interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'category';
  categoryKey?: string;
  size?: 'sm' | 'md';
}

const categoryColors: Record<string, string> = {
  cleaning: 'bg-cleaning/20 text-cleaning',
  exercise: 'bg-exercise/20 text-exercise',
  morning: 'bg-morning/20 text-morning',
  planning: 'bg-planning/20 text-planning',
  study: 'bg-study/20 text-study',
  medicine: 'bg-medicine/20 text-medicine',
  diary: 'bg-diary/20 text-diary',
  meditation: 'bg-meditation/20 text-meditation',
  comeback: 'bg-comeback/20 text-comeback',
};

export function Badge({ children, variant = 'default', categoryKey, size = 'sm' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const variantClasses = {
    default: 'bg-bg-hover text-text-muted',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
    category: categoryKey ? categoryColors[categoryKey] || 'bg-bg-hover text-text-muted' : 'bg-bg-hover text-text-muted',
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
