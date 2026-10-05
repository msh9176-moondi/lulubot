import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal, Badge, Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import { calculateLevel, getAccumulatedTitle } from '@/domain/levels';
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
  accumulated_exp: number;
  total_count: number;
  total_category_counts: Record<string, number>;
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

      // Fetch member info
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, display_name, accumulated_exp, selected_tree_skin')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      // Fetch certifications for the month
      const { data: certsData, error: certsError } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .eq('member_id', memberId)
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (certsError) throw certsError;

      // Fetch ALL certifications for total category counts (for category title)
      const { data: allCertsData, error: allCertsError } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .eq('member_id', memberId)
        .gt('final_exp', 0);

      if (allCertsError) throw allCertsError;

      // Calculate monthly stats
      let monthlyExp = 0;
      for (const cert of certsData || []) {
        monthlyExp += cert.final_exp || 0;
      }

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
        accumulated_exp: memberData.accumulated_exp || 0,
        total_count: allCertsData?.length || 0,
        total_category_counts: totalCategoryCounts,
        selected_tree_skin: (memberData.selected_tree_skin || 'default') as SkinId,
      });
    } catch (error) {
      console.error('Failed to fetch member details:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const monthlyLevel = details ? calculateLevel(details.monthly_exp) : 1;
  const categoryTitle = details ? getCategoryTitle(details.total_category_counts) : null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : details ? (
        <div>
          {/* 스킨 중심 프로필 카드 */}
          <div className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 px-6 py-10 overflow-hidden">
            {/* 배경 구름 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-4 left-8 w-20 h-10 bg-white/50 rounded-full blur-sm" />
              <div className="absolute top-8 right-12 w-24 h-12 bg-white/40 rounded-full blur-sm" />
              <div className="absolute top-6 left-1/3 w-16 h-8 bg-white/30 rounded-full blur-sm" />
            </div>

            {/* 메인 컨텐츠: 스킨 중심 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* 나무 이미지 (크게) */}
              <img
                src={currentTreeImage}
                alt={currentSkinInfo?.name || growthStageInfo.name}
                className={`w-40 h-52 object-contain drop-shadow-xl ${details.selected_tree_skin === 'planning' ? 'scale-[1.5]' : ''}`}
              />

              {/* 이름 */}
              <h2 className="mt-4 text-2xl font-bold text-text">{details.display_name}</h2>

              {/* 칭호들 */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="text-accent font-medium">
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
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-black/40 rounded-full shadow-sm">
                <Sparkles className="w-5 h-5 text-primary" />
                {details.selected_tree_skin === 'default' ? (
                  <>
                    <span className="text-base font-bold text-primary">{growthStageInfo.name}</span>
                    <span className="text-sm text-text-muted">({growthStageInfo.stage + 1}/10)</span>
                  </>
                ) : (
                  <>
                    <span className="text-base font-bold text-primary">{currentSkinInfo?.name}</span>
                    <span className="text-sm text-text-muted">
                      {DEFAULT_CATEGORIES[details.selected_tree_skin as CategoryKey]?.emoji}
                    </span>
                  </>
                )}
              </div>

              {/* 스킨 설명 */}
              {details.selected_tree_skin !== 'default' && (
                <p className="mt-2 text-sm text-primary font-medium">
                  {DEFAULT_CATEGORIES[details.selected_tree_skin as CategoryKey]?.name} 마스터 스킨
                </p>
              )}
            </div>
          </div>

          {/* 간단한 통계 */}
          <div className="px-6 py-4 bg-bg-card">
            <div className="flex items-center justify-center gap-6 text-center">
              <div>
                <p className="text-xs text-text-muted">이번 달</p>
                <p className="text-lg font-bold text-primary">{details.monthly_exp} EXP</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-text-muted">월간 레벨</p>
                <p className="text-lg font-bold text-text">
                  <Badge variant="primary">Lv.{monthlyLevel}</Badge>
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-text-muted">누적</p>
                <p className="text-lg font-bold text-accent">{details.accumulated_exp} EXP</p>
              </div>
            </div>
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
