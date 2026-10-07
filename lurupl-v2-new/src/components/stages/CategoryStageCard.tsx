/**
 * CategoryStageCard Component
 * 개별 카테고리의 이모티콘 스태킹과 스테이지 해금 UI
 */

import { useState } from 'react';
import { CATEGORIES, type CategoryKey } from '@/domain/categories';
import { type StageDefinition, type CategoryStageStatus } from '@/domain/stages';
import { getSkinRewardForStage } from '@/domain/tree-skins';
import { useStageStore } from '@/stores/stageStore';
import { EmojiStack } from './EmojiStack';
import { Lock, Unlock, ChevronRight, Sparkles } from 'lucide-react';

interface CategoryStageCardProps {
  memberId: string;
  categoryKey: CategoryKey;
  status: CategoryStageStatus;
  definitions: StageDefinition[];
  isOwnProfile?: boolean; // 본인 프로필인지 (해금 버튼 표시용)
  onDetailClick?: () => void;
  compact?: boolean; // 압축 모드 (그리드용)
}

export function CategoryStageCard({
  memberId,
  categoryKey,
  status,
  definitions,
  isOwnProfile = false,
  onDetailClick,
  compact = false
}: CategoryStageCardProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const claimStage = useStageStore(state => state.claimStage);

  // 새 이모티콘 애니메이션은 MVP 이후 구현 예정
  const newEmojis: number[] = [];

  const category = CATEGORIES.find(c => c.key === categoryKey);
  const currentDefinition = definitions.find(
    d => d.categoryKey === categoryKey && d.stageNumber === status.currentStage
  );
  const nextDefinition = definitions.find(
    d => d.categoryKey === categoryKey && d.stageNumber === status.nextStage
  );

  // 스킨 보상 확인
  const skinReward = getSkinRewardForStage(categoryKey, status.nextStage);

  // 다음 스테이지까지의 진행률
  const progressPercent = status.nextRequired
    ? Math.min((status.verifiedCount / status.nextRequired) * 100, 100)
    : 100;

  const handleUnlock = async () => {
    if (!status.canUnlock || unlocking) return;

    setUnlocking(true);
    setUnlockError(null);

    try {
      const result = await claimStage(memberId, categoryKey, status.nextStage);
      if (!result.success) {
        setUnlockError(result.message || '해금에 실패했습니다.');
      }
    } catch (error) {
      setUnlockError('네트워크 오류가 발생했습니다.');
    } finally {
      setUnlocking(false);
    }
  };

  if (!category) return null;

  // 압축 모드 (그리드용)
  if (compact) {
    return (
      <div
        onClick={onDetailClick}
        className={`
          relative p-3 rounded-xl border bg-bg-card
          transition-all cursor-pointer
          hover:border-primary/30 hover:shadow-md
          ${status.canUnlock ? 'ring-2 ring-primary/30 animate-pulse-subtle' : ''}
        `}
      >
        {/* 카테고리 헤더 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{category.emoji}</span>
          <span className="font-medium text-text text-sm">{category.name}</span>
          {status.currentStage > 0 && (
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-xs font-bold text-white"
              style={{ background: category.color }}
            >
              Lv.{status.currentStage}
            </span>
          )}
        </div>

        {/* 이모티콘 스택 미니 */}
        <EmojiStack
          categoryKey={categoryKey}
          count={status.verifiedCount}
          newIndices={newEmojis}
          maxVisibleRows={3}
          itemsPerRow={4}
          emojiSize="sm"
          showCount={true}
          stageLevel={status.currentStage}
        />

        {/* 진행 바 */}
        {status.nextRequired && (
          <div className="mt-2">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: category.color
                }}
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-xs text-text-muted">
              <span>{status.verifiedCount}회</span>
              <span>다음: {status.nextRequired}회</span>
            </div>
          </div>
        )}

        {/* 해금 가능 표시 */}
        {status.canUnlock && isOwnProfile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnlock();
            }}
            disabled={unlocking}
            className={`mt-2 w-full py-1.5 px-3 rounded-lg text-white text-sm font-medium
                       flex items-center justify-center gap-1.5 hover:brightness-110 transition-all
                       disabled:opacity-50 ${skinReward ? 'bg-gradient-to-r from-primary to-purple-500' : 'bg-primary'}`}
          >
            {unlocking ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>해금하기</span>
                {skinReward && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    +🎁스킨
                  </span>
                )}
              </>
            )}
          </button>
        )}

        {/* 화살표 */}
        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      </div>
    );
  }

  // 전체 모드
  return (
    <div
      className={`
        relative p-4 rounded-xl border bg-bg-card
        ${status.canUnlock ? 'ring-2 ring-primary/30' : ''}
      `}
    >
      {/* 카테고리 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: `${category.color}20` }}
          >
            {category.emoji}
          </div>
          <div>
            <h3 className="font-semibold text-text">{category.name}</h3>
            {currentDefinition ? (
              <p className="text-sm text-text-muted">{currentDefinition.stageName}</p>
            ) : (
              <p className="text-sm text-text-muted">시작 전</p>
            )}
          </div>
        </div>

        {/* 스테이지 레벨 */}
        {status.currentStage > 0 && (
          <div
            className="px-3 py-1.5 rounded-lg text-white font-bold"
            style={{ background: category.color }}
          >
            Stage {status.currentStage}
          </div>
        )}
      </div>

      {/* 이모티콘 스택 */}
      <div className="flex justify-center mb-4">
        <EmojiStack
          categoryKey={categoryKey}
          count={status.verifiedCount}
          newIndices={newEmojis}
          maxVisibleRows={5}
          itemsPerRow={6}
          emojiSize="md"
          showCount={true}
          stageLevel={status.currentStage}
          interactive
          onEmojiClick={() => onDetailClick?.()}
        />
      </div>

      {/* 진행 상태 */}
      <div className="space-y-2">
        {/* 진행 바 */}
        {status.nextRequired && (
          <div>
            <div className="flex justify-between items-center mb-1 text-sm">
              <span className="text-text-muted">
                다음 스테이지: <span className="text-text font-medium">{nextDefinition?.stageName}</span>
              </span>
              <span className="text-text font-medium">
                {status.verifiedCount} / {status.nextRequired}
              </span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${progressPercent}%`,
                  background: category.color
                }}
              >
                {/* 반짝임 효과 */}
                {progressPercent > 0 && progressPercent < 100 && (
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* 최종 스테이지 달성 */}
        {!status.nextRequired && status.currentStage > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-gold">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">최종 스테이지 달성!</span>
            <Sparkles className="w-5 h-5" />
          </div>
        )}

        {/* 해금 버튼 */}
        {status.canUnlock && isOwnProfile && (
          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className={`w-full py-3 px-4 rounded-xl
                       text-white font-semibold flex items-center justify-center gap-2
                       hover:shadow-lg transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       animate-pulse-subtle
                       ${skinReward
                         ? 'bg-gradient-to-r from-primary via-purple-500 to-pink-500 hover:shadow-purple-500/30'
                         : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-primary/30'
                       }`}
          >
            {unlocking ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>해금 중...</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>스테이지 {status.nextStage} 해금하기</span>
                {skinReward && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded text-sm">
                    🎁 +스킨
                  </span>
                )}
              </>
            )}
          </button>
        )}

        {/* 에러 메시지 */}
        {unlockError && (
          <p className="text-sm text-red-500 text-center">{unlockError}</p>
        )}

        {/* 해금 불가능 상태 */}
        {!status.canUnlock && status.nextRequired && (
          <div className="flex items-center justify-center gap-2 py-2 text-text-muted text-sm">
            <Lock className="w-4 h-4" />
            <span>{status.nextRequired - status.verifiedCount}회 더 인증하면 해금 가능</span>
          </div>
        )}
      </div>

      {/* 상세 보기 */}
      {onDetailClick && (
        <button
          onClick={onDetailClick}
          className="mt-3 w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1"
        >
          <span>상세 기록 보기</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default CategoryStageCard;
