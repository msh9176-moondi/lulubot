import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 타입 정의
export type Tables = {
  members: {
    id: string;
    display_name: string;
    wake_up_time: string | null;
    accumulated_exp: number;
    is_active: boolean;
    joined_at: string | null;
    left_at: string | null;
    created_at: string;
    updated_at: string;
  };
  categories: {
    key: string;
    name: string;
    emoji: string;
    base_exp: number;
    daily_limit: number;
    cooldown_hours: number | null;
    description: string | null;
    is_active: boolean;
    sort_order: number;
  };
  certifications: {
    id: string;
    member_id: string;
    category_key: string;
    cert_date: string;
    cert_time: string;
    tag_used: string | null;
    base_exp: number;
    multiplier: number;
    final_exp: number;
    comeback_bonus_exp: number;
    is_valid_morning: boolean | null;
    is_valid_comeback: boolean | null;
    is_over_limit: boolean;
    daily_cert_num: number;
    created_at: string;
  };
  xp_events: {
    id: string;
    name: string;
    emoji: string;
    start_date: string;
    end_date: string;
    multiplier: number;
    categories: string[] | null;
    is_enabled: boolean;
    created_at: string;
  };
  achievement_definitions: {
    key: string;
    name: string;
    emoji: string | null;
    category: string | null;
    type: string;
    target: number;
    difficulty: number;
    is_hidden: boolean;
    hint: string | null;
    is_sensitive: boolean;
    is_active: boolean;
  };
  member_achievements: {
    id: string;
    member_id: string;
    achievement_key: string;
    achieved_at: string;
    created_at: string;
  };
  // Motivation feature tables
  personal_reasons: {
    id: string;
    member_id: string;
    category_key: string | null;
    reason_text: string;
    importance: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  challenge_templates: {
    id: string;
    category_key: string;
    title: string;
    description: string | null;
    difficulty: number;
    duration_minutes: number;
    tips: string[] | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  };
  user_challenges: {
    id: string;
    member_id: string;
    template_id: string;
    is_favorite: boolean;
    times_completed: number;
    times_started: number;
    last_started_at: string | null;
    last_completed_at: string | null;
    created_at: string;
  };
  start_attempts: {
    id: string;
    member_id: string;
    template_id: string | null;
    category_key: string;
    started_at: string;
    status: string;
    certification_id: string | null;
    confirmed_at: string | null;
    expired_at: string | null;
    notes: string | null;
    created_at: string;
  };
  weekly_reflections: {
    id: string;
    member_id: string;
    week_start: string;
    what_worked: string | null;
    what_didnt: string | null;
    next_week_focus: string | null;
    energy_level: number | null;
    motivation_level: number | null;
    created_at: string;
    updated_at: string;
  };
};
