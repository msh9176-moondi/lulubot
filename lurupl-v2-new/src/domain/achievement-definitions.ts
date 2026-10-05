/**
 * Achievement Definitions
 * 도전 과제 정의 (31개)
 */

import type { AchievementDefinition } from './achievement-types';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ========== 카테고리별 첫 인증 (8개) ==========
  {
    key: 'cleaning_first',
    name: '첫 걸음',
    description: '청소 카테고리 첫 인증',
    icon: '🧹',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'exercise_first',
    name: '몸풀기',
    description: '운동 카테고리 첫 인증',
    icon: '🏃',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'morning_first',
    name: '눈떠요',
    description: '기상 카테고리 첫 인증',
    icon: '⏰',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'planning_first',
    name: '계획 시작',
    description: '계획 카테고리 첫 인증',
    icon: '📋',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'study_first',
    name: '배움의 시작',
    description: '공부 카테고리 첫 인증',
    icon: '📚',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'medicine_first',
    name: '건강 관리',
    description: '복약 카테고리 첫 인증',
    icon: '💊',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'diary_first',
    name: '일기 시작',
    description: '다이어리 카테고리 첫 인증',
    icon: '📝',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },
  {
    key: 'meditation_first',
    name: '마음 챙김',
    description: '명상 카테고리 첫 인증',
    icon: '🧘',
    category: 'category',
    difficulty: 1,
    reward: 5,
  },

  // ========== 주간 달성 (3개) ==========
  {
    key: 'cleaning_weekly',
    name: '청소 습관',
    description: '주간 청소 인증 3회 달성',
    icon: '✨',
    category: 'category',
    difficulty: 2,
    reward: 10,
  },
  {
    key: 'exercise_weekly',
    name: '운동 루틴',
    description: '주간 운동 인증 4회 달성',
    icon: '💪',
    category: 'category',
    difficulty: 2,
    reward: 10,
  },
  {
    key: 'study_weekly',
    name: '학습 습관',
    description: '주간 공부 인증 5회 달성',
    icon: '📖',
    category: 'category',
    difficulty: 2,
    reward: 10,
  },

  // ========== 연속 달성 (스트릭) (8개) ==========
  {
    key: 'cleaning_streak',
    name: '청결 마스터',
    description: '청소 14일 연속 인증',
    icon: '🏠',
    category: 'category',
    difficulty: 4,
    reward: 30,
  },
  {
    key: 'exercise_streak',
    name: '운동 마스터',
    description: '운동 10일 연속 인증',
    icon: '🏆',
    category: 'category',
    difficulty: 4,
    reward: 30,
  },
  {
    key: 'morning_streak',
    name: '얼리버드',
    description: '기상 14일 연속 인증',
    icon: '🌅',
    category: 'category',
    difficulty: 4,
    reward: 30,
  },
  {
    key: 'planning_streak',
    name: '계획의 달인',
    description: '계획 7일 연속 인증',
    icon: '🎯',
    category: 'category',
    difficulty: 3,
    reward: 20,
  },
  {
    key: 'study_streak',
    name: '학습 마스터',
    description: '공부 10일 연속 인증',
    icon: '🎓',
    category: 'category',
    difficulty: 4,
    reward: 30,
  },
  {
    key: 'medicine_streak',
    name: '건강 지킴이',
    description: '복약 7일 연속 인증',
    icon: '💚',
    category: 'category',
    difficulty: 3,
    reward: 20,
  },
  {
    key: 'diary_streak',
    name: '기록의 달인',
    description: '다이어리 7일 연속 인증',
    icon: '📔',
    category: 'category',
    difficulty: 3,
    reward: 20,
  },
  {
    key: 'meditation_streak',
    name: '명상 마스터',
    description: '명상 7일 연속 인증',
    icon: '🪷',
    category: 'category',
    difficulty: 3,
    reward: 20,
  },

  // ========== 월간 달성 (3개) ==========
  {
    key: 'cleaning_master',
    name: '깨끗함의 왕',
    description: '월간 청소 인증 20회 달성',
    icon: '👑',
    category: 'category',
    difficulty: 4,
    reward: 50,
  },
  {
    key: 'exercise_master',
    name: '근육몬',
    description: '월간 운동 인증 25회 달성',
    icon: '🏅',
    category: 'category',
    difficulty: 5,
    reward: 50,
  },
  {
    key: 'study_master',
    name: '학습왕',
    description: '월간 공부 인증 30회 달성',
    icon: '📚',
    category: 'category',
    difficulty: 5,
    reward: 50,
  },

  // ========== 통합 도전 과제 (3개) ==========
  {
    key: 'morning_early',
    name: '새벽의 아이',
    description: '새벽 6시 전 기상 인증 10회',
    icon: '🌙',
    category: 'integrated',
    difficulty: 4,
    reward: 30,
  },
  {
    key: 'balance_daily',
    name: '균형잡힌 하루',
    description: '하루에 3가지 카테고리 인증',
    icon: '⚖️',
    category: 'integrated',
    difficulty: 2,
    reward: 15,
  },
  {
    key: 'allrounder',
    name: '올라운더',
    description: '주간 6가지 이상 카테고리 인증',
    icon: '🌟',
    category: 'integrated',
    difficulty: 3,
    reward: 25,
  },

  // ========== 히든 도전 과제 (4개) ==========
  {
    key: 'hidden_owl',
    name: '부엉이',
    description: '자정~새벽 4시 사이 인증',
    icon: '🦉',
    category: 'hidden',
    difficulty: 2,
    reward: 10,
  },
  {
    key: 'hidden_santa',
    name: '산타',
    description: '크리스마스에 인증',
    icon: '🎅',
    category: 'hidden',
    difficulty: 2,
    reward: 20,
  },
  {
    key: 'hidden_phoenix',
    name: '불사조',
    description: '7일 이상 공백 후 복귀',
    icon: '🔥',
    category: 'hidden',
    difficulty: 2,
    reward: 15,
  },
  {
    key: 'hidden_century',
    name: '센추리온',
    description: '총 인증 100회 달성',
    icon: '💯',
    category: 'hidden',
    difficulty: 4,
    reward: 100,
  },
];

// 도전 과제 키로 정의 찾기
export const getAchievementByKey = (key: string): AchievementDefinition | undefined => {
  return ACHIEVEMENTS.find(a => a.key === key);
};

// 카테고리별 도전 과제 필터
export const getAchievementsByCategory = (category: AchievementDefinition['category']): AchievementDefinition[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};
