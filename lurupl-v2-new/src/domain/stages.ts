/**
 * Category Stage System Domain Logic
 * 카테고리별 이모티콘 스태킹 및 스테이지 해금 관련 로직
 */

import type { CategoryKey } from './categories';

// 스테이지 정의 타입
export interface StageDefinition {
  id: string;
  categoryKey: CategoryKey;
  stageNumber: number;
  requiredCount: number;
  stageName: string;
  stageDescription: string | null;
  themeColor: string | null;
  rewardIcon: string | null;
}

// 스테이지 해금 기록 타입
export interface StageUnlock {
  stageNumber: number;
  unlockedAt: string;
  animationSeen: boolean;
}

// 멤버의 카테고리별 스테이지 상태
export interface CategoryStageStatus {
  categoryKey: CategoryKey;
  verifiedCount: number;
  currentStage: number; // 현재 해금된 최고 스테이지 (0 = 없음)
  nextStage: number; // 다음 해금할 스테이지
  nextRequired: number | null; // 다음 스테이지에 필요한 인증 수
  canUnlock: boolean; // 해금 가능 여부
  unlocks: StageUnlock[]; // 해금 기록 목록
}

// 스테이지 해금 결과
export interface ClaimStageResult {
  success: boolean;
  error?: string;
  message?: string;
  stageNumber?: number;
  stageName?: string;
  stageDescription?: string;
  verifiedCount?: number;
  unlockedAt?: string;
  required?: number;
  current?: number;
}

// 스테이지 상태 enum
export type StageState = 'locked' | 'in_progress' | 'unlockable' | 'unlocked';

/**
 * 특정 스테이지의 상태 계산
 */
export function getStageState(
  stageNumber: number,
  currentStage: number,
  verifiedCount: number,
  requiredCount: number
): StageState {
  // 이미 해금됨
  if (stageNumber <= currentStage) {
    return 'unlocked';
  }

  // 이전 스테이지가 해금되지 않음 (잠김)
  if (stageNumber > currentStage + 1) {
    return 'locked';
  }

  // 다음 해금 대상 스테이지
  if (verifiedCount >= requiredCount) {
    return 'unlockable';
  }

  return 'in_progress';
}

/**
 * 다음 스테이지까지의 진행률 계산
 */
export function getProgressToNextStage(
  verifiedCount: number,
  currentStageRequired: number, // 현재 스테이지의 required_count (없으면 0)
  nextStageRequired: number | null
): { current: number; target: number; progress: number } {
  if (!nextStageRequired) {
    // 더 이상 스테이지가 없음 (최종 단계 도달)
    return { current: verifiedCount, target: verifiedCount, progress: 100 };
  }

  // 현재 스테이지 기준점부터 다음 스테이지까지의 진행률
  const baseCount = currentStageRequired;
  const targetCount = nextStageRequired;
  const progressCount = Math.min(verifiedCount, targetCount);

  const progress = Math.min(
    ((progressCount - baseCount) / (targetCount - baseCount)) * 100,
    100
  );

  return {
    current: verifiedCount,
    target: targetCount,
    progress: Math.max(0, progress)
  };
}

/**
 * 스테이지 레벨에 따른 시각적 스케일 계산
 * 스테이지가 높을수록 진열 공간이 커짐
 */
export function getStageScale(stageNumber: number): number {
  // 0: 1.0, 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5
  return 1 + (stageNumber * 0.1);
}

/**
 * 스테이지에 따른 배경 장식 레벨
 */
export function getStageDecorationLevel(stageNumber: number): 'none' | 'basic' | 'enhanced' | 'premium' | 'legendary' | 'mythic' {
  if (stageNumber === 0) return 'none';
  if (stageNumber === 1) return 'basic';      // 첫걸음마
  if (stageNumber <= 3) return 'enhanced';    // 2~3단계
  if (stageNumber <= 6) return 'premium';     // 4~6단계
  if (stageNumber <= 9) return 'legendary';   // 7~9단계
  return 'mythic'; // 10~11단계
}

/**
 * 이모티콘 쌓기 레이아웃 계산
 * count에 따라 행/열 배치 반환
 */
export function calculateStackLayout(
  count: number,
  maxVisibleRows: number = 5,
  itemsPerRow: number = 5
): {
  visibleCount: number;
  rows: number[];
  hasMore: boolean;
  hiddenCount: number;
} {
  const maxVisible = maxVisibleRows * itemsPerRow;
  const visibleCount = Math.min(count, maxVisible);
  const hasMore = count > maxVisible;
  const hiddenCount = hasMore ? count - maxVisible : 0;

  // 각 행에 몇 개씩 배치할지 계산 (아래에서 위로 쌓임)
  const rows: number[] = [];
  let remaining = visibleCount;

  while (remaining > 0 && rows.length < maxVisibleRows) {
    const rowCount = Math.min(remaining, itemsPerRow);
    rows.push(rowCount);
    remaining -= rowCount;
  }

  return { visibleCount, rows, hasMore, hiddenCount };
}

/**
 * 이모티콘 쌓기 그리드 포지션 계산
 * 바닥부터 위로, 왼쪽에서 오른쪽으로 쌓임
 */
export function calculateEmojiPosition(
  index: number,
  totalCount: number,
  containerWidth: number,
  emojiSize: number = 24,
  gap: number = 2
): { x: number; y: number; row: number; col: number } {
  const itemsPerRow = Math.floor(containerWidth / (emojiSize + gap));
  const row = Math.floor(index / itemsPerRow);
  const col = index % itemsPerRow;

  // y는 아래에서 위로 (row 0이 바닥)
  const totalRows = Math.ceil(totalCount / itemsPerRow);
  const invertedRow = totalRows - 1 - row;

  return {
    x: col * (emojiSize + gap),
    y: invertedRow * (emojiSize + gap),
    row,
    col
  };
}

/**
 * 새 이모티콘 드롭 애니메이션 지연 시간 계산
 */
export function calculateDropDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

/**
 * 해금 가능한 스테이지 목록 반환
 * (사용자가 순차적으로 해금해야 하지만, 여러 스테이지가 한번에 해금 가능 상태일 수 있음)
 */
export function getUnlockableStages(
  verifiedCount: number,
  currentStage: number,
  stageDefinitions: StageDefinition[]
): StageDefinition[] {
  const sortedStages = [...stageDefinitions].sort((a, b) => a.stageNumber - b.stageNumber);
  const unlockable: StageDefinition[] = [];

  for (const stage of sortedStages) {
    // 이미 해금된 스테이지는 스킵
    if (stage.stageNumber <= currentStage) continue;

    // 이전 스테이지가 해금되지 않으면 중단
    // (순차 해금이므로 첫 번째 해금 가능한 것만 실제로 해금 가능)
    if (stage.stageNumber > currentStage + 1) break;

    // 인증 수가 충분하면 해금 가능
    if (verifiedCount >= stage.requiredCount) {
      unlockable.push(stage);
      // 첫 번째 해금 가능한 스테이지만 반환 (순차 해금)
      break;
    }
  }

  return unlockable;
}

/**
 * 축하 애니메이션 설정
 */
export interface CelebrationConfig {
  duration: number; // 밀리초
  particleCount: number;
  skipEnabled: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_CELEBRATION_CONFIG: CelebrationConfig = {
  duration: 2000,
  particleCount: 30,
  skipEnabled: true,
  reducedMotion: false,
  soundEnabled: false // 기본 꺼짐
};

/**
 * 움직임 축소 설정 확인
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
