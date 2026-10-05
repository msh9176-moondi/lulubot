/**
 * TabContainer Component
 * 재사용 가능한 탭 컨테이너 - 탭 상태 관리 및 스타일링
 */

import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string | ReactNode;
}

interface TabContainerProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function TabContainer({
  tabs,
  activeTab,
  onTabChange,
  children,
  className = '',
  variant = 'default',
}: TabContainerProps) {
  const getTabStyles = (isActive: boolean) => {
    const baseStyles = 'px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2';

    switch (variant) {
      case 'pills':
        return `${baseStyles} rounded-lg ${
          isActive
            ? 'bg-primary text-white'
            : 'text-text-muted hover:text-text hover:bg-bg-hover'
        }`;
      case 'underline':
        return `${baseStyles} border-b-2 ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-text-muted hover:text-text hover:border-border'
        }`;
      default:
        return `${baseStyles} border-b-2 ${
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-text-muted hover:text-text'
        }`;
    }
  };

  return (
    <div className={className}>
      {/* 탭 헤더 */}
      <div className={`flex gap-1 ${variant === 'underline' ? 'border-b border-border' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={getTabStyles(activeTab === tab.id)}
          >
            {tab.icon && (
              typeof tab.icon === 'string' ? (
                <span>{tab.icon}</span>
              ) : (
                tab.icon
              )
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}

export default TabContainer;
