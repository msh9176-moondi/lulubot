/**
 * 동기부여 통계 API
 */

import { supabase } from '../supabase';
import type { CategoryKey } from '@/domain/categories';

interface MotivationStats {
  totalAttempts: number;
  confirmedAttempts: number;
  confirmRate: number;
  streakDays: number;
  favoriteCategory: CategoryKey | null;
}

/**
 * 동기부여 관련 통계 조회
 */
export async function getMotivationStats(memberId: string): Promise<MotivationStats> {
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

  // 연속 일수 계산
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
