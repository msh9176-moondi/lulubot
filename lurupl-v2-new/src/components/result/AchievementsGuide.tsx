import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Achievement {
  key: string;
  name: string;
  emoji: string | null;
  category: string | null;
  type: string;
  target: number;
  difficulty: number;
  is_hidden: boolean;
  hint: string | null;
}

const CATEGORY_INFO: Record<string, { name: string; emoji: string }> = {
  cleaning: { name: '청소', emoji: '🧹' },
  exercise: { name: '운동', emoji: '🏃' },
  morning: { name: '기상', emoji: '⏰' },
  planning: { name: '계획', emoji: '📋' },
  study: { name: '공부', emoji: '📚' },
  medicine: { name: '약', emoji: '💊' },
  diary: { name: '일기', emoji: '📝' },
  meditation: { name: '명상', emoji: '🧘' },
  special: { name: '통합', emoji: '🌈' },
  ranking: { name: '랭킹', emoji: '🏆' },
  hidden: { name: '히든', emoji: '🎭' },
};

const CONDITION_TEXT: Record<string, (target: number) => string> = {
  first: () => '첫 인증',
  weekly: (t) => `7일간 ${t}회 이상`,
  streak: (t) => `${t}일 연속`,
  monthly: (t) => `월 ${t}회 이상`,
  early: (t) => `오전 6시 이전 ${t}회`,
  daily_variety: (t) => `하루 ${t}카테고리 이상`,
  weekly_variety: (t) => `주간 ${t}카테고리 이상`,
  monthly_all: () => '월간 전 카테고리 인증',
  hidden_owl: () => '자정~새벽 4시 인증',
  hidden_santa: () => '12월 25일 인증',
  hidden_phoenix: () => '복귀 후 7일 연속 인증',
  hidden_perfect: () => '하루 전 카테고리 인증',
  hidden_century: (t) => `누적 ${t}회 인증`,
  hidden_ghost: (t) => `주말에만 ${t}주 연속`,
  // 랭킹 도전과제
  ranking_first: () => '월간 랭킹 1위',
  ranking_second: () => '월간 랭킹 2위',
  ranking_third: () => '월간 랭킹 3위',
  ranking_first_count: (t) => `월간 1위 ${t}회 달성`,
  ranking_top3_count: (t) => `월간 TOP3 ${t}회 달성`,
  ranking_top3_streak: (t) => `${t}개월 연속 TOP3`,
};

const categoryOrder = [
  'cleaning', 'exercise', 'morning', 'study',
  'medicine', 'planning', 'diary', 'meditation',
  'special', 'ranking', 'hidden'
];

// 랭킹 도전과제 정적 데이터 (DB 마이그레이션 전 표시용)
const RANKING_ACHIEVEMENTS: Achievement[] = [
  { key: 'ranking_first', name: '챔피언', emoji: '👑', category: null, type: 'ranking_first', target: 1, difficulty: 4, is_hidden: false, hint: null },
  { key: 'ranking_second', name: '준우승', emoji: '🥈', category: null, type: 'ranking_second', target: 1, difficulty: 3, is_hidden: false, hint: null },
  { key: 'ranking_third', name: '입상', emoji: '🥉', category: null, type: 'ranking_third', target: 1, difficulty: 3, is_hidden: false, hint: null },
  { key: 'ranking_first_3', name: '트리플 챔피언', emoji: '🏆', category: null, type: 'ranking_first_count', target: 3, difficulty: 4, is_hidden: false, hint: null },
  { key: 'ranking_top3_5', name: '명예의 전당', emoji: '🌟', category: null, type: 'ranking_top3_count', target: 5, difficulty: 4, is_hidden: false, hint: null },
  { key: 'ranking_top3_streak', name: '스테디셀러', emoji: '💎', category: null, type: 'ranking_top3_streak', target: 3, difficulty: 4, is_hidden: true, hint: '꾸준함이 빛을 발할 때' },
];

