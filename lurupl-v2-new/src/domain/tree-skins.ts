/**
 * Tree Skins Domain
 * 나무 스킨 시스템 - 명시적 import 방식
 */

import type { CategoryKey } from './categories';

// ============================================================
// 명시적 SVG 파일 import (프로덕션 빌드 호환성 보장)
// ============================================================

// 기본 스킨
import default01 from '@/assets/skins/default/01.svg';
import default02 from '@/assets/skins/default/02.svg';
import default03 from '@/assets/skins/default/03.svg';
import default04 from '@/assets/skins/default/04.svg';
import default05 from '@/assets/skins/default/05.svg';
import default06 from '@/assets/skins/default/06.svg';
import default07 from '@/assets/skins/default/07.svg';
import default08 from '@/assets/skins/default/08.svg';
import default09 from '@/assets/skins/default/09.svg';
import default10 from '@/assets/skins/default/10.svg';

// 운동 스킨
import exercise01 from '@/assets/skins/exercise/01.svg';
import exercise02 from '@/assets/skins/exercise/02.svg';
import exercise03 from '@/assets/skins/exercise/03.svg';
import exercise04 from '@/assets/skins/exercise/04.svg';
import exercise05 from '@/assets/skins/exercise/05.svg';

// 청소 스킨
import cleaning01 from '@/assets/skins/cleaning/01.svg';
import cleaning02 from '@/assets/skins/cleaning/02.svg';
import cleaning03 from '@/assets/skins/cleaning/03.svg';
import cleaning04 from '@/assets/skins/cleaning/04.svg';
import cleaning05 from '@/assets/skins/cleaning/05.svg';

// 기상 스킨
import morning01 from '@/assets/skins/morning/01.svg';
import morning02 from '@/assets/skins/morning/02.svg';
import morning03 from '@/assets/skins/morning/03.svg';
import morning04 from '@/assets/skins/morning/04.svg';
import morning05 from '@/assets/skins/morning/05.svg';

// 계획 스킨
import planning01 from '@/assets/skins/planning/01.svg';
import planning02 from '@/assets/skins/planning/02.svg';
import planning03 from '@/assets/skins/planning/03.svg';
import planning04 from '@/assets/skins/planning/04.svg';
import planning05 from '@/assets/skins/planning/05.svg';

// 공부 스킨
import study01 from '@/assets/skins/study/01.svg';
import study02 from '@/assets/skins/study/02.svg';
import study03 from '@/assets/skins/study/03.svg';
import study04 from '@/assets/skins/study/04.svg';
import study05 from '@/assets/skins/study/05.svg';

// 약 스킨
import medicine01 from '@/assets/skins/medicine/01.svg';
import medicine02 from '@/assets/skins/medicine/02.svg';
import medicine03 from '@/assets/skins/medicine/03.svg';
import medicine04 from '@/assets/skins/medicine/04.svg';
import medicine05 from '@/assets/skins/medicine/05.svg';

// 일기 스킨
import diary01 from '@/assets/skins/diary/01.svg';
import diary02 from '@/assets/skins/diary/02.svg';
import diary03 from '@/assets/skins/diary/03.svg';
import diary04 from '@/assets/skins/diary/04.svg';
import diary05 from '@/assets/skins/diary/05.svg';

// 명상 스킨
import meditation01 from '@/assets/skins/meditation/01.svg';
import meditation02 from '@/assets/skins/meditation/02.svg';
import meditation03 from '@/assets/skins/meditation/03.svg';
import meditation04 from '@/assets/skins/meditation/04.svg';
import meditation05 from '@/assets/skins/meditation/05.svg';

// 복귀 스킨
import comeback05 from '@/assets/skins/comeback/05.svg';

// ============================================================
// 타입 정의
// ============================================================

export interface TreeSkin {
  id: string;
  name: string;
  description: string;
  image: string;
  categoryKey: CategoryKey | null;
  stageNumber: number;
}

// ============================================================
// 스킨 데이터 정의
// ============================================================

const DEFAULT_SKINS: Record<number, string> = {
  1: default01, 2: default02, 3: default03, 4: default04, 5: default05,
  6: default06, 7: default07, 8: default08, 9: default09, 10: default10,
};

