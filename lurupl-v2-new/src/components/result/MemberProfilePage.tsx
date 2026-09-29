/**
 * MemberProfilePage - 동기부여 탭에서 사용하는 멤버 프로필 페이지
 * 멤버 선택 후 전체 프로필을 인라인으로 표시
 */

import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Badge, ProgressBar, Spinner } from '@/components/common';
import { AchievementsGrid } from './AchievementsGrid';
import { GrowthChart } from './GrowthChart';
import { TimeHeatmap } from './TimeHeatmap';
import { PersonalizedFeedback } from './PersonalizedFeedback';
import { GrowthGarden } from '@/components/stages';
import { PersonalMotivationHub } from '@/components/motivation';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getLevelTitle, getAccumulatedTitle, EXP_PER_LEVEL } from '@/domain/levels';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS, type CategoryKey } from '@/domain/categories';
import { getCategoryTitle } from '@/domain/category-title';

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
}

export function MemberProfilePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingWakeTime, setEditingWakeTime] = useState(false);
  const [wakeTime, setWakeTime] = useState('07:00');
  const [savingWakeTime, setSavingWakeTime] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Get current month
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchDetails();
    }
  }, [selectedMemberId, yearMonth]);

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
        .select('id, display_name, accumulated_exp, wake_up_time')
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

  const handleBack = () => {
    setSelectedMemberId(null);
    setDetails(null);
    setActiveTab('overview');
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
  if (!selectedMemberId) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text">개인 페이지</h2>
          <p className="text-text-muted mt-2">
            본인의 프로필을 선택해서 상세 활동을 확인하세요
          </p>
        </div>

        <div className="grid gap-2 max-h-96 overflow-y-auto">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
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
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 px-6 py-3 text-sm text-text-muted hover:text-text transition-colors border-b border-border w-full text-left"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>멤버 선택으로 돌아가기</span>
      </button>

      {/* Header */}
      <div className="px-6 py-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
            {getAccumulatedTitle(details.accumulated_exp).icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">{details.display_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="primary">Lv.{monthlyLevel}</Badge>
              <span className="text-text-muted">{getLevelTitle(monthlyLevel)}</span>
              <span className="text-accent">
                {getAccumulatedTitle(details.accumulated_exp).icon}{' '}
                {getAccumulatedTitle(details.accumulated_exp).title}
              </span>
              {categoryTitle && (
                <span
                  className="text-sm bg-accent/20 text-accent px-2 py-0.5 rounded-full"
                  title={`${DEFAULT_CATEGORIES[categoryTitle.category]?.name} ${categoryTitle.count}회 인증`}
                >
                  {categoryTitle.emoji} {categoryTitle.title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-bg/50 rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted mb-1">이번 달</p>
            <p className="text-xl font-bold text-primary">{details.monthly_exp} EXP</p>
            <p className="text-xs text-text-muted">{details.monthly_count}회 ({details.cert_days}일)</p>
          </div>
          <div className="bg-bg/50 rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted mb-1">저번 달</p>
            <p className="text-xl font-bold text-text">{details.last_month_exp} EXP</p>
            <p className="text-xs text-text-muted">{details.last_month_count}회</p>
          </div>
          <div className="bg-bg/50 rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted mb-1">누적</p>
            <p className="text-xl font-bold text-accent">{details.accumulated_exp} EXP</p>
            <p className="text-xs text-text-muted">{details.total_count}회</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-text-muted">Lv.{monthlyLevel}</span>
            <span className="text-text-muted">
              {details.monthly_exp % EXP_PER_LEVEL} / {EXP_PER_LEVEL} EXP
            </span>
          </div>
          <ProgressBar
            value={details.monthly_exp % EXP_PER_LEVEL}
            max={EXP_PER_LEVEL}
            size="md"
          />
        </div>

        {/* Wake Time Setting */}
        <div className="mt-4 p-3 bg-bg/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <span className="text-sm text-text-muted">목표 기상 시간</span>
            </div>
            {editingWakeTime ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="bg-bg-card border border-border rounded px-2 py-1 text-sm text-text"
                />
                <button
                  onClick={handleSaveWakeTime}
                  disabled={savingWakeTime}
                  className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {savingWakeTime ? '...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingWakeTime(false);
                    setWakeTime(details.wake_up_time || '07:00');
                  }}
                  className="px-3 py-1 bg-border text-text-muted text-sm rounded hover:bg-bg-hover transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingWakeTime(true)}
                className="flex items-center gap-2 px-3 py-1 bg-bg-card border border-border rounded text-sm text-text hover:border-primary/50 transition-colors"
              >
                <span className="font-medium">{details.wake_up_time || '미설정'}</span>
                <span className="text-text-muted text-xs">변경</span>
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

                  {categoryTitle && (
                    <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{categoryTitle.emoji}</span>
                        <div>
                          <p className="font-medium text-text">{categoryTitle.title}</p>
                          <p className="text-xs text-text-muted">
                            {DEFAULT_CATEGORIES[categoryTitle.category]?.name} {categoryTitle.count}회 인증으로 획득!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <GrowthGarden memberId={selectedMemberId} />
                </div>
              </div>
            )}

            {activeTab === 'growth' && selectedMemberId && (
              <div className="space-y-6">
                <GrowthChart memberId={selectedMemberId} />
                <PersonalMotivationHub memberId={selectedMemberId} memberName={details.display_name} />
              </div>
            )}

            {activeTab === 'category' && (
              <div className="space-y-4">
                {Object.entries(details.category_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => {
                    const cat = DEFAULT_CATEGORIES[category as CategoryKey];
                    if (!cat) return null;
                    const color = CATEGORY_COLORS[category as CategoryKey];
                    const maxCount = Math.max(...Object.values(details.category_counts));

                    return (
                      <div key={category} className="flex items-center gap-4">
                        <div className="w-20 flex items-center gap-2">
                          <span className="text-xl">{cat.emoji}</span>
                          <span className="text-sm text-text-muted">{cat.name}</span>
                        </div>
                        <div className="flex-1 h-6 bg-border/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium text-text">
                          {count}회
                        </span>
                      </div>
                    );
                  })}

                {Object.keys(details.category_counts).length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    이번 달 인증 기록이 없습니다
                  </div>
                )}
              </div>
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
  );
}
