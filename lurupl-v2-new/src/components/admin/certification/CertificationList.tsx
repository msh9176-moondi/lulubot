/**
 * CertificationList Component
 * 인증 목록 탭
 */

import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '@/components/common';
import { useMembersStore } from '@/stores/membersStore';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import type { Certification } from './types';
import { PAGE_SIZE } from './types';

interface CertificationListProps {
  onEdit: (cert: Certification) => void;
  onDelete: (id: string) => void;
}

export function CertificationList({ onEdit, onDelete }: CertificationListProps) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterMember, setFilterMember] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const { members } = useMembersStore();

  // Load certifications
  useEffect(() => {
    const loadCertifications = async () => {
      setLoading(true);

      const [year, month] = filterMonth.split('-').map(Number);
      const startDate = `${filterMonth}-01`;
      const endDate = `${filterMonth}-${new Date(year, month, 0).getDate()}`;

      let query = supabase
        .from('certifications')
        .select('*', { count: 'exact' })
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterMember) {
        query = query.eq('member_id', filterMember);
      }
      if (filterCategory) {
        query = query.eq('category_key', filterCategory);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to load certifications:', error);
      } else {
        setCertifications(data || []);
        setTotal(count || 0);
      }

      setLoading(false);
    };

    loadCertifications();
  }, [filterMonth, filterMember, filterCategory, page]);

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.display_name || memberId;
  };

  const getCategoryInfo = (key: CategoryKey) => {
    const cat = DEFAULT_CATEGORIES[key];
    return cat ? `${cat.emoji} ${cat.name}` : key;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-bg rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setPage(0);
            }}
            className="bg-bg-card border border-border rounded px-3 py-1.5 text-text text-sm"
          />
        </div>
        <select
          value={filterMember}
          onChange={(e) => {
            setFilterMember(e.target.value);
            setPage(0);
          }}
          className="bg-bg-card border border-border rounded px-3 py-1.5 text-text text-sm"
        >
          <option value="">전체 멤버</option>
          {members.filter(m => m.is_active).map(m => (
            <option key={m.id} value={m.id}>{m.display_name}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(0);
          }}
          className="bg-bg-card border border-border rounded px-3 py-1.5 text-text text-sm"
        >
          <option value="">전체 카테고리</option>
          {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.emoji} {cat.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-bg">
                  <th className="text-left p-3 border-b border-border font-medium text-text-muted">날짜</th>
                  <th className="text-left p-3 border-b border-border font-medium text-text-muted">시간</th>
                  <th className="text-left p-3 border-b border-border font-medium text-text-muted">멤버</th>
                  <th className="text-left p-3 border-b border-border font-medium text-text-muted">카테고리</th>
                  <th className="text-center p-3 border-b border-border font-medium text-text-muted">EXP</th>
                  <th className="text-center p-3 border-b border-border font-medium text-text-muted">상태</th>
                  <th className="text-center p-3 border-b border-border font-medium text-text-muted">작업</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map(cert => (
                  <tr key={cert.id} className="hover:bg-bg-hover">
                    <td className="p-3 border-b border-border text-text">{cert.cert_date}</td>
                    <td className="p-3 border-b border-border text-text-muted">{cert.cert_time}</td>
                    <td className="p-3 border-b border-border text-text">{getMemberName(cert.member_id)}</td>
                    <td className="p-3 border-b border-border text-text">
                      {getCategoryInfo(cert.category_key)}
                    </td>
                    <td className="p-3 border-b border-border text-center">
                      <span className={`font-medium ${cert.final_exp > 0 ? 'text-green-500' : 'text-text-muted'}`}>
                        {cert.final_exp}
                      </span>
                    </td>
                    <td className="p-3 border-b border-border text-center">
                      {cert.is_over_limit ? (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 rounded">초과</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 rounded">정상</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-border text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(cert)}
                          className="p-1.5 text-text-muted hover:text-primary hover:bg-bg rounded transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(cert.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-bg rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              총 {total}건 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text">
                {page + 1} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CertificationList;
