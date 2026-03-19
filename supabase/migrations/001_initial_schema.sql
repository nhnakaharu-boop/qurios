-- ============================================================
-- Qurio Database Schema v1.0
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'tutor', 'admin');
CREATE TYPE plan_type AS ENUM ('free', 'student_premium', 'tutor_free', 'tutor_premium');
CREATE TYPE lesson_status AS ENUM ('waiting', 'matched', 'active', 'completed', 'cancelled');
CREATE TYPE subject_type AS ENUM ('math', 'english', 'chemistry', 'physics', 'biology', 'japanese', 'social', 'info', 'other');
CREATE TYPE difficulty AS ENUM ('basic', 'standard', 'advanced');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  display_name    TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
  bio             TEXT CHECK (length(bio) <= 160),
  avatar_url      TEXT,
  cover_url       TEXT,
  role            user_role NOT NULL DEFAULT 'student',
  plan            plan_type NOT NULL DEFAULT 'free',
  birth_date      DATE NOT NULL,
  prefecture      TEXT,
  grade           TEXT,
  subject_tags    subject_type[] DEFAULT '{}',
  follower_count  INTEGER NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
  following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  friend_count    INTEGER NOT NULL DEFAULT 0 CHECK (friend_count >= 0),
  total_lessons   INTEGER NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
  monthly_lessons INTEGER NOT NULL DEFAULT 0 CHECK (monthly_lessons >= 0),
  total_answers   INTEGER NOT NULL DEFAULT 0 CHECK (total_answers >= 0),
  total_study_min INTEGER NOT NULL DEFAULT 0 CHECK (total_study_min >= 0),
  deviation_score NUMERIC(5,2) CHECK (deviation_score BETWEEN 0 AND 100),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  ticket_count    INTEGER NOT NULL DEFAULT 0 CHECK (ticket_count >= 0),
  guardian_email  TEXT,
  guardian_approved BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FOLLOW (tutor only - students cannot follow each other)
-- ============================================================
CREATE TABLE public.follows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================
-- FRIENDS
-- ============================================================
CREATE TABLE public.friendships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE public.groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description TEXT CHECK (length(description) <= 200),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility  TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'invite', 'approval')),
  member_count INTEGER NOT NULL DEFAULT 1 CHECK (member_count BETWEEN 1 AND 40),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.group_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- LESSONS (授業)
-- ============================================================
CREATE TABLE public.lessons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_id      UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  subject       subject_type NOT NULL,
  grade         TEXT,
  difficulty    difficulty DEFAULT 'standard',
  content       TEXT NOT NULL CHECK (length(content) BETWEEN 10 AND 500),
  memo          TEXT CHECK (length(memo) <= 200),
  status        lesson_status NOT NULL DEFAULT 'waiting',
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_sec  INTEGER CHECK (duration_sec >= 0),
  extended_count INTEGER NOT NULL DEFAULT 0 CHECK (extended_count >= 0),
  is_resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  tutor_rating  SMALLINT CHECK (tutor_rating BETWEEN 1 AND 5),
  rating_comment TEXT CHECK (length(rating_comment) <= 300),
  photo_deleted_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Photo temp table (auto-deleted after lesson)
CREATE TABLE public.lesson_photos (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT photo_auto_delete CHECK (deleted_at IS NULL OR deleted_at > uploaded_at)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'jpy',
  type            TEXT NOT NULL CHECK (type IN ('lesson_extend', 'tutor_nomination', 'subscription', 'payout')),
  status          payment_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHALLENGE (課題Shorts)
-- ============================================================
CREATE TABLE public.challenges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject       subject_type NOT NULL,
  difficulty    difficulty DEFAULT 'standard',
  question      TEXT NOT NULL CHECK (length(question) BETWEEN 5 AND 300),
  answer        TEXT NOT NULL CHECK (length(answer) BETWEEN 1 AND 200),
  explanation   TEXT CHECK (length(explanation) <= 500),
  like_count    INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  answer_count  INTEGER NOT NULL DEFAULT 0 CHECK (answer_count >= 0),
  comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.challenge_answers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer       TEXT NOT NULL CHECK (length(answer) BETWEEN 1 AND 200),
  is_correct   BOOLEAN,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE public.challenge_likes (
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE public.challenge_comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lesson request from challenge
CREATE TABLE public.lesson_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message      TEXT CHECK (length(message) <= 300),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, student_id)
);

-- ============================================================
-- EARNINGS (収益)
-- ============================================================
CREATE TABLE public.earnings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  lesson_id    UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('challenge_answer', 'lesson', 'membership')),
  amount_yen   NUMERIC(10,2) NOT NULL CHECK (amount_yen >= 0),
  month        TEXT NOT NULL,  -- 'YYYY-MM'
  is_paid      BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,
  total_yen   NUMERIC(10,2) NOT NULL CHECK (total_yen >= 0),
  bank_name   TEXT,
  status      TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tutor_id, month)
);

