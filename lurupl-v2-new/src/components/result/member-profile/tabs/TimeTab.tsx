/**
 * TimeTab Component
 * 시간대 탭 - 시간대별 히트맵
 */

import { TimeHeatmap } from '@/components/result/TimeHeatmap';

interface TimeTabProps {
  memberId: string;
}

export function TimeTab({ memberId }: TimeTabProps) {
  return <TimeHeatmap memberId={memberId} />;
}

export default TimeTab;
