/**
 * TopRankerCard Component
 * 1위 하이라이트 카드
 */

import { calculateLevel, getLevelTitle, getExpForNextLevel, EXP_PER_LEVEL } from '@/domain/levels';
import { getSkinImage, type SkinId } from '@/domain/tree-skins';

interface TopRankerCardProps {
  member: {
    id: string;
    display_name: string;
    monthly_exp: number;
    cert_count: number;
    selected_tree_skin?: string;
    total_count?: number;
  };
  onMemberClick: (id: string) => void;
}

export function TopRankerCard({ member, onMemberClick }: TopRankerCardProps) {
  const level = calculateLevel(member.monthly_exp);
  const levelTitle = getLevelTitle(level);
  const expProgress = getExpForNextLevel(member.monthly_exp);
  const treeSkinImage = getSkinImage(
    (member.selected_tree_skin || 'default') as SkinId,
    member.total_count || 0
  );

  return (
    <div
      className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-[28px] cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => onMemberClick(member.id)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: Tree Skin & Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <img
              src={treeSkinImage}
              alt="나무 스킨"
              className="w-16 h-20 object-contain drop-shadow-lg"
            />
            <div className="absolute -top-1 -right-1 text-lg">👑</div>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-1">이번 달 1위</p>
            <p className="text-xl font-bold text-text">{member.display_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-primary text-white text-sm font-medium rounded">
                Lv.{level}
              </span>
              <span className="text-text-muted">{levelTitle}</span>
            </div>
          </div>
        </div>

        {/* Right: EXP & Progress */}
        <div className="sm:text-right">
          <p className="text-3xl font-bold text-primary">
            {member.monthly_exp} <span className="text-lg font-normal">EXP</span>
          </p>
          <p className="text-sm text-text-muted mt-1">{member.cert_count}회 인증</p>

          {/* Progress to next level */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>다음 레벨까지</span>
              <span>{expProgress.current} / {EXP_PER_LEVEL} EXP</span>
            </div>
            <div className="w-full sm:w-48 h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${expProgress.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopRankerCard;
