/**
 * usePagination Hook
 * 페이지네이션 로직을 위한 커스텀 훅
 */

import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setTotalItems: (total: number) => void;
  startIndex: number;
  endIndex: number;
}

export function usePagination(
  totalItems: number = 0,
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { initialPage = 0, pageSize = 20 } = options;

  const [page, setPageState] = useState(initialPage);
  const [total, setTotalItems] = useState(totalItems);

  const totalPages = useMemo(() =>
    Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const hasNext = useMemo(() => page < totalPages - 1, [page, totalPages]);
  const hasPrev = useMemo(() => page > 0, [page]);

  const setPage = useCallback((newPage: number) => {
    const clampedPage = Math.max(0, Math.min(newPage, totalPages - 1));
    setPageState(clampedPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPageState((prev) => prev + 1);
    }
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setPageState((prev) => prev - 1);
    }
  }, [hasPrev]);

  const firstPage = useCallback(() => {
    setPageState(0);
  }, []);

  const lastPage = useCallback(() => {
    setPageState(totalPages - 1);
  }, [totalPages]);

  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  return {
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrev,
    setPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setTotalItems,
    startIndex,
    endIndex,
  };
}

export default usePagination;
