/**
 * CategoryDetailModal Component
 * 카테고리 상세 보기 - 개별 인증 기록과 이모티콘 일대일 대응
 */

import { useEffect, useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Lock, Unlock, Sparkles } from 'lucide-react';
import { CATEGORIES, type CategoryKey } from '@/domain/categories';
import { supabase } from '@/lib/supabase';
import { useStageStore } from '@/stores/stageStore';
import type { StageDefinition } from '@/domain/stages';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  categoryKey: CategoryKey | null;
  definitions: StageDefinition[];
  isOwnProfile?: boolean;
}

interface CertRecord {
  id: string;
  certDate: string;
  certTime: string;
  categoryKey: string;
  finalExp: number;
  tagUsed: string;
}

const ITEMS_PER_PAGE = 20;

export function CategoryDetailModal({
  isOpen,
  onClose,
  memberId,
  categoryKey,
  definitions,
  isOwnProfile = false
}: CategoryDetailModalProps) {
  const [certifications, setCertifications] = useState<CertRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { memberStatuses, claimStage } = useStageStore();
  const [unlocking, setUnlocking] = useState(false);

  const status = useMemo(() => {
    const statuses = memberStatuses.get(memberId) || [];
    return statuses.find(s => s.categoryKey === categoryKey);
  }, [memberStatuses, memberId, categoryKey]);

  const category = categoryKey ? CATEGORIES.find(c => c.key === categoryKey) : null;
  const categoryDefinitions = definitions.filter(d => d.categoryKey === categoryKey);

  // 인증 기록 가져오기
  useEffect(() => {
    if (!isOpen || !memberId || !categoryKey) return;

    async function fetchCertifications() {
      setLoading(true);
      try {
        // 총 개수
        const { count } = await supabase
          .from('certifications')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', memberId)
          .eq('category_key', categoryKey)
          .gt('final_exp', 0);

        setTotalCount(count || 0);

        // 페이지 데이터
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from('certifications')
          .select('id, cert_date, cert_time, category_key, final_exp, tag_used')
          .eq('member_id', memberId)
          .eq('category_key', categoryKey)
          .gt('final_exp', 0)
          .order('cert_date', { ascending: false })
          .order('cert_time', { ascending: false })
          .range(from, to);

        if (error) throw error;

        setCertifications((data || []).map(d => ({
          id: d.id,
          certDate: d.cert_date,
          certTime: d.cert_time,
          categoryKey: d.category_key,
          finalExp: d.final_exp,
          tagUsed: d.tag_used
        })));
      } catch (error) {
        console.error('Failed to fetch certifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCertifications();
  }, [isOpen, memberId, categoryKey, page]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setCertifications([]);
    }
  }, [isOpen]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // 해금 처리
  const handleUnlock = async () => {
    if (!status?.canUnlock || unlocking || !categoryKey) return;

    setUnlocking(true);
    try {
      await claimStage(memberId, categoryKey, status.nextStage);
    } finally {
      setUnlocking(false);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 시간 포맷
  const formatTime = (timeStr: string) => {
    return timeStr?.slice(0, 5) || '';
  };

  // 진행률 계산 (현재 스테이지 → 다음 스테이지)
  const getStageProgress = (stageNum: number): number => {
    const def = categoryDefinitions.find(d => d.stageNumber === stageNum);
    const prevDef = categoryDefinitions.find(d => d.stageNumber === stageNum - 1);

    if (!def) return 0;

    const start = prevDef?.requiredCount || 0;
    const end = def.requiredCount;
    const current = status?.verifiedCount || 0;

    if (current >= end) return 100;
    if (current <= start) return 0;

    return ((current - start) / (end - start)) * 100;
  };

  if (!isOpen || !category || !categoryKey) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="px-6 py-4 border-b border-border flex items-center justify-between"
          style={{ background: `linear-gradient(to right, ${category.color}10, transparent)` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{category.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-text">{category.name}</h2>
              <p className="text-sm text-text-muted">
                총 {status?.verifiedCount || 0}회 인증
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-bg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스테이지 진행 현황 */}
        <div className="px-6 py-4 border-b border-border bg-bg">
          <h3 className="text-sm font-medium text-text-muted mb-3">스테이지 진행</h3>
          <div className="space-y-2">
            {categoryDefinitions.map(def => {
              const isUnlocked = (status?.currentStage || 0) >= def.stageNumber;
              const isCurrent = status?.currentStage === def.stageNumber;
              const isNext = status?.nextStage === def.stageNumber;
              const progress = getStageProgress(def.stageNumber);

              return (
                <div
                  key={def.stageNumber}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg
                    ${isUnlocked ? 'bg-primary/10' : isNext ? 'bg-bg-card' : 'opacity-50'}
                  `}
                >
                  {/* 아이콘 */}
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${isUnlocked ? 'bg-primary text-white' : 'bg-border text-text-muted'}
                    `}
                  >
                    {isUnlocked ? <Sparkles className="w-4 h-4" /> : def.stageNumber}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isUnlocked ? 'text-primary' : 'text-text'}`}>
                        {def.stageName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 bg-primary text-white text-xs rounded">
                          현재
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">
                      {def.requiredCount}회 필요
                    </div>
                  </div>

                  {/* 진행바 또는 상태 */}
                  <div className="w-24">
                    {isUnlocked ? (
                      <span className="text-xs text-primary font-medium">완료</span>
                    ) : isNext ? (
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 해금 버튼 */}
          {status?.canUnlock && isOwnProfile && (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark
                         text-white font-semibold flex items-center justify-center gap-2
                         hover:shadow-lg hover:shadow-primary/30 transition-all
                         disabled:opacity-50 animate-pulse-subtle"
            >
              {unlocking ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>해금 중...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  <span>스테이지 {status.nextStage} 해금하기</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 인증 기록 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              인증 기록
            </h3>
            <span className="text-xs text-text-muted">
              {totalCount > 0 && `${(page - 1) * ITEMS_PER_PAGE + 1}-${Math.min(page * ITEMS_PER_PAGE, totalCount)} / ${totalCount}`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : certifications.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>아직 인증 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certifications.map((cert, index) => {
                const globalIndex = (page - 1) * ITEMS_PER_PAGE + index;

                return (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-bg hover:bg-bg-hover transition-colors"
                  >
                    {/* 이모티콘 (인덱스 표시) */}
                    <div className="relative">
                      <span className="text-2xl">{category.emoji}</span>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {totalCount - globalIndex}
                      </span>
                    </div>

                    {/* 날짜/시간 */}
                    <div className="flex-1">
                      <p className="font-medium text-text">
                        {formatDate(cert.certDate)}
                      </p>
                      <p className="text-sm text-text-muted">
                        {formatTime(cert.certTime)}
                      </p>
                    </div>

                    {/* 태그 */}
                    <span className="px-2 py-1 bg-bg-card border border-border rounded text-xs text-text-muted">
                      {cert.tagUsed}
                    </span>

                    {/* EXP */}
                    <span className="text-sm font-medium text-primary">
                      +{cert.finalExp} EXP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-1 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryDetailModal;
