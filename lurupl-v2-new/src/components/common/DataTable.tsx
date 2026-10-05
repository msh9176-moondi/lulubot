/**
 * DataTable Component
 * 페이지네이션이 포함된 재사용 가능한 테이블 컴포넌트
 */

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  page = 0,
  pageSize = 20,
  total,
  onPageChange,
  loading = false,
  emptyMessage = '데이터가 없습니다',
  className = '',
  stickyHeader = false,
}: DataTableProps<T>) {
  const totalPages = total ? Math.ceil(total / pageSize) : 1;
  const hasPagination = total !== undefined && onPageChange !== undefined;

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={className}>
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={`bg-bg ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3 border-b border-border font-medium text-text-muted ${getAlignClass(col.align)}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-text-muted">
                  로딩 중...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={keyExtractor(row, rowIndex)}
                  className="hover:bg-bg-hover border-b border-border"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-3 text-text ${getAlignClass(col.align)}`}
                    >
                      {col.render
                        ? col.render(row[col.key], row, rowIndex)
                        : (row[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {hasPagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-text-muted">
            총 {total}건 중 {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)}건
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm ${
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'hover:bg-bg-hover text-text'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