const CATEGORY_SKINS: Record<CategoryKey, Record<number, string>> = {
  exercise: { 1: exercise01, 2: exercise02, 3: exercise03, 4: exercise04, 5: exercise05 },
  cleaning: { 1: cleaning01, 2: cleaning02, 3: cleaning03, 4: cleaning04, 5: cleaning05 },
  morning: { 1: morning01, 2: morning02, 3: morning03, 4: morning04, 5: morning05 },
  planning: { 1: planning01, 2: planning02, 3: planning03, 4: planning04, 5: planning05 },
  study: { 1: study01, 2: study02, 3: study03, 4: study04, 5: study05 },
  medicine: { 1: medicine01, 2: medicine02, 3: medicine03, 4: medicine04, 5: medicine05 },
  diary: { 1: diary01, 2: diary02, 3: diary03, 4: diary04, 5: diary05 },
  meditation: { 1: meditation01, 2: meditation02, 3: meditation03, 4: meditation04, 5: meditation05 },
  comeback: { 5: comeback05 },
};

// ============================================================
// 스테이지별 이름 정의
// ============================================================

const STAGE_NAMES: Record<CategoryKey, Record<number, string>> = {
  exercise: { 1: '아기 운동선수', 2: '운동 새싹', 3: '러너', 4: '운동 습관화', 5: '피트니스 마스터' },
  cleaning: { 1: '아기 청소부', 2: '청소 새싹', 3: '깔끔러', 4: '청소 습관화', 5: '청소 달인' },
  morning: { 1: '아기 얼리버드', 2: '기상 새싹', 3: '아침형 인간', 4: '기상 습관화', 5: '얼리버드' },
  planning: { 1: '아기 계획가', 2: '계획 새싹', 3: '플래너', 4: '계획 습관화', 5: '계획의 신' },
  study: { 1: '아기 학생', 2: '공부 새싹', 3: '학습자', 4: '공부 습관화', 5: '공부 박사' },
  medicine: { 1: '아기 약사', 2: '복약 새싹', 3: '건강 지킴이', 4: '복약 습관화', 5: '약사' },
  diary: { 1: '아기 작가', 2: '일기 새싹', 3: '기록자', 4: '일기 습관화', 5: '작가' },
  meditation: { 1: '아기 명상가', 2: '명상 새싹', 3: '수행자', 4: '명상 습관화', 5: '명상 마스터' },
  comeback: { 5: '불사조' },
};

const CATEGORY_NAMES: Record<CategoryKey, string> = {
  exercise: '운동', cleaning: '청소', morning: '기상', planning: '계획',
  study: '공부', medicine: '약', diary: '일기', meditation: '명상', comeback: '복귀',
};

// ============================================================
// 기본 성장 단계 (총 인증 수 기준, 카테고리 무관)
// ============================================================

export const DEFAULT_GROWTH_STAGES = [
  { stage: 1, image: DEFAULT_SKINS[1], name: '씨앗', minCount: 0 },
  { stage: 2, image: DEFAULT_SKINS[2], name: '새싹', minCount: 10 },
  { stage: 3, image: DEFAULT_SKINS[3], name: '떡잎', minCount: 30 },
  { stage: 4, image: DEFAULT_SKINS[4], name: '어린 줄기', minCount: 60 },
  { stage: 5, image: DEFAULT_SKINS[5], name: '자라는 중', minCount: 100 },
  { stage: 6, image: DEFAULT_SKINS[6], name: '튼튼한 줄기', minCount: 150 },
  { stage: 7, image: DEFAULT_SKINS[7], name: '가지 뻗기', minCount: 210 },
  { stage: 8, image: DEFAULT_SKINS[8], name: '무성한 잎', minCount: 280 },
  { stage: 9, image: DEFAULT_SKINS[9], name: '풍성한 나무', minCount: 360 },
  { stage: 10, image: DEFAULT_SKINS[10], name: '열매 맺은 나무', minCount: 450 },
];

// ============================================================
// 기본 스킨 정의
// ============================================================

export const DEFAULT_SKIN: TreeSkin = {
  id: 'default',
  name: '기본 나무',
  description: '기본 성장 나무',
  image: DEFAULT_SKINS[10],
  categoryKey: null,
  stageNumber: 0,
};

