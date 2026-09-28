import type { CategoryKey } from './categories';

export interface CategoryTitle {
  category: CategoryKey;
  title: string;
  emoji: string;
  count: number;
}

const CATEGORY_TITLES: Record<CategoryKey, { title: string; emoji: string; minCount: number }> = {
  cleaning: { title: '가정의 수호자', emoji: '🏠', minCount: 30 },
  exercise: { title: '운동선수', emoji: '💪', minCount: 30 },
  morning: { title: '얼리버드', emoji: '🌅', minCount: 20 },
  planning: { title: '전략가', emoji: '🎯', minCount: 20 },
  study: { title: '학자', emoji: '🎓', minCount: 30 },
  medicine: { title: '건강지킴이', emoji: '❤️', minCount: 20 },
  diary: { title: '기록왕', emoji: '✍️', minCount: 20 },
  meditation: { title: '마음챙김 마스터', emoji: '🧘', minCount: 20 },
  comeback: { title: '불사조', emoji: '🔥', minCount: 10 },
};

/**
 * Calculate category title based on certification counts
 * Returns the title for the most certified category if it meets the minimum requirement
 */
export function getCategoryTitle(
  categoryCounts: Record<string, number>
): CategoryTitle | null {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return null;
  }

  // Find the category with the most certifications
  let topCategory: CategoryKey | null = null;
  let maxCount = 0;

  for (const [category, count] of Object.entries(categoryCounts)) {
    const key = category as CategoryKey;
    if (CATEGORY_TITLES[key] && count > maxCount) {
      maxCount = count;
      topCategory = key;
    }
  }

  // Check if the minimum count requirement is met
  if (topCategory && maxCount >= CATEGORY_TITLES[topCategory].minCount) {
    return {
      category: topCategory,
      title: CATEGORY_TITLES[topCategory].title,
      emoji: CATEGORY_TITLES[topCategory].emoji,
      count: maxCount,
    };
  }

  return null;
}

/**
 * Get progress towards earning a category title
 */
export function getCategoryTitleProgress(
  categoryCounts: Record<string, number>
): { category: CategoryKey; current: number; required: number; percentage: number } | null {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return null;
  }

  // Find the category with the most certifications
  let topCategory: CategoryKey | null = null;
  let maxCount = 0;

  for (const [category, count] of Object.entries(categoryCounts)) {
    const key = category as CategoryKey;
    if (CATEGORY_TITLES[key] && count > maxCount) {
      maxCount = count;
      topCategory = key;
    }
  }

  if (topCategory) {
    const required = CATEGORY_TITLES[topCategory].minCount;
    return {
      category: topCategory,
      current: maxCount,
      required,
      percentage: Math.min(Math.round((maxCount / required) * 100), 100),
    };
  }

  return null;
}
