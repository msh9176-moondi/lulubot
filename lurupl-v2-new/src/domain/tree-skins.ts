/**
 * Tree Skins Domain
 * 나무 스킨 시스템 - 파일 기반 자동 감지
 *
 * 스킨 추가 방법:
 *   1. 파일만 추가하면 자동 감지됨!
 *   2. 파일 경로: /src/assets/skins/{카테고리}/{스테이지번호}.svg
 *   3. 예: /src/assets/skins/exercise/03.svg
 *
 * 폴더 구조:
 *   /src/assets/skins/
 *     /default/           - 기본 성장 스킨 (01.svg ~ 10.svg)
 *     /exercise/          - 운동 스킨
 *     /cleaning/          - 청소 스킨
 *     /morning/           - 기상 스킨
 *     /planning/          - 계획 스킨
 *     /study/             - 공부 스킨
 *     /medicine/          - 약 스킨
 *     /diary/             - 일기 스킨
 *     /meditation/        - 명상 스킨
 *     /comeback/          - 복귀 스킨
 */

import type { CategoryKey } from './categories';

// ============================================================
// Vite의 import.meta.glob으로 모든 스킨 자동 감지
// ============================================================

const defaultSkinModules = import.meta.glob<string>(
  '/src/assets/skins/default/*.svg',
  { eager: true, import: 'default' }
);

const categorySkinModules = import.meta.glob<string>(
  '/src/assets/skins/!(default)/*.svg',
  { eager: true, import: 'default' }
);

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
// 스테이지별 이름 정의
// ============================================================

const STAGE_NAMES: Record<CategoryKey, Record<number, string>> = {
  exercise: {
    1: '아기 운동선수', 2: '운동 새싹', 3: '러너', 4: '운동 습관화',
    5: '피트니스 마스터', 6: '운동선수', 7: '스포츠맨', 8: '철인',
    9: '체력왕', 10: '운동의 화신', 11: '피트니스 레전드',
  },
  cleaning: {
    1: '아기 청소부', 2: '청소 새싹', 3: '깔끔러', 4: '청소 습관화',
    5: '청소 달인', 6: '청소 마스터', 7: '미니멀리스트', 8: '정리왕',
    9: '청결의 화신', 10: '청소 레전드', 11: '빛나는 공간',
  },
  morning: {
    1: '아기 얼리버드', 2: '기상 새싹', 3: '아침형 인간', 4: '기상 습관화',
    5: '얼리버드', 6: '새벽의 주인', 7: '아침 마스터', 8: '여명의 수호자',
    9: '기상의 화신', 10: '새벽별', 11: '태양의 아이',
  },
  planning: {
    1: '아기 계획가', 2: '계획 새싹', 3: '플래너', 4: '계획 습관화',
    5: '계획의 신', 6: '전략가', 7: '계획 마스터', 8: '시간 관리자',
    9: '계획의 화신', 10: '스케줄러', 11: '인생 설계자',
  },
  study: {
    1: '아기 학생', 2: '공부 새싹', 3: '학습자', 4: '공부 습관화',
    5: '공부 박사', 6: '학자', 7: '공부 마스터', 8: '지식인',
    9: '공부의 화신', 10: '석학', 11: '지혜의 등불',
  },
  medicine: {
    1: '아기 약사', 2: '복약 새싹', 3: '건강 지킴이', 4: '복약 습관화',
    5: '약사', 6: '건강 마스터', 7: '웰니스 전문가', 8: '건강의 수호자',
    9: '복약의 화신', 10: '건강 대사', 11: '불로장생',
  },
  diary: {
    1: '아기 작가', 2: '일기 새싹', 3: '기록자', 4: '일기 습관화',
    5: '작가', 6: '일기 마스터', 7: '스토리텔러', 8: '기록의 수호자',
    9: '일기의 화신', 10: '문필가', 11: '인생 기록자',
  },
  meditation: {
    1: '아기 명상가', 2: '명상 새싹', 3: '수행자', 4: '명상 습관화',
    5: '명상 마스터', 6: '선인', 7: '마음 수련자', 8: '고요의 수호자',
    9: '명상의 화신', 10: '도인', 11: '깨달음의 경지',
  },
  comeback: {
    1: '복귀 첫걸음', 2: '복귀 새싹', 3: '다시 시작', 4: '복귀 습관화',
    5: '불사조', 6: '복귀 마스터', 7: '불굴의 의지', 8: '재기의 수호자',
    9: '복귀의 화신', 10: '피닉스', 11: '영원한 복귀자',
  },
};

