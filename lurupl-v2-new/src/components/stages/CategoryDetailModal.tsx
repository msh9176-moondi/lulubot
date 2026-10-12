/**
 * CategoryDetailModal Component
 * 카테고리 상세 보기 - 개별 인증 기록과 이모티콘 일대일 대응
 */

import { useState, useMemo } from 'react';
import { X, Lock, Unlock, Sparkles } from 'lucide-react';
import { CATEGORIES, type CategoryKey } from '@/domain/categories';
import { useStageStore } from '@/stores/stageStore';
import type { StageDefinition } from '@/domain/stages';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  categoryKey: CategoryKey | null;
  definitions: StageDefinition[];
  isOwnProfile?: boolean;
}


export function CategoryDetailModal({
  isOpen,
  onClose,
  memberId,
  categoryKey,
  definitions,
  isOwnProfile = false
}: CategoryDetailModalProps) {
  const { memberStatuses, claimStage } = useStageStore();
  const [unlocking, setUnlocking] = useState(false);

  const status = useMemo(() => {
    const statuses = memberStatuses.get(memberId) || [];
    return statuses.find(s => s.categoryKey === categoryKey);
  }, [memberStatuses, memberId, categoryKey]);

  const category = categoryKey ? CATEGORIES.find(c => c.key === categoryKey) : null;
  const categoryDefinitions = definitions.filter(d => d.categoryKey === categoryKey);


  // 해금 처리
  const handleUnlock = async () => {
    if (!status?.canUnlock || unlocking || !categoryKey) return;

    setUnlocking(true);
    try {
      await claimStage(memberId, categoryKey, status.nextStage);
    } finally {
      setUnlocking(false);
    }
  };

  // 진행률 계산 (현재 스테이지 → 다음 스테이지)
  const getStageProgress = (stageNum: number): number => {
    const def = categoryDefinitions.find(d => d.stageNumber === stageNum);
    const prevDef = categoryDefinitions.find(d => d.stageNumber === stageNum - 1);

    if (!def) return 0;

    const start = prevDef?.requiredCount || 0;
    const end = def.requiredCount;
    const current = status?.verifiedCount || 0;

    if (current >= end) return 100;
    if (current <= start) return 0;

    return ((current - start) / (end - start)) * 100;
  };

  if (!isOpen || !category || !categoryKey) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="px-6 py-4 border-b border-border flex items-center justify-between"
          style={{ background: `linear-gradient(to right, ${category.color}10, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{category.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-text">{category.name}</h2>
              <p className="text-sm text-text-muted">
                총 {status?.verifiedCount || 0}회 인증
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스테이지 진행 현황 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 border-b border-border bg-bg">
          <h3 className="text-sm font-medium text-text-muted mb-3">스테이지 진행</h3>
          <div className="space-y-2">
            {categoryDefinitions.map(def => {
              const isUnlocked = (status?.currentStage || 0) >= def.stageNumber;
              const isCurrent = status?.currentStage === def.stageNumber;
              const isNext = status?.nextStage === def.stageNumber;
              const progress = getStageProgress(def.stageNumber);

              return (
                <div
                  key={def.stageNumber}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg
                    ${isUnlocked ? 'bg-primary/10' : isNext ? 'bg-bg-card' : 'opacity-50'}
                  `}
                >
                  {/* 아이콘 */}
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${isUnlocked ? 'bg-primary text-white' : 'bg-border text-text-muted'}
                    `}
                  >
                    {isUnlocked ? <Sparkles className="w-4 h-4" /> : def.stageNumber}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isUnlocked ? 'text-primary' : 'text-text'}`}>
                        {def.stageName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 bg-primary text-white text-xs rounded">
                          현재
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">
                      {def.requiredCount}회 필요
                    </div>
                  </div>

                  {/* 진행바 또는 상태 */}
                  <div className="w-24">
                    {isUnlocked ? (
                      <span className="text-xs text-primary font-medium">완료</span>
                    ) : isNext ? (
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 해금 버튼 */}
          {status?.canUnlock && isOwnProfile && (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark
                         text-white font-semibold flex items-center justify-center gap-2
                         hover:shadow-lg hover:shadow-primary/30 transition-all
                         disabled:opacity-50 animate-pulse-subtle"
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
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default CategoryDetailModal;
