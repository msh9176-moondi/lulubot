/**
 * 시작 시도 (Start Attempts) API
 */

import { supabase } from '../supabase';
import type { StartAttempt } from '@/domain/motivation';
import type { CategoryKey } from '@/domain/categories';

/**
 * 시작 시도 생성
 */
export async function createStartAttempt(
  memberId: string,
  categoryKey: CategoryKey,
  templateId?: string,
  notes?: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_start_attempt', {
    p_member_id: memberId,
    p_category_key: categoryKey,
    p_template_id: templateId || null,
    p_notes: notes || null,
  });

  if (error) {
    console.error('Failed to create start attempt:', error);
    return null;
  }

  return data;
}

/**
 * 활성 시도 목록 조회
 */
export async function getActiveAttempts(memberId: string): Promise<StartAttempt[]> {
  const { data, error } = await supabase
    .from('start_attempts')
    .select(`
      *,
      template:challenge_templates(*)
    `)
    .eq('member_id', memberId)
    .eq('status', 'started')
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch active attempts:', error);
    return [];
  }

  return data || [];
}

/**
 * 최근 시도 목록 조회
 */
export async function getRecentAttempts(
  memberId: string,
  limit: number = 10
): Promise<StartAttempt[]> {
  const { data, error } = await supabase
    .from('start_attempts')
    .select(`
      *,
      template:challenge_templates(*)
    `)
    .eq('member_id', memberId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch recent attempts:', error);
    return [];
  }

  return data || [];
}

/**
 * 시도 취소
 */
export async function cancelStartAttempt(attemptId: string): Promise<boolean> {
  const { error } = await supabase
    .from('start_attempts')
    .update({ status: 'expired', expired_at: new Date().toISOString() })
    .eq('id', attemptId)
    .eq('status', 'started');

  if (error) {
    console.error('Failed to cancel start attempt:', error);
    return false;
  }

  return true;
}
