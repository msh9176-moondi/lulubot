import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface Certification {
  id: string;
  member_id: string;
  category_key: string;
  cert_date: string;
  cert_time: string;
  final_exp: number;
  is_over_limit: boolean;
  members: { display_name: string };
}

interface DetailedRecordsProps {
  yearMonth: string;
  onMemberClick?: (memberId: string) => void;
}

export function DetailedRecords({ yearMonth, onMemberClick }: DetailedRecordsProps) {
  const [records, setRecords] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCount, setShowCount] = useState(20);

  useEffect(() => {
    fetchRecords();
  }, [yearMonth]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      const { data, error } = await supabase
        .from('certifications')
        .select('*, members!inner(display_name)')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => r.category_key === filter);

  const displayedRecords = filteredRecords.slice(0, showCount);

  const categories = [
    { key: 'all', name: '전체', emoji: '📋' },
    ...Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => ({
      key,
      name: cat.name,
      emoji: cat.emoji,
    })),
  ];

  if (loading) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-[28px]">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-border rounded w-1/4"></div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 w-16 bg-border/50 rounded"></div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-border/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <h3 className="text-lg font-semibold text-text mb-2">상세 인증 기록</h3>
      <p className="text-sm text-text-muted mb-5">이번 달 전체 인증 기록을 확인하세요</p>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => {
              setFilter(cat.key);
              setShowCount(20);
            }}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === cat.key
                ? 'bg-primary text-white'
                : 'bg-bg text-text-muted hover:bg-bg-hover'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Records Count */}
      <p className="text-sm text-text-muted mb-4">
        총 {filteredRecords.length}건
        {filter !== 'all' && ` (전체 ${records.length}건 중)`}
      </p>

      {/* Records List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedRecords.map(record => {
          const cat = DEFAULT_CATEGORIES[record.category_key as CategoryKey];
          return (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-bg rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
              onClick={() => onMemberClick?.(record.member_id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat?.emoji || '📋'}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{record.members.display_name}</span>
                    <span className="text-sm text-text-muted">{cat?.name || record.category_key}</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {record.cert_date} {record.cert_time?.slice(0, 5)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${record.is_over_limit ? 'text-warning' : 'text-primary'}`}>
                  +{record.final_exp} EXP
                </p>
                {record.is_over_limit && (
                  <p className="text-xs text-warning">한도 초과</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {filteredRecords.length > showCount && (
        <button
          onClick={() => setShowCount(prev => prev + 20)}
          className="w-full mt-4 py-2 text-sm text-primary hover:underline"
        >
          더 보기 ({filteredRecords.length - showCount}건 남음)
        </button>
      )}

      {filteredRecords.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          인증 기록이 없습니다
        </div>
      )}
    </div>
  );
}
