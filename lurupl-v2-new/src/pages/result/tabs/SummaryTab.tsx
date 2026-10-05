/**
 * SummaryTab Component
 * 요약 탭 - 전체 통계, TOP 3, 주별 활동
 */

import { useState, useEffect } from 'react';
import { Clock, Zap, TrendingUp, Users, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CategoryPieChart } from '@/components/result';
import { calculateLevel, getLevelTitle } from '@/domain/levels';
import { SummaryCard, TopRankerCard, WeeklyActivityChart } from '../components';

type TabId = 'summary' | 'ranking' | 'guide' | 'motivation';

interface MemberStat {
  id: string;
  display_name: string;
  monthly_exp: number;
  cert_count: number;
  selected_tree_skin?: string;
  total_count?: number;
}

interface SummaryTabProps {
  yearMonth: string;
  totalCerts: number;
  totalExp: number;
  activeMembers: number;
  totalMembers: number;
  monthlyStats: MemberStat[];
  onMemberClick: (id: string) => void;
  onTabChange: (tab: TabId) => void;
}

export function SummaryTab({
  yearMonth,
  totalCerts,
  totalExp,
  activeMembers,
  totalMembers,
  monthlyStats,
  onMemberClick,
  onTabChange,
}: SummaryTabProps) {
  const [weeklyData, setWeeklyData] = useState<{ total: number; range: string } | null>(null);
  const [hourlyData, setHourlyData] = useState<number[]>([]);

  useEffect(() => {
    fetchWeeklyData();
    fetchHourlyData();
  }, [yearMonth]);

  // 현재 주 계산
  function getCurrentWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      label: `${monday.getMonth() + 1}.${monday.getDate()} - ${sunday.getMonth() + 1}.${sunday.getDate()}`
    };
  }

  async function fetchWeeklyData() {
    try {
      const { start, end } = getCurrentWeekRange();
      const today = new Date().toISOString().split('T')[0];
      const actualEnd = end > today ? today : end;

      const { data: certs } = await supabase
        .from('certifications')
        .select('member_id, final_exp')
        .gte('cert_date', start)
        .lte('cert_date', actualEnd)
        .gt('final_exp', 0);

      const weekTotal = certs?.length || 0;
      setWeeklyData({ total: weekTotal, range: getCurrentWeekRange().label });
    } catch (error) {
      console.error('Failed to fetch weekly data:', error);
    }
  }

  async function fetchHourlyData() {
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      const { data: certs } = await supabase
        .from('certifications')
        .select('cert_time')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      const hourCounts = new Array(24).fill(0);
      certs?.forEach(cert => {
        if (cert.cert_time) {
          const hour = parseInt(cert.cert_time.split(':')[0], 10);
          if (hour >= 0 && hour < 24) {
            hourCounts[hour]++;
          }
        }
      });

      setHourlyData(hourCounts);
    } catch (error) {
      console.error('Failed to fetch hourly data:', error);
    }
  }

  const maxHourly = Math.max(...hourlyData, 1);
  const hourlyTotal = hourlyData.reduce((a, b) => a + b, 0);

  // 시간대별 합계
  const morningCount = hourlyData.slice(6, 12).reduce((a, b) => a + b, 0);
  const afternoonCount = hourlyData.slice(12, 18).reduce((a, b) => a + b, 0);
  const eveningCount = hourlyData.slice(18, 24).reduce((a, b) => a + b, 0);
  const nightCount = hourlyData.slice(0, 6).reduce((a, b) => a + b, 0);

  // Top 3 members
  const top3 = monthlyStats.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Top 1 Level Card */}
      {top3.length > 0 && <TopRankerCard member={top3[0]} onMemberClick={onMemberClick} />}

      {/* 2. Row: TOP 3 + Weekly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 3 Preview */}
        <div className="lg:col-span-4">
          <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 sm:p-[28px] h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-text">이번 달 TOP 3</h3>
              <button
                onClick={() => onTabChange('ranking')}
                className="text-sm text-primary hover:underline"
              >
                전체 순위 →
              </button>
            </div>
            <p className="text-sm text-text-muted mb-4">이번 달 가장 열심히 인증한 멤버들입니다</p>

            <div className="space-y-3">
              {top3.map((member, idx) => {
                const level = calculateLevel(member.monthly_exp);
                const levelTitle = getLevelTitle(level);
                const rankColors = ['text-gold', 'text-silver', 'text-bronze'];

                return (
                  <div
                    key={member.id}
                    onClick={() => onMemberClick(member.id)}
                    className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    <span className={`text-xl sm:text-2xl font-bold ${rankColors[idx]} w-6 sm:w-8`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text truncate">{member.display_name}</p>
                      <p className="text-sm text-text-muted">Lv.{level} {levelTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{member.monthly_exp}</p>
                      <p className="text-xs text-text-muted">EXP</p>
                    </div>
                  </div>
                );
              })}

              {top3.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  아직 인증 데이터가 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <div className="lg:col-span-8">
          <WeeklyActivityChart yearMonth={yearMonth} />
        </div>
      </div>

      {/* 3. Row: Category Pie + Time Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Pie Chart */}
        <div className="lg:col-span-4 bg-bg-card rounded-xl border border-border shadow-sm p-5 sm:p-[28px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">카테고리별 활동</h3>
            <span className="text-sm text-text-muted">{totalCerts}건</span>
          </div>
          <p className="text-sm text-text-muted mb-5">어떤 영역에서 가장 활발하게 인증하고 있는지 확인하세요</p>
          <CategoryPieChart yearMonth={yearMonth} />
        </div>

        {/* Time Distribution */}
        <div className="lg:col-span-8 bg-bg-card rounded-xl border border-border shadow-sm p-5 sm:p-[28px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-text">시간대별 활동</h3>
            </div>
            <span className="text-sm text-text-muted">총 {hourlyTotal}회</span>
          </div>
          <p className="text-sm text-text-muted mb-6">하루 중 언제 가장 활발하게 인증하는지 확인하세요</p>

          {hourlyTotal > 0 ? (
            <>
              {/* Chart */}
              <div className="h-40 mb-4 flex items-end gap-[2px]">
                {hourlyData.map((count, hour) => {
                  const heightPercent = (count / maxHourly) * 100;
                  const barHeight = count > 0 ? Math.max(heightPercent, 8) : 3;
                  return (
                    <div
                      key={hour}
                      className="flex-1 group relative flex flex-col justify-end h-full"
                    >
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:bg-primary-dark"
                        style={{ height: `${barHeight}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-text text-bg-card text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {hour}시: {count}회
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis */}
              <div className="flex justify-between text-xs text-text-muted border-t border-border pt-2">
                <span>0시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>

              {/* Summary */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-border text-sm">
                <span className="text-text-muted">새벽(0-6시): <span className="text-text font-medium">{nightCount}회</span></span>
                <span className="text-text-muted">오전(6-12시): <span className="text-text font-medium">{morningCount}회</span></span>
                <span className="text-text-muted">오후(12-18시): <span className="text-text font-medium">{afternoonCount}회</span></span>
                <span className="text-text-muted">저녁(18-24시): <span className="text-text font-medium">{eveningCount}회</span></span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-text-muted">
              이번 달 시간 데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 4. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          label={`${yearMonth.split('-')[1]}월 총 인증`}
          value={totalCerts}
          unit="회"
          sub={`${totalExp.toLocaleString()} EXP 획득`}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          label={`이번 주 인증 (${weeklyData?.range || ''})`}
          value={weeklyData?.total ?? '-'}
          unit="회"
          sub="월~일 기준"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          label="이번 달 참여자"
          value={activeMembers}
          unit="명"
          sub={`전체 ${totalMembers}명 중`}
        />
        <SummaryCard
          icon={<Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
          label="이번 달 총 EXP"
          value={totalExp.toLocaleString()}
          unit=""
          sub="전체 획득 경험치"
        />
      </div>
    </div>
  );
}

export default SummaryTab;
