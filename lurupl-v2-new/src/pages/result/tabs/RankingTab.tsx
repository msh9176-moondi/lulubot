/**
 * RankingTab Component
 * 랭킹 탭 - 순위, 수상 기록, 상세 기록
 */

import {
  Leaderboard,
  MonthlyAwardsHistory,
  DetailedRecords,
} from '@/components/result';
import type { MemberStats } from '@/stores/membersStore';

interface RankingTabProps {
  yearMonth: string;
  monthlyStats: MemberStats[];
  onMemberClick: (id: string) => void;
}

export function RankingTab({ yearMonth, monthlyStats, onMemberClick }: RankingTabProps) {
  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <div className="bg-bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl font-semibold text-text">이번 달 전체 순위</h2>
          <p className="text-sm text-text-muted mt-1">클릭하면 상세 활동을 볼 수 있습니다</p>
        </div>
        <div className="p-6">
          <Leaderboard
            members={monthlyStats}
            onMemberClick={onMemberClick}
          />
        </div>
      </div>

      {/* Monthly Awards History */}
      <MonthlyAwardsHistory />

      {/* Detailed Records */}
      <DetailedRecords yearMonth={yearMonth} onMemberClick={onMemberClick} />
    </div>
  );
}

export default RankingTab;
