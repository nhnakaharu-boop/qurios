-- ============================================================
-- Qurios — Complete Database Schema
-- Version: 2025-06-19
-- Run once in Supabase SQL Editor (idempotent via IF NOT EXISTS)
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role     AS ENUM ('student', 'tutor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_type     AS ENUM (
    'free', 'student_paid', 'student_paid_plus', 'tutor_free', 'tutor_paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lesson_status AS ENUM ('waiting', 'matched', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lesson_type   AS ENUM ('5min', '25min');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subject_type  AS ENUM ('math', 'english', 'chemistry', 'physics', 'biology', 'japanese', 'social', 'info', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty    AS ENUM ('basic', 'standard', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABLES ──────────────────────────────────────────────────

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id                     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username               TEXT        UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name           TEXT        NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
  bio                    TEXT        CHECK (length(bio) <= 160),
  avatar_url             TEXT,
  cover_url              TEXT,
  role                   user_role   NOT NULL DEFAULT 'student',
  plan                   plan_type   NOT NULL DEFAULT 'free',
  birth_date             DATE        NOT NULL,
  prefecture             TEXT,
  grade                  TEXT,
  subject_tags           subject_type[] DEFAULT '{}',
  follower_count         INTEGER     NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
  following_count        INTEGER     NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  friend_count           INTEGER     NOT NULL DEFAULT 0 CHECK (friend_count >= 0),
  total_lessons          INTEGER     NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
  monthly_lessons        INTEGER     NOT NULL DEFAULT 0 CHECK (monthly_lessons >= 0),
  monthly_lesson_minutes INTEGER     NOT NULL DEFAULT 0 CHECK (monthly_lesson_minutes >= 0),
  total_answers          INTEGER     NOT NULL DEFAULT 0 CHECK (total_answers >= 0),
  total_study_min        INTEGER     NOT NULL DEFAULT 0 CHECK (total_study_min >= 0),
  deviation_score        NUMERIC(5,2) CHECK (deviation_score BETWEEN 0 AND 100),
  stripe_customer_id     TEXT        UNIQUE,
  stripe_subscription_id TEXT,
  plan_expires_at        TIMESTAMPTZ,
  ticket_count           INTEGER     NOT NULL DEFAULT 0 CHECK (ticket_count >= 0),
  guardian_email         TEXT,
  guardian_approved      BOOLEAN     DEFAULT FALSE,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  last_seen_at           TIMESTAMPTZ DEFAULT NOW(),
  -- tutor extras
  tutor_website_url      TEXT,
  tutor_youtube_url      TEXT,
  tutor_affiliate_url    TEXT,
  is_verified_tutor      BOOLEAN     NOT NULL DEFAULT FALSE,
  avg_rating             NUMERIC(3,2),
  rating_count           INTEGER     NOT NULL DEFAULT 0,
  -- gamification
  achievement_points     INTEGER     NOT NULL DEFAULT 0,
  endless_count          INTEGER     NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FOLLOWS (tutor-only target)
CREATE TABLE IF NOT EXISTS public.follows (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT        NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description  TEXT        CHECK (length(description) <= 200),
  owner_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility   TEXT        NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','invite','approval')),
  member_count INTEGER     NOT NULL DEFAULT 1 CHECK (member_count BETWEEN 1 AND 40),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GROUP MEMBERS
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id        UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id        UUID          REFERENCES public.groups(id) ON DELETE SET NULL,
  subject         subject_type  NOT NULL,
  grade           TEXT,
  difficulty      difficulty    DEFAULT 'standard',
  lesson_type     lesson_type   NOT NULL DEFAULT '5min',
  content         TEXT          NOT NULL CHECK (length(content) BETWEEN 10 AND 500),
  memo            TEXT          CHECK (length(memo) <= 200),
  tags            TEXT[]        DEFAULT '{}',
  status          lesson_status NOT NULL DEFAULT 'waiting',
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_sec    INTEGER       CHECK (duration_sec >= 0),
  extended_count  INTEGER       NOT NULL DEFAULT 0 CHECK (extended_count >= 0),
  is_resolved     BOOLEAN       NOT NULL DEFAULT FALSE,
  tutor_rating    SMALLINT      CHECK (tutor_rating BETWEEN 1 AND 5),
  rating_comment  TEXT          CHECK (length(rating_comment) <= 300),
  photo_deleted_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- LESSON PHOTOS (auto-deleted after lesson)
CREATE TABLE IF NOT EXISTS public.lesson_photos (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id    UUID        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- CHALLENGES
CREATE TABLE IF NOT EXISTS public.challenges (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject       subject_type NOT NULL,
  difficulty    difficulty   DEFAULT 'standard',
  question      TEXT         NOT NULL CHECK (length(question) BETWEEN 5 AND 500),
  answer        TEXT         NOT NULL CHECK (length(answer) BETWEEN 1 AND 300),
  explanation   TEXT         CHECK (length(explanation) <= 1000),
  youtube_url   TEXT,
  like_count    INTEGER      NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  answer_count  INTEGER      NOT NULL DEFAULT 0 CHECK (answer_count >= 0),
  comment_count INTEGER      NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  is_published  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- CHALLENGE ANSWERS
CREATE TABLE IF NOT EXISTS public.challenge_answers (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer       TEXT        NOT NULL CHECK (length(answer) BETWEEN 1 AND 300),
  is_correct   BOOLEAN,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- CHALLENGE LIKES
CREATE TABLE IF NOT EXISTS public.challenge_likes (
  challenge_id UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

-- CHALLENGE COMMENTS
CREATE TABLE IF NOT EXISTS public.challenge_comments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL CHECK (length(content) BETWEEN 1 AND 300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LESSON REQUESTS (from Challenge)
CREATE TABLE IF NOT EXISTS public.lesson_requests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message      TEXT        CHECK (length(message) <= 300),
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, student_id)
);

-- EARNINGS
CREATE TABLE IF NOT EXISTS public.earnings (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID        REFERENCES public.challenges(id) ON DELETE SET NULL,
  lesson_id    UUID        REFERENCES public.lessons(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL CHECK (type IN ('challenge_answer','lesson','membership','endless_lesson')),
  amount_yen   NUMERIC(10,2) NOT NULL CHECK (amount_yen >= 0),
  month        TEXT        NOT NULL,  -- 'YYYY-MM'
  is_paid      BOOLEAN     NOT NULL DEFAULT FALSE,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYOUTS
CREATE TABLE IF NOT EXISTS public.payouts (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month        TEXT        NOT NULL,
  total_yen    NUMERIC(10,2) NOT NULL CHECK (total_yen >= 0),
  status       TEXT        NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','processing','completed','failed')),
  processed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tutor_id, month)
);

-- RANKINGS
CREATE TABLE IF NOT EXISTS public.rankings (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week       TEXT         NOT NULL,
  subject    subject_type,
  score      INTEGER      NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank_pos   INTEGER      CHECK (rank_pos > 0),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week, subject)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         BIGSERIAL   PRIMARY KEY,
  user_id    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  resource   TEXT,
  ip_address INET,
  user_agent TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ENDLESS SESSIONS
CREATE TABLE IF NOT EXISTS public.endless_sessions (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject          subject_type  NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  cycle_count      INTEGER       NOT NULL DEFAULT 0,
  total_study_sec  INTEGER       NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN ('study','social','endless','streak','milestone')),
  rarity      TEXT        NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  points      INTEGER     NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID        NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- STUDY STREAKS
CREATE TABLE IF NOT EXISTS public.study_streaks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER     NOT NULL DEFAULT 0,
  longest_streak  INTEGER     NOT NULL DEFAULT 0,
  last_study_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.memberships (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  description  TEXT        CHECK (length(description) <= 500),
  price_yen    INTEGER     NOT NULL CHECK (price_yen BETWEEN 100 AND 100000),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  member_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MEMBERSHIP SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.membership_subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id          UUID        NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  student_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status                 TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ,
  UNIQUE(membership_id, student_id)
);

-- MEMBERSHIP POSTS
CREATE TABLE IF NOT EXISTS public.membership_posts (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID        NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        CHECK (length(title) <= 100),
  content       TEXT        NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  youtube_urls  TEXT[]      DEFAULT '{}',
  challenge_id  UUID        REFERENCES public.challenges(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id        UUID        REFERENCES public.lessons(id) ON DELETE SET NULL,
  reason           TEXT        NOT NULL,
  detail           TEXT        CHECK (length(detail) <= 500),
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id                 UUID        REFERENCES public.lessons(id) ON DELETE SET NULL,
  stripe_payment_intent_id  TEXT        UNIQUE,
  amount                    INTEGER     NOT NULL CHECK (amount > 0),
  currency                  TEXT        NOT NULL DEFAULT 'jpy',
  type                      TEXT        NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ENABLE ROW LEVEL SECURITY (ALL TABLES) ────────────────────
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_photos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_likes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endless_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streaks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ──────────────────────────────────────────────

-- PROFILES
DROP POLICY IF EXISTS "profiles_select"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"      ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (is_active = TRUE OR auth.uid() = id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- FOLLOWS
DROP POLICY IF EXISTS "follows_select" ON public.follows;
DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;

CREATE POLICY "follows_select" ON public.follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- FRIENDSHIPS
DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;

CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id)  -- receiver accepts/declines
  WITH CHECK (auth.uid() = friend_id);

CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- GROUPS
DROP POLICY IF EXISTS "groups_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_update" ON public.groups;
DROP POLICY IF EXISTS "groups_delete" ON public.groups;

CREATE POLICY "groups_select" ON public.groups
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE USING (auth.uid() = owner_id);

-- GROUP MEMBERS
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "group_members_insert" ON public.group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
  );

CREATE POLICY "group_members_delete" ON public.group_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
  );

-- LESSONS
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
DROP POLICY IF EXISTS "lessons_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update" ON public.lessons;

CREATE POLICY "lessons_select" ON public.lessons
  FOR SELECT USING (
    auth.uid() = student_id OR
    auth.uid() = tutor_id OR
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "lessons_insert" ON public.lessons
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "lessons_update" ON public.lessons
  FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = tutor_id);

-- LESSON PHOTOS (extremely restricted — auto-deleted)
DROP POLICY IF EXISTS "lesson_photos_select" ON public.lesson_photos;
DROP POLICY IF EXISTS "lesson_photos_insert" ON public.lesson_photos;

CREATE POLICY "lesson_photos_select" ON public.lesson_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id
        AND l.status = 'active'
        AND (l.student_id = auth.uid() OR l.tutor_id = auth.uid())
    )
  );

CREATE POLICY "lesson_photos_insert" ON public.lesson_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_id
        AND l.status = 'active'
        AND l.student_id = auth.uid()
    )
  );

-- CHALLENGES
DROP POLICY IF EXISTS "challenges_select" ON public.challenges;
DROP POLICY IF EXISTS "challenges_insert" ON public.challenges;
DROP POLICY IF EXISTS "challenges_update" ON public.challenges;
DROP POLICY IF EXISTS "challenges_delete" ON public.challenges;

CREATE POLICY "challenges_select" ON public.challenges
  FOR SELECT USING (is_published = TRUE OR auth.uid() = author_id);

CREATE POLICY "challenges_insert" ON public.challenges
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'tutor')
  );

