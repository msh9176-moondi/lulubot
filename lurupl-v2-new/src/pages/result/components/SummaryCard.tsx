/**
 * SummaryCard Component
 * 요약 통계 카드
 */

import type { ReactNode } from 'react';

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

export function SummaryCard({ icon, label, value, unit, sub }: SummaryCardProps) {
  return (
    <div className="bg-bg-card rounded-xl border border-border shadow-sm p-4 sm:p-[28px]">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-xs sm:text-sm text-text-muted mb-1 sm:mb-2 line-clamp-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-text">
        {value}
        {unit && <span className="text-base sm:text-lg font-normal text-text-muted ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs sm:text-sm text-text-muted mt-2 sm:mt-3">{sub}</p>}
    </div>
  );
}

export default SummaryCard;
