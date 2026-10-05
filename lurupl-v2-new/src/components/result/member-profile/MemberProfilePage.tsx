/**
 * MemberProfilePage - Refactored
 * 동기부여 탭에서 사용하는 멤버 프로필 페이지
 *
 * 서브컴포넌트로 분리:
 * - MemberSelector: 멤버 선택 UI
 * - PinVerification: PIN 인증/설정
 * - ProfileHeader: 프로필 헤더 (나무, 통계)
 * - Tabs: OverviewTab, GrowthTab, CategoryTab, TimeTab, AchievementsTab, RecordsTab
 */

import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Spinner } from '@/components/common';
import { TreeSkinSelector } from '@/components/stages';
import { supabase } from '@/lib/supabase';
import { hasMemberPin, setMemberPin, verifyMemberPin } from '@/lib/motivation-api';
import {
  type SkinId,
  getSkinImage,
  getCurrentGrowthStage,
  getSkinById,
} from '@/domain/tree-skins';

import { MemberSelector } from './MemberSelector';
import { PinVerification } from './PinVerification';
import { ProfileHeader } from './ProfileHeader';
import {
  OverviewTab,
  GrowthTab,
  CategoryTab,
  TimeTab,
  AchievementsTab,
  RecordsTab,
} from './tabs';

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

interface Certification {
  id?: string;
  category_key: string;
  cert_date: string;
  cert_time: string;
  final_exp: number;
  message?: string;
}

type ViewState = 'select-member' | 'pin' | 'profile';

const TABS = [
  { id: 'overview', label: '개요', icon: '🌱' },
  { id: 'growth', label: '성장', icon: '📈' },
  { id: 'category', label: '카테고리', icon: '📁' },
  { id: 'time', label: '시간대', icon: '⏰' },
  { id: 'achievements', label: '도전과제', icon: '🏆' },
  { id: 'records', label: '기록', icon: '📝' },
];

