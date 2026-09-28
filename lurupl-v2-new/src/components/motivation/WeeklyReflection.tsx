import { useState, useEffect } from 'react';
import { Calendar, Save, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getWeeklyReflection,
  saveWeeklyReflection,
  getRecentReflections,
} from '@/lib/motivation-api';
import type { WeeklyReflection as WeeklyReflectionType } from '@/domain/motivation';
import { getWeekStart, getLevelEmoji } from '@/domain/motivation';

interface WeeklyReflectionProps {
  memberId: string;
}

export function WeeklyReflection({ memberId }: WeeklyReflectionProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());
  const [reflection, setReflection] = useState<WeeklyReflectionType | null>(null);
  const [recentReflections, setRecentReflections] = useState<WeeklyReflectionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidnt, setWhatDidnt] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [motivationLevel, setMotivationLevel] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [memberId, currentWeekStart]);

  async function fetchData() {
    setLoading(true);
    const [current, recent] = await Promise.all([
      getWeeklyReflection(memberId, currentWeekStart),
      getRecentReflections(memberId, 4),
    ]);

    if (current) {
      setReflection(current);
      setWhatWorked(current.what_worked || '');
      setWhatDidnt(current.what_didnt || '');
      setNextFocus(current.next_week_focus || '');
      setEnergyLevel(current.energy_level);
      setMotivationLevel(current.motivation_level);
    } else {
      setReflection(null);
      setWhatWorked('');
      setWhatDidnt('');
      setNextFocus('');
      setEnergyLevel(null);
      setMotivationLevel(null);
    }

    setRecentReflections(recent.filter((r) => r.week_start !== currentWeekStart));
    setLoading(false);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveWeeklyReflection(memberId, currentWeekStart, {
      what_worked: whatWorked.trim() || null,
      what_didnt: whatDidnt.trim() || null,
      next_week_focus: nextFocus.trim() || null,
      energy_level: energyLevel,
      motivation_level: motivationLevel,
    });
    setSaving(false);

    if (result) {
      setReflection(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const current = new Date(currentWeekStart);
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(current.toISOString().split('T')[0]);
  }

  function formatWeekRange(weekStart: string) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  }

  const isCurrentWeek = currentWeekStart === getWeekStart();
  const isFuture = new Date(currentWeekStart) > new Date();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-border/50 rounded-lg w-48"></div>
        <div className="h-32 bg-border/50 rounded-lg"></div>
        <div className="h-32 bg-border/50 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          주간 회고
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-3 py-1.5 bg-bg rounded-lg text-sm">
            <span className="font-medium text-text">{formatWeekRange(currentWeekStart)}</span>
            {isCurrentWeek && (
              <span className="ml-2 text-xs text-primary">(이번 주)</span>
            )}
          </div>

          <button
            onClick={() => navigateWeek('next')}
            disabled={isCurrentWeek || isFuture}
            className="p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isFuture ? (
        <div className="text-center py-12 bg-bg rounded-lg border border-border">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted">아직 오지 않은 주입니다</p>
        </div>
      ) : (
        <>
          {/* Energy & Motivation Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-bg rounded-lg border border-border">
              <p className="text-sm font-medium text-text mb-3">에너지 레벨</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergyLevel(level)}
                    className={`flex-1 py-3 text-2xl rounded-lg transition-colors ${
                      energyLevel === level
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-bg-card hover:bg-bg-hover'
                    }`}
                  >
                    {getLevelEmoji(level)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-bg rounded-lg border border-border">
              <p className="text-sm font-medium text-text mb-3">동기 레벨</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setMotivationLevel(level)}
                    className={`flex-1 py-3 text-2xl rounded-lg transition-colors ${
                      motivationLevel === level
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-bg-card hover:bg-bg-hover'
                    }`}
                  >
                    {getLevelEmoji(level)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reflection Questions */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                이번 주 잘 된 것
              </label>
              <textarea
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                placeholder="작은 성공도 좋아요. 무엇이 잘 되었나요?"
                className="w-full p-3 bg-bg border border-border rounded-lg text-text resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                어려웠던 것
              </label>
              <textarea
                value={whatDidnt}
                onChange={(e) => setWhatDidnt(e.target.value)}
                placeholder="어떤 점이 힘들었나요? 솔직하게 적어보세요."
                className="w-full p-3 bg-bg border border-border rounded-lg text-text resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                다음 주 집중할 것
              </label>
              <textarea
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                placeholder="다음 주에는 무엇에 집중해볼까요?"
                className="w-full p-3 bg-bg border border-border rounded-lg text-text resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            } disabled:opacity-50`}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                저장 중...
              </>
            ) : saved ? (
              <>
                <Check className="w-5 h-5" />
                저장됨!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                저장
              </>
            )}
          </button>
        </>
      )}

      {/* Recent Reflections */}
      {recentReflections.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-muted mb-3">지난 회고</h4>
          <div className="space-y-2">
            {recentReflections.map((r) => (
              <button
                key={r.id}
                onClick={() => setCurrentWeekStart(r.week_start)}
                className="w-full p-3 bg-bg rounded-lg text-left hover:bg-bg-hover transition-colors flex items-center gap-3"
              >
                <div className="flex-shrink-0 text-2xl">
                  {r.energy_level ? getLevelEmoji(r.energy_level) : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">
                    {formatWeekRange(r.week_start)}
                  </p>
                  {r.what_worked && (
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {r.what_worked}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