CREATE POLICY "challenges_update" ON public.challenges
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "challenges_delete" ON public.challenges
  FOR DELETE USING (auth.uid() = author_id);

-- CHALLENGE ANSWERS
DROP POLICY IF EXISTS "challenge_answers_select" ON public.challenge_answers;
DROP POLICY IF EXISTS "challenge_answers_insert" ON public.challenge_answers;

CREATE POLICY "challenge_answers_select" ON public.challenge_answers
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.author_id = auth.uid())
  );

CREATE POLICY "challenge_answers_insert" ON public.challenge_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CHALLENGE LIKES
DROP POLICY IF EXISTS "challenge_likes_select" ON public.challenge_likes;
DROP POLICY IF EXISTS "challenge_likes_insert" ON public.challenge_likes;
DROP POLICY IF EXISTS "challenge_likes_delete" ON public.challenge_likes;

CREATE POLICY "challenge_likes_select" ON public.challenge_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "challenge_likes_insert" ON public.challenge_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenge_likes_delete" ON public.challenge_likes
  FOR DELETE USING (auth.uid() = user_id);

-- CHALLENGE COMMENTS
DROP POLICY IF EXISTS "challenge_comments_select" ON public.challenge_comments;
DROP POLICY IF EXISTS "challenge_comments_insert" ON public.challenge_comments;
DROP POLICY IF EXISTS "challenge_comments_delete" ON public.challenge_comments;