-- ============================================================
-- RANKINGS (weekly snapshot)
-- ============================================================
CREATE TABLE public.rankings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week        TEXT NOT NULL,   -- 'YYYY-Www'
  subject     subject_type,    -- NULL = overall
  score       INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank_pos    INTEGER CHECK (rank_pos > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week, subject)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (security)
-- ============================================================
CREATE TABLE public.audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  resource   TEXT,
  ip_address INET,
  user_agent TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_photos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_answers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Public profiles viewable by all" ON public.profiles FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access" ON public.profiles USING (auth.role() = 'service_role');

-- FOLLOWS policies
CREATE POLICY "Anyone can see follows" ON public.follows FOR SELECT USING (TRUE);
CREATE POLICY "Users manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- FRIENDSHIPS policies
CREATE POLICY "Users see own friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users manage own friendships" ON public.friendships FOR ALL USING (auth.uid() = user_id);

-- LESSONS policies
CREATE POLICY "Students see own lessons" ON public.lessons FOR SELECT USING (auth.uid() = student_id OR auth.uid() = tutor_id);
CREATE POLICY "Students create lessons" ON public.lessons FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Tutor update assigned lessons" ON public.lessons FOR UPDATE USING (auth.uid() = tutor_id OR auth.uid() = student_id);

-- LESSON PHOTOS: extremely restricted
CREATE POLICY "Only lesson participants view photos" ON public.lesson_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND (l.student_id = auth.uid() OR l.tutor_id = auth.uid()) AND l.status = 'active')
);
CREATE POLICY "Students upload during active lesson" ON public.lesson_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND l.student_id = auth.uid() AND l.status = 'active')
);

-- CHALLENGES policies
CREATE POLICY "Published challenges viewable by all" ON public.challenges FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Authors manage own challenges" ON public.challenges FOR ALL USING (auth.uid() = author_id);

-- CHALLENGE ANSWERS
CREATE POLICY "Users see own answers" ON public.challenge_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authors see answers to own challenges" ON public.challenge_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.author_id = auth.uid())
);
CREATE POLICY "Authenticated users insert answers" ON public.challenge_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- EARNINGS policies
CREATE POLICY "Tutors see own earnings" ON public.earnings FOR SELECT USING (auth.uid() = tutor_id);
CREATE POLICY "Service role manages earnings" ON public.earnings USING (auth.role() = 'service_role');

-- PAYOUTS policies
CREATE POLICY "Tutors see own payouts" ON public.payouts FOR SELECT USING (auth.uid() = tutor_id);

-- NOTIFICATIONS
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- AUDIT LOGS: admin only
CREATE POLICY "Admins see audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Follow: update follower/following counts
CREATE OR REPLACE FUNCTION handle_follow_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER follows_change AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION handle_follow_change();

-- Challenge like count
CREATE OR REPLACE FUNCTION handle_challenge_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges SET like_count = like_count + 1 WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.challenge_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER challenge_like_change AFTER INSERT OR DELETE ON public.challenge_likes FOR EACH ROW EXECUTE FUNCTION handle_challenge_like();

-- Auto-delete lesson photos on lesson end
CREATE OR REPLACE FUNCTION cleanup_lesson_photos()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status != NEW.status THEN
    UPDATE public.lesson_photos SET deleted_at = NOW() WHERE lesson_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lesson_photo_cleanup AFTER UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION cleanup_lesson_photos();

-- Calculate tutor unit price based on monthly lessons
CREATE OR REPLACE FUNCTION get_tutor_unit_price(monthly_count INTEGER, follower_cnt INTEGER)
RETURNS NUMERIC AS $$
BEGIN
  IF monthly_count < 30 THEN RETURN 0;
  ELSIF monthly_count < 100 THEN RETURN 0;
  ELSIF monthly_count < 400 THEN RETURN 0.2;
  ELSIF monthly_count < 1000 AND follower_cnt >= 200 THEN RETURN 0.3;
  ELSIF monthly_count < 1600 AND follower_cnt >= 200 THEN RETURN 0.5;
  ELSIF follower_cnt >= 200 THEN RETURN 0.8;
  ELSE RETURN 0.2;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Monthly earnings calculation
CREATE OR REPLACE FUNCTION calculate_monthly_earnings(tutor_uuid UUID, target_month TEXT)
RETURNS NUMERIC AS $$
DECLARE
  unit_price NUMERIC;
  answer_count INTEGER;
  monthly_lessons INTEGER;
  follower_cnt INTEGER;
BEGIN
  SELECT p.monthly_lessons, p.follower_count INTO monthly_lessons, follower_cnt
  FROM public.profiles p WHERE id = tutor_uuid;
  
  unit_price := get_tutor_unit_price(monthly_lessons, follower_cnt);
  
  SELECT COUNT(*) INTO answer_count
  FROM public.challenge_answers ca
  JOIN public.challenges c ON c.id = ca.challenge_id
  WHERE c.author_id = tutor_uuid
    AND TO_CHAR(ca.answered_at, 'YYYY-MM') = target_month;
  
  RETURN unit_price * answer_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_plan ON public.profiles(plan);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_friendships_user ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX idx_lessons_student ON public.lessons(student_id);