const CATEGORY_NAMES: Record<CategoryKey, string> = {
  exercise: '운동', cleaning: '청소', morning: '기상', planning: '계획',
  study: '공부', medicine: '약', diary: '일기', meditation: '명상', comeback: '복귀',
};

// ============================================================
// 파일 경로에서 스킨 정보 파싱
// ============================================================

function parseDefaultSkins(): Map<number, string> {
  const skins = new Map<number, string>();

  for (const [path, image] of Object.entries(defaultSkinModules)) {
    // /src/assets/skins/default/01.svg -> 01
    const match = path.match(/\/(\d+)\.svg$/);
    if (match) {
      const stage = parseInt(match[1], 10);
      skins.set(stage, image);
    }
  }

  return skins;
}

function parseCategorySkins(): Map<CategoryKey, Map<number, string>> {
  const skins = new Map<CategoryKey, Map<number, string>>();

  for (const [path, image] of Object.entries(categorySkinModules)) {
    // /src/assets/skins/exercise/03.svg -> exercise, 03
    const match = path.match(/\/([a-z]+)\/(\d+)\.svg$/);
    if (match) {
      const category = match[1] as CategoryKey;
      const stage = parseInt(match[2], 10);

      if (!skins.has(category)) {
        skins.set(category, new Map());
      }
      skins.get(category)!.set(stage, image);
    }
  }

  return skins;
}

// 파싱된 스킨 데이터
const DEFAULT_SKINS_MAP = parseDefaultSkins();
const CATEGORY_SKINS_MAP = parseCategorySkins();

// 디버깅: 감지된 스킨 출력
console.log('=== 스킨 자동 감지 결과 ===');
console.log('기본 스킨:', DEFAULT_SKINS_MAP.size, '개');
console.log('카테고리별 스킨:');
for (const [cat, stages] of CATEGORY_SKINS_MAP) {
  console.log(`  ${cat}: ${Array.from(stages.keys()).sort((a,b)=>a-b).join(', ')}단계`);
}

// ============================================================
// 기본 성장 단계 (총 인증 수 기준, 카테고리 무관)
// ============================================================

export const DEFAULT_GROWTH_STAGES = [
  { stage: 1, image: DEFAULT_SKINS_MAP.get(1) || '', name: '씨앗', minCount: 0 },
  { stage: 2, image: DEFAULT_SKINS_MAP.get(2) || '', name: '새싹', minCount: 10 },
  { stage: 3, image: DEFAULT_SKINS_MAP.get(3) || '', name: '떡잎', minCount: 30 },
  { stage: 4, image: DEFAULT_SKINS_MAP.get(4) || '', name: '어린 줄기', minCount: 60 },
  { stage: 5, image: DEFAULT_SKINS_MAP.get(5) || '', name: '자라는 중', minCount: 100 },
  { stage: 6, image: DEFAULT_SKINS_MAP.get(6) || '', name: '튼튼한 줄기', minCount: 150 },
  { stage: 7, image: DEFAULT_SKINS_MAP.get(7) || '', name: '가지 뻗기', minCount: 210 },
  { stage: 8, image: DEFAULT_SKINS_MAP.get(8) || '', name: '무성한 잎', minCount: 280 },
  { stage: 9, image: DEFAULT_SKINS_MAP.get(9) || '', name: '풍성한 나무', minCount: 360 },
  { stage: 10, image: DEFAULT_SKINS_MAP.get(10) || '', name: '열매 맺은 나무', minCount: 450 },
];

