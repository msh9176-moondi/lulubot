/**
 * 도전 (Challenges) API
 * 템플릿 및 유저 도전 관리
 */

import { supabase } from '../supabase';
import type { ChallengeTemplate, UserChallenge } from '@/domain/motivation';
import type { CategoryKey } from '@/domain/categories';

// =====================================================
// 도전 템플릿 (Challenge Templates)
// =====================================================

/**
 * 도전 템플릿 목록 조회
 */
export async function getChallengeTemplates(
  categoryKey?: CategoryKey
): Promise<ChallengeTemplate[]> {
  let query = supabase
    .from('challenge_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (categoryKey) {
    query = query.eq('category_key', categoryKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch challenge templates:', error);
    return [];
  }

  return data || [];
}

/**
 * 단일 도전 템플릿 조회
 */
export async function getChallengeTemplate(id: string): Promise<ChallengeTemplate | null> {
  const { data, error } = await supabase
    .from('challenge_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch challenge template:', error);
    return null;
  }

  return data;
}

// =====================================================
// 유저 도전 (User Challenges)
// =====================================================

/**
 * 멤버의 도전 목록 조회
 */
export async function getUserChallenges(memberId: string): Promise<UserChallenge[]> {
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      template:challenge_templates(*)
    `)
    .eq('member_id', memberId)
    .order('last_started_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Failed to fetch user challenges:', error);
    return [];
  }

  return data || [];
}

/**
 * 멤버의 즐겨찾기 도전 목록 조회
 */
export async function getFavoriteChallenges(memberId: string): Promise<UserChallenge[]> {
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      template:challenge_templates(*)
    `)
    .eq('member_id', memberId)
    .eq('is_favorite', true)
    .order('times_completed', { ascending: false });

  if (error) {
    console.error('Failed to fetch favorite challenges:', error);
    return [];
  }

  return data || [];
}

/**
 * 즐겨찾기 토글
 */
export async function toggleFavoriteChallenge(
  memberId: string,
  templateId: string,
  isFavorite: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('user_challenges')
    .upsert(
      {
        member_id: memberId,
        template_id: templateId,
        is_favorite: isFavorite,
      },
      { onConflict: 'member_id,template_id' }
    );

  if (error) {
    console.error('Failed to toggle favorite:', error);
    return false;
  }

  return true;
}