CREATE POLICY "challenge_comments_select" ON public.challenge_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "challenge_comments_insert" ON public.challenge_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

CREATE POLICY "challenge_comments_delete" ON public.challenge_comments
  FOR DELETE USING (auth.uid() = user_id);

-- LESSON REQUESTS
DROP POLICY IF EXISTS "lesson_requests_select" ON public.lesson_requests;
DROP POLICY IF EXISTS "lesson_requests_insert" ON public.lesson_requests;

CREATE POLICY "lesson_requests_select" ON public.lesson_requests
  FOR SELECT USING (auth.uid() = student_id OR auth.uid() = tutor_id);

CREATE POLICY "lesson_requests_insert" ON public.lesson_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- EARNINGS
DROP POLICY IF EXISTS "earnings_select" ON public.earnings;
DROP POLICY IF EXISTS "earnings_insert" ON public.earnings;

CREATE POLICY "earnings_select" ON public.earnings
  FOR SELECT USING (auth.uid() = tutor_id);

-- Service role only can insert/update earnings
CREATE POLICY "earnings_insert" ON public.earnings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- PAYOUTS
DROP POLICY IF EXISTS "payouts_select" ON public.payouts;

CREATE POLICY "payouts_select" ON public.payouts
  FOR SELECT USING (auth.uid() = tutor_id);

