/**
 * GrowthTab Component
 * 성장 탭 - 성장 차트 + 동기부여 허브
 */

import { GrowthChart } from '@/components/result/GrowthChart';
import { PersonalMotivationHub } from '@/components/motivation';

interface GrowthTabProps {
  memberId: string;
  memberName: string;
}

export function GrowthTab({ memberId, memberName }: GrowthTabProps) {
  return (
    <div className="space-y-6">
      <GrowthChart memberId={memberId} />
      <PersonalMotivationHub
        memberId={memberId}
        memberName={memberName}
        alreadyAuthenticated={true}
      />
    </div>
  );
}

export default GrowthTab;
