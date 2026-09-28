// =====================================================
// 동기부여 MVP 기능 - 타입 정의
// =====================================================

import type { CategoryKey } from './categories';

// 나의 이유
export interface PersonalReason {
  id: string;
  member_id: string;
  category_key: CategoryKey | null;
  reason_text: string;
  importance: number; // 1~5
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 도전 템플릿
export interface ChallengeTemplate {
  id: string;
  category_key: CategoryKey;
  title: string;
  description: string | null;
  difficulty: number; // 1: 쉬움, 2: 보통, 3: 어려움
  duration_minutes: number;
  tips: string[] | null;
  is_active: boolean;
  sort_order: number;
}

// 유저 도전 선택
export interface UserChallenge {
  id: string;
  member_id: string;
  template_id: string;
  is_favorite: boolean;
  times_completed: number;
  times_started: number;
  last_started_at: string | null;
  last_completed_at: string | null;
  created_at: string;
  // Joined
  template?: ChallengeTemplate;
}

// 시작 시도 상태
export type StartAttemptStatus = 'started' | 'pending' | 'confirmed' | 'expired';

// 시작 시도
export interface StartAttempt {
  id: string;
  member_id: string;
  template_id: string | null;
  category_key: CategoryKey;
  started_at: string;
  status: StartAttemptStatus;
  certification_id: string | null;
  confirmed_at: string | null;
  expired_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  template?: ChallengeTemplate;
}

// 주간 회고
export interface WeeklyReflection {
  id: string;
  member_id: string;
  week_start: string; // YYYY-MM-DD (월요일)
  what_worked: string | null;
  what_didnt: string | null;
  next_week_focus: string | null;
  energy_level: number | null; // 1~5
  motivation_level: number | null; // 1~5
  created_at: string;
  updated_at: string;
}

// 난이도 라벨
export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '쉬움',
  2: '보통',
  3: '어려움',
};

// 난이도 색상
export const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#22c55e', // green
  2: '#f59e0b', // amber
  3: '#ef4444', // red
};

// 시작 시도 상태 라벨
export const ATTEMPT_STATUS_LABELS: Record<StartAttemptStatus, string> = {
  started: '진행 중',
  pending: '확인 대기',
  confirmed: '완료됨',
  expired: '만료됨',
};

// 시작 시도 상태 색상
export const ATTEMPT_STATUS_COLORS: Record<StartAttemptStatus, string> = {
  started: '#3b82f6', // blue
  pending: '#f59e0b', // amber
  confirmed: '#22c55e', // green
  expired: '#6b7280', // gray
};

// 이번 주 월요일 구하기
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// 남은 시간 계산 (24시간 기준)
export function getRemainingTime(startedAt: string): {
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const start = new Date(startedAt);
  const now = new Date();
  const diff = 24 * 60 * 60 * 1000 - (now.getTime() - start.getTime());

  if (diff <= 0) {
    return { hours: 0, minutes: 0, expired: true };
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  return { hours, minutes, expired: false };
}

// 중요도 이모지
export function getImportanceEmoji(level: number): string {
  const emojis = ['', '💧', '🌱', '🌿', '🌳', '🌲'];
  return emojis[Math.min(Math.max(level, 1), 5)];
}

// 에너지/동기 레벨 이모지
export function getLevelEmoji(level: number): string {
  const emojis = ['', '😫', '😕', '😐', '🙂', '😄'];
  return emojis[Math.min(Math.max(level, 1), 5)];
}
