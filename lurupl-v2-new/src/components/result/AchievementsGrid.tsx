import { useEffect, useState } from 'react';
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
  achieved_at?: string;
}

interface AchievementsGridProps {
  memberId?: string;
}

export function AchievementsGrid({ memberId }: AchievementsGridProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [memberAchievements, setMemberAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [memberId]);

  async function fetchAchievements() {
    setLoading(true);
    try {
      // Fetch all achievement definitions
      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .eq('is_active', true)
        .eq('is_sensitive', false)
        .order('difficulty', { ascending: true });

      if (defError) throw defError;

      // Fetch member's achieved ones
      if (memberId) {
        const { data: achieved, error: achError } = await supabase
          .from('member_achievements')
          .select('achievement_key')
          .eq('member_id', memberId);

        if (achError) throw achError;
        setMemberAchievements(new Set(achieved?.map((a) => a.achievement_key) || []));
      }

      setAchievements(definitions || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  const getDifficultyStars = (difficulty: number) => {
    return '★'.repeat(difficulty) + '☆'.repeat(4 - difficulty);
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return 'text-success';
      case 2:
        return 'text-primary';
      case 3:
        return 'text-warning';
      case 4:
        return 'text-error';
      default:
        return 'text-text-muted';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-text-muted">로딩 중...</div>
      </div>
    );
  }

  // Group by category
  const grouped = achievements.reduce((acc, ach) => {
    const cat = ach.category || 'special';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryNames: Record<string, string> = {
    cleaning: '🧹 청소',
    exercise: '🏃 운동',
    morning: '⏰ 기상',
    planning: '📋 계획',
    study: '📚 공부',
    medicine: '💊 약',
    diary: '📝 일기',
    meditation: '🧘 명상',
    special: '🌈 특별',
  };

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, achs]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-text-muted mb-3">
            {categoryNames[category] || category}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {achs.map((ach) => {
              const isAchieved = memberAchievements.has(ach.key);
              const isHidden = ach.is_hidden && !isAchieved;

              return (
                <div
                  key={ach.key}
                  className={`p-4 rounded-lg border transition-all ${
                    isAchieved
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-bg border-border opacity-40 grayscale'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-2xl ${!isAchieved ? 'opacity-50' : ''}`}>
                      {isHidden ? '🔒' : ach.emoji || '🏆'}
                    </span>
                    {isAchieved ? (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        달성
                      </span>
                    ) : (
                      <span className="text-xs bg-border text-text-muted px-2 py-0.5 rounded-full">
                        미달성
                      </span>
                    )}
                  </div>
                  <p className={`font-medium text-sm mb-1 ${isAchieved ? 'text-text' : 'text-text-muted'}`}>
                    {isHidden ? '???' : ach.name}
                  </p>
                  <p className={`text-xs ${isAchieved ? getDifficultyColor(ach.difficulty) : 'text-text-muted'}`}>
                    {getDifficultyStars(ach.difficulty)}
                  </p>
                  {isHidden && ach.hint && (
                    <p className="text-xs text-text-muted mt-2 italic">
                      힌트: {ach.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {achievements.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          도전 과제가 없습니다
        </div>
      )}
    </div>
  );
}