-- RANKINGS
DROP POLICY IF EXISTS "rankings_select" ON public.rankings;
DROP POLICY IF EXISTS "rankings_insert" ON public.rankings;

CREATE POLICY "rankings_select" ON public.rankings
  FOR SELECT USING (TRUE);

CREATE POLICY "rankings_insert" ON public.rankings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- AUDIT LOGS (admin read, service_role write)
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ENDLESS SESSIONS
DROP POLICY IF EXISTS "endless_sessions_select" ON public.endless_sessions;
DROP POLICY IF EXISTS "endless_sessions_insert" ON public.endless_sessions;
DROP POLICY IF EXISTS "endless_sessions_update" ON public.endless_sessions;

CREATE POLICY "endless_sessions_select" ON public.endless_sessions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "endless_sessions_insert" ON public.endless_sessions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "endless_sessions_update" ON public.endless_sessions
  FOR UPDATE USING (auth.uid() = student_id);

-- ACHIEVEMENTS (public read, service_role write)
DROP POLICY IF EXISTS "achievements_select" ON public.achievements;

CREATE POLICY "achievements_select" ON public.achievements
  FOR SELECT USING (TRUE);

-- USER ACHIEVEMENTS
DROP POLICY IF EXISTS "user_achievements_select" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert" ON public.user_achievements;

CREATE POLICY "user_achievements_select" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- STUDY STREAKS
DROP POLICY IF EXISTS "study_streaks_select" ON public.study_streaks;
DROP POLICY IF EXISTS "study_streaks_upsert" ON public.study_streaks;

CREATE POLICY "study_streaks_select" ON public.study_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "study_streaks_upsert" ON public.study_streaks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;

CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT USING (is_active = TRUE OR auth.uid() = tutor_id);

CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT WITH CHECK (
    auth.uid() = tutor_id AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.plan = 'tutor_paid')
  );

