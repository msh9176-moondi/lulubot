/**
 * Achievement Types
 * 도전 과제 타입 정의
 */

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'category' | 'integrated' | 'hidden' | 'ranking' | 'special';
  difficulty: number; // 1-5 stars
  reward?: number; // EXP reward
}
