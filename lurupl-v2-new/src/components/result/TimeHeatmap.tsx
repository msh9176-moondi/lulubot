import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TimeHeatmapProps {
  memberId: string;
}

interface HourlyData {
  hour: number;
  count: number;
}

export function TimeHeatmap({ memberId }: TimeHeatmapProps) {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [peakHour, setPeakHour] = useState<number | null>(null);
  const [periodStats, setPeriodStats] = useState({
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  });

  useEffect(() => {
    if (memberId) {
      fetchData();
    }
  }, [memberId]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: certs, error } = await supabase
        .from('certifications')
        .select('cert_time')
        .eq('member_id', memberId)
        .gt('final_exp', 0);

      if (error) throw error;

      // Count by hour
      const counts = new Array(24).fill(0);
      certs?.forEach(cert => {
        if (cert.cert_time) {
          const hour = parseInt(cert.cert_time.split(':')[0], 10);
          if (hour >= 0 && hour < 24) {
            counts[hour]++;
          }
        }
      });

      const data: HourlyData[] = counts.map((count, hour) => ({ hour, count }));
      setHourlyData(data);

      // Find peak hour
      const maxCount = Math.max(...counts);
      const peak = counts.indexOf(maxCount);
      setPeakHour(maxCount > 0 ? peak : null);

      // Period stats
      const morning = counts.slice(5, 12).reduce((a, b) => a + b, 0);
      const afternoon = counts.slice(12, 18).reduce((a, b) => a + b, 0);
      const evening = counts.slice(18, 24).reduce((a, b) => a + b, 0);
      const night = counts.slice(0, 5).reduce((a, b) => a + b, 0);
      const total = morning + afternoon + evening + night;

      setPeriodStats({
        morning: total > 0 ? Math.round((morning / total) * 100) : 0,
        afternoon: total > 0 ? Math.round((afternoon / total) * 100) : 0,
        evening: total > 0 ? Math.round((evening / total) * 100) : 0,
        night: total > 0 ? Math.round((night / total) * 100) : 0
      });
    } catch (error) {
      console.error('Failed to fetch time data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getHeatColor(count: number, maxCount: number): string {
    if (count === 0) return 'bg-bg';
    const intensity = count / maxCount;
    if (intensity > 0.8) return 'bg-primary';
    if (intensity > 0.6) return 'bg-primary/80';
    if (intensity > 0.4) return 'bg-primary/60';
    if (intensity > 0.2) return 'bg-primary/40';
    return 'bg-primary/20';
  }

  function getTimeLabel(hour: number): string {
    const ampm = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${ampm} ${displayHour}시`;
  }

  function getPeriodEmoji(period: string): string {
    switch (period) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      case 'night': return '🌃';
      default: return '';
    }
  }

  function getPeriodLabel(period: string): string {
    switch (period) {
      case 'morning': return '오전 (5-11시)';
      case 'afternoon': return '오후 (12-17시)';
      case 'evening': return '저녁 (18-23시)';
      case 'night': return '새벽 (0-4시)';
      default: return '';
    }
  }

  if (loading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="text-text-muted text-sm">로딩 중...</div>
      </div>
    );
  }

  const maxCount = Math.max(...hourlyData.map(d => d.count), 1);

  return (
    <div>
      {/* Heatmap Grid */}
      <div className="mb-4">
        <div className="grid grid-cols-12 gap-1">
          {hourlyData.map(({ hour, count }) => (
            <div
              key={hour}
              className={`aspect-square rounded ${getHeatColor(count, maxCount)} relative group cursor-default`}
              title={`${getTimeLabel(hour)}: ${count}회`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-bg-card border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <p className="font-medium text-text">{count}회</p>
                  <p className="text-text-muted">{getTimeLabel(hour)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hour labels */}
        <div className="grid grid-cols-12 gap-1 mt-1">
          {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(hour => (
            <div key={hour} className="text-center text-xs text-text-muted">
              {hour}
            </div>
          ))}
        </div>
      </div>

      {/* Peak Hour */}
      {peakHour !== null && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <div>
              <p className="text-sm text-text">
                <span className="font-medium">피크 시간:</span> {getTimeLabel(peakHour)}
              </p>
              <p className="text-xs text-text-muted">
                가장 많이 인증하는 시간대입니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Stats */}
      <div className="grid grid-cols-2 gap-2">
        {(['morning', 'afternoon', 'evening', 'night'] as const).map(period => (
          <div key={period} className="p-3 bg-bg rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span>{getPeriodEmoji(period)}</span>
              <span className="text-sm text-text">{getPeriodLabel(period)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${periodStats[period]}%` }}
                />
              </div>
              <span className="text-sm font-medium text-text-muted w-12 text-right">
                {periodStats[period]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 bg-bg rounded-lg">
        <p className="text-sm text-text-muted">
          💡 {getInsight(periodStats)}
        </p>
      </div>
    </div>
  );
}

function getInsight(stats: { morning: number; afternoon: number; evening: number; night: number }): string {
  const { morning, afternoon, evening, night } = stats;
  const max = Math.max(morning, afternoon, evening, night);

  if (max === 0) return '아직 인증 기록이 없습니다.';

  if (morning === max) {
    return '오전에 가장 활발하게 인증하고 계세요! 아침형 인간이시네요.';
  } else if (afternoon === max) {
    return '오후에 가장 많이 인증하시네요. 점심 이후가 골든타임!';
  } else if (evening === max) {
    return '저녁 시간대에 주로 인증하시네요. 하루를 마무리하며 정리하는 스타일!';
  } else {
    return '새벽에 활동하시는 올빼미형! 야간형 인증러시네요.';
  }
}
