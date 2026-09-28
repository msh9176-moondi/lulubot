import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WeekRanking {
  name: string;
  exp: number;
  rank: number;
  prevRank?: number;
  rankChange?: number;
}

interface WeekData {
  weekNum: number;
  dateRange: string;
  isCurrentWeek: boolean;
  rankings: WeekRanking[];
}

interface WeeklyRankingsProps {
  yearMonth: string;
}

export function WeeklyRankings({ yearMonth }: WeeklyRankingsProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyRankings();
  }, [yearMonth]);

  function getWeeksInMonth(yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const weeks: { start: Date; end: Date; weekNum: number }[] = [];
    let current = new Date(firstDay);
    let weekNum = 1;

    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 1) {
      const mondayOffset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      current.setDate(current.getDate() + mondayOffset);
    }

    if (current.getDate() > 1) {
      weeks.push({
        start: new Date(firstDay),
        end: new Date(current.getTime() - 86400000),
        weekNum: weekNum++
      });
    }

    while (current <= lastDay) {
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + 6);

      weeks.push({
        start: new Date(current),
        end: weekEnd > lastDay ? new Date(lastDay) : weekEnd,
        weekNum: weekNum++
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  async function fetchWeeklyRankings() {
    setLoading(true);
    try {
      const monthWeeks = getWeeksInMonth(yearMonth);
      const now = new Date();
      const weekDataArray: WeekData[] = [];

      for (const week of monthWeeks) {
        const startStr = week.start.toISOString().split('T')[0];
        const endStr = week.end.toISOString().split('T')[0];

        const { data: certs, error } = await supabase
          .from('certifications')
          .select('member_id, final_exp, members!inner(display_name)')
          .gte('cert_date', startStr)
          .lte('cert_date', endStr)
          .gt('final_exp', 0);

        if (error) throw error;

        const expMap: Record<string, { name: string; exp: number }> = {};
        certs?.forEach((cert: any) => {
          const id = cert.member_id;
          if (!expMap[id]) {
            expMap[id] = { name: cert.members.display_name, exp: 0 };
          }
          expMap[id].exp += cert.final_exp || 0;
        });

        const rankings: WeekRanking[] = Object.values(expMap)
          .sort((a, b) => b.exp - a.exp)
          .map((m, idx) => ({
            name: m.name,
            exp: m.exp,
            rank: idx + 1
          }));

        const prevWeekIndex = weekDataArray.length - 1;
        if (prevWeekIndex >= 0) {
          const prevRankings = weekDataArray[prevWeekIndex].rankings;
          const prevRankMap: Record<string, number> = {};
          prevRankings.forEach(r => {
            prevRankMap[r.name] = r.rank;
          });

          rankings.forEach(r => {
            if (prevRankMap[r.name] !== undefined) {
              r.prevRank = prevRankMap[r.name];
              r.rankChange = r.prevRank - r.rank;
            }
          });
        }

        const isCurrentWeek = now >= week.start && now <= week.end;

        weekDataArray.push({
          weekNum: week.weekNum,
          dateRange: `${week.start.getMonth() + 1}/${week.start.getDate()} - ${week.end.getMonth() + 1}/${week.end.getDate()}`,
          isCurrentWeek,
          rankings: rankings.slice(0, 3)
        });
      }

      setWeeks(weekDataArray);
    } catch (error) {
      console.error('Failed to fetch weekly rankings:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-[28px]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-border rounded w-1/4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-border/50 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <div className="flex items-center gap-2 mb-5">
        <Calendar className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-text">주간 정산</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {weeks.map(week => (
          <div
            key={week.weekNum}
            className={`p-5 rounded-lg border ${
              week.isCurrentWeek
                ? 'bg-primary/5 border-primary/20'
                : 'bg-bg border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">{week.weekNum}주</span>
              {week.isCurrentWeek && (
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  진행중
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted mb-2">{week.dateRange}</div>

            <div className="space-y-1.5">
              {week.rankings.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">
                  데이터 없음
                </p>
              ) : (
                week.rankings.map((r, idx) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-bold w-4 ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        'text-amber-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs text-text truncate">
                        {r.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-primary font-medium">
                        {r.exp}
                      </span>
                      {r.rankChange !== undefined && r.rankChange !== 0 && (
                        r.rankChange > 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-error" />
                        )
                      )}
                      {r.rankChange === 0 && (
                        <Minus className="w-3 h-3 text-text-muted" />
                      )}
                      {r.prevRank === undefined && week.weekNum > 1 && (
                        <span className="text-[10px] text-primary font-medium">N</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {weeks.length === 0 && (
        <div className="text-center py-8 text-text-muted text-sm">
          주간 데이터가 없습니다
        </div>
      )}
    </div>
  );
}
