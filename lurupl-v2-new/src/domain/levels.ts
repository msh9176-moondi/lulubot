// 레벨 시스템 상수
export const EXP_PER_LEVEL = 5;

// 레벨 타이틀 (10레벨 단위 순환)
export const LEVEL_TITLES = [
  '새싹',
  '성장',
  '발전',
  '열정',
  '습관',
  '루틴',
  '마스터',
  '전문가',
  '영웅',
  '전설',
];

// 누적 칭호 시스템
export interface AccumulatedTitle {
  minExp: number;
  title: string;
  icon: string;
}

export const ACCUMULATED_TITLES: AccumulatedTitle[] = [
  { minExp: 0, title: '뉴비', icon: '🌱' },
  { minExp: 30, title: '루키', icon: '🥉' },
  { minExp: 80, title: '브론즈', icon: '🥈' },
  { minExp: 150, title: '실버', icon: '🥇' },
  { minExp: 300, title: '골드', icon: '⭐' },
  { minExp: 500, title: '플래티넘', icon: '💎' },
  { minExp: 800, title: '다이아', icon: '👑' },
  { minExp: 1200, title: '마스터', icon: '🔥' },
  { minExp: 2000, title: '그랜드마스터', icon: '⚡' },
  { minExp: 3000, title: '레전드', icon: '🏆' },
];

/**
 * 경험치로 레벨 계산
 */
export function calculateLevel(exp: number): number {
  if (exp <= 0) return 1;
  return Math.floor(exp / EXP_PER_LEVEL) + 1;
}

/**
 * 레벨에 필요한 최소 경험치
 */
export function getExpForLevel(level: number): number {
  return (level - 1) * EXP_PER_LEVEL;
}

/**
 * 레벨 타이틀 생성 (10레벨마다 등급 추가)
 */
export function getLevelTitle(level: number): string {
  const baseTitle = LEVEL_TITLES[(level - 1) % 10];
  const tier = Math.floor((level - 1) / 10);

  if (tier === 0) return baseTitle;

  const tierNames = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  if (tier < 10) return `${baseTitle} ${tierNames[tier]}`;
  return `${baseTitle} +${tier}`;
}

/**
 * 누적 경험치로 칭호 계산
 */
export function getAccumulatedTitle(totalExp: number): AccumulatedTitle {
  let result = ACCUMULATED_TITLES[0];
  for (const title of ACCUMULATED_TITLES) {
    if (totalExp >= title.minExp) {
      result = title;
    } else {
      break;
    }
  }
  return result;
}

/**
 * 다음 레벨까지 필요한 경험치 정보
 */
export function getExpForNextLevel(currentExp: number): {
  current: number;
  needed: number;
  progress: number;
} {
  const currentLevel = calculateLevel(currentExp);
  const currentLevelExp = getExpForLevel(currentLevel);
  const nextLevelExp = getExpForLevel(currentLevel + 1);

  const expInCurrentLevel = currentExp - currentLevelExp;
  const expNeededForNext = nextLevelExp - currentLevelExp;
  const progress = (expInCurrentLevel / expNeededForNext) * 100;

  return {
    current: expInCurrentLevel,
    needed: expNeededForNext,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

/**
 * 레벨에 따른 색상 (HSL 그라데이션)
 */
export function getLevelColor(level: number): string {
  const hue = (level * 25) % 360;
  const saturation = 70 + (level % 10) * 2;
  const lightness = 55 + (level % 5) * 2;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