export function MemberProfilePage() {
  // Member state
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // View & Tab state
  const [view, setView] = useState<ViewState>('select-member');
  const [activeTab, setActiveTab] = useState('overview');

  // PIN state
  const [hasPin, setHasPin] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);

  // Skin selector state
  const [showSkinSelector, setShowSkinSelector] = useState(false);

  // Current month
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Effects
  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId && view === 'profile') {
      fetchDetails();
    }
  }, [selectedMemberId, yearMonth, view]);

  // Computed values
  const growthStageInfo = useMemo(() => {
    return getCurrentGrowthStage(details?.total_count || 0);
  }, [details?.total_count]);

  const currentTreeImage = useMemo(() => {
    const skinId = details?.selected_tree_skin || 'default';
    return getSkinImage(skinId, details?.total_count || 0);
  }, [details?.selected_tree_skin, details?.total_count]);

  const currentSkinInfo = useMemo(() => {
    const skinId = details?.selected_tree_skin || 'default';
    return getSkinById(skinId);
  }, [details?.selected_tree_skin]);

  // API functions
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

      const lastMonth = new Date(year, month - 2, 1);
      const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const lastMonthEnd = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()}`;

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, display_name, accumulated_exp, wake_up_time, selected_tree_skin')
        .eq('id', selectedMemberId)
        .single();

      if (memberError) throw memberError;

      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('category_key, cert_date, final_exp')
        .eq('member_id', selectedMemberId)
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      const { data: lastMonthCerts, error: lastMonthError } = await supabase
        .from('certifications')
        .select('final_exp')
        .eq('member_id', selectedMemberId)
        .gte('cert_date', lastMonthStart)
        .lte('cert_date', lastMonthEnd)
        .gt('final_exp', 0);

      if (lastMonthError) throw lastMonthError;

      const { data: allCertsData, error: allCertsError } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .eq('member_id', selectedMemberId)
        .gt('final_exp', 0);

      if (allCertsError) throw allCertsError;

      // Calculate stats
      const categoryCounts: Record<string, number> = {};
      const certDays = new Set<string>();
      let monthlyExp = 0;

      for (const cert of certsData || []) {
        monthlyExp += cert.final_exp || 0;
        certDays.add(cert.cert_date);
        categoryCounts[cert.category_key] = (categoryCounts[cert.category_key] || 0) + 1;
      }

      const lastMonthExp = lastMonthCerts?.reduce((sum, c) => sum + (c.final_exp || 0), 0) || 0;
      const lastMonthCount = lastMonthCerts?.length || 0;

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

  // Handlers
  async function handleMemberSelect(member: Member) {
    setSelectedMemberId(member.id);
    setSelectedMemberName(member.display_name);
    setLoadingPin(true);
    const pinExists = await hasMemberPin(member.id);
    setHasPin(pinExists);
    setLoadingPin(false);
    setView('pin');
  }

  async function handlePinSet(pin: string): Promise<boolean> {
    if (!selectedMemberId) return false;
    const success = await setMemberPin(selectedMemberId, pin);
    if (success) setView('profile');
    return success;
  }

  async function handlePinVerify(pin: string): Promise<boolean> {
    if (!selectedMemberId) return false;
    const success = await verifyMemberPin(selectedMemberId, pin);
    if (success) setView('profile');
    return success;
  }

  function handleLogout() {
    setSelectedMemberId(null);
    setSelectedMemberName('');
    setDetails(null);
    setActiveTab('overview');
    setView('select-member');
  }

  async function handleWakeTimeUpdate(time: string) {
    if (!selectedMemberId) return;
    try {
      const { error } = await supabase.rpc('update_wake_time', {
        p_member_id: selectedMemberId,
        p_wake_time: time,
      });
      if (error) throw error;
      setDetails((prev) => prev ? { ...prev, wake_up_time: time } : null);
    } catch (error) {
      console.error('Failed to save wake time:', error);
    }
  }

  // Render: Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Render: Member Selection
  if (view === 'select-member') {
    return <MemberSelector members={members} onSelect={handleMemberSelect} />;
  }

  // Render: PIN Verification
  if (view === 'pin' && selectedMemberId) {
    return (
      <PinVerification
        memberName={selectedMemberName}
        hasPin={hasPin}
        loading={loadingPin}
        onBack={handleLogout}
        onPinSet={handlePinSet}
        onPinVerify={handlePinVerify}
      />
    );
  }

  // Render: Profile not authenticated
  if (view !== 'profile' || !selectedMemberId) {
    return null;
  }

  // Render: Loading profile
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // Render: Profile not found
  if (!details) {
    return (
      <div className="text-center py-12 text-text-muted">
        프로필을 불러올 수 없습니다
      </div>
    );
  }

  // Render: Profile View
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
        {/* Profile Header */}
        <ProfileHeader
          displayName={details.display_name}
          accumulatedExp={details.accumulated_exp}
          monthlyExp={details.monthly_exp}
          monthlyCount={details.monthly_count}
          lastMonthExp={details.last_month_exp}
          lastMonthCount={details.last_month_count}
          totalCount={details.total_count}
          totalCategoryCounts={details.total_category_counts}
          wakeUpTime={details.wake_up_time}
          selectedTreeSkin={details.selected_tree_skin}
          currentTreeImage={currentTreeImage}
          currentSkinInfo={currentSkinInfo}
          growthStageInfo={growthStageInfo}
          onSkinChange={() => setShowSkinSelector(true)}
          onWakeTimeUpdate={handleWakeTimeUpdate}
        />

        {/* Tabs */}
        <div className="px-6">
          <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
            {TABS.map((tab) => (
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
              <OverviewTab
                memberId={selectedMemberId}
                monthlyExp={details.monthly_exp}
                monthlyCount={details.monthly_count}
                certDays={details.cert_days}
                totalCategoryCounts={details.total_category_counts}
              />
            )}

            {activeTab === 'growth' && (
              <GrowthTab
                memberId={selectedMemberId}
                memberName={details.display_name}
              />
            )}

            {activeTab === 'category' && (
              <CategoryTab categoryCounts={details.category_counts} />
            )}

            {activeTab === 'time' && <TimeTab memberId={selectedMemberId} />}

            {activeTab === 'achievements' && (
              <AchievementsTab memberId={selectedMemberId} />
            )}

            {activeTab === 'records' && (
              <RecordsTab certifications={certifications} />
            )}
          </div>
        </div>
      </div>

      {/* Skin Selector Modal */}
      <TreeSkinSelector
        isOpen={showSkinSelector}
        onClose={() => setShowSkinSelector(false)}
        memberId={selectedMemberId}
        totalCount={details.total_count}
        currentSkinId={details.selected_tree_skin}
        onSkinChange={(newSkinId) => {
          setDetails((prev) => prev ? { ...prev, selected_tree_skin: newSkinId } : null);
        }}
      />
    </div>
  );
}

export default MemberProfilePage;
