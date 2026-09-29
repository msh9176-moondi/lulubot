/**
 * EmojiStack Component
 * 카테고리 이모티콘이 실제로 쌓이는 시각화 컴포넌트
 */

import { useEffect, useRef, useState, memo } from 'react';
import { CATEGORIES, type CategoryKey } from '@/domain/categories';
import { calculateStackLayout } from '@/domain/stages';

interface EmojiStackProps {
  categoryKey: CategoryKey;
  count: number;
  newIndices?: number[]; // 새로 추가된 이모티콘 인덱스 (애니메이션용)
  maxVisibleRows?: number;
  itemsPerRow?: number;
  emojiSize?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  stageLevel?: number; // 스테이지 레벨에 따른 장식
  interactive?: boolean;
  onEmojiClick?: (index: number) => void;
  className?: string;
}

const EMOJI_SIZES = {
  sm: { size: 18, gap: 1 },
  md: { size: 24, gap: 2 },
  lg: { size: 32, gap: 3 }
};

export const EmojiStack = memo(function EmojiStack({
  categoryKey,
  count,
  newIndices = [],
  maxVisibleRows = 5,
  itemsPerRow = 5,
  emojiSize = 'md',
  showCount = true,
  stageLevel = 0,
  interactive = false,
  onEmojiClick,
  className = ''
}: EmojiStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animatedIndices, setAnimatedIndices] = useState<Set<number>>(new Set());
  const category = CATEGORIES.find(c => c.key === categoryKey);
  const emoji = category?.emoji || '❓';

  const { size, gap } = EMOJI_SIZES[emojiSize];
  const layout = calculateStackLayout(count, maxVisibleRows, itemsPerRow);

  // 새 이모티콘 드롭 애니메이션
  useEffect(() => {
    if (newIndices.length === 0) return;

    // 새 인덱스들을 순차적으로 애니메이션
    newIndices.forEach((idx, i) => {
      setTimeout(() => {
        setAnimatedIndices(prev => new Set([...prev, idx]));
      }, i * 100); // 100ms 간격으로 순차 드롭
    });

    // 애니메이션 완료 후 초기화
    const timer = setTimeout(() => {
      setAnimatedIndices(new Set());
    }, newIndices.length * 100 + 500);

    return () => clearTimeout(timer);
  }, [newIndices]);

  // 스테이지 레벨에 따른 배경 스타일
  const getStageDecoration = () => {
    switch (stageLevel) {
      case 0:
        return 'bg-bg-card border-border';
      case 1:
        return 'bg-gradient-to-b from-bg-card to-bg border-border shadow-sm';
      case 2:
        return 'bg-gradient-to-b from-bg-card to-primary/5 border-primary/20 shadow-md';
      case 3:
        return 'bg-gradient-to-b from-bg-card via-primary/5 to-primary/10 border-primary/30 shadow-lg';
      case 4:
        return 'bg-gradient-to-b from-bg-card via-primary/10 to-primary/20 border-primary/40 shadow-xl';
      default:
        return 'bg-gradient-to-br from-primary/10 via-gold/10 to-primary/20 border-gold/50 shadow-xl ring-1 ring-gold/20';
    }
  };

  // 개별 이모티콘 렌더링
  const renderEmoji = (index: number, _rowIndex: number, colIndex: number) => {
    const isNew = animatedIndices.has(index);
    const isInteractive = interactive && onEmojiClick;

    return (
      <span
        key={index}
        onClick={() => isInteractive && onEmojiClick?.(index)}
        className={`
          inline-flex items-center justify-center select-none
          transition-all duration-300
          ${isNew ? 'animate-emoji-drop' : ''}
          ${isInteractive ? 'cursor-pointer hover:scale-125 hover:z-10' : ''}
        `}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.85,
          animationDelay: isNew ? `${colIndex * 50}ms` : undefined
        }}
        title={`${category?.name} 인증 #${index + 1}`}
      >
        {emoji}
      </span>
    );
  };

  // 행 렌더링 (바닥부터 위로)
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    let currentIndex = 0;

    // layout.rows는 바닥 행부터 순서대로
    for (let rowIdx = 0; rowIdx < layout.rows.length; rowIdx++) {
      const itemCount = layout.rows[rowIdx];
      const rowItems: React.ReactNode[] = [];

      for (let colIdx = 0; colIdx < itemCount; colIdx++) {
        rowItems.push(renderEmoji(currentIndex, rowIdx, colIdx));
        currentIndex++;
      }

      rows.push(
        <div
          key={rowIdx}
          className="flex justify-center items-center"
          style={{ gap: gap }}
        >
          {rowItems}
        </div>
      );
    }

    // 역순으로 반환 (위에서 아래로 렌더링되므로)
    return rows.reverse();
  };

  const containerWidth = itemsPerRow * (size + gap);
  const containerHeight = maxVisibleRows * (size + gap);

  return (
    <div
      ref={containerRef}
      className={`
        relative rounded-xl border overflow-hidden
        ${getStageDecoration()}
        ${className}
      `}
      style={{
        minWidth: containerWidth + 24,
        minHeight: containerHeight + 24,
        // 스테이지에 따른 스케일 효과
        transform: `scale(${1 + stageLevel * 0.02})`
      }}
    >
      {/* 바닥 라인 (쌓이는 느낌) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-border/50"
        style={{
          background: stageLevel >= 3
            ? `linear-gradient(to right, transparent, ${category?.color || '#888'}40, transparent)`
            : undefined
        }}
      />

      {/* 이모티콘 쌓기 영역 */}
      <div
        className="flex flex-col justify-end items-center p-3"
        style={{ minHeight: containerHeight }}
      >
        {count === 0 ? (
          <div className="flex items-center justify-center text-text-muted opacity-30">
            <span style={{ fontSize: size * 0.85 }}>{emoji}</span>
          </div>
        ) : (
          renderRows()
        )}
      </div>

      {/* 더 많은 이모티콘 표시 */}
      {layout.hasMore && (
        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-bg/80 backdrop-blur-sm rounded text-xs text-text-muted">
          +{layout.hiddenCount}
        </div>
      )}

      {/* 숫자 카운트 */}
      {showCount && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-bg/80 backdrop-blur-sm rounded text-xs font-medium text-text">
          {count}
        </div>
      )}

      {/* 스테이지 배지 */}
      {stageLevel > 0 && (
        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold"
          style={{
            background: category?.color || '#888',
            color: '#fff'
          }}
        >
          Lv.{stageLevel}
        </div>
      )}
    </div>
  );
});

export default EmojiStack;