export function AchievementsGuide() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (catKey: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(catKey)) {
        next.delete(catKey);
      } else {
        next.add(catKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(categoryOrder));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  async function fetchAchievements() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .eq('is_sensitive', false)
        .order('difficulty', { ascending: true });

      if (error) throw error;

      // DB 데이터 + 랭킹 도전과제 (중복 제거)
      const dbAchievements = data || [];
      const existingKeys = new Set(dbAchievements.map(a => a.key));
      const rankingToAdd = RANKING_ACHIEVEMENTS.filter(a => !existingKeys.has(a.key));

      setAchievements([...dbAchievements, ...rankingToAdd]);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      // DB 오류 시에도 랭킹 도전과제는 표시
      setAchievements(RANKING_ACHIEVEMENTS);
    } finally {
      setLoading(false);
    }
  }

  function getDifficultyStars(difficulty: number) {
    return '★'.repeat(difficulty) + '☆'.repeat(4 - difficulty);
  }

  function getDifficultyColor(difficulty: number) {
    switch (difficulty) {
      case 1: return 'text-success';
      case 2: return 'text-primary';
      case 3: return 'text-warning';
      case 4: return 'text-error';
      default: return 'text-text-muted';
    }
  }

  function getConditionText(type: string, target: number, hint?: string | null) {
    const fn = CONDITION_TEXT[type];
    if (fn) return fn(target);
    if (hint) return hint;
    return type;
  }

  // Group achievements by category
  const grouped = achievements.reduce((acc, ach) => {
    let cat: string;
    if (ach.is_hidden) {
      cat = 'hidden';
    } else if (ach.type.startsWith('ranking_')) {
      cat = 'ranking';
    } else {
      cat = ach.category || 'special';
    }
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-[28px]">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-bg rounded w-1/4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-5 bg-bg rounded w-1/6"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-24 bg-bg rounded-lg"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text">도전 과제</h2>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-text-muted hover:text-primary transition-colors px-2 py-1 rounded hover:bg-bg"
          >
            전체 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-text-muted hover:text-primary transition-colors px-2 py-1 rounded hover:bg-bg"
          >
            전체 접기
          </button>
        </div>
      </div>
      <p className="text-sm text-text-muted mb-7">
        인증을 통해 도전 과제를 달성하고 성취감을 느껴보세요
      </p>

      <div className="space-y-3">
        {categoryOrder.map(catKey => {
          const achs = grouped[catKey];
          if (!achs || achs.length === 0) return null;

          const catInfo = CATEGORY_INFO[catKey] || { name: catKey, emoji: '❓' };
          const isExpanded = expandedSections.has(catKey);

          return (
            <div key={catKey} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(catKey)}
                className="w-full flex items-center justify-between p-4 bg-bg hover:bg-bg/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catInfo.emoji}</span>
                  <h3 className="font-semibold text-text">{catInfo.name}</h3>
                  <span className="text-xs text-text-muted">({achs.length}개)</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-text-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-text-muted" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 bg-bg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                    {achs.map(ach => {
                      const isHidden = ach.is_hidden;

                      return (
                        <div
                          key={ach.key}
                          className={`p-5 rounded-lg border transition-all ${
                            isHidden
                              ? 'bg-bg-card border-border opacity-70'
                              : 'bg-bg-card border-border hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-2xl">
                              {isHidden ? '❓' : (ach.emoji || '🏆')}
                            </span>
                            <span className={`text-xs ${getDifficultyColor(ach.difficulty)}`}>
                              {getDifficultyStars(ach.difficulty)}
                            </span>
                          </div>

                          <p className="font-medium text-text text-sm mb-1">
                            {isHidden ? '???' : ach.name}
                          </p>

                          <p className={`text-xs ${isHidden ? 'text-text-muted italic' : 'text-text-muted'}`}>
                            {isHidden
                              ? `힌트: ${ach.hint || '비밀...'}`
                              : getConditionText(ach.type, ach.target, ach.hint)
                            }
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          등록된 도전 과제가 없습니다
        </div>
      )}
    </div>
  );
}
