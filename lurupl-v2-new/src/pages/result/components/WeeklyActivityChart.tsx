/**
 * WeeklyActivityChart Component
 * 주별 활동 차트
 */

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WeekData {
  weekNum: number;
  dateRange: string;
  isCurrentWeek?: boolean;
  isFuture: boolean;
  totalExp: number;
  rankings: { rank: number; name: string; exp: number }[];
}

interface WeeklyActivityChartProps {
  yearMonth: string;
}

export function WeeklyActivityChart({ yearMonth }: WeeklyActivityChartProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyRankings();
  }, [yearMonth]);

  function getWeeksInMonth(yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: { start: Date; end: Date; weekNum: number; isFuture: boolean; isPast: boolean }[] = [];
    let current = new Date(firstDay);
    let weekNum = 1;

    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 1) {
      const mondayOffset = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      current.setDate(current.getDate() + mondayOffset);
    }

    if (current.getDate() > 1) {
      const weekEnd = new Date(current.getTime() - 86400000);
      weeks.push({
        start: new Date(firstDay),
        end: weekEnd,
        weekNum: weekNum++,
        isFuture: firstDay > today,
        isPast: weekEnd < today
      });
    }

    while (current <= lastDay) {
      const weekEnd = new Date(current);
      weekEnd.setDate(current.getDate() + 6);
      const actualEnd = weekEnd > lastDay ? new Date(lastDay) : weekEnd;

      weeks.push({
        start: new Date(current),
        end: actualEnd,
        weekNum: weekNum++,
        isFuture: current > today,
        isPast: actualEnd < today
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  async function fetchWeeklyRankings() {
    setLoading(true);
    try {
      const monthWeeks = getWeeksInMonth(yearMonth);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const todayStr = today.toISOString().split('T')[0];
      const weekDataArray: WeekData[] = [];

      for (const week of monthWeeks) {
        const startStr = week.start.toISOString().split('T')[0];
        const endStr = week.end.toISOString().split('T')[0];
        const actualEndStr = endStr > todayStr ? todayStr : endStr;

        if (startStr > todayStr) {
          weekDataArray.push({
            weekNum: week.weekNum,
            dateRange: `${week.start.getMonth() + 1}/${week.start.getDate()} - ${week.end.getMonth() + 1}/${week.end.getDate()}`,
            isFuture: true,
            totalExp: 0,
            rankings: []
          });
          continue;
        }

        const { data: certs, error } = await supabase
          .from('certifications')
          .select('member_id, final_exp, members!inner(display_name)')
          .gte('cert_date', startStr)
          .lte('cert_date', actualEndStr)
          .gt('final_exp', 0);

        if (error) throw error;

        const expMap: Record<string, { name: string; exp: number }> = {};
        certs?.forEach((cert: { member_id: string; final_exp: number; members: { display_name: string } }) => {
          const id = cert.member_id;
          if (!expMap[id]) {
            expMap[id] = { name: cert.members.display_name, exp: 0 };
          }
          expMap[id].exp += cert.final_exp || 0;
        });

        const totalExp = Object.values(expMap).reduce((sum, m) => sum + m.exp, 0);
        const rankings = Object.values(expMap)
          .sort((a, b) => b.exp - a.exp)
          .slice(0, 3)
          .map((m, idx) => ({ rank: idx + 1, name: m.name, exp: m.exp }));

        const isCurrentWeek = today >= week.start && today <= week.end;

        weekDataArray.push({
          weekNum: week.weekNum,
          dateRange: `${week.start.getMonth() + 1}/${week.start.getDate()} - ${week.end.getMonth() + 1}/${week.end.getDate()}`,
          isCurrentWeek,
          isFuture: false,
          totalExp,
          rankings
        });
      }

      setWeeks(weekDataArray);
    } catch (error) {
      console.error('Failed to fetch weekly rankings:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxWeekExp = Math.max(...weeks.filter(w => !w.isFuture).map(w => w.totalExp), 1);

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border shadow-sm p-[28px]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-border rounded w-1/4"></div>
          <div className="h-40 bg-border/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-[28px]">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-text">주별 활동 흐름</h3>
      </div>
      <p className="text-sm text-text-muted mb-6">매주 얼마나 성장하고 있는지 확인하세요</p>

      {/* Bar Chart */}
      <div className="space-y-4">
        {weeks.map(week => {
          const barWidth = week.isFuture ? 0 : (week.totalExp / maxWeekExp) * 100;

          return (
            <div key={week.weekNum} className="group">
              <div className="flex items-center gap-4">
                {/* Week label */}
                <div className="w-24 flex-shrink-0">
                  <span className={`text-sm font-medium ${week.isCurrentWeek ? 'text-primary' : 'text-text'}`}>
                    {week.weekNum}주차
                  </span>
                  <p className="text-xs text-text-muted">{week.dateRange}</p>
                </div>

                {/* Bar */}
                <div className="flex-1">
                  {week.isFuture ? (
                    <div className="h-8 bg-border/30 rounded flex items-center justify-center">
                      <span className="text-xs text-text-muted">예정</span>
                    </div>
                  ) : week.totalExp === 0 ? (
                    <div className="h-8 bg-border/30 rounded flex items-center justify-center">
                      <span className="text-xs text-text-muted">데이터 없음</span>
                    </div>
                  ) : (
                    <div className="relative h-8 bg-border/30 rounded overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded transition-all ${
                          week.isCurrentWeek ? 'bg-primary' : 'bg-primary/70'
                        }`}
                        style={{ width: `${Math.max(barWidth, 5)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-sm font-medium text-white drop-shadow">
                          {week.totalExp} EXP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top 3 mini */}
                <div className="hidden md:flex gap-2 w-48 flex-shrink-0">
                  {week.rankings.slice(0, 3).map((r, idx) => (
                    <span key={idx} className="text-xs text-text-muted truncate">
                      {idx + 1}. {r.name}
                    </span>
                  ))}
                  {week.rankings.length === 0 && !week.isFuture && (
                    <span className="text-xs text-text-muted">-</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {weeks.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          주간 데이터가 없습니다
        </div>
      )}
    </div>
  );
}

export default WeeklyActivityChart;
