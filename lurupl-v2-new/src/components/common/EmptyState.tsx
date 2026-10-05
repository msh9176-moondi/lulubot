/**
 * EmptyState Component
 * 데이터 없음 상태 표시용 컴포넌트
 */

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: {
    container: 'py-6',
    icon: 'w-8 h-8',
    title: 'text-sm',
    description: 'text-xs',
    button: 'px-3 py-1.5 text-xs',
  },
  md: {
    container: 'py-12',
    icon: 'w-12 h-12',
    title: 'text-base',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'w-16 h-16',
    title: 'text-lg',
    description: 'text-base',
    button: 'px-6 py-3 text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}>
      <div className={`text-text-muted mb-4 ${styles.icon}`}>
        {icon || <Inbox className="w-full h-full" />}
      </div>

      <h3 className={`font-medium text-text ${styles.title}`}>
        {title}
      </h3>

      {description && (
        <p className={`text-text-muted mt-1 max-w-sm ${styles.description}`}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors ${styles.button}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
