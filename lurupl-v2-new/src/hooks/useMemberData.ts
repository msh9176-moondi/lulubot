/**
 * useMemberData Hook
 * 멤버 데이터 로딩을 위한 커스텀 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CategoryKey } from '@/domain/categories';

interface MemberInfo {
  id: string;
  display_name: string;
  selected_tree_skin: string;
  accumulated_exp: number;
}

interface MemberStats {
  totalCertifications: number;
  totalExp: number;
  categoryBreakdown: Record<CategoryKey, number>;
  currentStreak: number;
  longestStreak: number;
}

interface Certification {
  id: string;
  cert_date: string;
  cert_time: string;
  category_key: CategoryKey;
  final_exp: number;
}

interface UseMemberDataReturn {
  member: MemberInfo | null;
  stats: MemberStats | null;
  certifications: Certification[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMemberData(memberId: string | null): UseMemberDataReturn {
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!memberId) {
      setMember(null);
      setStats(null);
      setCertifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 멤버 정보 조회
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, display_name, selected_tree_skin, accumulated_exp')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // 인증 기록 조회
      const { data: certData, error: certError } = await supabase
        .from('certifications')
        .select('id, cert_date, cert_time, category_key, final_exp')
        .eq('member_id', memberId)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false })
        .limit(100);

      if (certError) throw certError;
      setCertifications(certData || []);

      // 통계 계산
      if (certData) {
        const categoryBreakdown: Record<string, number> = {};
        let totalExp = 0;

        certData.forEach((cert) => {
          categoryBreakdown[cert.category_key] = (categoryBreakdown[cert.category_key] || 0) + 1;
          totalExp += cert.final_exp;
        });

        // 스트릭 계산 (간단한 버전)
        const sortedDates = [...new Set(certData.map((c) => c.cert_date))].sort().reverse();
        let currentStreak = 0;
        let longestStreak = 0;
        let streak = 0;
        let prevDate: Date | null = null;

        for (const dateStr of sortedDates) {
          const date = new Date(dateStr);
          if (!prevDate) {
            streak = 1;
          } else {
            const diff = (prevDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
              streak++;
            } else {
              longestStreak = Math.max(longestStreak, streak);
              streak = 1;
            }
          }
          prevDate = date;
        }
        longestStreak = Math.max(longestStreak, streak);
        currentStreak = streak;

        setStats({
          totalCertifications: certData.length,
          totalExp,
          categoryBreakdown: categoryBreakdown as Record<CategoryKey, number>,
          currentStreak,
          longestStreak,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    member,
    stats,
    certifications,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useMemberData;
