import { useEffect, useState } from 'react';
import { calculateLevel, getLevelTitle, getAccumulatedTitle, EXP_PER_LEVEL } from '@/domain/levels';
import { getSkinImage } from '@/domain/tree-skins';
import { Badge } from '@/components/common';
import { supabase } from '@/lib/supabase';
import type { MemberStats } from '@/stores/membersStore';
import { ChevronRight, Sparkles } from 'lucide-react';

const SEEN_ACHIEVEMENTS_KEY = 'lurupl_achievements_seen';

interface LeaderboardProps {
  members: MemberStats[];
  onMemberClick: (memberId: string) => void;
}

export function Leaderboard({ members, onMemberClick }: LeaderboardProps) {
  const [newAchievementCounts, setNewAchievementCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAchievementCounts();
  }, [members]);

  async function fetchAchievementCounts() {
    try {
      const memberIds = members.map(m => m.id);
      if (memberIds.length === 0) return;

      const { data: achievements, error } = await supabase
        .from('member_achievements')
        .select('member_id, achievement_key')
        .in('member_id', memberIds);

      if (error) throw error;

      const memberAchievements: Record<string, string[]> = {};
      achievements?.forEach(a => {
        if (!memberAchievements[a.member_id]) {
          memberAchievements[a.member_id] = [];
        }
        memberAchievements[a.member_id].push(a.achievement_key);
      });

      const seenData = localStorage.getItem(SEEN_ACHIEVEMENTS_KEY);
      const seen: Record<string, string[]> = seenData ? JSON.parse(seenData) : {};

      const counts: Record<string, number> = {};
      for (const [memberId, achList] of Object.entries(memberAchievements)) {
        const seenList = seen[memberId] || [];
        const newCount = achList.filter(a => !seenList.includes(a)).length;
        if (newCount > 0) {
          counts[memberId] = newCount;
        }
      }

      setNewAchievementCounts(counts);
    } catch (error) {
      console.error('Failed to fetch achievement counts:', error);
    }
  }

  const handleMemberClick = (memberId: string) => {
    markAchievementsSeen(memberId);
    onMemberClick(memberId);
  };

  async function markAchievementsSeen(memberId: string) {
    try {
      const { data: achievements } = await supabase
        .from('member_achievements')
        .select('achievement_key')
        .eq('member_id', memberId);

      if (achievements) {
        const seenData = localStorage.getItem(SEEN_ACHIEVEMENTS_KEY);
        const seen: Record<string, string[]> = seenData ? JSON.parse(seenData) : {};
        seen[memberId] = achievements.map(a => a.achievement_key);
        localStorage.setItem(SEEN_ACHIEVEMENTS_KEY, JSON.stringify(seen));

        setNewAchievementCounts(prev => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to mark achievements as seen:', error);
    }
  }

  return (
    <div className="space-y-2">
      {members.map((member, index) => {
        const rank = index + 1;
        const level = calculateLevel(member.monthly_exp);
        const levelTitle = getLevelTitle(level);
        const accTitle = getAccumulatedTitle(member.accumulated_exp);
        const newCount = newAchievementCounts[member.id] || 0;
        const expInLevel = member.monthly_exp % EXP_PER_LEVEL;
        const progressPercent = (expInLevel / EXP_PER_LEVEL) * 100;

        const getRankStyle = () => {
          if (rank === 1) return 'bg-amber-50 border-amber-200';
          if (rank === 2) return 'bg-slate-50 border-slate-200';
          if (rank === 3) return 'bg-orange-50 border-orange-200';
          return 'bg-white border-border hover:bg-bg-hover';
        };

        const getRankColor = () => {
          if (rank === 1) return 'text-amber-500';
          if (rank === 2) return 'text-slate-400';
          if (rank === 3) return 'text-orange-500';
          return 'text-text-muted';
        };

        const skinImage = getSkinImage(member.selected_tree_skin, member.total_count);

        return (
          <div
            key={member.id}
            onClick={() => handleMemberClick(member.id)}
            className={`group flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer transition-all ${getRankStyle()}`}
          >
            {/* Rank + Skin combined for mobile */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span className={`text-base sm:text-xl font-bold w-5 sm:w-6 text-center ${getRankColor()}`}>
                {rank}
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10">
                <img
                  src={skinImage}
                  alt="스킨"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-text truncate group-hover:text-primary transition-colors max-w-[80px] sm:max-w-none">
                  {member.display_name}
                </span>
                <Badge variant="primary">Lv.{level}</Badge>
                {newCount > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                    <Sparkles className="w-3 h-3" />
                    {newCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 text-xs sm:text-sm text-text-muted">
                <span className="truncate">{levelTitle}</span>
                <span className="text-border">•</span>
                <span className="truncate">{accTitle.icon} {accTitle.title}</span>
              </div>

              {/* Progress bar for top 3 */}
              {rank <= 3 && (
                <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-2">
                  <div className="flex-1 h-1 sm:h-1.5 bg-border rounded-full overflow-hidden max-w-[120px] sm:max-w-[200px]">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">{expInLevel}/{EXP_PER_LEVEL}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="text-right flex-shrink-0">
              <p className="text-base sm:text-xl font-bold text-primary">{member.monthly_exp}</p>
              <p className="text-xs sm:text-sm text-text-muted whitespace-nowrap">
                {member.cert_count}회 / {member.cert_days}일
              </p>
            </div>

            {/* Arrow - hidden on very small screens */}
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted group-hover:text-primary transition-colors flex-shrink-0 hidden xs:block" />
          </div>
        );
      })}

      {members.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          이번 달 인증 데이터가 없습니다
        </div>
      )}
    </div>
  );
}