// ============================================================
// 기본 스킨 정의
// ============================================================

export const DEFAULT_SKIN: TreeSkin = {
  id: 'default',
  name: '기본 나무',
  description: '기본 성장 나무',
  image: DEFAULT_SKINS_MAP.get(10) || '',
  categoryKey: null,
  stageNumber: 0,
};

// ============================================================
// 헬퍼 함수들
// ============================================================

/**
 * 특정 카테고리의 특정 스테이지 스킨 이미지 반환
 */
export function getCategorySkinImage(
  categoryKey: CategoryKey,
  stageNumber: number
): string | null {
  return CATEGORY_SKINS_MAP.get(categoryKey)?.get(stageNumber) || null;
}

/**
 * 특정 카테고리의 특정 스테이지 스킨 정보 반환
 */
export function getCategorySkin(
  categoryKey: CategoryKey,
  stageNumber: number
): TreeSkin | null {
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

/**
 * 기본 스킨 이미지 반환 (총 인증수 기준)
 */
export function getDefaultSkinImage(totalCount: number): string {
  for (let i = DEFAULT_GROWTH_STAGES.length - 1; i >= 0; i--) {
    if (totalCount >= DEFAULT_GROWTH_STAGES[i].minCount) {
      return DEFAULT_GROWTH_STAGES[i].image;
    }
  }
  return DEFAULT_GROWTH_STAGES[0].image;
}

/**
 * 스킨 ID로 이미지 반환
 */
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

  // 레거시 호환: 이전 형식 지원 (categoryKey만 있는 경우 = 5단계 마스터)
  const legacyImage = getCategorySkinImage(skinId as CategoryKey, 5);
  if (legacyImage) return legacyImage;

  // 레거시 호환: baby 스킨
  if (skinId.endsWith('-baby')) {
    const categoryKey = skinId.replace('-baby', '') as CategoryKey;
    const babyImage = getCategorySkinImage(categoryKey, 1);
    if (babyImage) return babyImage;
  }

  return getDefaultSkinImage(totalCount);
}

/**
 * 획득한 스킨 목록 계산
 */
export function getUnlockedSkins(
  categoryStages: Map<CategoryKey, number> | Record<CategoryKey, number>
): TreeSkin[] {
  const unlocked: TreeSkin[] = [DEFAULT_SKIN];

  const stages = categoryStages instanceof Map
    ? Object.fromEntries(categoryStages)
    : categoryStages;

  for (const [categoryKey, stagesMap] of CATEGORY_SKINS_MAP.entries()) {
    const currentStage = stages[categoryKey] || 0;

    for (const [stageNumber] of stagesMap) {
      if (currentStage >= stageNumber) {
        const skin = getCategorySkin(categoryKey, stageNumber);
        if (skin) unlocked.push(skin);
      }
    }
  }

  return unlocked;
}

/**
 * 스킨 ID로 스킨 정보 조회
 */
export function getSkinById(skinId: string): TreeSkin | undefined {
  if (skinId === 'default') return DEFAULT_SKIN;

  // categoryKey-stageNumber 형식
  const match = skinId.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, categoryKey, stageStr] = match;
    const stageNumber = parseInt(stageStr, 10);
    return getCategorySkin(categoryKey as CategoryKey, stageNumber) || undefined;
  }

  // 레거시 호환: categoryKey만 (= 5단계)
  const legacySkin = getCategorySkin(skinId as CategoryKey, 5);
  if (legacySkin) return legacySkin;

  // 레거시 호환: baby 스킨 (= 1단계)
  if (skinId.endsWith('-baby')) {
    const categoryKey = skinId.replace('-baby', '') as CategoryKey;
    return getCategorySkin(categoryKey, 1) || undefined;
  }

  return undefined;
}