// ============================================================
// 헬퍼 함수들
// ============================================================

export function getCategorySkinImage(categoryKey: CategoryKey, stageNumber: number): string | null {
  return CATEGORY_SKINS[categoryKey]?.[stageNumber] || null;
}

export function getCategorySkin(categoryKey: CategoryKey, stageNumber: number): TreeSkin | null {
  const image = getCategorySkinImage(categoryKey, stageNumber);
  if (!image) return null;

  const categoryName = CATEGORY_NAMES[categoryKey] || categoryKey;
  const stageName = STAGE_NAMES[categoryKey]?.[stageNumber] || `${categoryName} ${stageNumber}단계`;

  return {
    id: `${categoryKey}-${stageNumber}`,
    name: stageName,
    description: `${categoryName} ${stageNumber}단계 달성 보상`,
    image,
    categoryKey,
    stageNumber,
  };
}

export function getDefaultSkinImage(totalCount: number): string {
  for (let i = DEFAULT_GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (totalCount >= DEFAULT_GROWTH_STAGES[i].minCount) {
      return DEFAULT_GROWTH_STAGES[i].image;
    }
  }
  return DEFAULT_GROWTH_STAGES[0].image;
}

export function getSkinImage(skinId: string, totalCount: number = 0): string {
  if (skinId === 'default') {
    return getDefaultSkinImage(totalCount);
  }

  // categoryKey-stageNumber 형식 파싱
  const match = skinId.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, categoryKey, stageStr] = match;
    const stageNumber = parseInt(stageStr, 10);
    const image = getCategorySkinImage(categoryKey as CategoryKey, stageNumber);
    if (image) return image;
  }

  // 레거시 호환: categoryKey만 (= 5단계)
  const legacyImage = getCategorySkinImage(skinId as CategoryKey, 5);
  if (legacyImage) return legacyImage;

  // 레거시 호환: baby 스킨 (= 1단계)
  if (skinId.endsWith('-baby')) {
    const categoryKey = skinId.replace('-baby', '') as CategoryKey;
    const babyImage = getCategorySkinImage(categoryKey, 1);
    if (babyImage) return babyImage;
  }

  return getDefaultSkinImage(totalCount);
}

export function getUnlockedSkins(
  categoryStages: Map<CategoryKey, number> | Record<CategoryKey, number>
): TreeSkin[] {
  const unlocked: TreeSkin[] = [DEFAULT_SKIN];

  const stages = categoryStages instanceof Map
    ? Object.fromEntries(categoryStages)
    : categoryStages;

  for (const [categoryKey, stagesObj] of Object.entries(CATEGORY_SKINS)) {
    const currentStage = stages[categoryKey as CategoryKey] || 0;

    for (const stageStr of Object.keys(stagesObj)) {
      const stageNumber = parseInt(stageStr, 10);
      if (currentStage >= stageNumber) {
        const skin = getCategorySkin(categoryKey as CategoryKey, stageNumber);
        if (skin) unlocked.push(skin);
      }
    }
  }

  return unlocked;
}

export function getSkinById(skinId: string): TreeSkin | undefined {
  if (skinId === 'default') return DEFAULT_SKIN;

  const match = skinId.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, categoryKey, stageStr] = match;
    const stageNumber = parseInt(stageStr, 10);
    return getCategorySkin(categoryKey as CategoryKey, stageNumber) || undefined;
  }

  // 레거시 호환
  const legacySkin = getCategorySkin(skinId as CategoryKey, 5);
  if (legacySkin) return legacySkin;

  if (skinId.endsWith('-baby')) {
    const categoryKey = skinId.replace('-baby', '') as CategoryKey;
    return getCategorySkin(categoryKey, 1) || undefined;
  }

  return undefined;
}

export function getSkinRewardForStage(categoryKey: CategoryKey, stageNumber: number): TreeSkin | null {
  return getCategorySkin(categoryKey, stageNumber);
}

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

export function getAvailableSkinStages(categoryKey: CategoryKey): number[] {
  const stagesObj = CATEGORY_SKINS[categoryKey];
  if (!stagesObj) return [];
  return Object.keys(stagesObj).map(s => parseInt(s, 10)).sort((a, b) => a - b);
}

