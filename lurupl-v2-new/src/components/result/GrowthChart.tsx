import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface GrowthChartProps {
  memberId: string;
}

type Period = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  label: string;
  exp: number;
}

export function GrowthChart({ memberId }: GrowthChartProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchData();
    }
  }, [memberId, period]);

  async function fetchData() {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string;
      let groupBy: 'day' | 'week' | 'month';

      if (period === 'daily') {
        // Last 30 days
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        startDate = start.toISOString().split('T')[0];
        groupBy = 'day';
      } else if (period === 'weekly') {
        // Last 12 weeks
        const start = new Date(now);
        start.setDate(start.getDate() - 84);
        startDate = start.toISOString().split('T')[0];
        groupBy = 'week';
      } else {
        // Last 6 months
        const start = new Date(now);
        start.setMonth(start.getMonth() - 6);
        startDate = start.toISOString().split('T')[0];
        groupBy = 'month';
      }

      const { data: certs, error } = await supabase
        .from('certifications')
        .select('cert_date, final_exp')
        .eq('member_id', memberId)
        .gte('cert_date', startDate)
        .gt('final_exp', 0)
        .order('cert_date', { ascending: true });

      if (error) throw error;

      // Group data
      const grouped: Record<string, number> = {};

      certs?.forEach(cert => {
        let key: string;
        const date = new Date(cert.cert_date);

        if (groupBy === 'day') {
          key = cert.cert_date;
        } else if (groupBy === 'week') {
          // Get week start (Monday)
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const weekStart = new Date(date.setDate(diff));
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        grouped[key] = (grouped[key] || 0) + (cert.final_exp || 0);
      });

      // Convert to array and format labels
      const points: DataPoint[] = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, exp]) => {
          let label: string;
          if (groupBy === 'day') {
            const d = new Date(key);
            label = `${d.getMonth() + 1}/${d.getDate()}`;
          } else if (groupBy === 'week') {
            const d = new Date(key);
            label = `${d.getMonth() + 1}/${d.getDate()}~`;
          } else {
            const [, month] = key.split('-');
            label = `${parseInt(month)}월`;
          }
          return { label, exp };
        });

      // Fill missing dates for daily view
      if (groupBy === 'day') {
        const filledPoints: DataPoint[] = [];
        const current = new Date(startDate);
        const end = new Date();

        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          const existing = points.find(p => {
            const d = new Date(dateStr);
            return p.label === `${d.getMonth() + 1}/${d.getDate()}`;
          });

          filledPoints.push({
            label: `${current.getMonth() + 1}/${current.getDate()}`,
            exp: existing?.exp || 0
          });

          current.setDate(current.getDate() + 1);
        }

        setData(filledPoints.slice(-30)); // Last 30 days
      } else {
        setData(points);
      }
    } catch (error) {
      console.error('Failed to fetch growth data:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxExp = Math.max(...data.map(d => d.exp), 1);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-text-muted text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Period Selector */}
      <div className="flex gap-2 mb-4">
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              period === p
                ? 'bg-primary text-white'
                : 'bg-bg text-text-muted hover:text-text'
            }`}
          >
            {p === 'daily' ? '일별' : p === 'weekly' ? '주별' : '월별'}
          </button>
        ))}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-text-muted">
          데이터가 없습니다
        </div>
      ) : (
        <div className="relative bg-bg rounded-lg p-4">
          {/* Chart container */}
          <div className="flex">
            {/* Y-axis labels */}
            <div className="w-8 flex flex-col justify-between text-xs text-text-muted pr-2" style={{ height: '160px' }}>
              <span>{maxExp}</span>
              <span>{Math.round(maxExp / 2)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="flex-1 flex items-end gap-1 overflow-x-auto" style={{ height: '160px' }}>
              {data.map((point, idx) => {
                const height = point.exp > 0 ? (point.exp / maxExp) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-shrink-0 flex flex-col justify-end group cursor-pointer"
                    style={{
                      width: period === 'daily' ? '12px' : '28px',
                      height: '100%'
                    }}
                  >
                    <div
                      className={`w-full rounded-t transition-all relative ${
                        point.exp > 0
                          ? 'bg-primary hover:bg-primary/90'
                          : 'bg-border/40'
                      }`}
                      style={{
                        height: point.exp > 0
                          ? `${Math.max(height, 10)}%`
                          : '4px'
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                        <div className="bg-bg-card border border-border rounded px-3 py-2 text-xs whitespace-nowrap shadow-lg">
                          <p className="font-bold text-primary text-sm">{point.exp} EXP</p>
                          <p className="text-text-muted">{point.label}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-10 flex justify-between text-xs text-text-muted mt-1 overflow-hidden">
            {period === 'daily' ? (
              <>
                <span>{data[0]?.label}</span>
                <span>{data[Math.floor(data.length / 2)]?.label}</span>
                <span>{data[data.length - 1]?.label}</span>
              </>
            ) : (
              data.map((point, idx) => (
                <span key={idx} className="flex-shrink-0" style={{ width: '24px', textAlign: 'center' }}>
                  {idx % 2 === 0 ? point.label : ''}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="p-2 bg-bg rounded-lg">
          <p className="text-lg font-bold text-primary">
            {data.reduce((sum, d) => sum + d.exp, 0)}
          </p>
          <p className="text-xs text-text-muted">총 EXP</p>
        </div>
        <div className="p-2 bg-bg rounded-lg">
          <p className="text-lg font-bold text-text">
            {data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.exp, 0) / data.length) : 0}
          </p>
          <p className="text-xs text-text-muted">평균</p>
        </div>
        <div className="p-2 bg-bg rounded-lg">
          <p className="text-lg font-bold text-accent">{maxExp}</p>
          <p className="text-xs text-text-muted">최고</p>
        </div>
      </div>
    </div>
  );
}