CREATE POLICY "memberships_update" ON public.memberships
  FOR UPDATE USING (auth.uid() = tutor_id);

CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE USING (auth.uid() = tutor_id);

-- MEMBERSHIP SUBSCRIPTIONS
DROP POLICY IF EXISTS "membership_subscriptions_select" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "membership_subscriptions_insert" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "membership_subscriptions_update" ON public.membership_subscriptions;

CREATE POLICY "membership_subscriptions_select" ON public.membership_subscriptions
  FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.tutor_id = auth.uid())
  );

CREATE POLICY "membership_subscriptions_insert" ON public.membership_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.role() = 'service_role');

CREATE POLICY "membership_subscriptions_update" ON public.membership_subscriptions
  FOR UPDATE USING (auth.role() = 'service_role');

-- MEMBERSHIP POSTS
DROP POLICY IF EXISTS "membership_posts_select" ON public.membership_posts;
DROP POLICY IF EXISTS "membership_posts_insert" ON public.membership_posts;
DROP POLICY IF EXISTS "membership_posts_delete" ON public.membership_posts;

CREATE POLICY "membership_posts_select" ON public.membership_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.tutor_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.membership_subscriptions ms
      WHERE ms.membership_id = membership_id
        AND ms.student_id = auth.uid()
        AND ms.status = 'active'
    )
  );

CREATE POLICY "membership_posts_insert" ON public.membership_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.tutor_id = auth.uid())
  );

CREATE POLICY "membership_posts_delete" ON public.membership_posts
  FOR DELETE USING (auth.uid() = author_id);

-- REPORTS
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;

CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id AND
    auth.uid() <> reported_user_id AND
    auth.role() = 'authenticated'
  );

-- PAYMENTS
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── FUNCTIONS ─────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER profiles_updated_at   BEFORE UPDATE ON public.profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Follow counter
CREATE OR REPLACE FUNCTION handle_follow_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER follows_change AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION handle_follow_change();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Challenge like counter
CREATE OR REPLACE FUNCTION handle_challenge_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges SET like_count = like_count + 1 WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.challenge_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER challenge_like_change AFTER INSERT OR DELETE ON public.challenge_likes FOR EACH ROW EXECUTE FUNCTION handle_challenge_like();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-delete lesson photos on lesson end
CREATE OR REPLACE FUNCTION cleanup_lesson_photos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status != NEW.status THEN
    UPDATE public.lesson_photos SET deleted_at = NOW() WHERE lesson_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER lesson_photo_cleanup AFTER UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION cleanup_lesson_photos();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Challenge earn rate (monthly lesson minutes basis)
CREATE OR REPLACE FUNCTION get_challenge_rate(monthly_minutes INTEGER)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF monthly_minutes <  150  THEN RETURN 0;
  ELSIF monthly_minutes < 1500 THEN RETURN 0.05;
  ELSIF monthly_minutes < 4500 THEN RETURN 0.1;
  ELSIF monthly_minutes < 8000 THEN RETURN 0.2;
  ELSE RETURN 0.4;
  END IF;
END;
$$;

-- Monthly earnings calculation
CREATE OR REPLACE FUNCTION calculate_monthly_earnings(tutor_uuid UUID, target_month TEXT)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rate         NUMERIC;
  answer_cnt   INTEGER;
  monthly_min  INTEGER;
BEGIN
  SELECT p.monthly_lesson_minutes INTO monthly_min
  FROM public.profiles p WHERE id = tutor_uuid;

  rate := get_challenge_rate(COALESCE(monthly_min, 0));

  SELECT COUNT(*) INTO answer_cnt
  FROM public.challenge_answers ca
  JOIN public.challenges c ON c.id = ca.challenge_id
  WHERE c.author_id = tutor_uuid
    AND TO_CHAR(ca.answered_at, 'YYYY-MM') = target_month;

  RETURN rate * answer_cnt;
END;
$$;