CREATE INDEX idx_lessons_tutor ON public.lessons(tutor_id);
CREATE INDEX idx_lessons_status ON public.lessons(status);
CREATE INDEX idx_challenges_author ON public.challenges(author_id);
CREATE INDEX idx_challenges_subject ON public.challenges(subject);
CREATE INDEX idx_challenge_answers_challenge ON public.challenge_answers(challenge_id);
CREATE INDEX idx_earnings_tutor ON public.earnings(tutor_id);
CREATE INDEX idx_earnings_month ON public.earnings(month);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);

-- ============================================================
-- v2 ADDITIONS: 25-minute endless study, membership, achievements
-- ============================================================

-- ENDLESS STUDY SESSIONS
CREATE TABLE public.endless_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject         subject_type NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  cycle_count     INTEGER NOT NULL DEFAULT 0,
  total_study_sec INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.endless_cycles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.endless_sessions(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  tutor_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cycle_number    INTEGER NOT NULL,
  study_sec       INTEGER NOT NULL DEFAULT 1500,
  cooldown_sec    INTEGER NOT NULL DEFAULT 300,
  tutor_earned    NUMERIC(10,2) NOT NULL DEFAULT 100,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lesson_ended_at TIMESTAMPTZ,
  cooldown_ended_at TIMESTAMPTZ
);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('study','social','endless','streak','milestone')),
  rarity      TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  points      INTEGER NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- STREAKS
CREATE TABLE public.study_streaks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MEMBERSHIP (tutor only)
CREATE TABLE public.memberships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 60),
  description TEXT CHECK (length(description) <= 500),
  price_yen   INTEGER NOT NULL CHECK (price_yen BETWEEN 100 AND 100000),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.membership_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,
  UNIQUE(membership_id, student_id)
);

-- MEMBERSHIP POSTS (like a channel)
CREATE TABLE public.membership_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT CHECK (length(title) <= 100),
  content      TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  youtube_urls TEXT[] DEFAULT '{}',  -- only YouTube links allowed
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TUTOR PROFILE LINKS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutor_website_url TEXT,
  ADD COLUMN IF NOT EXISTS tutor_youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS tutor_affiliate_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified_tutor BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS achievement_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS endless_count INTEGER NOT NULL DEFAULT 0;

-- PLANS: add premium_all for students
-- premium_all = ¥2480/month, no ads, all features
-- Update plan enum
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'student_premium_all';

-- RLS for new tables
ALTER TABLE public.endless_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endless_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own endless sessions" ON public.endless_sessions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students manage own endless sessions" ON public.endless_sessions FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Anyone see achievements" ON public.achievements FOR SELECT USING (TRUE);
CREATE POLICY "Users see own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own streaks" ON public.study_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone see active memberships" ON public.memberships FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Tutors manage own memberships" ON public.memberships FOR ALL USING (auth.uid() = tutor_id);
CREATE POLICY "Members see membership posts" ON public.membership_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.membership_subscriptions ms WHERE ms.membership_id = membership_id AND ms.student_id = auth.uid() AND ms.status = 'active')
  OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.tutor_id = auth.uid())
);
CREATE POLICY "Tutors create membership posts" ON public.membership_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.tutor_id = auth.uid())
);

-- Seed achievements
INSERT INTO public.achievements (code, name, description, icon, category, rarity, points) VALUES
('first_lesson', '初授業', '最初の授業を受けた', '📚', 'milestone', 'common', 10),
('first_endless', 'はじめての25分', '25分エンドレス学習を完了した', '🔥', 'endless', 'common', 20),
('endless_3', '3サイクル達成', '3サイクル連続でエンドレス学習', '⚡', 'endless', 'rare', 50),
('endless_10', '10サイクル達成', '10サイクル連続でエンドレス学習', '🌟', 'endless', 'epic', 200),
('streak_7', '7日連続', '7日間連続して学習した', '🔥', 'streak', 'rare', 100),
('streak_30', '30日連続', '30日間連続して学習した', '💎', 'streak', 'legendary', 500),
('challenge_100', 'Challenge100問', 'Challengeを100問解答した', '🎯', 'study', 'rare', 100),
('lesson_50', '50授業達成', '授業を50回受けた', '🎓', 'milestone', 'epic', 200),
('top_ranker', 'TOP10ランカー', '週間ランキングTOP10入り', '🏆', 'milestone', 'epic', 150),
('follower_10', 'フォロワー10人', '10人にフォローされた', '👥', 'social', 'common', 30)
ON CONFLICT (code) DO NOTHING;

-- REPORTS TABLE (v2)
CREATE TABLE IF NOT EXISTS public.reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id        UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  reason           TEXT NOT NULL,
  detail           TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins see all reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add monthly_lesson_minutes column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_lesson_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- Update plan type to include new names (idempotent)
-- Note: In production, update existing plan values
-- UPDATE profiles SET plan = 'student_paid' WHERE plan = 'student_premium';
-- UPDATE profiles SET plan = 'student_paid_plus' WHERE plan = 'student_premium_all';
-- UPDATE profiles SET plan = 'tutor_paid' WHERE plan = 'tutor_premium';
