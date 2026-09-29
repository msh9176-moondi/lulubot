/**
 * GrowthGarden Component
 * 메인 성장 화면 - 카테고리별 이모티콘 진열칸
 * 각 카테고리가 독립적인 "화분"처럼 이모티콘이 쌓임
 */

import { useEffect, useState } from 'react';
import { CATEGORIES, CATEGORY_KEYS, type CategoryKey } from '@/domain/categories';
import { useStageStore } from '@/stores/stageStore';
import { CategoryStageCard } from './CategoryStageCard';
import { CategoryDetailModal } from './CategoryDetailModal';
import { StageCelebration } from './StageCelebration';
import { Sparkles, Info, Filter } from 'lucide-react';

interface GrowthGardenProps {
  memberId: string;
  isOwnProfile?: boolean;
}

type SortMode = 'default' | 'progress' | 'count';
type FilterMode = 'all' | 'unlockable' | 'active';

export function GrowthGarden({ memberId, isOwnProfile = false }: GrowthGardenProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const {
    definitions,
    memberStatuses,
    loading,
    fetchDefinitions,
    fetchMemberStatus
  } = useStageStore();

  const statuses = memberStatuses.get(memberId) || [];

  // 데이터 로드
  useEffect(() => {
    fetchDefinitions();
    if (memberId) {
      fetchMemberStatus(memberId);
    }
  }, [memberId, fetchDefinitions, fetchMemberStatus]);

  // 카테고리 정렬 및 필터링
  const getSortedCategories = () => {
    let categories = CATEGORY_KEYS.map(key => {
      const status = statuses.find(s => s.categoryKey === key);
      return {
        key,
        status,
        category: CATEGORIES.find(c => c.key === key)!
      };
    });

    // 필터링
    if (filterMode === 'unlockable') {
      categories = categories.filter(c => c.status?.canUnlock);
    } else if (filterMode === 'active') {
      categories = categories.filter(c => (c.status?.verifiedCount || 0) > 0);
    }

    // 정렬
    if (sortMode === 'progress') {
      categories.sort((a, b) => {
        const aProgress = a.status?.nextRequired
          ? (a.status.verifiedCount / a.status.nextRequired)
          : 1;
        const bProgress = b.status?.nextRequired
          ? (b.status.verifiedCount / b.status.nextRequired)
          : 1;
        return bProgress - aProgress;
      });
    } else if (sortMode === 'count') {
      categories.sort((a, b) => {
        return (b.status?.verifiedCount || 0) - (a.status?.verifiedCount || 0);
      });
    }

    return categories;
  };

  const sortedCategories = getSortedCategories();
  const unlockableCount = statuses.filter(s => s.canUnlock).length;
  const totalStages = statuses.reduce((sum, s) => sum + s.currentStage, 0);
  const totalCerts = statuses.reduce((sum, s) => sum + s.verifiedCount, 0);

  if (loading && statuses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            나의 성장 정원
          </h2>
          <p className="text-sm text-text-muted mt-1">
            인증할 때마다 이모티콘이 쌓이고, 기준에 도달하면 새 스테이지를 열 수 있어요
          </p>
        </div>

        {/* 통계 요약 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="px-3 py-1.5 bg-bg rounded-lg border border-border">
            <span className="text-text-muted">총 인증</span>
            <span className="ml-2 font-bold text-text">{totalCerts}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg rounded-lg border border-border">
            <span className="text-text-muted">스테이지</span>
            <span className="ml-2 font-bold text-primary">{totalStages}</span>
          </div>
          {unlockableCount > 0 && isOwnProfile && (
            <div className="px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/30 animate-pulse-subtle">
              <span className="text-primary font-medium">
                {unlockableCount}개 해금 가능!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 필터/정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-text-muted">
          <Filter className="w-4 h-4" />
          <span>보기:</span>
        </div>
        <div className="flex gap-1">
          {[
            { mode: 'all' as FilterMode, label: '전체' },
            { mode: 'active' as FilterMode, label: '활동중' },
            { mode: 'unlockable' as FilterMode, label: '해금 가능' }
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filterMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-bg border border-border text-text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border mx-2" />

        <div className="flex gap-1">
          {[
            { mode: 'default' as SortMode, label: '기본순' },
            { mode: 'progress' as SortMode, label: '진행률순' },
            { mode: 'count' as SortMode, label: '인증수순' }
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                sortMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-bg border border-border text-text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCategories.map(({ key, status, category }) => (
          <CategoryStageCard
            key={key}
            memberId={memberId}
            categoryKey={key}
            status={status || {
              categoryKey: key,
              verifiedCount: 0,
              currentStage: 0,
              nextStage: 1,
              nextRequired: definitions.find(d => d.categoryKey === key && d.stageNumber === 1)?.requiredCount || null,
              canUnlock: false,
              unlocks: []
            }}
            definitions={definitions}
            isOwnProfile={isOwnProfile}
            onDetailClick={() => setSelectedCategory(key)}
            compact
          />
        ))}
      </div>

      {/* 빈 상태 */}
      {sortedCategories.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {filterMode === 'unlockable' ? (
            <p>현재 해금 가능한 스테이지가 없습니다.</p>
          ) : filterMode === 'active' ? (
            <p>아직 인증 기록이 없습니다.</p>
          ) : (
            <p>카테고리 정보를 불러오는 중...</p>
          )}
        </div>
      )}

      {/* 안내 문구 */}
      <div className="flex items-start gap-2 p-4 bg-bg rounded-xl border border-border text-sm text-text-muted">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p>
            <strong className="text-text">이모티콘 1개 = 인증 1건</strong>입니다.
            EXP 배수나 이벤트와 무관하게 확정된 인증 건수만큼 쌓입니다.
          </p>
          <p className="mt-1">
            기준에 도달해도 자동으로 해금되지 않습니다.
            <strong className="text-text"> 직접 버튼을 눌러</strong> 새 스테이지를 열어주세요!
          </p>
        </div>
      </div>

      {/* 상세 모달 */}
      <CategoryDetailModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        memberId={memberId}
        categoryKey={selectedCategory}
        definitions={definitions}
        isOwnProfile={isOwnProfile}
      />

      {/* 축하 애니메이션 */}
      <StageCelebration />
    </div>
  );
}

export default GrowthGarden;
