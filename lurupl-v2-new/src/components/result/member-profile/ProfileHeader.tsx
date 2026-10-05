/**
 * ProfileHeader Component
 * 프로필 헤더 - 나무, 통계, 기상 시간 표시
 */

import { useState } from 'react';
import { Sparkles, Palette } from 'lucide-react';
import { Badge, ProgressBar } from '@/components/common';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { calculateLevel, getLevelTitle, getAccumulatedTitle, EXP_PER_LEVEL } from '@/domain/levels';
import { getCategoryTitle } from '@/domain/category-title';
import type { SkinId } from '@/domain/tree-skins';

interface ProfileHeaderProps {
  displayName: string;
  accumulatedExp: number;
  monthlyExp: number;
  monthlyCount: number;
  lastMonthExp: number;
  lastMonthCount: number;
  totalCount: number;
  totalCategoryCounts: Record<string, number>;
  wakeUpTime: string | null;
  selectedTreeSkin: SkinId;
  currentTreeImage: string;
  currentSkinInfo: { name: string } | undefined;
  growthStageInfo: {
    stage: number;
    name: string;
    progress: number;
    nextStage: { name: string; minCount: number } | null;
  };
  onSkinChange: () => void;
  onWakeTimeUpdate: (time: string) => Promise<void>;
}

