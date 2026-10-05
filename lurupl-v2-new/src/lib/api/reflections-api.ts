/**
 * 주간 회고 (Weekly Reflections) API
 */

import { supabase } from '../supabase';
import type { WeeklyReflection } from '@/domain/motivation';

/**
 * 특정 주의 회고 조회
 */
export async function getWeeklyReflection(
  memberId: string,
  weekStart: string
): Promise<WeeklyReflection | null> {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('member_id', memberId)
    .eq('week_start', weekStart)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch weekly reflection:', error);
    return null;
  }

  return data;
}

/**
 * 최근 회고 목록 조회
 */
export async function getRecentReflections(
  memberId: string,
  limit: number = 4
): Promise<WeeklyReflection[]> {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('member_id', memberId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch recent reflections:', error);
    return [];
  }

  return data || [];
}

/**
 * 주간 회고 저장
 */
export async function saveWeeklyReflection(
  memberId: string,
  weekStart: string,
  reflection: Partial<
    Pick<
      WeeklyReflection,
      'what_worked' | 'what_didnt' | 'next_week_focus' | 'energy_level' | 'motivation_level'
    >
  >
): Promise<WeeklyReflection | null> {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .upsert(
      {
        member_id: memberId,
        week_start: weekStart,
        ...reflection,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,week_start' }
    )
    .select()
    .single();

  if (error) {
    console.error('Failed to save weekly reflection:', error);
    return null;
  }

  return data;
}
