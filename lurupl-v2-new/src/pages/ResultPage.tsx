import { useState, useEffect, useCallback } from 'react';
import { useMembersStore } from '@/stores/membersStore';
import {
  Leaderboard,
  ProfileModal,
  AchievementsGuide,
  CertificationGuide,
  CategoryPieChart,
  MonthlyAwardsHistory,
  DetailedRecords,
  MemberProfilePage,
} from '@/components/result';
import { Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getLevelTitle, getExpForNextLevel, EXP_PER_LEVEL } from '@/domain/levels';
import {
  BarChart3,
  Target,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Trophy,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

type TabId = 'summary' | 'guide' | 'challenges' | 'ranking' | 'motivation';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'summary', label: '요약', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'guide', label: '가이드', icon: <Zap className="w-5 h-5" /> },
  { id: 'challenges', label: '도전', icon: <Target className="w-5 h-5" /> },
  { id: 'ranking', label: '랭킹', icon: <Users className="w-5 h-5" /> },
  { id: 'motivation', label: '내 정보', icon: <Sparkles className="w-5 h-5" /> },
];

export function ResultPage() {
  const {
    monthlyStats,
    selectedMonth,
    lastUpdated,
    loading,
    fetchMonthlyStats,
    setSelectedMonth,
  } = useMembersStore();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  useEffect(() => {
    fetchMonthlyStats(selectedMonth);
  }, [selectedMonth, fetchMonthlyStats]);

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#profile=(.+)$/);
    if (match) {
      const memberId = decodeURIComponent(match[1]);
      const member = monthlyStats.find(m => m.id === memberId);
      if (member) {
        setSelectedMemberId(memberId);
      }
    }
  }, [monthlyStats]);

  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const formatMonthDisplay = (ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    return `${year}년 ${month}월`;
  };

  const totalCerts = monthlyStats.reduce((sum, m) => sum + m.cert_count, 0);
  const totalExp = monthlyStats.reduce((sum, m) => sum + m.monthly_exp, 0);
  const activeMembers = monthlyStats.filter(m => m.cert_count > 0).length;

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-3">
            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-[28px] font-bold text-text truncate">루루플 성장 기록</h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5 hidden sm:block">ADHD 실행력 향상을 위한 인증 활동 리포트</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Month Navigator */}
              <div className="flex items-center bg-bg rounded-lg border border-border">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1.5 sm:p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-l-lg transition-colors"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 border-x border-border">
                  <Calendar className="w-3.5 h-3.5 text-text-muted hidden sm:block" />
                  <span className="text-sm sm:text-base font-medium text-text whitespace-nowrap">
                    {formatMonthDisplay(selectedMonth)}
                  </span>
                </div>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1.5 sm:p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-r-lg transition-colors"
                  aria-label="다음 달"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {lastUpdated && (
                <span className="text-xs text-text-muted hidden lg:block">
                  {lastUpdated} 기준
                </span>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-0.5 sm:gap-1 -mb-px overflow-x-auto hide-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedMemberId(null); // Close profile modal when switching tabs
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text hover:border-border'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <SummaryTab
                yearMonth={selectedMonth}
                totalCerts={totalCerts}
                totalExp={totalExp}
                activeMembers={activeMembers}
                totalMembers={monthlyStats.length}
                monthlyStats={monthlyStats}
                onMemberClick={setSelectedMemberId}
                onTabChange={setActiveTab}
              />
            )}

            {/* Guide Tab */}
            {activeTab === 'guide' && (
              <CertificationGuide />
            )}

            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <AchievementsGuide />
            )}

            {/* Ranking Tab */}
            {activeTab === 'ranking' && (
              <div className="space-y-6">
                {/* Leaderboard */}
                <div className="bg-bg-card rounded-xl border border-border shadow-sm">
                  <div className="px-6 py-5 border-b border-border">
                    <h2 className="text-xl font-semibold text-text">이번 달 전체 순위</h2>
                    <p className="text-sm text-text-muted mt-1">클릭하면 상세 활동을 볼 수 있습니다</p>
                  </div>
                  <div className="p-6">
                    <Leaderboard
                      members={monthlyStats}
                      onMemberClick={setSelectedMemberId}
                    />
                  </div>
                </div>

                {/* Monthly Awards History */}
                <MonthlyAwardsHistory />

                {/* Detailed Records */}
                <DetailedRecords yearMonth={selectedMonth} onMemberClick={setSelectedMemberId} />
              </div>
            )}

            {/* Motivation Tab - 개인 페이지 */}
            {activeTab === 'motivation' && (
              <MemberProfilePage />
            )}
          </>
        )}
      </main>

      <ProfileModal
        isOpen={!!selectedMemberId}
        onClose={() => {
          setSelectedMemberId(null);
          window.location.hash = '';
        }}
        memberId={selectedMemberId}
        yearMonth={selectedMonth}
      />

      {/* Footer */}
      <footer className="border-t border-border bg-bg-card mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-6 text-center">
          <p className="text-sm text-text-muted">꾸준히 인증하고 성장하세요</p>
        </div>
      </footer>
    </div>
  );
}

