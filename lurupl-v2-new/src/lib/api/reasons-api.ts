/**
 * 나의 이유 (Personal Reasons) API
 */

import { supabase } from '../supabase';
import type { PersonalReason } from '@/domain/motivation';
import type { CategoryKey } from '@/domain/categories';

/**
 * 멤버의 개인 이유 목록 조회
 */
export async function getPersonalReasons(memberId: string): Promise<PersonalReason[]> {
  const { data, error } = await supabase
    .from('personal_reasons')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .order('importance', { ascending: false });

  if (error) {
    console.error('Failed to fetch personal reasons:', error);
    return [];
  }

  return data || [];
}

/**
 * 개인 이유 생성
 */
export async function createPersonalReason(
  memberId: string,
  reasonText: string,
  categoryKey: CategoryKey | null = null,
  importance: number = 3
): Promise<PersonalReason | null> {
  const { data, error } = await supabase
    .from('personal_reasons')
    .insert({
      member_id: memberId,
      category_key: categoryKey,
      reason_text: reasonText,
      importance,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create personal reason:', error);
    return null;
  }

  return data;
}

/**
 * 개인 이유 수정
 */
export async function updatePersonalReason(
  id: string,
  updates: Partial<Pick<PersonalReason, 'reason_text' | 'importance' | 'is_active'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('personal_reasons')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to update personal reason:', error);
    return false;
  }

  return true;
}

/**
 * 개인 이유 삭제 (soft delete)
 */
export async function deletePersonalReason(id: string): Promise<boolean> {
  return updatePersonalReason(id, { is_active: false });
}
