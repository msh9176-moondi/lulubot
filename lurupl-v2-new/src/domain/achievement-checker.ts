import type { CategoryKey } from './categories';

interface Certification {
  memberId: string;
  category: CategoryKey;
  certDate: string;
  certTime: string;
  finalExp: number;
}

interface AchievementCheck {
  key: string;
  achieved: boolean;
}

export interface AchievementContext {
  certifications: Certification[];
  memberCerts: Certification[];
  existingAchievements: Set<string>;
}

// Check streak (consecutive days)
function getStreak(certs: Certification[], category?: CategoryKey): number {
  const filtered = category
    ? certs.filter((c) => c.category === category)
    : certs;

  const dates = [...new Set(filtered.map((c) => c.certDate))].sort();
  if (dates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// Count certifications in current week
function getWeeklyCount(certs: Certification[], category?: CategoryKey): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const filtered = category
    ? certs.filter((c) => c.category === category)
    : certs;

  return filtered.filter((c) => new Date(c.certDate) >= startOfWeek).length;
}

// Count certifications in current month
function getMonthlyCount(certs: Certification[], category?: CategoryKey): number {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filtered = category
    ? certs.filter((c) => c.category === category)
    : certs;

  return filtered.filter((c) => c.certDate.startsWith(yearMonth)).length;
}

// Count different categories in a single day
function getDailyVariety(certs: Certification[], date: string): number {
  const dayCerts = certs.filter((c) => c.certDate === date);
  return new Set(dayCerts.map((c) => c.category)).size;
}

// Count different categories in current week
function getWeeklyVariety(certs: Certification[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekCerts = certs.filter((c) => new Date(c.certDate) >= startOfWeek);
  return new Set(weekCerts.map((c) => c.category)).size;
}

// Check early morning certifications (before 6 AM)
export function getEarlyMorningCount(certs: Certification[]): number {
  return certs.filter((c) => {
    const hour = parseInt(c.certTime.split(':')[0], 10);
    return hour < 6;
  }).length;
}

// Check all achievements for a member
export function checkAchievements(ctx: AchievementContext): AchievementCheck[] {
  const { memberCerts, existingAchievements } = ctx;
  const results: AchievementCheck[] = [];

  const categories: CategoryKey[] = [
    'cleaning',
    'exercise',
    'morning',
    'planning',
    'study',
    'medicine',
    'diary',
    'meditation',
  ];

  // Category-specific achievements
  for (const cat of categories) {
    const catCerts = memberCerts.filter((c) => c.category === cat);

    // First certification
    const firstKey = `${cat}_first`;
    if (!existingAchievements.has(firstKey) && catCerts.length >= 1) {
      results.push({ key: firstKey, achieved: true });
    }

    // Weekly count
    const weeklyKey = `${cat}_weekly`;
    const weeklyTargets: Record<string, number> = {
      cleaning: 3,
      exercise: 4,
      study: 5,
    };
    if (weeklyTargets[cat] && !existingAchievements.has(weeklyKey)) {
      const weeklyCount = getWeeklyCount(memberCerts, cat);
      if (weeklyCount >= weeklyTargets[cat]) {
        results.push({ key: weeklyKey, achieved: true });
      }
    }

    // Streak
    const streakKey = `${cat}_streak`;
    const streakTargets: Record<string, number> = {
      cleaning: 14,
      exercise: 10,
      morning: 14,
      study: 10,
      medicine: 7,
      planning: 7,
      diary: 7,
      meditation: 7,
    };
    if (streakTargets[cat] && !existingAchievements.has(streakKey)) {
      const streak = getStreak(memberCerts, cat);
      if (streak >= streakTargets[cat]) {
        results.push({ key: streakKey, achieved: true });
      }
    }

    // Monthly master
    const masterKey = `${cat}_master`;
    const masterTargets: Record<string, number> = {
      cleaning: 20,
      exercise: 25,
      study: 30,
    };
    if (masterTargets[cat] && !existingAchievements.has(masterKey)) {
      const monthlyCount = getMonthlyCount(memberCerts, cat);
      if (monthlyCount >= masterTargets[cat]) {
        results.push({ key: masterKey, achieved: true });
      }
    }
  }

  // Special achievements
  // Morning early bird (early before 6 AM)
  if (!existingAchievements.has('morning_early')) {
    const morningCerts = memberCerts.filter((c) => c.category === 'morning');
    const earlyCount = morningCerts.filter((c) => {
      const hour = parseInt(c.certTime.split(':')[0], 10);
      return hour < 6;
    }).length;
    if (earlyCount >= 10) {
      results.push({ key: 'morning_early', achieved: true });
    }
  }

  // Balance - 3 different categories in one day
  if (!existingAchievements.has('balance_daily')) {
    const dates = [...new Set(memberCerts.map((c) => c.certDate))];
    const hasBalance = dates.some((date) => getDailyVariety(memberCerts, date) >= 3);
    if (hasBalance) {
      results.push({ key: 'balance_daily', achieved: true });
    }
  }

  // All-rounder - 6 different categories in one week
  if (!existingAchievements.has('allrounder')) {
    if (getWeeklyVariety(memberCerts) >= 6) {
      results.push({ key: 'allrounder', achieved: true });
    }
  }

  // Hidden achievements

  // Owl - certification after midnight (00:00-04:00)
  if (!existingAchievements.has('hidden_owl')) {
    const hasOwl = memberCerts.some((c) => {
      const hour = parseInt(c.certTime.split(':')[0], 10);
      return hour >= 0 && hour < 4;
    });
    if (hasOwl) {
      results.push({ key: 'hidden_owl', achieved: true });
    }
  }

  // Santa - certification on Christmas
  if (!existingAchievements.has('hidden_santa')) {
    const hasSanta = memberCerts.some((c) => c.certDate.endsWith('-12-25'));
    if (hasSanta) {
      results.push({ key: 'hidden_santa', achieved: true });
    }
  }

  // Phoenix - comeback after 7+ day absence
  if (!existingAchievements.has('hidden_phoenix')) {
    const dates = [...new Set(memberCerts.map((c) => c.certDate))].sort();
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 7) {
        results.push({ key: 'hidden_phoenix', achieved: true });
        break;
      }
    }
  }

  // Century - 100 total certifications
  if (!existingAchievements.has('hidden_century')) {
    if (memberCerts.length >= 100) {
      results.push({ key: 'hidden_century', achieved: true });
    }
  }

  return results;
}
