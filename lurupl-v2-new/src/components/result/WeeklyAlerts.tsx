import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, TrendingUp } from 'lucide-react';

interface MemberWeekly {
  member_id: string;
  display_name: string;
  weekly_count: number;
}

interface WeeklyAlertsProps {
  onMemberClick?: (memberId: string) => void;
}

export function WeeklyAlerts({ onMemberClick }: WeeklyAlertsProps) {
  const [members, setMembers] = useState<MemberWeekly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      label: `${formatDate(monday)} - ${formatDate(sunday)}`
    };
  }

  async function fetchWeeklyData() {
    setLoading(true);
    try {
      const { start, end } = getWeekRange();

      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, display_name')
        .eq('is_active', true);

      if (membersError) throw membersError;

      const { data: certs, error: certsError } = await supabase
        .from('certifications')
        .select('member_id')
        .gte('cert_date', start)
        .lte('cert_date', end)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      const countMap: Record<string, number> = {};
      certs?.forEach(cert => {
        countMap[cert.member_id] = (countMap[cert.member_id] || 0) + 1;
      });

      const memberList: MemberWeekly[] = (membersData || []).map(member => ({
        member_id: member.id,
        display_name: member.display_name,
        weekly_count: countMap[member.id] || 0,
      }));

      memberList.sort((a, b) => b.weekly_count - a.weekly_count);
      setMembers(memberList);
    } catch (error) {
      console.error('Failed to fetch weekly data:', error);
    } finally {
      setLoading(false);
    }
  }

  const weekRange = getWeekRange();
  const maxCount = Math.max(...members.map(m => m.weekly_count), 1);
  const totalCount = members.reduce((sum, m) => sum + m.weekly_count, 0);

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-[28px]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-border rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-border/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">이번 주 인증</h2>
          </div>
          <p className="text-xs text-text-muted mt-1 mb-2">주 3회 이상 인증해야 합니다</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Calendar className="w-3 h-3" />
            <span>{weekRange.label}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">{totalCount}</p>
          <p className="text-xs text-text-muted">총 인증</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-2">
        {members.map((member, index) => {
          const percentage = maxCount > 0 ? (member.weekly_count / maxCount) * 100 : 0;

          return (
            <div
              key={member.member_id}
              onClick={() => onMemberClick?.(member.member_id)}
              className="group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className="w-5 flex-shrink-0">
                  <span className="text-xs text-text-muted">{index + 1}</span>
                </div>

                {/* Name */}
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm text-text truncate block group-hover:text-primary transition-colors">
                    {member.display_name}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 h-6 bg-border/30 rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded transition-all duration-300 flex items-center justify-end px-2"
                    style={{ width: `${Math.max(percentage, 10)}%` }}
                  >
                    <span className="text-xs font-medium text-white/90">
                      {member.weekly_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          활성 멤버가 없습니다
        </div>
      )}
    </div>
  );
}