export function getAllSkins(): TreeSkin[] {
  const skins: TreeSkin[] = [DEFAULT_SKIN];

  for (const [categoryKey, stagesObj] of Object.entries(CATEGORY_SKINS)) {
    for (const stageStr of Object.keys(stagesObj)) {
      const stageNumber = parseInt(stageStr, 10);
      const skin = getCategorySkin(categoryKey as CategoryKey, stageNumber);
      if (skin) skins.push(skin);
    }
  }

  return skins;
}

export const ALL_SKINS = getAllSkins();

// ============================================================
// CATEGORY_SKIN_CONFIG (TreeSkinSelector용)
// ============================================================

export interface CategorySkinConfig {
  categoryKey: CategoryKey;
  categoryName: string;
  stages: Record<number, string>;
  stageNames: Record<number, string>;
}

function buildCategorySkinConfig(): Record<CategoryKey, CategorySkinConfig> {
  const config: Record<CategoryKey, CategorySkinConfig> = {} as Record<CategoryKey, CategorySkinConfig>;

  const allCategories: CategoryKey[] = ['exercise', 'cleaning', 'morning', 'planning', 'study', 'medicine', 'diary', 'meditation', 'comeback'];

  for (const cat of allCategories) {
    config[cat] = {
      categoryKey: cat,
      categoryName: CATEGORY_NAMES[cat] || cat,
      stages: CATEGORY_SKINS[cat] || {},
      stageNames: STAGE_NAMES[cat] || {},
    };
  }

  return config;
}

export const CATEGORY_SKIN_CONFIG = buildCategorySkinConfig();

// ============================================================
// 레거시 호환용 export
// ============================================================

export interface LegacyTreeSkin {
  id: string;
  name: string;
  description: string;
  image: string;
  categoryKey: CategoryKey | null;
  requiredStage: number;
}

function buildBabySkins(): Partial<Record<CategoryKey, LegacyTreeSkin>> {
  const skins: Partial<Record<CategoryKey, LegacyTreeSkin>> = {};

  for (const [categoryKey, stagesObj] of Object.entries(CATEGORY_SKINS)) {
    const image = stagesObj[1];
    if (image) {
      skins[categoryKey as CategoryKey] = {
        id: `${categoryKey}-baby`,
        name: STAGE_NAMES[categoryKey as CategoryKey]?.[1] || `${CATEGORY_NAMES[categoryKey as CategoryKey]} 1단계`,
        description: `${CATEGORY_NAMES[categoryKey as CategoryKey]} 1단계(첫걸음마) 달성 보상`,
        image,
        categoryKey: categoryKey as CategoryKey,
        requiredStage: 1,
      };
    }
  }

  return skins;
}

function buildLegacyCategorySkins(): Partial<Record<CategoryKey, LegacyTreeSkin>> {
  const skins: Partial<Record<CategoryKey, LegacyTreeSkin>> = {};

  for (const [categoryKey, stagesObj] of Object.entries(CATEGORY_SKINS)) {
    const image = stagesObj[5];
    if (image) {
      skins[categoryKey as CategoryKey] = {
        id: categoryKey,
        name: STAGE_NAMES[categoryKey as CategoryKey]?.[5] || `${CATEGORY_NAMES[categoryKey as CategoryKey]} 마스터`,
        description: `${CATEGORY_NAMES[categoryKey as CategoryKey]} 카테고리 5단계 달성 보상`,
        image,
        categoryKey: categoryKey as CategoryKey,
        requiredStage: 5,
      };
    }
  }

  return skins;
}

/** @deprecated */
export const BABY_SKINS = buildBabySkins();

/** @deprecated */
export const CATEGORY_SKINS_LEGACY = buildLegacyCategorySkins() as Record<Exclude<CategoryKey, 'diary'>, LegacyTreeSkin>;

// SkinId 타입 (레거시 호환)
export type SkinId = string;

/**
 * 스킨이 확대 표시가 필요한지 확인 (2-4단계 카테고리 스킨)
 */
export function shouldScaleSkin(skinId: string): boolean {
  if (skinId === 'default') return false;

  const match = skinId.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const stageNumber = parseInt(match[2], 10);
    return stageNumber >= 2 && stageNumber <= 4;
  }

  return false;
}
