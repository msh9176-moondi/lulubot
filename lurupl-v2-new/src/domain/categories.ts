// 카테고리 타입 정의
export type CategoryKey =
  | 'cleaning'
  | 'exercise'
  | 'morning'
  | 'planning'
  | 'study'
  | 'medicine'
  | 'diary'
  | 'meditation'
  | 'comeback';

export interface Category {
  key: CategoryKey;
  name: string;
  emoji: string;
  baseExp: number;
  dailyLimit: number;
  cooldownHours?: number;
  tags: string[];
}

// 기본 카테고리 정의 (DB에서 로드 전 폴백용)
export const DEFAULT_CATEGORIES: Record<CategoryKey, Category> = {
  cleaning: {
    key: 'cleaning',
    name: '청소',
    emoji: '🧹',
    baseExp: 2,
    dailyLimit: 3,
    tags: ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
  },
  exercise: {
    key: 'exercise',
    name: '운동',
    emoji: '🏃',
    baseExp: 3,
    dailyLimit: 2,
    tags: ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
  },
  morning: {
    key: 'morning',
    name: '기상',
    emoji: '⏰',
    baseExp: 2,
    dailyLimit: 1,
    tags: ['#기상', '#굿모닝', '#아침'],
  },
  planning: {
    key: 'planning',
    name: '계획',
    emoji: '📋',
    baseExp: 3,
    dailyLimit: 1,
    tags: ['#계획', '#계획표', '#투두', '#todo', '#할일'],
  },
  study: {
    key: 'study',
    name: '공부',
    emoji: '📚',
    baseExp: 3,
    dailyLimit: 3,
    tags: ['#공부', '#스터디', '#독서', '#학습'],
  },
  medicine: {
    key: 'medicine',
    name: '약',
    emoji: '💊',
    baseExp: 1,
    dailyLimit: 1,
    tags: ['#약', '#복약', '#약먹기', '#약복용', '#영양제'],
  },
  diary: {
    key: 'diary',
    name: '일기',
    emoji: '📝',
    baseExp: 2,
    dailyLimit: 1,
    tags: ['#일기', '#감사일기', '#하루기록', '#오늘하루', '#일상'],
  },
  meditation: {
    key: 'meditation',
    name: '명상',
    emoji: '🧘',
    baseExp: 2,
    dailyLimit: 2,
    tags: ['#명상', '#마음챙김', '#호흡', '#묵상'],
  },
  comeback: {
    key: 'comeback',
    name: '복귀',
    emoji: '🔄',
    baseExp: 3,
    dailyLimit: 999,
    cooldownHours: 72,
    tags: ['#복귀', '#컴백', '#돌아왔어'],
  },
};

export const CATEGORY_KEYS = Object.keys(DEFAULT_CATEGORIES) as CategoryKey[];

// 카테고리 색상 매핑
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  cleaning: '#06b6d4',
  exercise: '#22c55e',
  morning: '#f59e0b',
  planning: '#ec4899',
  study: '#6366f1',
  medicine: '#14b8a6',
  diary: '#a855f7',
  meditation: '#8b5cf6',
  comeback: '#ef4444',
};
