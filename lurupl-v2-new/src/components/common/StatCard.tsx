/**
 * StatCard Component
 * 통계 수치 표시용 카드 컴포넌트
 */

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

const sizeStyles = {
  sm: {
    card: 'p-3',
    title: 'text-xs',
    value: 'text-lg',
    icon: 'w-8 h-8',
  },
  md: {
    card: 'p-4',
    title: 'text-sm',
    value: 'text-2xl',
    icon: 'w-10 h-10',
  },
  lg: {
    card: 'p-6',
    title: 'text-base',
    value: 'text-3xl',
    icon: 'w-12 h-12',
  },
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  size = 'md',
  className = '',
}: StatCardProps) {
  const styles = sizeStyles[size];
  const isPositive = trend && trend.value >= 0;

  return (
    <div className={`bg-bg rounded-xl border border-border ${styles.card} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-text-muted ${styles.title}`}>{title}</p>
          <p className={`font-bold text-text mt-1 ${styles.value}`}>{value}</p>

          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{isPositive ? '+' : ''}{trend.value}%</span>
              {trend.label && <span className="text-text-muted">{trend.label}</span>}
            </div>
          )}
        </div>

        {icon && (
          <div className={`${colorStyles[color]} rounded-lg p-2 flex items-center justify-center ${styles.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
