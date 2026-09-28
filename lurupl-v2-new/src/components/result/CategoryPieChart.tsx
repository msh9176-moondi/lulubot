import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES } from '@/domain/categories';

interface CategoryData {
  category_key: string;
  category_name: string;
  category_emoji: string;
  cert_count: number;
  total_exp: number;
}

interface CategoryPieChartProps {
  yearMonth: string;
}

// Monochrome blue palette based on primary color
const MONOCHROME_COLORS = [
  '#6C8DFF', // primary
  '#5A7AE6',
  '#4867CC',
  '#3654B3',
  '#244199',
  '#1A3380',
  '#122666',
  '#0A1A4D',
  '#051033',
];

export function CategoryPieChart({ yearMonth }: CategoryPieChartProps) {
  const [data, setData] = useState<CategoryData[]>([]);
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
        .select('category_key, final_exp')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (error) throw error;

      const categoryMap: Record<string, { count: number; exp: number }> = {};
      for (const cert of certsData || []) {
        if (!categoryMap[cert.category_key]) {
          categoryMap[cert.category_key] = { count: 0, exp: 0 };
        }
        categoryMap[cert.category_key].count += 1;
        categoryMap[cert.category_key].exp += cert.final_exp || 0;
      }

      const result: CategoryData[] = Object.entries(categoryMap).map(([key, stats]) => {
        const cat = DEFAULT_CATEGORIES[key as keyof typeof DEFAULT_CATEGORIES];
        return {
          category_key: key,
          category_name: cat?.name || key,
          category_emoji: cat?.emoji || '',
          cert_count: stats.count,
          total_exp: stats.exp,
        };
      });

      result.sort((a, b) => b.cert_count - a.cert_count);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch category distribution:', error);
    } finally {
      setLoading(false);
    }
  }

  const total = data.reduce((sum, d) => sum + d.cert_count, 0);

  // Calculate pie chart segments
  let currentAngle = -90;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.cert_count / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle: currentAngle,
      color: MONOCHROME_COLORS[index % MONOCHROME_COLORS.length],
    };
  });

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', x, y,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z',
    ].join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-text-muted text-sm">로딩 중...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-text-muted text-sm">데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Pie Chart SVG */}
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {segments.map((seg) => (
            <path
              key={seg.category_key}
              d={describeArc(50, 50, 45, seg.startAngle, seg.endAngle)}
              fill={seg.color}
              className="transition-all duration-200 hover:opacity-80"
            />
          ))}
          {/* Center hole */}
          <circle cx="50" cy="50" r="25" fill="var(--color-bg-card)" />
          {/* Center text */}
          <text
            x="50"
            y="48"
            textAnchor="middle"
            className="fill-text font-bold"
            style={{ fontSize: '12px' }}
          >
            {total}
          </text>
          <text
            x="50"
            y="58"
            textAnchor="middle"
            className="fill-text-muted"
            style={{ fontSize: '6px' }}
          >
            총 인증
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {segments.map((seg) => (
          <div key={seg.category_key} className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-text truncate">{seg.category_name}</span>
            <span className="text-text-muted text-xs ml-auto">{seg.cert_count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