/**
 * 특정 스테이지 해금 시 획득할 스킨 반환
 */
export function getSkinRewardForStage(
  categoryKey: CategoryKey,
  stageNumber: number
): TreeSkin | null {
  return getCategorySkin(categoryKey, stageNumber);
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

/**
 * 카테고리에서 사용 가능한 스킨 스테이지 목록
 */
export function getAvailableSkinStages(categoryKey: CategoryKey): number[] {
  const stagesMap = CATEGORY_SKINS_MAP.get(categoryKey);
  if (!stagesMap) return [];
  return Array.from(stagesMap.keys()).sort((a, b) => a - b);
}

/**
 * 모든 스킨 목록
 */
export function getAllSkins(): TreeSkin[] {
  const skins: TreeSkin[] = [DEFAULT_SKIN];

  for (const [categoryKey, stagesMap] of CATEGORY_SKINS_MAP.entries()) {
    for (const [stageNumber] of stagesMap) {
      const skin = getCategorySkin(categoryKey, stageNumber);
      if (skin) skins.push(skin);
    }
  }

  return skins;
}

// 레거시 호환
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
  const config: Partial<Record<CategoryKey, CategorySkinConfig>> = {};

  for (const [categoryKey, stagesMap] of CATEGORY_SKINS_MAP.entries()) {
    const stages: Record<number, string> = {};
    for (const [stageNumber, image] of stagesMap) {
      stages[stageNumber] = image;
    }

    config[categoryKey] = {
      categoryKey,
      categoryName: CATEGORY_NAMES[categoryKey] || categoryKey,
      stages,
      stageNames: STAGE_NAMES[categoryKey] || {},
    };
  }

  // 스킨이 없는 카테고리도 빈 config로 추가
  const allCategories: CategoryKey[] = ['exercise', 'cleaning', 'morning', 'planning', 'study', 'medicine', 'diary', 'meditation', 'comeback'];
  for (const cat of allCategories) {
    if (!config[cat]) {
      config[cat] = {
        categoryKey: cat,
        categoryName: CATEGORY_NAMES[cat] || cat,
        stages: {},
        stageNames: STAGE_NAMES[cat] || {},
      };
    }
  }

  return config as Record<CategoryKey, CategorySkinConfig>;
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

  for (const [categoryKey, stagesMap] of CATEGORY_SKINS_MAP.entries()) {
    const image = stagesMap.get(1);
    if (image) {
      skins[categoryKey] = {
        id: `${categoryKey}-baby`,
        name: STAGE_NAMES[categoryKey]?.[1] || `${CATEGORY_NAMES[categoryKey]} 1단계`,
        description: `${CATEGORY_NAMES[categoryKey]} 1단계(첫걸음마) 달성 보상`,
        image,
        categoryKey,
        requiredStage: 1,
      };
    }
  }

  return skins;
}

function buildCategorySkins(): Partial<Record<CategoryKey, LegacyTreeSkin>> {
  const skins: Partial<Record<CategoryKey, LegacyTreeSkin>> = {};

  for (const [categoryKey, stagesMap] of CATEGORY_SKINS_MAP.entries()) {
    const image = stagesMap.get(5);
    if (image) {
      skins[categoryKey] = {
        id: categoryKey,
        name: STAGE_NAMES[categoryKey]?.[5] || `${CATEGORY_NAMES[categoryKey]} 마스터`,
        description: `${CATEGORY_NAMES[categoryKey]} 카테고리 5단계 달성 보상`,
        image,
        categoryKey,
        requiredStage: 5,
      };
    }
  }

  return skins;
}

/** @deprecated */
export const BABY_SKINS = buildBabySkins();

/** @deprecated */
export const CATEGORY_SKINS = buildCategorySkins() as Record<Exclude<CategoryKey, 'diary'>, LegacyTreeSkin>;

// SkinId 타입 (레거시 호환)
export type SkinId = string;
