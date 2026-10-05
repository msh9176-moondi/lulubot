/**
 * CertificationManagement Component
 * 관리자용 인증 데이터 관리 - 인증 기록 조회/수정/삭제
 */

import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Spinner, Modal } from '@/components/common';
import { useMembersStore } from '@/stores/membersStore';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface Certification {
  id: string;
  member_id: string;
  cert_date: string;
  cert_time: string;
  category_key: CategoryKey;
  final_exp: number;
  is_over_limit: boolean;
  original_text: string;
  import_batch_id: string | null;
  created_at: string;
}

interface ImportBatch {
  id: string;
  created_at: string;
  cert_count: number;
  total_exp: number;
  status: string;
  file_name: string;
  confirmed_at: string | null;
}

type TabType = 'list' | 'batches' | 'stats';

const PAGE_SIZE = 20;

export function CertificationManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // 필터
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterMember, setFilterMember] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  // 수정 모달
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [editForm, setEditForm] = useState({ final_exp: 0, is_over_limit: false });

  // 삭제 확인
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { members, fetchMembers } = useMembersStore();

  // 초기 데이터 로드
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 인증 목록 로드
  useEffect(() => {
    const loadCertifications = async () => {
      if (activeTab !== 'list') return;
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
  }, [activeTab, filterMonth, filterMember, filterCategory, page]);

  // 배치 목록 로드
  useEffect(() => {
    const loadBatches = async () => {
      if (activeTab !== 'batches') return;
      setLoading(true);

      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to load batches:', error);
      } else {
        setBatches(data || []);
      }

      setLoading(false);
    };

    loadBatches();
  }, [activeTab]);

  // 인증 수정
  const handleEdit = (cert: Certification) => {
    setEditingCert(cert);
    setEditForm({
      final_exp: cert.final_exp,
      is_over_limit: cert.is_over_limit,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCert) return;

    const { error } = await supabase
      .from('certifications')
      .update({
        final_exp: editForm.final_exp,
        is_over_limit: editForm.is_over_limit,
      })
      .eq('id', editingCert.id);

    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      setCertifications(prev =>
        prev.map(c =>
          c.id === editingCert.id
            ? { ...c, final_exp: editForm.final_exp, is_over_limit: editForm.is_over_limit }
            : c
        )
      );
      setEditingCert(null);
    }
  };

  // 인증 삭제
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('certifications')
      .delete()
      .eq('id', id);

    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      setCertifications(prev => prev.filter(c => c.id !== id));
      setTotal(prev => prev - 1);
    }
    setDeletingId(null);
  };

  // 멤버 이름 가져오기
  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.display_name || memberId;
  };

  // 카테고리 정보
  const getCategoryInfo = (key: CategoryKey) => {
    const cat = DEFAULT_CATEGORIES[key];
    return cat ? `${cat.emoji} ${cat.name}` : key;
  };

  const tabs = [
    { id: 'list' as TabType, label: '인증 목록', icon: '📋' },
    { id: 'batches' as TabType, label: '배치 관리', icon: '📦' },
    { id: 'stats' as TabType, label: '통계', icon: '📊' },
  ];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 인증 목록 */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* 필터 */}
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
              {/* 테이블 */}
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
                              onClick={() => handleEdit(cert)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-bg rounded transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(cert.id)}
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

              {/* 페이지네이션 */}
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
      )}

      {/* 배치 관리 */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <FileText className="w-5 h-5" />
            <h3 className="font-medium">가져오기 배치 기록</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map(batch => (
                <div
                  key={batch.id}
                  className="p-4 bg-bg rounded-lg border border-border flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-text">
                      {new Date(batch.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-text-muted flex items-center gap-2">
                      <span>{batch.file_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        batch.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        {batch.status === 'confirmed' ? '완료' : '대기중'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{batch.cert_count}건</p>
                    <p className="text-xs text-text-muted">+{batch.total_exp} EXP</p>
                  </div>
                </div>
              ))}
              {batches.length === 0 && (
                <p className="text-center text-text-muted py-8">
                  가져오기 기록이 없습니다.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 통계 */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <p className="text-text-muted text-center py-12">
            통계 기능은 준비 중입니다.
          </p>
        </div>
      )}

      {/* 수정 모달 */}
      {editingCert && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCert(null)}
          title="인증 수정"
          size="sm"
        >
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-text-muted mb-1">멤버</p>
              <p className="font-medium text-text">{getMemberName(editingCert.member_id)}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">날짜/시간</p>
              <p className="font-medium text-text">{editingCert.cert_date} {editingCert.cert_time}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">카테고리</p>
              <p className="font-medium text-text">{getCategoryInfo(editingCert.category_key)}</p>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">최종 EXP</label>
              <input
                type="number"
                value={editForm.final_exp}
                onChange={(e) => setEditForm({ ...editForm, final_exp: parseInt(e.target.value) || 0 })}
                className="w-full bg-bg border border-border rounded px-3 py-2 text-text"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_over_limit"
                checked={editForm.is_over_limit}
                onChange={(e) => setEditForm({ ...editForm, is_over_limit: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_over_limit" className="text-sm text-text">
                일일 제한 초과 여부
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingCert(null)}
                className="flex-1 py-2 px-4 bg-bg-hover text-text rounded-lg hover:bg-border transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 모달 */}
      {deletingId && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingId(null)}
          title="인증 삭제"
          size="sm"
        >
          <div className="p-6 space-y-4">
            <p className="text-text">
              이 인증 기록을 정말 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-500">
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 px-4 bg-bg-hover text-text rounded-lg hover:bg-border transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CertificationManagement;
