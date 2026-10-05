/**
 * Tree Skins Domain
 * 나무 스킨 시스템 정의 - 기본 스킨과 카테고리별 특별 스킨
 */

import type { CategoryKey } from './categories';

// 기본 성장 단계 스킨 import
import Seed1 from '@/seed/seed-1.svg';
import Seed2 from '@/seed/seed-2.svg';
import Seed3 from '@/seed/seed-3.svg';
import Seed4 from '@/seed/seed-4.svg';
import Seed5 from '@/seed/seed-5.svg';
import Seed6 from '@/seed/seed-6.svg';
import Seed7 from '@/seed/seed-7.svg';
import Seed8 from '@/seed/seed-8.svg';
import Seed9 from '@/seed/seed-9.svg';
import Seed10 from '@/seed/seed-10.svg';

// 특별 스킨 import (seed2 폴더)
import SkinWeightTraining from '@/seed2/seed-Weight training.svg';
import SkinSweeper from '@/seed2/seed-Sweeper.svg';
import SkinStudy from '@/seed2/seed-Study.svg';
import SkinRising from '@/seed2/seed-Rising.svg';
import SkinPlaner from '@/seed2/seed-planer.svg';
import SkinMeditation from '@/seed2/seed-Meditation.svg';
import SkinReturn from '@/seed2/seed-Return.svg';
import SkinPharmacist from '@/seed2/seed-Pharmacist.svg';

// 스킨 타입 정의
export type SkinId = 'default' | CategoryKey;

export interface TreeSkin {
  id: SkinId;
  name: string;
  description: string;
  image: string; // 특별 스킨은 단일 이미지 사용
  categoryKey: CategoryKey | null; // null이면 기본 스킨
  requiredStage: number; // 획득에 필요한 스테이지 (기본 스킨은 0)
}

// 기본 성장 단계 (총 인증 수 기준)
export const DEFAULT_GROWTH_STAGES = [
  { image: Seed1, name: '씨앗', minCount: 0 },
  { image: Seed2, name: '새싹', minCount: 10 },
  { image: Seed3, name: '떡잎', minCount: 30 },
  { image: Seed4, name: '어린 줄기', minCount: 60 },
  { image: Seed5, name: '자라는 중', minCount: 100 },
  { image: Seed6, name: '튼튼한 줄기', minCount: 150 },
  { image: Seed7, name: '가지 뻗기', minCount: 210 },
  { image: Seed8, name: '무성한 잎', minCount: 280 },
  { image: Seed9, name: '풍성한 나무', minCount: 360 },
  { image: Seed10, name: '열매 맺은 나무', minCount: 450 },
];

// 카테고리별 특별 스킨 정의
export const CATEGORY_SKINS: Record<Exclude<CategoryKey, 'diary'>, TreeSkin> = {
  exercise: {
    id: 'exercise',
    name: '운동선수',
    description: '운동 카테고리 5단계 달성 보상',
    image: SkinWeightTraining,
    categoryKey: 'exercise',
    requiredStage: 5,
  },
  cleaning: {
    id: 'cleaning',
    name: '청소 달인',
    description: '청소 카테고리 5단계 달성 보상',
    image: SkinSweeper,
    categoryKey: 'cleaning',
    requiredStage: 5,
  },
  study: {
    id: 'study',
    name: '공부 박사',
    description: '공부 카테고리 5단계 달성 보상',
    image: SkinStudy,
    categoryKey: 'study',
    requiredStage: 5,
  },
  morning: {
    id: 'morning',
    name: '얼리버드',
    description: '기상 카테고리 5단계 달성 보상',
    image: SkinRising,
    categoryKey: 'morning',
    requiredStage: 5,
  },
  planning: {
    id: 'planning',
    name: '계획의 신',
    description: '계획 카테고리 5단계 달성 보상',
    image: SkinPlaner,
    categoryKey: 'planning',
    requiredStage: 5,
  },
  meditation: {
    id: 'meditation',
    name: '명상 마스터',
    description: '명상 카테고리 5단계 달성 보상',
    image: SkinMeditation,
    categoryKey: 'meditation',
    requiredStage: 5,
  },
  comeback: {
    id: 'comeback',
    name: '불사조',
    description: '복귀 카테고리 5단계 달성 보상',
    image: SkinReturn,
    categoryKey: 'comeback',
    requiredStage: 5,
  },
  medicine: {
    id: 'medicine',
    name: '약사',
    description: '약 카테고리 5단계 달성 보상',
    image: SkinPharmacist,
    categoryKey: 'medicine',
    requiredStage: 5,
  },
};