export function ProfileHeader({
  displayName,
  accumulatedExp,
  monthlyExp,
  monthlyCount,
  lastMonthExp,
  lastMonthCount,
  totalCount,
  totalCategoryCounts,
  wakeUpTime,
  selectedTreeSkin,
  currentTreeImage,
  currentSkinInfo,
  growthStageInfo,
  onSkinChange,
  onWakeTimeUpdate,
}: ProfileHeaderProps) {
  const [editingWakeTime, setEditingWakeTime] = useState(false);
  const [wakeTime, setWakeTime] = useState(wakeUpTime || '07:00');
  const [savingWakeTime, setSavingWakeTime] = useState(false);

  const monthlyLevel = calculateLevel(monthlyExp);
  const categoryTitle = getCategoryTitle(totalCategoryCounts);

  const handleSaveWakeTime = async () => {
    setSavingWakeTime(true);
    await onWakeTimeUpdate(wakeTime);
    setSavingWakeTime(false);
    setEditingWakeTime(false);
  };

  return (
    <div className="border-b border-border">
      {/* 정원 배경 + 나무 */}
      <div className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 px-4 sm:px-6 py-6 sm:py-8 overflow-hidden">
        {/* 배경 구름 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-8 w-20 h-10 bg-white/50 rounded-full blur-sm" />
          <div className="absolute top-8 right-12 w-24 h-12 bg-white/40 rounded-full blur-sm" />
          <div className="absolute top-6 left-1/3 w-16 h-8 bg-white/30 rounded-full blur-sm" />
        </div>

        {/* 메인 컨텐츠: 나무 + 정보 */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* 나무 이미지 */}
          <div className={`flex-shrink-0 ${selectedTreeSkin === 'planning' ? 'sm:mr-6' : ''}`}>
            <img
              src={currentTreeImage}
              alt={currentSkinInfo?.name || growthStageInfo.name}
              className={`w-24 h-32 sm:w-32 sm:h-40 object-contain drop-shadow-lg ${selectedTreeSkin === 'planning' ? 'scale-[1.5]' : ''}`}
            />
          </div>

          {/* 정보 영역 */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            {/* 이름 + 칭호 */}
            <h2 className="text-lg sm:text-xl font-bold text-text">{displayName}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
              <span className="text-accent text-sm sm:text-base">
                {getAccumulatedTitle(accumulatedExp).icon}{' '}
                {getAccumulatedTitle(accumulatedExp).title}
              </span>
              {categoryTitle && (
                <span className="text-xs sm:text-sm text-text-muted">
                  {categoryTitle.emoji} {categoryTitle.title}
                </span>
              )}
            </div>

            {/* 성장 단계/스킨 뱃지 + 스킨 변경 버튼 */}
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/80 dark:bg-black/40 rounded-full shadow-sm">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                {selectedTreeSkin === 'default' ? (
                  <>
                    <span className="text-xs sm:text-sm font-bold text-primary">{growthStageInfo.name}</span>
                    <span className="text-[10px] sm:text-xs text-text-muted">({growthStageInfo.stage + 1}/10)</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs sm:text-sm font-bold text-primary">{currentSkinInfo?.name}</span>
                    <span className="text-[10px] sm:text-xs text-text-muted">
                      {DEFAULT_CATEGORIES[selectedTreeSkin as CategoryKey]?.emoji}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={onSkinChange}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/80 dark:bg-black/40 rounded-full shadow-sm hover:bg-white dark:hover:bg-black/60 transition-colors"
              >
                <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-muted" />
                <span className="text-[10px] sm:text-xs text-text-muted">스킨 변경</span>
              </button>
            </div>

            {/* 다음 단계 진행바 */}
            {selectedTreeSkin === 'default' && growthStageInfo.nextStage ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                  <span className="text-text-muted">다음: {growthStageInfo.nextStage.name}</span>
                  <span className="text-primary font-medium">
                    {totalCount} / {growthStageInfo.nextStage.minCount}
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, growthStageInfo.progress)}%` }}
                  />
                </div>
              </div>
            ) : selectedTreeSkin === 'default' ? (
              <p className="mt-3 text-xs text-green-600 dark:text-green-400 font-medium">
                최고 단계 달성!
              </p>
            ) : (
              <p className="mt-3 text-xs text-primary font-medium">
                {DEFAULT_CATEGORIES[selectedTreeSkin as CategoryKey]?.name} 마스터 스킨
              </p>
            )}
          </div>
        </div>
      </div>

      {/* EXP 통계 */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-bg-card">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">이번 달</p>
            <p className="text-base sm:text-lg font-bold text-primary">{monthlyExp}</p>
            <p className="text-[10px] sm:text-xs text-text-muted">EXP · {monthlyCount}회</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">저번 달</p>
            <p className="text-base sm:text-lg font-bold text-text">{lastMonthExp}</p>
            <p className="text-[10px] sm:text-xs text-text-muted">EXP · {lastMonthCount}회</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-text-muted mb-0.5">누적</p>
            <p className="text-base sm:text-lg font-bold text-accent">{accumulatedExp}</p>
            <p className="text-[10px] sm:text-xs text-text-muted">EXP · {totalCount}회</p>
          </div>
        </div>

        {/* 월간 레벨 진행 */}
        <div className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
            <span className="text-text-muted flex items-center gap-1">
              <Badge variant="primary">Lv.{monthlyLevel}</Badge>
              {getLevelTitle(monthlyLevel)}
            </span>
            <span className="text-text-muted">
              {monthlyExp % EXP_PER_LEVEL} / {EXP_PER_LEVEL}
            </span>
          </div>
          <ProgressBar
            value={monthlyExp % EXP_PER_LEVEL}
            max={EXP_PER_LEVEL}
            size="sm"
          />
        </div>

        {/* 기상 시간 */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>⏰</span>
            <span className="text-text-muted">목표 기상</span>
          </div>
          {editingWakeTime ? (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="bg-bg border border-border rounded px-2 py-1 text-sm text-text"
              />
              <button
                onClick={handleSaveWakeTime}
                disabled={savingWakeTime}
                className="px-2 py-1 bg-primary text-white text-xs rounded"
              >
                {savingWakeTime ? '...' : '저장'}
              </button>
              <button
                onClick={() => {
                  setEditingWakeTime(false);
                  setWakeTime(wakeUpTime || '07:00');
                }}
                className="px-2 py-1 bg-border text-text-muted text-xs rounded"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingWakeTime(true)}
              className="text-text font-medium hover:text-primary transition-colors"
            >
              {wakeUpTime || '미설정'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
