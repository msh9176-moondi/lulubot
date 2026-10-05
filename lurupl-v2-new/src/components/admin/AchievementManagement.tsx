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

  // 해금 조건 설명 생성
  const getUnlockCondition = (ach: AchievementDef): string => {
    const categoryName = ach.category ? (categoryLabels[ach.category]?.replace(/^.+\s/, '') || ach.category) : '';

    switch (ach.type) {
      case 'first':
        return `${categoryName} 첫 인증`;
      case 'weekly':
        return `주간 ${categoryName} ${ach.target}회 인증`;
      case 'streak':
        return `${categoryName} ${ach.target}일 연속 인증`;
      case 'monthly':
        return `월간 ${categoryName} ${ach.target}회 인증`;
      case 'early':
        return `오전 6시 이전 기상 ${ach.target}회`;
      case 'daily_variety':
        return `하루에 ${ach.target}개 카테고리 인증`;
      case 'weekly_variety':
        return `주간 ${ach.target}개 카테고리 인증`;
      case 'monthly_all':
        return `월간 ${ach.target}개 카테고리 인증`;
      case 'hidden_owl':
        return `자정~새벽 4시 사이 인증`;
      case 'hidden_santa':
        return `12월 25일에 인증`;
      case 'hidden_phoenix':
        return `7일 이상 공백 후 복귀 인증`;
      case 'hidden_perfect':
        return `하루에 모든 카테고리 인증`;
      case 'hidden_century':
        return `총 ${ach.target}회 인증 달성`;
      case 'hidden_ghost':
        return `주말에만 ${ach.target}주 연속 인증`;
      case 'ranking_first':
        return `월간 랭킹 1위 달성`;
      case 'ranking_second':
        return `월간 랭킹 2위 달성`;
      case 'ranking_third':
        return `월간 랭킹 3위 달성`;
      case 'ranking_first_count':
        return `월간 1위 ${ach.target}회 달성`;
      case 'ranking_top3_count':
        return `월간 TOP3 ${ach.target}회 달성`;
      case 'ranking_top3_streak':
        return `${ach.target}개월 연속 TOP3 달성`;
      default:
        return ach.hint || `목표: ${ach.target}`;
    }
  };

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
                            {getUnlockCondition(ach)}
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
                const memberAchs = memberAchievements.get(member.id) || [];
                const totalCount = achievements.length;
                const percentage = totalCount > 0 ? Math.round((memberAchs.length / totalCount) * 100) : 0;

                return (
                  <div
                    key={member.id}
                    className="p-4 bg-bg rounded-xl border border-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-text">{member.display_name}</p>
                        <p className="text-sm text-text-muted">
                          {memberAchs.length}/{totalCount} 달성 ({percentage}%)
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
                    {memberAchs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {memberAchs.slice(0, 10).map(ach => {
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
                        {memberAchs.length > 10 && (
                          <span className="text-sm text-text-muted">
                            +{memberAchs.length - 10}개
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
