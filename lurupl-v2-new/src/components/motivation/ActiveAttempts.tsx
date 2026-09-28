import { useState, useEffect } from 'react';
import { Clock, X, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { getActiveAttempts, getRecentAttempts, cancelStartAttempt } from '@/lib/motivation-api';
import type { StartAttempt } from '@/domain/motivation';
import { getRemainingTime, ATTEMPT_STATUS_LABELS, ATTEMPT_STATUS_COLORS } from '@/domain/motivation';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from '@/domain/categories';

interface ActiveAttemptsProps {
  memberId: string;
  onNewChallenge: () => void;
}

export function ActiveAttempts({ memberId, onNewChallenge }: ActiveAttemptsProps) {
  const [activeAttempts, setActiveAttempts] = useState<StartAttempt[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<StartAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(new Date());

  useEffect(() => {
    fetchAttempts();
    // Update "now" every minute for countdown
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, [memberId]);

  async function fetchAttempts() {
    setLoading(true);
    const [active, recent] = await Promise.all([
      getActiveAttempts(memberId),
      getRecentAttempts(memberId, 5),
    ]);
    setActiveAttempts(active);
    setRecentAttempts(recent.filter((r) => r.status !== 'started'));
    setLoading(false);
  }

  async function handleCancel(attemptId: string) {
    if (!confirm('이 시도를 취소하시겠습니까?')) return;

    const success = await cancelStartAttempt(attemptId);
    if (success) {
      setActiveAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-border/50 rounded-lg"></div>
        <div className="h-20 bg-border/50 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Attempts */}
      <div>
        <h3 className="text-lg font-semibold text-text flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-primary" />
          진행 중인 도전
        </h3>

        {activeAttempts.length === 0 ? (
          <div className="text-center py-8 bg-bg rounded-lg border border-border">
            <Play className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-30" />
            <p className="text-text-muted">진행 중인 도전이 없습니다</p>
            <button
              onClick={onNewChallenge}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              새 도전 시작하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAttempts.map((attempt) => {
              const category = DEFAULT_CATEGORIES[attempt.category_key];
              const color = CATEGORY_COLORS[attempt.category_key];
              const remaining = getRemainingTime(attempt.started_at);

              return (
                <div
                  key={attempt.id}
                  className={`p-4 rounded-lg border-2 ${
                    remaining.expired
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-primary/5 border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {category.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text">
                        {attempt.template?.title || `${category.name} 인증`}
                      </h4>
                      <p className="text-sm text-text-muted mt-1">
                        시작: {new Date(attempt.started_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {/* Countdown */}
                      <div
                        className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                          remaining.expired ? 'text-red-500' : 'text-primary'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {remaining.expired ? (
                          <span>시간 초과</span>
                        ) : (
                          <span>
                            남은 시간: {remaining.hours}시간 {remaining.minutes}분
                          </span>
                        )}
                      </div>

                      {attempt.notes && (
                        <p className="text-xs text-text-muted mt-2 italic">
                          "{attempt.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCancel(attempt.id)}
                      className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="취소"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Reminder */}
                  {!remaining.expired && (
                    <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-text-muted">
                        카카오톡에서 <strong className="text-text">#{category.tags[0]}</strong> 태그로 인증하면 완료됩니다!
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-muted mb-3">최근 기록</h3>
          <div className="space-y-2">
            {recentAttempts.map((attempt) => {
              const category = DEFAULT_CATEGORIES[attempt.category_key];
              const color = CATEGORY_COLORS[attempt.category_key];
              const statusColor = ATTEMPT_STATUS_COLORS[attempt.status];

              return (
                <div
                  key={attempt.id}
                  className="flex items-center gap-3 p-3 bg-bg rounded-lg"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {category.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">
                      {attempt.template?.title || `${category.name} 인증`}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(attempt.started_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <span
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                    }}
                  >
                    {attempt.status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
                    {ATTEMPT_STATUS_LABELS[attempt.status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
