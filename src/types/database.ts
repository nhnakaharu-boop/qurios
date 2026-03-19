// ============================================================
// Qurios - TypeScript Database Types
// ============================================================

export type UserRole = 'student' | 'tutor' | 'admin';
export type PlanType =
  | 'free'
  | 'student_paid'           // 生徒有料プラン ¥980/月
  | 'student_paid_plus'      // 生徒有料プラン+ ¥2480/月 (no ads, all features)
  | 'tutor_free'
  | 'tutor_paid';            // 有料講師 ¥4980/月

export type LessonStatus = 'waiting' | 'matched' | 'active' | 'completed' | 'cancelled';
export type SubjectType = 'math' | 'english' | 'chemistry' | 'physics' | 'biology' | 'japanese' | 'social' | 'info' | 'other';
export type Difficulty = 'basic' | 'standard' | 'advanced';

/**
 * Challenge earning rates (¥/answer) based on MONTHLY LESSON MINUTES
 * < 150min   → ¥0   (no earnings)
 * ≥ 150min   → ¥0.05
 * ≥ 1500min  → ¥0.1
 * ≥ 4500min  → ¥0.2
 * ≥ 8000min  → ¥0.4
 */
export function getChallengeRate(monthlyMinutes: number): number {
  if (monthlyMinutes < 150)  return 0;
  if (monthlyMinutes < 1500) return 0.05;
  if (monthlyMinutes < 4500) return 0.1;
  if (monthlyMinutes < 8000) return 0.2;
  return 0.4;
}

export const PLAN_LABELS: Record<PlanType, string> = {
  free:               '無料',
  student_paid:       '生徒有料プラン',
  student_paid_plus:  '生徒有料プラン+',
  tutor_free:         '講師（無料）',
  tutor_paid:         '有料講師',
};

// Stripe payment links (production)
export const STRIPE_LINKS = {
  tutor_nomination_ticket: 'https://buy.stripe.com/test_3cIcN65GWf6Lbzlawh7bW00',
  student_paid_plus:       'https://buy.stripe.com/test_4gMbJ2c5k5wbgTFeMx7bW01',
  student_paid:            'https://buy.stripe.com/test_14A00k8T88In46T5bX7bW02',
  tutor_paid:              'https://buy.stripe.com/test_00w9AU0mC9Mr0UHcEp7bW03',
};

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: UserRole;
  plan: PlanType;
  birth_date: string;
  prefecture: string | null;
  grade: string | null;
  subject_tags: SubjectType[];
  follower_count: number;
  following_count: number;
  friend_count: number;
  total_lessons: number;
  monthly_lessons: number;
  monthly_lesson_minutes: number;   // NEW: minutes for earning calc
  total_answers: number;
  total_study_min: number;
  deviation_score: number | null;
  ticket_count: number;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  // Tutor specific
  tutor_website_url?: string | null;
  tutor_youtube_url?: string | null;
  tutor_affiliate_url?: string | null;
  is_verified_tutor?: boolean;
  // Achievements
  achievement_points?: number;
  endless_count?: number;
  // Rating
  avg_rating?: number;
  rating_count?: number;
}

export interface Lesson {
  id: string;
  student_id: string;
  tutor_id: string | null;
  group_id: string | null;
  subject: SubjectType;
  grade: string | null;
  difficulty: Difficulty;
  content: string;
  memo: string | null;
  status: LessonStatus;
  lesson_type: '5min' | '25min';   // NEW
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  extended_count: number;
  is_resolved: boolean;
  tutor_rating: number | null;
  rating_comment: string | null;
  created_at: string;
  student?: Partial<Profile>;
  tutor?: Partial<Profile>;
}

export interface Challenge {
  id: string;
  author_id: string;
  subject: SubjectType;
  difficulty: Difficulty;
  question: string;
  answer: string;
  explanation: string | null;
  youtube_url?: string | null;
  like_count: number;
  answer_count: number;
  comment_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: Partial<Profile>;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  lesson_id?: string | null;
  reason: string;
  detail: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender?: Partial<Profile>;
  receiver?: Partial<Profile>;
}

export interface EndlessSession {
  id: string;
  student_id: string;
  subject: SubjectType;
  status: 'active' | 'paused' | 'completed';
  cycle_count: number;
  total_study_sec: number;
  started_at: string;
  ended_at: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'social' | 'endless' | 'streak' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface Membership {
  id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  price_yen: number;
  is_active: boolean;
  member_count: number;
  created_at: string;
  tutor?: Partial<Profile>;
}

export interface MembershipPost {
  id: string;
  membership_id: string;
  author_id: string;
  title: string | null;
  content: string;
  youtube_urls: string[];
  challenge_id: string | null;
  created_at: string;
  updated_at: string;
  author?: Partial<Profile>;
}

export interface Earning {
  id: string;
  tutor_id: string;
  challenge_id: string | null;
  lesson_id: string | null;
  type: 'challenge_answer' | 'lesson' | 'membership' | 'endless_lesson';
  amount_yen: number;
  month: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  visibility: 'public' | 'invite' | 'approval';
  member_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles:                 { Row: Profile;          Insert: Partial<Profile>;          Update: Partial<Profile>          };
      lessons:                  { Row: Lesson;           Insert: Partial<Lesson>;           Update: Partial<Lesson>           };
      challenges:               { Row: Challenge;        Insert: Partial<Challenge>;        Update: Partial<Challenge>        };
      earnings:                 { Row: Earning;          Insert: Partial<Earning>;          Update: Partial<Earning>          };
      notifications:            { Row: Notification;     Insert: Partial<Notification>;     Update: Partial<Notification>     };
      groups:                   { Row: Group;            Insert: Partial<Group>;            Update: Partial<Group>            };
      endless_sessions:         { Row: EndlessSession;   Insert: Partial<EndlessSession>;   Update: Partial<EndlessSession>   };
      achievements:             { Row: Achievement;      Insert: Partial<Achievement>;      Update: Partial<Achievement>      };
      user_achievements:        { Row: UserAchievement;  Insert: Partial<UserAchievement>;  Update: Partial<UserAchievement>  };
      memberships:              { Row: Membership;       Insert: Partial<Membership>;       Update: Partial<Membership>       };
      membership_posts:         { Row: MembershipPost;   Insert: Partial<MembershipPost>;   Update: Partial<MembershipPost>   };
      reports:                  { Row: Report;           Insert: Partial<Report>;           Update: Partial<Report>           };
      friend_requests:          { Row: FriendRequest;    Insert: Partial<FriendRequest>;    Update: Partial<FriendRequest>    };
    };
  };
}
