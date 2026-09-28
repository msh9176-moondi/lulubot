import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface CategoryGridProps {
  yearMonth: string;
}

interface CategoryData {
  category: CategoryKey;
  count: number;
  totalExp: number;
}

export function CategoryGrid({ yearMonth }: CategoryGridProps) {
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

      const { data: certs, error } = await supabase
        .from('certifications')
        .select('category_key, final_exp')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (error) throw error;

      // Aggregate by category
      const categoryMap: Record<string, { count: number; totalExp: number }> = {};

      certs?.forEach(cert => {
        const key = cert.category_key;
        if (!categoryMap[key]) {
          categoryMap[key] = { count: 0, totalExp: 0 };
        }
        categoryMap[key].count++;
        categoryMap[key].totalExp += cert.final_exp || 0;
      });

      // Convert to array with all categories
      const result: CategoryData[] = Object.keys(DEFAULT_CATEGORIES).map(key => ({
        category: key as CategoryKey,
        count: categoryMap[key]?.count || 0,
        totalExp: categoryMap[key]?.totalExp || 0,
      }));

      setData(result);
    } catch (error) {
      console.error('Failed to fetch category data:', error);
    } finally {
      setLoading(false);
    }
  }

  const colors: Record<string, string> = {
    cleaning: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    exercise: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    morning: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    planning: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    study: 'from-green-500/20 to-green-500/5 border-green-500/30',
    medicine: 'from-red-500/20 to-red-500/5 border-red-500/30',
    diary: 'from-orange-500/20 to-orange-500/5 border-orange-500/30',
    meditation: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    comeback: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-bg rounded-lg p-4 h-28"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <h2 className="text-lg font-semibold text-text mb-5">카테고리별 현황</h2>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {data.map(({ category, count, totalExp }) => {
          const cat = DEFAULT_CATEGORIES[category];

          return (
            <div
              key={category}
              className={`p-4 rounded-lg border bg-gradient-to-b ${colors[category] || 'bg-bg border-border'}`}
            >
              <div className="text-center">
                <span className="text-2xl block mb-1">{cat.emoji}</span>
                <p className="text-xs text-text-muted mb-2">{cat.name}</p>
                <p className="text-lg font-bold text-text">{count}</p>
                <p className="text-xs text-primary">+{totalExp} EXP</p>
                <p className="text-xs text-text-muted mt-1">
                  일일 {cat.dailyLimit}회
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
        <span>💡 일일 제한: 하루 최대 인증 가능 횟수</span>
      </div>
    </div>
  );
}