-- Reset monthly counters (run via cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_counters()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET monthly_lessons = 0, monthly_lesson_minutes = 0;
END;
$$;

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role       ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_plan       ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_active     ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_follows_follower    ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following   ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user    ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend  ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status  ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_lessons_student     ON public.lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_tutor       ON public.lessons(tutor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status      ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_type        ON public.lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_challenges_author   ON public.challenges(author_id);
CREATE INDEX IF NOT EXISTS idx_challenges_subject  ON public.challenges(subject);
CREATE INDEX IF NOT EXISTS idx_challenges_pub      ON public.challenges(is_published);
CREATE INDEX IF NOT EXISTS idx_challenge_answers_c ON public.challenge_answers(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_answers_u ON public.challenge_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_tutor      ON public.earnings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_earnings_month      ON public.earnings(month);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_read  ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_rankings_user       ON public.rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_rankings_week       ON public.rankings(week);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_tutor   ON public.memberships(tutor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mem_subs_member     ON public.membership_subscriptions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen  ON public.profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_endless_student     ON public.endless_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_u ON public.user_achievements(user_id);

-- ── SEED DATA ─────────────────────────────────────────────────
INSERT INTO public.achievements (code, name, description, icon, category, rarity, points) VALUES
  ('first_lesson',   '初授業',           '最初の授業を受けた',                    '📚', 'milestone', 'common',    10),
  ('first_endless',  'はじめての25分',   '25分エンドレス学習を完了した',           '🔥', 'endless',   'common',    20),
  ('endless_3',      '3サイクル達成',    '3サイクル連続でエンドレス学習',          '⚡', 'endless',   'rare',      50),
  ('endless_10',     '10サイクル達成',   '10サイクル連続でエンドレス学習',         '🌟', 'endless',   'epic',     200),
  ('endless_30',     '30サイクル達成',   '30サイクル連続でエンドレス学習',         '💎', 'endless',   'legendary', 1000),
  ('streak_3',       '3日連続',          '3日間連続して学習した',                  '🔥', 'streak',    'common',    30),
  ('streak_7',       '7日連続',          '7日間連続して学習した',                  '🔥', 'streak',    'rare',     100),
  ('streak_30',      '30日連続',         '30日間連続して学習した',                 '💎', 'streak',    'legendary', 500),
  ('challenge_10',   'Challenge10問',    'Challengeを10問解答した',               '🎯', 'study',     'common',    20),
  ('challenge_100',  'Challenge100問',   'Challengeを100問解答した',              '🎯', 'study',     'rare',     100),
  ('challenge_1000', 'Challenge1000問',  'Challengeを1000問解答した',             '🏅', 'study',     'epic',     500),
  ('lesson_10',      '10授業達成',       '授業を10回受けた',                       '📖', 'milestone', 'common',    30),
  ('lesson_50',      '50授業達成',       '授業を50回受けた',                       '🎓', 'milestone', 'epic',     200),
  ('lesson_200',     '200授業達成',      '授業を200回受けた',                      '🏆', 'milestone', 'legendary', 800),
  ('top_ranker',     'TOP10ランカー',    '週間ランキングTOP10入り',                '🏆', 'milestone', 'epic',     150),
  ('top3_ranker',    'TOP3ランカー',     '週間ランキングTOP3入り',                 '👑', 'milestone', 'legendary', 500),
  ('follower_10',    'フォロワー10人',   '10人にフォローされた（講師）',            '👥', 'social',    'common',    30),
  ('follower_100',   'フォロワー100人',  '100人にフォローされた（講師）',           '👑', 'social',    'rare',     200),
  ('first_challenge','初課題投稿',       '最初の自作課題を投稿した（講師）',        '✏️', 'milestone', 'common',    20),
  ('first_member',   'メンバーシップ開設','メンバーシップを作成した（講師）',       '💼', 'milestone', 'rare',      80)
ON CONFLICT (code) DO NOTHING;

-- ── VERIFY ALL TABLES HAVE RLS ────────────────────────────────
-- (run this as a sanity check query — returns tables without RLS)
-- SELECT tablename FROM pg_tables WHERE schemaname='public'
-- AND tablename NOT IN (
--   SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relrowsecurity=TRUE
-- );
