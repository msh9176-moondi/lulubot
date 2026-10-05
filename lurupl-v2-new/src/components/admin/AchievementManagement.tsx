/**
 * AchievementManagement Component
 * 관리자용 도전 과제 관리 - 31개 도전 과제 목록, 멤버별 달성 현황
 */

import { useState, useEffect } from 'react';
import { Trophy, User, BarChart3, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';

// DB에서 로드하는 도전 과제 정의 타입
interface AchievementDef {
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

interface MemberAchievement {
  id: string;
  member_id: string;
  achievement_key: string;
  achieved_at: string;
}

interface AchievementStat {
  key: string;
  name: string;
  emoji: string | null;
  category: string | null;
  difficulty: number;
  achievedCount: number;
  achievedMembers: string[];
}

interface MemberInfo {
  id: string;
  display_name: string;
}

type TabType = 'list' | 'members' | 'stats';

export function AchievementManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [achievements, setAchievements] = useState<AchievementDef[]>([]);
  const [memberAchievements, setMemberAchievements] = useState<Map<string, MemberAchievement[]>>(new Map());
  const [achievementStats, setAchievementStats] = useState<AchievementStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // 멤버, 도전 과제 정의, 달성 기록 동시 조회
        const [membersResult, definitionsResult, achievementsResult] = await Promise.all([
          supabase
            .from('members')
            .select('id, display_name')
            .eq('is_active', true),
          supabase
            .from('achievement_definitions')
            .select('*')
            .eq('is_active', true)
            .order('difficulty'),
          supabase
            .from('member_achievements')
            .select('*')
        ]);

        if (membersResult.error) throw membersResult.error;
        if (definitionsResult.error) throw definitionsResult.error;
        if (achievementsResult.error) throw achievementsResult.error;

        const membersList = membersResult.data || [];
        const definitionsList = definitionsResult.data || [];
        const achievementsList = achievementsResult.data || [];

        setMembers(membersList);
        setAchievements(definitionsList);

        // 멤버별로 그룹화
        const achievementMap = new Map<string, MemberAchievement[]>();
        for (const ach of achievementsList) {
          const existing = achievementMap.get(ach.member_id) || [];
          existing.push(ach);
          achievementMap.set(ach.member_id, existing);
        }
        setMemberAchievements(achievementMap);

        // 통계 계산
        const stats: AchievementStat[] = definitionsList.map(def => {
          const achievedMembers: string[] = [];
          achievementMap.forEach((memberAchs, memberId) => {
            if (memberAchs.some(a => a.achievement_key === def.key)) {
              const member = membersList.find(m => m.id === memberId);
              if (member) {
                achievedMembers.push(member.display_name);
              }
            }
          });

          return {
            key: def.key,
            name: def.name,
            emoji: def.emoji,
            category: def.category,
            difficulty: def.difficulty,
            achievedCount: achievedMembers.length,
            achievedMembers,
          };
        });

        setAchievementStats(stats);
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 도전 과제 재계산
  const handleRecalculate = async (memberId: string) => {
    setRecalculating(memberId);

    // RPC 함수 호출 (존재한다면)
    const { error } = await supabase.rpc('recalculate_achievements', {
      p_member_id: memberId
    });

    if (error) {
      console.error('Failed to recalculate:', error);
      alert('재계산 실패: ' + error.message);
    } else {
      alert('재계산 완료!');
      // 데이터 새로고침
      window.location.reload();
    }

    setRecalculating(null);
  };

  // 카테고리별 도전 과제 그룹화
  const groupedAchievements = achievements.reduce((acc, ach) => {
    // DB의 category 필드 또는 type 기반으로 그룹화
    let groupKey = ach.category || 'special';
    if (ach.type?.startsWith('hidden_')) groupKey = 'hidden';
    if (ach.type?.startsWith('ranking_')) groupKey = 'ranking';

    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(ach);
    return acc;
  }, {} as Record<string, AchievementDef[]>);

  const categoryLabels: Record<string, string> = {
    cleaning: '🧹 청소',
    exercise: '🏃 운동',
    morning: '⏰ 기상',
    planning: '📋 계획',
    study: '📚 공부',
    medicine: '💊 복약',
    diary: '📝 일기',
    meditation: '🧘 명상',
    hidden: '🔮 히든',
    ranking: '🏆 랭킹',
    special: '✨ 특별',
  };

  const difficultyStars = (d: number) => '⭐'.repeat(d);

  const tabs = [
    { id: 'list' as TabType, label: '전체 목록', icon: '📋' },
    { id: 'members' as TabType, label: '멤버별 현황', icon: '👥' },
    { id: 'stats' as TabType, label: '통계', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 전체 목록 */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-muted">
              <Trophy className="w-5 h-5" />
              <h3 className="font-medium">도전 과제 목록 ({achievements.length}개)</h3>
            </div>
          </div>

          {Object.entries(groupedAchievements).map(([category, achievements]) => (
            <div key={category} className="space-y-3">
              <h4 className="font-medium text-text flex items-center gap-2">
                {categoryLabels[category] || category}
                <span className="text-xs text-text-muted">({achievements.length}개)</span>
              </h4>
              <div className="grid gap-2">
                {achievements.map(ach => {
                  const stat = achievementStats.find(s => s.key === ach.key);
                  return (
                    <div
                      key={ach.key}
                      className="p-3 bg-bg rounded-lg border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{ach.emoji}</span>
                        <div>
                          <p className="font-medium text-text">
                            {ach.name}
                            <span className="ml-2 text-yellow-500 text-sm">
                              {difficultyStars(ach.difficulty)}
                            </span>
                          </p>
                          <p className="text-sm text-text-muted">
                            {ach.is_hidden ? (ach.hint || '히든 도전과제') : `${ach.type} (목표: ${ach.target})`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">
                          {stat?.achievedCount || 0}명 달성
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 멤버별 현황 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <User className="w-5 h-5" />
            <h3 className="font-medium">멤버별 달성 현황</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-3">
              {members.map(member => {
                const achievements = memberAchievements.get(member.id) || [];
                const percentage = Math.round((achievements.length / achievements.length) * 100);

                return (
                  <div
                    key={member.id}
                    className="p-4 bg-bg rounded-xl border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-text">{member.display_name}</p>
                        <p className="text-sm text-text-muted">
                          {achievements.length}/{achievements.length} 달성 ({percentage}%)
                        </p>
                      </div>
                      <button
                        onClick={() => handleRecalculate(member.id)}
                        disabled={recalculating === member.id}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-text-muted hover:text-primary hover:bg-bg-hover rounded transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${recalculating === member.id ? 'animate-spin' : ''}`} />
                        재계산
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* 최근 달성 */}
                    {achievements.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {achievements.slice(0, 10).map(ach => {
                          const def = achievements.find(a => a.key === ach.achievement_key);
                          return def ? (
                            <span
                              key={ach.id}
                              className="text-lg"
                              title={def.name}
                            >
                              {def.emoji}
                            </span>
                          ) : null;
                        })}
                        {achievements.length > 10 && (
                          <span className="text-sm text-text-muted">
                            +{achievements.length - 10}개
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 통계 */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-medium">도전 과제 달성률 통계</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-2">
              {achievementStats
                .sort((a, b) => b.achievedCount - a.achievedCount)
                .map(stat => {
                  const totalMembers = members.length;
                  const percentage = totalMembers > 0
                    ? Math.round((stat.achievedCount / totalMembers) * 100)
                    : 0;

                  return (
                    <div
                      key={stat.key}
                      className="p-3 bg-bg rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text">{stat.name}</span>
                          <span className="text-yellow-500 text-xs">
                            {difficultyStars(stat.difficulty)}
                          </span>
                        </div>
                        <span className="text-sm text-primary font-medium">
                          {stat.achievedCount}명 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {stat.achievedMembers.length > 0 && (
                        <p className="text-xs text-text-muted mt-1">
                          {stat.achievedMembers.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AchievementManagement;