// Summary Tab Component
interface SummaryTabProps {
  yearMonth: string;
  totalCerts: number;
  totalExp: number;
  activeMembers: number;
  totalMembers: number;
  monthlyStats: any[];
  onMemberClick: (id: string) => void;
  onTabChange: (tab: TabId) => void;
}

function SummaryTab({
  yearMonth,
  totalCerts,
  totalExp,
  activeMembers,
  totalMembers,
  monthlyStats,
  onMemberClick,
  onTabChange,
}: SummaryTabProps) {
  const [weeklyData, setWeeklyData] = useState<any>(null);
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

      // 오늘까지만 집계 (미래 날짜 제외)
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

      {/* 2. Row: TOP 3 + Weekly Activity (PC: side by side, Mobile: stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 3 Preview (4 cols on PC) */}
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

        {/* Weekly Activity Chart (8 cols on PC) */}
        <div className="lg:col-span-8">
          <WeeklyActivityChart yearMonth={yearMonth} />
        </div>
      </div>

      {/* 3. Row: Category Pie + Time Distribution (PC: side by side, Mobile: stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 sm:p-[28px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">카테고리별 활동</h3>
            <span className="text-sm text-text-muted">{totalCerts}건</span>
          </div>
          <p className="text-sm text-text-muted mb-5">어떤 영역에서 가장 활발하게 인증하고 있는지 확인하세요</p>
          <CategoryPieChart yearMonth={yearMonth} />
        </div>

        {/* Time Distribution */}
        <div className="bg-bg-card rounded-xl border border-border shadow-sm p-5 sm:p-[28px]">
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

      {/* 4. Summary Cards - 맨 아래 */}
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

// Summary Card Component
interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

function SummaryCard({ icon, label, value, unit, sub }: SummaryCardProps) {
  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-4 sm:p-[28px]">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-xs sm:text-sm text-text-muted mb-1 sm:mb-2 line-clamp-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-text">
        {value}
        {unit && <span className="text-base sm:text-lg font-normal text-text-muted ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs sm:text-sm text-text-muted mt-2 sm:mt-3">{sub}</p>}
    </div>
  );
}

// Top Ranker Card Component
interface TopRankerCardProps {
  member: any;
  onMemberClick: (id: string) => void;
}

function TopRankerCard({ member, onMemberClick }: TopRankerCardProps) {
  const level = calculateLevel(member.monthly_exp);
  const levelTitle = getLevelTitle(level);
  const expProgress = getExpForNextLevel(member.monthly_exp);

  return (
    <div
      className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-[28px] cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => onMemberClick(member.id)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: Crown & Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center text-2xl">
            👑
          </div>
          <div>
            <p className="text-sm text-text-muted mb-1">이번 달 1위</p>
            <p className="text-xl font-bold text-text">{member.display_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary text-white text-sm font-medium rounded">
                Lv.{level}
              </span>
              <span className="text-text-muted">{levelTitle}</span>
            </div>
          </div>
        </div>

        {/* Right: EXP & Progress */}
        <div className="sm:text-right">
          <p className="text-3xl font-bold text-primary">{member.monthly_exp} <span className="text-lg font-normal">EXP</span></p>
          <p className="text-sm text-text-muted mt-1">{member.cert_count}회 인증</p>

          {/* Progress to next level */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>다음 레벨까지</span>
              <span>{expProgress.current} / {EXP_PER_LEVEL} EXP</span>
            </div>
            <div className="w-full sm:w-48 h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${expProgress.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Activity Chart Component
interface WeeklyActivityChartProps {
  yearMonth: string;
}

function WeeklyActivityChart({ yearMonth }: WeeklyActivityChartProps) {
  const [weeks, setWeeks] = useState<any[]>([]);
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
      const weekDataArray: any[] = [];

      for (const week of monthWeeks) {
        const startStr = week.start.toISOString().split('T')[0];
        // 미래 날짜는 오늘까지만 집계
        const endStr = week.end.toISOString().split('T')[0];
        const actualEndStr = endStr > todayStr ? todayStr : endStr;

        // 완전히 미래인 주는 건너뜀
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
        certs?.forEach((cert: any) => {
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
                  {week.rankings.slice(0, 3).map((r: any, idx: number) => (
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