// 기본 스킨 정의
export const DEFAULT_SKIN: TreeSkin = {
  id: 'default',
  name: '기본 나무',
  description: '기본 성장 나무',
  image: Seed10, // 기본 스킨의 대표 이미지
  categoryKey: null,
  requiredStage: 0,
};

// 모든 스킨 목록 (기본 + 특별)
export const ALL_SKINS: TreeSkin[] = [
  DEFAULT_SKIN,
  ...Object.values(CATEGORY_SKINS),
];

/**
 * 특정 스킨의 이미지 반환
 * 기본 스킨: 총 인증 수에 따른 성장 단계 이미지
 * 특별 스킨: 해당 스킨의 단일 이미지
 */
export function getSkinImage(skinId: SkinId, totalCount: number = 0): string {
  if (skinId === 'default') {
    // 기본 스킨은 총 인증 수에 따른 성장 단계 이미지 반환
    let stageIndex = 0;
    for (let i = DEFAULT_GROWTH_STAGES.length - 1; i >= 0; i--) {
      if (totalCount >= DEFAULT_GROWTH_STAGES[i].minCount) {
        stageIndex = i;
        break;
      }
    }
    return DEFAULT_GROWTH_STAGES[stageIndex].image;
  }

  // 특별 스킨은 해당 카테고리의 스킨 이미지 반환
  const skin = CATEGORY_SKINS[skinId as Exclude<CategoryKey, 'diary'>];
  return skin?.image || DEFAULT_GROWTH_STAGES[0].image;
}

/**
 * 획득한 스킨 목록 계산
 * @param categoryStages - 카테고리별 현재 스테이지 (categoryKey -> currentStage)
 */
export function getUnlockedSkins(
  categoryStages: Map<CategoryKey, number> | Record<CategoryKey, number>
): TreeSkin[] {
  const unlocked: TreeSkin[] = [DEFAULT_SKIN]; // 기본 스킨은 항상 포함

  const stages = categoryStages instanceof Map
    ? Object.fromEntries(categoryStages)
    : categoryStages;

  for (const [categoryKey, skin] of Object.entries(CATEGORY_SKINS)) {
    const currentStage = stages[categoryKey as CategoryKey] || 0;
    if (currentStage >= skin.requiredStage) {
      unlocked.push(skin);
    }
  }

  return unlocked;
}

/**
 * 스킨 ID로 스킨 정보 조회
 */
export function getSkinById(skinId: SkinId): TreeSkin | undefined {
  if (skinId === 'default') return DEFAULT_SKIN;
  return CATEGORY_SKINS[skinId as Exclude<CategoryKey, 'diary'>];
}

/**
 * 현재 성장 단계 계산 (기본 스킨용)
 */
export function getCurrentGrowthStage(totalCount: number): {
  stage: number;
  name: string;
  image: string;
  progress: number;
  nextStage: { name: string; minCount: number } | null;
} {
  let stageIndex = 0;
  for (let i = DEFAULT_GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (totalCount >= DEFAULT_GROWTH_STAGES[i].minCount) {
      stageIndex = i;
      break;
    }
  }

  const currentStageInfo = DEFAULT_GROWTH_STAGES[stageIndex];
  const nextStageInfo = stageIndex < DEFAULT_GROWTH_STAGES.length - 1
    ? DEFAULT_GROWTH_STAGES[stageIndex + 1]
    : null;

  const progress = nextStageInfo
    ? ((totalCount - currentStageInfo.minCount) / (nextStageInfo.minCount - currentStageInfo.minCount)) * 100
    : 100;

  return {
    stage: stageIndex,
    name: currentStageInfo.name,
    image: currentStageInfo.image,
    progress: Math.min(100, progress),
    nextStage: nextStageInfo ? { name: nextStageInfo.name, minCount: nextStageInfo.minCount } : null,
  };
}
