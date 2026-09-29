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
  color: string;
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
    color: '#06b6d4',
    baseExp: 2,
    dailyLimit: 3,
    tags: ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
  },
  exercise: {
    key: 'exercise',
    name: '운동',
    emoji: '🏃',
    color: '#22c55e',
    baseExp: 3,
    dailyLimit: 2,
    tags: ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
  },
  morning: {
    key: 'morning',
    name: '기상',
    emoji: '⏰',
    color: '#f59e0b',
    baseExp: 2,
    dailyLimit: 1,
    tags: ['#기상', '#굿모닝', '#아침'],
  },
  planning: {
    key: 'planning',
    name: '계획',
    emoji: '📋',
    color: '#ec4899',
    baseExp: 3,
    dailyLimit: 1,
    tags: ['#계획', '#계획표', '#투두', '#todo', '#할일'],
  },
  study: {
    key: 'study',
    name: '공부',
    emoji: '📚',
    color: '#6366f1',
    baseExp: 3,
    dailyLimit: 3,
    tags: ['#공부', '#스터디', '#독서', '#학습'],
  },
  medicine: {
    key: 'medicine',
    name: '약',
    emoji: '💊',
    color: '#14b8a6',
    baseExp: 1,
    dailyLimit: 1,
    tags: ['#약', '#복약', '#약먹기', '#약복용', '#영양제'],
  },
  diary: {
    key: 'diary',
    name: '일기',
    emoji: '📝',
    color: '#a855f7',
    baseExp: 2,
    dailyLimit: 1,
    tags: ['#일기', '#감사일기', '#하루기록', '#오늘하루', '#일상'],
  },
  meditation: {
    key: 'meditation',
    name: '명상',
    emoji: '🧘',
    color: '#8b5cf6',
    baseExp: 2,
    dailyLimit: 2,
    tags: ['#명상', '#마음챙김', '#호흡', '#묵상'],
  },
  comeback: {
    key: 'comeback',
    name: '복귀',
    emoji: '🔄',
    color: '#ef4444',
    baseExp: 3,
    dailyLimit: 999,
    cooldownHours: 72,
    tags: ['#복귀', '#컴백', '#돌아왔어'],
  },
};

// 배열 형태의 카테고리 목록
export const CATEGORIES = Object.values(DEFAULT_CATEGORIES);

export const CATEGORY_KEYS = Object.keys(DEFAULT_CATEGORIES) as CategoryKey[];

// 카테고리 색상 매핑 (레거시 호환)
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
