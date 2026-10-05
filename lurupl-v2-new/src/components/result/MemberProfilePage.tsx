/**
 * MemberProfilePage - 동기부여 탭에서 사용하는 멤버 프로필 페이지
 * 멤버 선택 후 전체 프로필을 인라인으로 표시
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, LogOut, Palette } from 'lucide-react';
import { Badge, ProgressBar, Spinner } from '@/components/common';
import { AchievementsGrid } from './AchievementsGrid';
import { GrowthChart } from './GrowthChart';
import { TimeHeatmap } from './TimeHeatmap';
import { PersonalizedFeedback } from './PersonalizedFeedback';
import { GrowthGarden, TreeSkinSelector } from '@/components/stages';
import { PersonalMotivationHub, PinSetup } from '@/components/motivation';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getLevelTitle, getAccumulatedTitle, EXP_PER_LEVEL } from '@/domain/levels';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { getCategoryTitle } from '@/domain/category-title';
import { hasMemberPin, setMemberPin, verifyMemberPin } from '@/lib/motivation-api';
import {
  type SkinId,
  getSkinImage,
  getCurrentGrowthStage,
  getSkinById,
} from '@/domain/tree-skins';

interface Member {
  id: string;
  display_name: string;
}

interface MemberDetails {
  member_id: string;
  display_name: string;
  monthly_exp: number;
  monthly_count: number;
  cert_days: number;
  accumulated_exp: number;
  total_count: number;
  last_month_exp: number;
  last_month_count: number;
  category_counts: Record<string, number>;
  total_category_counts: Record<string, number>;
  wake_up_time: string | null;
  selected_tree_skin: SkinId;
}

type ViewState = 'select-member' | 'pin' | 'profile';

export function MemberProfilePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingWakeTime, setEditingWakeTime] = useState(false);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [savingWakeTime, setSavingWakeTime] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // PIN authentication state
  const [view, setView] = useState<ViewState>('select-member');
  const [hasPin, setHasPin] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);

  // Tree skin state
  const [showSkinSelector, setShowSkinSelector] = useState(false);

  // Get current month
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId && view === 'profile') {
      fetchDetails();
    }
  }, [selectedMemberId, yearMonth, view]);

  // 현재 성장 단계 계산 (tree-skins.ts 사용)
  const growthStageInfo = useMemo(() => {
    return getCurrentGrowthStage(details?.total_count || 0);
  }, [details?.total_count]);

  // 현재 선택된 스킨의 이미지
  const currentTreeImage = useMemo(() => {
    const skinId = details?.selected_tree_skin || 'default';
    return getSkinImage(skinId, details?.total_count || 0);
  }, [details?.selected_tree_skin, details?.total_count]);

  // 현재 스킨 정보
  const currentSkinInfo = useMemo(() => {
    const skinId = details?.selected_tree_skin || 'default';
    return getSkinById(skinId);
  }, [details?.selected_tree_skin]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, display_name')
        .order('display_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDetails() {
    if (!selectedMemberId) return;

    setLoadingProfile(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      // Calculate last month dates
      const lastMonth = new Date(year, month - 2, 1);
      const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastMonthEnd = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()}`;

      // Fetch member info
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, display_name, accumulated_exp, wake_up_time, selected_tree_skin')
        .eq('id', selectedMemberId)
        .single();

      if (memberError) throw memberError;

      // Fetch certifications for the month
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('category_key, cert_date, final_exp')
        .eq('member_id', selectedMemberId)
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      // Fetch last month certifications
      const { data: lastMonthCerts, error: lastMonthError } = await supabase
        .from('certifications')
        .select('final_exp')
        .eq('member_id', selectedMemberId)
        .gte('cert_date', lastMonthStart)
        .lte('cert_date', lastMonthEnd)
        .gt('final_exp', 0);

      if (lastMonthError) throw lastMonthError;

      // Fetch ALL certifications for total category counts
      const { data: allCertsData, error: allCertsError } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .eq('member_id', selectedMemberId)
        .gt('final_exp', 0);

      if (allCertsError) throw allCertsError;

      // Calculate monthly stats
      const categoryCounts: Record<string, number> = {};
      const certDays = new Set<string>();
      let monthlyExp = 0;

      for (const cert of certsData || []) {
        monthlyExp += cert.final_exp || 0;
        certDays.add(cert.cert_date);
        categoryCounts[cert.category_key] = (categoryCounts[cert.category_key] || 0) + 1;
      }

      // Calculate last month stats
      const lastMonthExp = lastMonthCerts?.reduce((sum, c) => sum + (c.final_exp || 0), 0) || 0;
      const lastMonthCount = lastMonthCerts?.length || 0;

      // Calculate total category counts
      const totalCategoryCounts: Record<string, number> = {};
      for (const cert of allCertsData || []) {
        totalCategoryCounts[cert.category_key] = (totalCategoryCounts[cert.category_key] || 0) + 1;
      }

      setDetails({
        member_id: memberData.id,
        display_name: memberData.display_name,
        monthly_exp: monthlyExp,
        monthly_count: certsData?.length || 0,
        cert_days: certDays.size,
        accumulated_exp: memberData.accumulated_exp || 0,
        total_count: allCertsData?.length || 0,
        last_month_exp: lastMonthExp,
        last_month_count: lastMonthCount,
        category_counts: categoryCounts,
        total_category_counts: totalCategoryCounts,
        wake_up_time: memberData.wake_up_time,
        selected_tree_skin: (memberData.selected_tree_skin || 'default') as SkinId,
      });
      setWakeTime(memberData.wake_up_time || '07:00');

      // Fetch recent certifications
      const { data: recentCerts, error: recentError } = await supabase
        .from('certifications')
        .select('*')
        .eq('member_id', selectedMemberId)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;
      setCertifications(recentCerts || []);
    } catch (error) {
      console.error('Failed to fetch member details:', error);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSaveWakeTime() {
    if (!selectedMemberId) return;
    setSavingWakeTime(true);
    try {
      const { error } = await supabase.rpc('update_wake_time', {
        p_member_id: selectedMemberId,
        p_wake_time: wakeTime,
      });

      if (error) throw error;
      setDetails((prev) => prev ? { ...prev, wake_up_time: wakeTime } : null);
      setEditingWakeTime(false);
    } catch (error) {
      console.error('Failed to save wake time:', error);
    } finally {
      setSavingWakeTime(false);
    }
  }

  // Handle member selection - check PIN first
  async function handleMemberSelect(member: Member) {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.display_name);
    setLoadingPin(true);
    const pinExists = await hasMemberPin(member.id);
    setHasPin(pinExists);
    setLoadingPin(false);
    setView('pin');
  }

  // Handle PIN set
  async function handlePinSet(pin: string): Promise<boolean> {
    if (!selectedMemberId) return false;
    const success = await setMemberPin(selectedMemberId, pin);
    if (success) {
      setView('profile');
    }
    return success;
  }

  // Handle PIN verify
  async function handlePinVerify(pin: string): Promise<boolean> {
    if (!selectedMemberId) return false;
    const success = await verifyMemberPin(selectedMemberId, pin);
    if (success) {
      setView('profile');
    }
    return success;
  }

  // Handle logout - go back to member selection
  const handleLogout = () => {
    setSelectedMemberId(null);
    setSelectedMemberName('');
    setDetails(null);
    setActiveTab('overview');
    setView('select-member');
  };

  const handleBack = () => {
    setSelectedMemberId(null);
    setSelectedMemberName('');
    setDetails(null);
    setActiveTab('overview');
    setView('select-member');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Member selection view
  if (view === 'select-member') {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text">개인 페이지</h2>
          <p className="text-text-muted mt-2">
            본인을 선택하고 PIN을 입력해서 상세 활동을 확인하세요
          </p>
        </div>

        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => handleMemberSelect(member)}
              className="w-full p-4 bg-bg rounded-lg border border-border text-left hover:border-primary/30 hover:bg-bg-hover transition-colors flex items-center justify-between"
            >
              <span className="font-medium text-text">{member.display_name}</span>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // PIN verification view
  if (view === 'pin' && selectedMemberId) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <button
          onClick={handleBack}
          className="text-sm text-text-muted hover:text-text mb-4 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          다른 멤버 선택
        </button>

        <div className="text-center mb-4">
          <p className="text-lg font-medium text-text">{selectedMemberName}</p>
        </div>

        {loadingPin ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <PinSetup
            hasPin={hasPin}
            onPinSet={handlePinSet}
            onPinVerify={handlePinVerify}
          />
        )}
      </div>
    );
  }

  // Profile view - only show if authenticated
  if (view !== 'profile' || !selectedMemberId) {
    return null;
  }

  // Loading profile
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Profile not found
  if (!details) {
    return (
      <div className="text-center py-12 text-text-muted">
        프로필을 불러올 수 없습니다
      </div>
    );
  }

  const monthlyLevel = calculateLevel(details.monthly_exp);
  const categoryTitle = getCategoryTitle(details.total_category_counts);

  const tabs = [
    { id: 'overview', label: '개요', icon: '🌱' },
    { id: 'growth', label: '성장', icon: '📈' },
    { id: 'category', label: '카테고리', icon: '📁' },
    { id: 'time', label: '시간대', icon: '⏰' },
    { id: 'achievements', label: '도전과제', icon: '🏆' },
    { id: 'records', label: '기록', icon: '📝' },
  ];

  return (
    <div className="bg-bg-card rounded-2xl border border-border w-full max-w-2xl mx-auto overflow-hidden flex flex-col">
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-6 py-3 text-sm text-text-muted hover:text-text transition-colors border-b border-border w-full text-left"
      >
        <LogOut className="w-4 h-4" />
        <span>로그아웃</span>
      </button>

      <div className="flex-1 overflow-y-auto">

      {/* 나의 정원 - 통합 헤더 */}
      <div className="border-b border-border">
        {/* 정원 배경 + 나무 */}
        <div className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
          {/* 배경 구름 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-4 left-8 w-20 h-10 bg-white/50 rounded-full blur-sm" />
            <div className="absolute top-8 right-12 w-24 h-12 bg-white/40 rounded-full blur-sm" />
            <div className="absolute top-6 left-1/3 w-16 h-8 bg-white/30 rounded-full blur-sm" />
          </div>

          {/* 메인 컨텐츠: 나무 + 정보 */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* 나무 이미지 */}
            <div className={`flex-shrink-0 ${details.selected_tree_skin === 'planning' ? 'sm:mr-6' : ''}`}>
              <img
                src={currentTreeImage}
                alt={currentSkinInfo?.name || growthStageInfo.name}
                className={`w-24 h-32 sm:w-32 sm:h-40 object-contain drop-shadow-lg ${details.selected_tree_skin === 'planning' ? 'scale-[1.5]' : ''}`}
              />
            </div>

            {/* 정보 영역 */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              {/* 이름 + 칭호 */}
              <h2 className="text-lg sm:text-xl font-bold text-text">{details.display_name}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-accent text-sm sm:text-base">
                  {getAccumulatedTitle(details.accumulated_exp).icon}{' '}
                  {getAccumulatedTitle(details.accumulated_exp).title}
                </span>
                {categoryTitle && (
                  <span className="text-xs sm:text-sm text-text-muted">
                    {categoryTitle.emoji} {categoryTitle.title}
                  </span>
                )}
              </div>

              {/* 성장 단계/스킨 뱃지 + 스킨 변경 버튼 */}
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/80 dark:bg-black/40 rounded-full shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  {details.selected_tree_skin === 'default' ? (
                    <>
                      <span className="text-xs sm:text-sm font-bold text-primary">{growthStageInfo.name}</span>
                      <span className="text-[10px] sm:text-xs text-text-muted">({growthStageInfo.stage + 1}/10)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm font-bold text-primary">{currentSkinInfo?.name}</span>
                      <span className="text-[10px] sm:text-xs text-text-muted">
                        {DEFAULT_CATEGORIES[details.selected_tree_skin as CategoryKey]?.emoji}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowSkinSelector(true)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/80 dark:bg-black/40 rounded-full shadow-sm hover:bg-white dark:hover:bg-black/60 transition-colors"
                >
                  <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" />
                  <span className="text-[10px] sm:text-xs text-text-muted">스킨 변경</span>
                </button>
              </div>

              {/* 다음 단계 진행바 (기본 스킨일 때만) */}
              {details.selected_tree_skin === 'default' && growthStageInfo.nextStage ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                    <span className="text-text-muted">다음: {growthStageInfo.nextStage.name}</span>
                    <span className="text-primary font-medium">
                      {details.total_count} / {growthStageInfo.nextStage.minCount}
                    </span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, growthStageInfo.progress)}%` }}
                    />
                  </div>
                </div>
              ) : details.selected_tree_skin === 'default' ? (
                <p className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">
                  최고 단계 달성!
                </p>
              ) : (
                <p className="mt-3 text-xs text-primary font-medium">
                  {DEFAULT_CATEGORIES[details.selected_tree_skin as CategoryKey]?.name} 마스터 스킨
                </p>
              )}
            </div>
          </div>
        </div>

        {/* EXP 통계 */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-bg-card">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">이번 달</p>
              <p className="text-base sm:text-lg font-bold text-primary">{details.monthly_exp}</p>
              <p className="text-[10px] sm:text-xs text-text-muted">EXP · {details.monthly_count}회</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">저번 달</p>
              <p className="text-base sm:text-lg font-bold text-text">{details.last_month_exp}</p>
              <p className="text-[10px] sm:text-xs text-text-muted">EXP · {details.last_month_count}회</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">누적</p>
              <p className="text-base sm:text-lg font-bold text-accent">{details.accumulated_exp}</p>
              <p className="text-[10px] sm:text-xs text-text-muted">EXP · {details.total_count}회</p>
            </div>
          </div>

          {/* 월간 레벨 진행 */}
          <div className="mt-3 sm:mt-4">
            <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
              <span className="text-text-muted flex items-center gap-1">
                <Badge variant="primary">Lv.{monthlyLevel}</Badge>
                {getLevelTitle(monthlyLevel)}
              </span>
              <span className="text-text-muted">
                {details.monthly_exp % EXP_PER_LEVEL} / {EXP_PER_LEVEL}
              </span>
            </div>
            <ProgressBar
              value={details.monthly_exp % EXP_PER_LEVEL}
              max={EXP_PER_LEVEL}
              size="sm"
            />
          </div>

          {/* 기상 시간 */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>⏰</span>
              <span className="text-text-muted">목표 기상</span>
            </div>
            {editingWakeTime ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="bg-bg border border-border rounded px-2 py-1 text-sm text-text"
                />
                <button
                  onClick={handleSaveWakeTime}
                  disabled={savingWakeTime}
                  className="px-2 py-1 bg-primary text-white text-xs rounded"
                >
                  {savingWakeTime ? '...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingWakeTime(false);
                    setWakeTime(details.wake_up_time || '07:00');
                  }}
                  className="px-2 py-1 bg-border text-text-muted text-xs rounded"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingWakeTime(true)}
                className="text-text font-medium hover:text-primary transition-colors"
              >
                {details.wake_up_time || '미설정'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div>
          <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-4">
            {activeTab === 'overview' && (
              <div className="pb-6">
                <div className="space-y-6">
                  <PersonalizedFeedback
                    memberId={selectedMemberId}
                    monthlyExp={details.monthly_exp}
                    monthlyCount={details.monthly_count}
                    certDays={details.cert_days}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-bg rounded-lg">
                      <p className="text-text-muted text-sm mb-1">일평균 인증</p>
                      <p className="text-2xl font-bold text-text">
                        {details.cert_days > 0
                          ? (details.monthly_count / details.cert_days).toFixed(1)
                          : '0'}
                        회
                      </p>
                    </div>
                    <div className="p-4 bg-bg rounded-lg">
                      <p className="text-text-muted text-sm mb-1">EXP 효율</p>
                      <p className="text-2xl font-bold text-text">
                        {details.monthly_count > 0
                          ? (details.monthly_exp / details.monthly_count).toFixed(1)
                          : '0'}
                        /회
                      </p>
                    </div>
                  </div>

                  <CategoryTitleProgress categoryCounts={details.total_category_counts} />

                  <GrowthGarden memberId={selectedMemberId} isOwnProfile={true} />
                </div>
              </div>
            )}

            {activeTab === 'growth' && selectedMemberId && (
              <div className="space-y-6">
                <GrowthChart memberId={selectedMemberId} />
                <PersonalMotivationHub memberId={selectedMemberId} memberName={details.display_name} alreadyAuthenticated={true} />
              </div>
            )}

            {activeTab === 'category' && (
              <CategoryTab categoryCounts={details.category_counts} />
            )}

            {activeTab === 'time' && selectedMemberId && (
              <TimeHeatmap memberId={selectedMemberId} />
            )}

            {activeTab === 'achievements' && selectedMemberId && (
              <AchievementsGrid memberId={selectedMemberId} />
            )}

            {activeTab === 'records' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {certifications.map((cert, idx) => {
                  const cat = DEFAULT_CATEGORIES[cert.category_key as CategoryKey];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-bg rounded-lg"
                    >
                      <span className="text-xl">{cat?.emoji || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text truncate">{cert.message || cat?.name}</p>
                        <p className="text-xs text-text-muted">
                          {cert.cert_date} {cert.cert_time?.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant={cert.final_exp > 0 ? 'primary' : 'default'}>
                        {cert.final_exp > 0 ? `+${cert.final_exp}` : '0'} EXP
                      </Badge>
                    </div>
                  );
                })}

                {certifications.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    인증 기록이 없습니다
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* 스킨 선택 모달 */}
      <TreeSkinSelector
        isOpen={showSkinSelector}
        onClose={() => setShowSkinSelector(false)}
        memberId={selectedMemberId}
        totalCount={details.total_count}
        currentSkinId={details.selected_tree_skin}
        onSkinChange={(newSkinId) => {
          setDetails(prev => prev ? { ...prev, selected_tree_skin: newSkinId } : null);
        }}
      />
    </div>
  );
}

// 카테고리 칭호 진행 상황 컴포넌트
function CategoryTitleProgress({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  const categoryTitleData = getCategoryTitle(categoryCounts);

  if (categoryTitleData) {
    return (
      <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{categoryTitleData.emoji}</span>
          <div>
            <p className="font-medium text-text">{categoryTitleData.title}</p>
            <p className="text-xs text-text-muted">
              {DEFAULT_CATEGORIES[categoryTitleData.category]?.name} {categoryTitleData.count}회 인증으로 획득!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 칭호가 없으면 가장 많은 카테고리의 진행률 표시
  const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const [topCat, topCount] = entries[0];
  const cat = DEFAULT_CATEGORIES[topCat as CategoryKey];
  const required = 20; // 기본 최소 요구치
  const progress = Math.min(Math.round((topCount / required) * 100), 100);

  return (
    <div className="p-4 bg-bg rounded-lg">
      <p className="text-sm text-text-muted mb-2">카테고리 칭호까지</p>
      <div className="flex items-center gap-3">
        <span className="text-xl">{cat?.emoji}</span>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text">{cat?.name}</span>
            <span className="text-text-muted">{topCount}/{required}회</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 카테고리 탭 컴포넌트 (파이 차트 + 상세 카드)
function CategoryTab({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return <p className="text-center py-8 text-text-muted">이번 달 인증 기록이 없습니다</p>;
  }

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  // 파이 차트 색상
  const colors: Record<string, string> = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
    diary: '#fb923c',
    meditation: '#c084fc',
    comeback: '#38bdf8',
  };

  let gradientParts: string[] = [];
  let currentAngle = 0;

  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      if (count > 0) {
        const angle = (count / total) * 360;
        gradientParts.push(
          `${colors[key] || '#888'} ${currentAngle}deg ${currentAngle + angle}deg`
        );
        currentAngle += angle;
      }
    });

  const pieStyle = gradientParts.length > 0
    ? { background: `conic-gradient(${gradientParts.join(', ')})` }
    : { background: '#333' };

  return (
    <div className="space-y-6">
      {/* 파이 차트 */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            className="w-32 h-32 rounded-full"
            style={pieStyle}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-bg-card flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-text">{total}</span>
              <span className="text-xs text-text-muted">총 인증</span>
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-3">
        {Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => {
            const cat = DEFAULT_CATEGORIES[key as CategoryKey];
            const percentage = ((count / total) * 100).toFixed(0);

            return (
              <div key={key} className="p-3 bg-bg rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text">
                    {cat?.emoji} {cat?.name || key}
                  </span>
                  <span className="text-text-muted">
                    {count}회 ({percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / total) * 100}%`,
                      backgroundColor: colors[key] || '#888'
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
