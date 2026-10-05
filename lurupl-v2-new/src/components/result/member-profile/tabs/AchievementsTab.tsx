/**
 * AchievementsTab Component
 * 도전과제 탭 - 도전과제 그리드
 */

import { AchievementsGrid } from '@/components/result/AchievementsGrid';

interface AchievementsTabProps {
  memberId: string;
}

export function AchievementsTab({ memberId }: AchievementsTabProps) {
  return <AchievementsGrid memberId={memberId} />;
}

export default AchievementsTab;
