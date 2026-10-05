/**
 * ConfirmModal Component
 * 확인/취소 다이얼로그 컴포넌트
 */

import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

const variantStyles = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    buttonColor: 'bg-red-500 hover:bg-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    buttonColor: 'bg-green-500 hover:bg-green-600',
  },
};

export function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'info',
  loading = false,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="" size="sm">
      <div className="p-6 text-center">
        {/* 아이콘 */}
        <div className={`mx-auto w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-4`}>
          <Icon className={`w-6 h-6 ${styles.iconColor}`} />
        </div>

        {/* 제목 */}
        <h3 className="text-lg font-semibold text-text mb-2">
          {title}
        </h3>

        {/* 메시지 */}
        <p className="text-sm text-text-muted mb-6">
          {message}
        </p>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-bg border border-border rounded-lg text-text hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 text-white rounded-lg transition-colors disabled:opacity-50 ${styles.buttonColor}`}
          >
            {loading ? '처리 중...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
