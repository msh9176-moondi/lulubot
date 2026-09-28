import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface MonthlyAward {
  yearMonth: string;
  mvp: { name: string; exp: number } | null;
  growth: { name: string; improvement: number } | null;
  challenge: { name: string; count: number } | null;
}

export function MonthlyAwardsHistory() {
  const [awards, setAwards] = useState<MonthlyAward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAwardsHistory();
  }, []);

  async function fetchAwardsHistory() {
    setLoading(true);
    try {
      // Get last 6 months
      const months: string[] = [];
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const awardsData: MonthlyAward[] = [];

      for (const ym of months) {
        const [year, month] = ym.split('-').map(Number);
        const startDate = `${ym}-01`;
        const endDate = `${ym}-${new Date(year, month, 0).getDate()}`;

        // Also get previous month for growth calculation
        const prevMonth = new Date(year, month - 2, 1);
        const prevYm = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
        const prevStartDate = `${prevYm}-01`;
        const prevEndDate = `${prevYm}-${new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()}`;

        // Fetch current month stats
        const { data: certs } = await supabase
          .from('certifications')
          .select('member_id, final_exp, members!inner(display_name)')
          .gte('cert_date', startDate)
          .lte('cert_date', endDate)
          .gt('final_exp', 0);

        // Fetch previous month stats
        const { data: prevCerts } = await supabase
          .from('certifications')
          .select('member_id, final_exp')
          .gte('cert_date', prevStartDate)
          .lte('cert_date', prevEndDate)
          .gt('final_exp', 0);

        // Calculate stats
        const memberStats: Record<string, { name: string; exp: number; count: number }> = {};
        const prevMemberExp: Record<string, number> = {};

        prevCerts?.forEach((cert: any) => {
          prevMemberExp[cert.member_id] = (prevMemberExp[cert.member_id] || 0) + (cert.final_exp || 0);
        });

        certs?.forEach((cert: any) => {
          const id = cert.member_id;
          if (!memberStats[id]) {
            memberStats[id] = { name: cert.members.display_name, exp: 0, count: 0 };
          }
          memberStats[id].exp += cert.final_exp || 0;
          memberStats[id].count += 1;
        });

        const members = Object.entries(memberStats);

        // MVP: highest EXP
        const mvpMember = members.length > 0
          ? members.sort((a, b) => b[1].exp - a[1].exp)[0]
          : null;

        // Growth: biggest improvement from previous month
        let growthMember: { name: string; improvement: number } | null = null;
        let maxImprovement = 0;
        members.forEach(([id, stats]) => {
          const prevExp = prevMemberExp[id] || 0;
          const improvement = stats.exp - prevExp;
          if (improvement > maxImprovement) {
            maxImprovement = improvement;
            growthMember = { name: stats.name, improvement };
          }
        });

        // Challenge: most certifications
        const challengeMember = members.length > 0
          ? members.sort((a, b) => b[1].count - a[1].count)[0]
          : null;

        awardsData.push({
          yearMonth: ym,
          mvp: mvpMember ? { name: mvpMember[1].name, exp: mvpMember[1].exp } : null,
          growth: growthMember,
          challenge: challengeMember ? { name: challengeMember[1].name, count: challengeMember[1].count } : null,
        });
      }

      setAwards(awardsData);
    } catch (error) {
      console.error('Failed to fetch awards history:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatMonth(ym: string) {
    const [year, month] = ym.split('-').map(Number);
    return `${year}.${month}월`;
  }

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-[28px]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-border rounded w-1/4"></div>
          <div className="h-32 bg-border/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <h3 className="text-lg font-semibold text-text mb-2">월간 수상 히스토리</h3>
      <p className="text-sm text-text-muted mb-5">매월 가장 뛰어난 활동을 보인 멤버들입니다</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-text-muted font-medium">월</th>
              <th className="text-left py-3 px-2 text-text-muted font-medium">
                <span className="inline-flex items-center gap-1">🌟 MVP</span>
              </th>
              <th className="text-left py-3 px-2 text-text-muted font-medium">
                <span className="inline-flex items-center gap-1">🌱 성장</span>
              </th>
              <th className="text-left py-3 px-2 text-text-muted font-medium">
                <span className="inline-flex items-center gap-1">💪 도전</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {awards.map((award, idx) => (
              <tr key={award.yearMonth} className={idx % 2 === 0 ? 'bg-bg/50' : ''}>
                <td className="py-3 px-2 font-medium text-text">{formatMonth(award.yearMonth)}</td>
                <td className="py-3 px-2">
                  {award.mvp ? (
                    <div>
                      <span className="text-text">{award.mvp.name}</span>
                      <span className="text-text-muted text-xs ml-1">({award.mvp.exp} EXP)</span>
                    </div>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  {award.growth && award.growth.improvement > 0 ? (
                    <div>
                      <span className="text-text">{award.growth.name}</span>
                      <span className="text-success text-xs ml-1">(+{award.growth.improvement})</span>
                    </div>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  {award.challenge ? (
                    <div>
                      <span className="text-text">{award.challenge.name}</span>
                      <span className="text-text-muted text-xs ml-1">({award.challenge.count}회)</span>
                    </div>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {awards.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          수상 히스토리가 없습니다
        </div>
      )}
    </div>
  );
}
