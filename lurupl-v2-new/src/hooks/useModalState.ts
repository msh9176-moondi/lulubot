/**
 * useModalState Hook
 * 모달 열기/닫기 상태 관리를 위한 커스텀 훅
 */

import { useState, useCallback } from 'react';

interface ModalState<T> {
  isOpen: boolean;
  data: T | null;
}

interface UseModalStateReturn<T> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

export function useModalState<T = unknown>(
  initialData: T | null = null
): UseModalStateReturn<T> {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: false,
    data: initialData,
  });

  const open = useCallback((data?: T) => {
    setState({
      isOpen: true,
      data: data ?? null,
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle,
  };
}

export default useModalState;
