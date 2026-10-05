/**
 * OverviewTab Component
 * 개요 탭 - 피드백, 통계, 정원
 */

import { PersonalizedFeedback } from '@/components/result/PersonalizedFeedback';
import { GrowthGarden } from '@/components/stages';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { getCategoryTitle } from '@/domain/category-title';

interface OverviewTabProps {
  memberId: string;
  monthlyExp: number;
  monthlyCount: number;
  certDays: number;
  totalCategoryCounts: Record<string, number>;
}

export function OverviewTab({
  memberId,
  monthlyExp,
  monthlyCount,
  certDays,
  totalCategoryCounts,
}: OverviewTabProps) {
  return (
    <div className="pb-6">
      <div className="space-y-6">
        <PersonalizedFeedback
          memberId={memberId}
          monthlyExp={monthlyExp}
          monthlyCount={monthlyCount}
          certDays={certDays}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-bg rounded-lg">
            <p className="text-text-muted text-sm mb-1">일평균 인증</p>
            <p className="text-2xl font-bold text-text">
              {certDays > 0 ? (monthlyCount / certDays).toFixed(1) : '0'}회
            </p>
          </div>
          <div className="p-4 bg-bg rounded-lg">
            <p className="text-text-muted text-sm mb-1">EXP 효율</p>
            <p className="text-2xl font-bold text-text">
              {monthlyCount > 0 ? (monthlyExp / monthlyCount).toFixed(1) : '0'}/회
            </p>
          </div>
        </div>

        <CategoryTitleProgress categoryCounts={totalCategoryCounts} />

        <GrowthGarden memberId={memberId} isOwnProfile={true} />
      </div>
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
  const required = 20;
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

export default OverviewTab;
