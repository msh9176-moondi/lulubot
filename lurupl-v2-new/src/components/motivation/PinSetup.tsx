import { useState } from 'react';
import { Lock, Check, X } from 'lucide-react';

interface PinSetupProps {
  onPinSet: (pin: string) => Promise<boolean>;
  onPinVerify: (pin: string) => Promise<boolean>;
  hasPin: boolean;
}

export function PinSetup({ onPinSet, onPinVerify, hasPin }: PinSetupProps) {
  const [mode, setMode] = useState<'verify' | 'setup' | 'success'>(hasPin ? 'verify' : 'setup');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinChange = (value: string, isConfirm: boolean = false) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (isConfirm) {
      setConfirmPin(cleaned);
    } else {
      setPin(cleaned);
    }
    setError('');
  };

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError('4자리 PIN을 입력해주세요');
      return;
    }

    setLoading(true);
    const success = await onPinVerify(pin);
    setLoading(false);

    if (success) {
      setMode('success');
    } else {
      setError('PIN이 일치하지 않습니다');
      setPin('');
    }
  };

  const handleSetup = async () => {
    if (pin.length !== 4) {
      setError('4자리 PIN을 입력해주세요');
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN이 일치하지 않습니다');
      return;
    }

    setLoading(true);
    const success = await onPinSet(pin);
    setLoading(false);

    if (success) {
      setMode('success');
    } else {
      setError('PIN 설정에 실패했습니다');
    }
  };

  if (mode === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <p className="text-lg font-medium text-text">인증 완료!</p>
        <p className="text-sm text-text-muted mt-2">이제 동기부여 기능을 사용할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-text">
          {mode === 'verify' ? 'PIN 입력' : 'PIN 설정'}
        </h3>
        <p className="text-sm text-text-muted mt-2">
          {mode === 'verify'
            ? '설정한 4자리 PIN을 입력해주세요'
            : '개인 데이터 보호를 위해 4자리 PIN을 설정해주세요'}
        </p>
      </div>

      <div className="space-y-4">
        {/* PIN Input */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            {mode === 'verify' ? 'PIN' : '새 PIN'}
          </label>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                  pin[idx]
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-bg'
                }`}
              >
                {pin[idx] ? '●' : ''}
              </div>
            ))}
          </div>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            className="sr-only"
            autoFocus
          />
        </div>

        {/* Confirm PIN (setup mode only) */}
        {mode === 'setup' && (
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              PIN 확인
            </label>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                    confirmPin[idx]
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-bg'
                  }`}
                >
                  {confirmPin[idx] ? '●' : ''}
                </div>
              ))}
            </div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={(e) => handlePinChange(e.target.value, true)}
              className="sr-only"
            />
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, idx) => {
            if (key === null) return <div key={idx} />;

            const isDelete = key === 'del';
            const activeInput = mode === 'setup' && pin.length === 4 ? 'confirm' : 'pin';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isDelete) {
                    if (activeInput === 'confirm') {
                      setConfirmPin((prev) => prev.slice(0, -1));
                    } else {
                      setPin((prev) => prev.slice(0, -1));
                    }
                  } else {
                    if (activeInput === 'confirm' && confirmPin.length < 4) {
                      setConfirmPin((prev) => prev + key);
                    } else if (activeInput === 'pin' && pin.length < 4) {
                      setPin((prev) => prev + key);
                    }
                  }
                  setError('');
                }}
                className={`h-14 rounded-lg text-xl font-medium transition-colors ${
                  isDelete
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    : 'bg-bg hover:bg-bg-hover text-text'
                }`}
              >
                {isDelete ? <X className="w-6 h-6 mx-auto" /> : key}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={mode === 'verify' ? handleVerify : handleSetup}
          disabled={loading || pin.length !== 4 || (mode === 'setup' && confirmPin.length !== 4)}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '확인 중...' : mode === 'verify' ? '확인' : 'PIN 설정'}
        </button>

        {mode === 'verify' && (
          <button
            type="button"
            onClick={() => setMode('setup')}
            className="w-full py-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            PIN을 잊으셨나요? 새로 설정하기
          </button>
        )}
      </div>
    </div>
  );
}
