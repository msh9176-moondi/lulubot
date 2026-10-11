/**
 * CategoryTab Component
 * 카테고리 탭 - 파이 차트 + 상세 목록 (이번 달 / 누적 전환)
 */

import { useState } from 'react';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface CategoryTabProps {
  categoryCounts: Record<string, number>;       // 이번 달
  totalCategoryCounts: Record<string, number>;  // 누적
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

type ViewMode = 'monthly' | 'total';

export function CategoryTab({ categoryCounts, totalCategoryCounts }: CategoryTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const currentCounts = viewMode === 'monthly' ? categoryCounts : totalCategoryCounts;
  const isEmpty = !currentCounts || Object.keys(currentCounts).length === 0 ||
    Object.values(currentCounts).every(v => v === 0);

  const total = isEmpty ? 0 : Object.values(currentCounts).reduce((a, b) => a + b, 0);

  // 파이 차트 그라데이션 생성
  let gradientParts: string[] = [];
  let currentAngle = 0;

  if (!isEmpty) {
    Object.entries(currentCounts)
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
  }

  const pieStyle = gradientParts.length > 0
    ? { background: `conic-gradient(${gradientParts.join(', ')})` }
    : { background: '#333' };

  return (
    <div className="space-y-6">
      {/* 토글 버튼 */}
      <div className="flex justify-center">
        <div className="inline-flex bg-bg rounded-lg p-1">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'monthly'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            이번 달
          </button>
          <button
            onClick={() => setViewMode('total')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'total'
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            누적
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-center py-8 text-text-muted">
          {viewMode === 'monthly' ? '이번 달 인증 기록이 없습니다' : '인증 기록이 없습니다'}
        </p>
      ) : (
        <>
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
                  <span className="text-xs text-text-muted">
                    {viewMode === 'monthly' ? '이번 달' : '누적'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리 목록 */}
          <div className="space-y-3">
            {Object.entries(currentCounts)
              .filter(([, count]) => count > 0)
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
        </>
      )}
    </div>
  );
}

export default CategoryTab;
