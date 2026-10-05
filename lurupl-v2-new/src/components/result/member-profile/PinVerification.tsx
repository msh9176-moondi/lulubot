/**
 * PinVerification Component
 * PIN 인증/설정 화면
 */

import { ChevronLeft } from 'lucide-react';
import { Spinner } from '@/components/common';
import { PinSetup } from '@/components/motivation';

interface PinVerificationProps {
  memberName: string;
  hasPin: boolean;
  loading: boolean;
  onBack: () => void;
  onPinSet: (pin: string) => Promise<boolean>;
  onPinVerify: (pin: string) => Promise<boolean>;
}

export function PinVerification({
  memberName,
  hasPin,
  loading,
  onBack,
  onPinSet,
  onPinVerify,
}: PinVerificationProps) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <button
        onClick={onBack}
        className="text-sm text-text-muted hover:text-text mb-4 flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        다른 멤버 선택
      </button>

      <div className="text-center mb-4">
        <p className="text-lg font-medium text-text">{memberName}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <PinSetup
          hasPin={hasPin}
          onPinSet={onPinSet}
          onPinVerify={onPinVerify}
        />
      )}
    </div>
  );
}

export default PinVerification;
