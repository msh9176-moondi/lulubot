import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES } from '@/domain/categories';
import { Zap, Calendar } from 'lucide-react';

interface XpEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  exp_multiplier: number;
  categories: string[] | null;
  is_enabled: boolean;
}

export function EventBanners() {
  const [activeEvents, setActiveEvents] = useState<XpEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<XpEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('xp_events')
        .select('*')
        .eq('is_enabled', true)
        .gte('end_date', today)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const active: XpEvent[] = [];
      const upcoming: XpEvent[] = [];

      data?.forEach(event => {
        if (event.start_date <= today && event.end_date >= today) {
          active.push(event);
        } else if (event.start_date > today) {
          upcoming.push(event);
        }
      });

      setActiveEvents(active);
      setUpcomingEvents(upcoming.slice(0, 1));
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDaysRemaining(endDate: string) {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDaysUntilStart(startDate: string) {
    const start = new Date(startDate);
    const now = new Date();
    return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getCategoryText(categories: string[] | null) {
    if (!categories || categories.length === 0) return '전체 카테고리';
    return categories
      .map(c => {
        const cat = DEFAULT_CATEGORIES[c as keyof typeof DEFAULT_CATEGORIES];
        return cat ? cat.name : c;
      })
      .join(', ');
  }

  if (loading) {
    return null;
  }

  if (activeEvents.length === 0 && upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Active Events */}
      {activeEvents.map(event => {
        const daysLeft = getDaysRemaining(event.end_date);

        return (
          <div
            key={event.id}
            className="bg-primary/10 rounded-xl border border-primary/20 p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-text truncate">{event.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                    <span>{getCategoryText(event.categories)}</span>
                    <span className="text-border">|</span>
                    <span>~{event.end_date}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-primary">
                  x{event.exp_multiplier}
                </div>
                <div className={`text-xs font-medium ${
                  daysLeft <= 1 ? 'text-error' : daysLeft <= 3 ? 'text-warning' : 'text-text-muted'
                }`}>
                  D-{daysLeft}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Upcoming Events */}
      {upcomingEvents.map(event => {
        const daysUntil = getDaysUntilStart(event.start_date);

        return (
          <div
            key={event.id}
            className="bg-bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-border flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-text-muted" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm text-text truncate">
                    <span className="text-text-muted">예정:</span> {event.name}
                  </h3>
                  <div className="text-xs text-text-muted mt-0.5">
                    {event.start_date} 시작 · x{event.exp_multiplier}
                  </div>
                </div>
              </div>

              <div className="text-xs font-medium text-primary flex-shrink-0">
                {daysUntil}일 후
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
