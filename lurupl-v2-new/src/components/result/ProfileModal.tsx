import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal, Tabs, Badge, ProgressBar, Spinner } from '@/components/common';
import { AchievementsGrid } from './AchievementsGrid';
import { GrowthChart } from './GrowthChart';
import { TimeHeatmap } from './TimeHeatmap';
import { PersonalizedFeedback } from './PersonalizedFeedback';
import { GrowthGarden } from '@/components/stages';
import { PersonalMotivationHub } from '@/components/motivation';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getLevelTitle, getAccumulatedTitle, EXP_PER_LEVEL } from '@/domain/levels';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { getCategoryTitle } from '@/domain/category-title';
import {
  type SkinId,
  getSkinImage,
  getCurrentGrowthStage,
  getSkinById,
} from '@/domain/tree-skins';

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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string | null;
  yearMonth: string;
}

export function ProfileModal({ isOpen, onClose, memberId, yearMonth }: ProfileModalProps) {
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && memberId) {
      fetchDetails();
      // Update URL hash
      window.location.hash = `profile=${memberId}`;
    }
  }, [isOpen, memberId, yearMonth]);

  // Handle URL hash for profile sharing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#profile=') && isOpen) {
        onClose();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOpen, onClose]);

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

  // Clear hash on close
  const handleClose = () => {
    window.history.pushState('', document.title, window.location.pathname + window.location.search);
    onClose();
  };

  async function fetchDetails() {
    setLoading(true);
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
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Fetch certifications for the month
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('category_key, cert_date, final_exp')
        .eq('member_id', memberId)
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      // Fetch last month certifications
      const { data: lastMonthCerts, error: lastMonthError } = await supabase
        .from('certifications')
        .select('final_exp')
        .eq('member_id', memberId)
        .gte('cert_date', lastMonthStart)
        .lte('cert_date', lastMonthEnd)
        .gt('final_exp', 0);

      if (lastMonthError) throw lastMonthError;

      // Fetch ALL certifications for total category counts (for category title)
      const { data: allCertsData, error: allCertsError } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .eq('member_id', memberId)
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

      // Fetch recent certifications
      const { data: recentCerts, error: recentError } = await supabase
        .from('certifications')
        .select('*')
        .eq('member_id', memberId)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;
      setCertifications(recentCerts || []);
    } catch (error) {
      console.error('Failed to fetch member details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: '개요', icon: '🌱' },
    { id: 'growth', label: '성장', icon: '📈' },
    { id: 'category', label: '카테고리', icon: '📁' },
    { id: 'time', label: '시간대', icon: '⏰' },
    { id: 'achievements', label: '도전과제', icon: '🏆' },
    { id: 'records', label: '기록', icon: '📝' },
  ];

  const monthlyLevel = details ? calculateLevel(details.monthly_exp) : 1;
  const categoryTitle = details ? getCategoryTitle(details.total_category_counts) : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : details ? (
        <div>
          {/* 나의 정원 - 통합 헤더 */}
          <div className="border-b border-border">
            {/* 정원 배경 + 나무 */}
            <div className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 px-6 py-8 overflow-hidden">
              {/* 배경 구름 */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-4 left-8 w-20 h-10 bg-white/50 rounded-full blur-sm" />
                <div className="absolute top-8 right-12 w-24 h-12 bg-white/40 rounded-full blur-sm" />
                <div className="absolute top-6 left-1/3 w-16 h-8 bg-white/30 rounded-full blur-sm" />
              </div>

              {/* 메인 컨텐츠: 나무 + 정보 */}
              <div className="relative z-10 flex items-center gap-6">
                {/* 나무 이미지 */}
                <div className="flex-shrink-0">
                  <img
                    src={currentTreeImage}
                    alt={currentSkinInfo?.name || growthStageInfo.name}
                    className="w-32 h-40 object-contain drop-shadow-lg"
                  />
                </div>

                {/* 정보 영역 */}
                <div className="flex-1 min-w-0">
                  {/* 이름 + 칭호 */}
                  <h2 className="text-xl font-bold text-text">{details.display_name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-accent">
                      {getAccumulatedTitle(details.accumulated_exp).icon}{' '}
                      {getAccumulatedTitle(details.accumulated_exp).title}
                    </span>
                    {categoryTitle && (
                      <span className="text-sm text-text-muted">
                        {categoryTitle.emoji} {categoryTitle.title}
                      </span>
                    )}
                  </div>

                  {/* 성장 단계/스킨 뱃지 */}
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-black/40 rounded-full shadow-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {details.selected_tree_skin === 'default' ? (
                      <>
                        <span className="text-sm font-bold text-primary">{growthStageInfo.name}</span>
                        <span className="text-xs text-text-muted">({growthStageInfo.stage + 1}/10)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-primary">{currentSkinInfo?.name}</span>
                        <span className="text-xs text-text-muted">
                          {DEFAULT_CATEGORIES[details.selected_tree_skin as CategoryKey]?.emoji}
                        </span>
                      </>
                    )}
                  </div>

                  {/* 다음 단계 진행바 (기본 스킨일 때만) */}
                  {details.selected_tree_skin === 'default' && growthStageInfo.nextStage ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-muted">다음: {growthStageInfo.nextStage.name}</span>
                        <span className="text-primary font-medium">
                          {details.total_count} / {growthStageInfo.nextStage.minCount}
                        </span>
                      </div>
                      <div className="h-2 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
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
            <div className="px-6 py-4 bg-bg-card">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-0.5">이번 달</p>
                  <p className="text-lg font-bold text-primary">{details.monthly_exp}</p>
                  <p className="text-xs text-text-muted">EXP · {details.monthly_count}회</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-xs text-text-muted mb-0.5">저번 달</p>
                  <p className="text-lg font-bold text-text">{details.last_month_exp}</p>
                  <p className="text-xs text-text-muted">EXP · {details.last_month_count}회</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-0.5">누적</p>
                  <p className="text-lg font-bold text-accent">{details.accumulated_exp}</p>
                  <p className="text-xs text-text-muted">EXP · {details.total_count}회</p>
                </div>
              </div>

              {/* 월간 레벨 진행 */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
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

              {/* 기상 시간 (읽기 전용) */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>⏰</span>
                  <span className="text-text-muted">목표 기상</span>
                </div>
                <span className="text-text font-medium">
                  {details.wake_up_time || '미설정'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <div className="px-6">
            <Tabs tabs={tabs}>
              {(activeTab) => (
                <div className="pb-6">
                  {activeTab === 'overview' && memberId && (
                    <OverviewTab details={details} memberId={memberId} />
                  )}
                  {activeTab === 'growth' && memberId && (
                    <div className="space-y-6">
                      <GrowthChart memberId={memberId} />
                      <PersonalMotivationHub memberId={memberId} memberName={details.display_name} />
                    </div>
                  )}
                  {activeTab === 'category' && (
                    <CategoryTab categoryCounts={details.category_counts} />
                  )}
                  {activeTab === 'time' && memberId && (
                    <TimeHeatmap memberId={memberId} />
                  )}
                  {activeTab === 'achievements' && (
                    <AchievementsGrid memberId={memberId || undefined} />
                  )}
                  {activeTab === 'records' && (
                    <RecordsTab certifications={certifications} />
                  )}
                </div>
              )}
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-text-muted">
          멤버 정보를 불러올 수 없습니다
        </div>
      )}
    </Modal>
  );
}

function OverviewTab({ details, memberId }: { details: MemberDetails; memberId: string }) {
  const avgCertsPerDay = details.cert_days > 0
    ? (details.monthly_count / details.cert_days).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Personalized Feedback */}
      <PersonalizedFeedback
        memberId={memberId}
        monthlyExp={details.monthly_exp}
        monthlyCount={details.monthly_count}
        certDays={details.cert_days}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-bg rounded-lg">
          <p className="text-text-muted text-sm mb-1">일평균 인증</p>
          <p className="text-2xl font-bold text-text">{avgCertsPerDay}회</p>
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

      {/* Category Title Progress */}
      <CategoryTitleProgress categoryCounts={details.total_category_counts} />

      {/* Growth Garden (읽기 전용) */}
      <GrowthGarden memberId={memberId} isOwnProfile={false} />
    </div>
  );
}

function CategoryTitleProgress({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  const categoryTitle = getCategoryTitle(categoryCounts);

  if (categoryTitle) {
    return (
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
    );
  }

  // Find closest category to title
  const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const [topCat, topCount] = entries[0];
  const cat = DEFAULT_CATEGORIES[topCat as keyof typeof DEFAULT_CATEGORIES];
  const required = 20; // Default minimum
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

function CategoryTab({ categoryCounts }: { categoryCounts: Record<string, number> }) {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return <p className="text-center py-8 text-text-muted">카테고리별 데이터가 없습니다</p>;
  }

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  // Pie chart data
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
      {/* Pie Chart */}
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

      {/* Category List */}
      <div className="space-y-3">
        {Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => {
            const cat = DEFAULT_CATEGORIES[key as keyof typeof DEFAULT_CATEGORIES];
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

function RecordsTab({ certifications }: { certifications: any[] }) {
  if (certifications.length === 0) {
    return <p className="text-center py-8 text-text-muted">인증 기록이 없습니다</p>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {certifications.map((cert) => (
        <div
          key={cert.id}
          className="flex items-center justify-between p-3 bg-bg rounded-lg"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">
              {DEFAULT_CATEGORIES[cert.category_key as keyof typeof DEFAULT_CATEGORIES]?.emoji || ''}
            </span>
            <div>
              <p className="text-sm text-text">
                {DEFAULT_CATEGORIES[cert.category_key as keyof typeof DEFAULT_CATEGORIES]?.name || cert.category_key}
              </p>
              <p className="text-xs text-text-muted">
                {cert.cert_date} {cert.cert_time?.slice(0, 5)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">+{cert.final_exp} EXP</p>
            {cert.is_over_limit && (
              <p className="text-xs text-warning">한도 초과</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
