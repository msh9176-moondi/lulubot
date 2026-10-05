/**
 * CategoryTab Component
 * 카테고리 탭 - 파이 차트 + 상세 목록
 */

import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface CategoryTabProps {
  categoryCounts: Record<string, number>;
}

// 파이 차트 색상
const CATEGORY_COLORS: Record<string, string> = {
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

export function CategoryTab({ categoryCounts }: CategoryTabProps) {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return (
      <p className="text-center py-8 text-text-muted">
        이번 달 인증 기록이 없습니다
      </p>
    );
  }

  const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  // 파이 차트 그라데이션 생성
  let gradientParts: string[] = [];
  let currentAngle = 0;

  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      if (count > 0) {
        const angle = (count / total) * 360;
        gradientParts.push(
          `${CATEGORY_COLORS[key] || '#888'} ${currentAngle}deg ${currentAngle + angle}deg`
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
                      backgroundColor: CATEGORY_COLORS[key] || '#888'
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

export default CategoryTab;
