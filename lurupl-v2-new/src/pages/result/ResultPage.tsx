/**
 * ResultPage - Refactored
 * 루루플 성장 기록 메인 페이지
 *
 * 분리된 컴포넌트:
 * - tabs/SummaryTab: 요약 탭
 * - tabs/RankingTab: 랭킹 탭
 * - components/SummaryCard, TopRankerCard, WeeklyActivityChart
 */

import { useState, useEffect, useCallback } from 'react';
import { useMembersStore } from '@/stores/membersStore';
import {
  ProfileModal,
  CertificationGuide,
  MemberProfilePage,
} from '@/components/result';
import { Spinner } from '@/components/common';
import {
  BarChart3,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
} from 'lucide-react';

import { SummaryTab, RankingTab } from './tabs';

type TabId = 'summary' | 'ranking' | 'guide' | 'motivation';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'summary', label: '요약', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'ranking', label: '랭킹', icon: <Users className="w-5 h-5" /> },
  { id: 'guide', label: '가이드', icon: <Zap className="w-5 h-5" /> },
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

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSelectedMemberId(null);
  };

  // Stats calculations
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
              <h1 className="text-xl sm:text-2xl md:text-[28px] font-bold text-text truncate">
                루루플 성장 기록
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5 hidden sm:block">
                실행력 향상을 위한 인증 활동 리포트
              </p>
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
                onClick={() => handleTabChange(tab.id)}
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

            {activeTab === 'ranking' && (
              <RankingTab
                yearMonth={selectedMonth}
                monthlyStats={monthlyStats}
                onMemberClick={setSelectedMemberId}
              />
            )}

            {activeTab === 'guide' && <CertificationGuide />}

            {activeTab === 'motivation' && <MemberProfilePage />}
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

export default ResultPage;
