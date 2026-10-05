// =====================================================
// 동기부여 MVP 기능 - API 서비스
// =====================================================

import { supabase } from './supabase';
import type {
  PersonalReason,
  ChallengeTemplate,
  UserChallenge,
  StartAttempt,
  WeeklyReflection,
} from '@/domain/motivation';
import type { CategoryKey } from '@/domain/categories';

// =====================================================
// PIN 인증
// =====================================================

export async function setMemberPin(memberId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_member_pin', {
    p_member_id: memberId,
    p_pin: pin,
  });

  if (error) {
    console.error('Failed to set PIN:', error);
    return false;
  }

  return data === true;
}

export async function verifyMemberPin(memberId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_member_pin', {
    p_member_id: memberId,
    p_pin: pin,
  });

  if (error) {
    console.error('Failed to verify PIN:', error);
    return false;
  }

  return data === true;
}

export async function hasMemberPin(memberId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('members')
    .select('pin')
    .eq('id', memberId)
    .single();

  if (error || !data) return false;
  return data.pin !== null;
}

// =====================================================
// 나의 이유 (Personal Reasons)
// =====================================================

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

export async function deletePersonalReason(id: string): Promise<boolean> {
  return updatePersonalReason(id, { is_active: false });
}

// =====================================================
// 도전 템플릿 (Challenge Templates)
// =====================================================

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

// =====================================================
// 시작 시도 (Start Attempts)
// =====================================================

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

// =====================================================
// 주간 회고 (Weekly Reflections)
// =====================================================

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

// =====================================================
// 통계
// =====================================================

export async function getMotivationStats(memberId: string): Promise<{
  totalAttempts: number;
  confirmedAttempts: number;
  confirmRate: number;
  streakDays: number;
  favoriteCategory: CategoryKey | null;
}> {
  const { data: attempts, error } = await supabase
    .from('start_attempts')
    .select('status, category_key, started_at')
    .eq('member_id', memberId);

  if (error || !attempts) {
    return {
      totalAttempts: 0,
      confirmedAttempts: 0,
      confirmRate: 0,
      streakDays: 0,
      favoriteCategory: null,
    };
  }

  const totalAttempts = attempts.length;
  const confirmedAttempts = attempts.filter((a) => a.status === 'confirmed').length;
  const confirmRate = totalAttempts > 0 ? Math.round((confirmedAttempts / totalAttempts) * 100) : 0;

  // 카테고리별 카운트
  const categoryCounts: Record<string, number> = {};
  attempts.forEach((a) => {
    categoryCounts[a.category_key] = (categoryCounts[a.category_key] || 0) + 1;
  });

  const favoriteCategory =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as CategoryKey | undefined;

  // 연속 일수 계산 (간단한 버전)
  const dates = [...new Set(attempts.map((a) => a.started_at.split('T')[0]))].sort().reverse();
  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];

    if (dates[i] === expectedStr) {
      streakDays++;
    } else {
      break;
    }
  }

  return {
    totalAttempts,
    confirmedAttempts,
    confirmRate,
    streakDays,
    favoriteCategory: favoriteCategory || null,
  };
}

// =====================================================
// 나무 스킨 (Tree Skins)
// =====================================================

/**
 * 멤버의 현재 선택된 스킨 조회
 */
export async function getMemberTreeSkin(memberId: string): Promise<string> {
  const { data, error } = await supabase
    .from('members')
    .select('selected_tree_skin')
    .eq('id', memberId)
    .single();

  if (error) {
    console.error('Failed to get tree skin:', error);
    return 'default';
  }

  return data?.selected_tree_skin || 'default';
}

/**
 * 멤버의 스킨 변경
 */
export async function updateMemberTreeSkin(
  memberId: string,
  skinId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_member_tree_skin', {
    p_member_id: memberId,
    p_skin_id: skinId,
  });

  if (error) {
    console.error('Failed to update tree skin:', error);
    return false;
  }

  return data === true;
}
