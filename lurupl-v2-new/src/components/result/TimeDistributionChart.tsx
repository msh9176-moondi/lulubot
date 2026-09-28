import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface HourlyData {
  hour: number;
  cert_count: number;
}

interface TimeDistributionChartProps {
  yearMonth: string;
}

export function TimeDistributionChart({ yearMonth }: TimeDistributionChartProps) {
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [yearMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      const { data: certsData, error } = await supabase
        .from('certifications')
        .select('cert_time')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (error) throw error;

      const hourMap: Record<number, number> = {};
      for (const cert of certsData || []) {
        if (cert.cert_time) {
          const hour = parseInt(cert.cert_time.split(':')[0], 10);
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        }
      }

      const fullData: HourlyData[] = [];
      for (let i = 0; i < 24; i++) {
        fullData.push({ hour: i, cert_count: hourMap[i] || 0 });
      }

      setData(fullData);
    } catch (error) {
      console.error('Failed to fetch hourly distribution:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxCount = Math.max(...data.map((d) => d.cert_count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.cert_count, 0);

  // Calculate opacity based on count (higher count = higher opacity)
  const getBarOpacity = (count: number) => {
    if (count === 0) return 0.1;
    const ratio = count / maxCount;
    return 0.3 + ratio * 0.7; // Range: 0.3 to 1.0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-text-muted text-sm">로딩 중...</div>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-text-muted text-sm">데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div>
      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-text-muted mb-2 px-0.5">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>

      {/* Bars */}
      <div className="flex items-end h-28 gap-px">
        {data.map((item) => {
          const height = (item.cert_count / maxCount) * 100;
          const opacity = getBarOpacity(item.cert_count);

          return (
            <div
              key={item.hour}
              className="flex-1 relative group"
            >
              <div
                className="w-full bg-primary rounded-t transition-all duration-200 hover:bg-primary-light"
                style={{
                  height: `${Math.max(height, 4)}%`,
                  opacity
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-card border border-border rounded text-xs text-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {item.hour}시: {item.cert_count}회
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
        <span className="text-xs text-text-muted">총 {totalCount}회 인증</span>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>오전 {data.slice(6, 12).reduce((s, d) => s + d.cert_count, 0)}회</span>
          <span>오후 {data.slice(12, 18).reduce((s, d) => s + d.cert_count, 0)}회</span>
          <span>저녁 {data.slice(18, 24).reduce((s, d) => s + d.cert_count, 0)}회</span>
        </div>
      </div>
    </div>
  );
}
