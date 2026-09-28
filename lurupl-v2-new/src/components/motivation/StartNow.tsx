import { useState, useEffect } from 'react';
import { Play, Clock, Lightbulb, ArrowLeft, CheckCircle } from 'lucide-react';
import { createStartAttempt, getPersonalReasons } from '@/lib/motivation-api';
import type { ChallengeTemplate, PersonalReason } from '@/domain/motivation';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, getImportanceEmoji } from '@/domain/motivation';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from '@/domain/categories';

interface StartNowProps {
  memberId: string;
  template: ChallengeTemplate;
  onBack: () => void;
  onStarted: (attemptId: string) => void;
}

export function StartNow({ memberId, template, onBack, onStarted }: StartNowProps) {
  const [reasons, setReasons] = useState<PersonalReason[]>([]);
  const [notes, setNotes] = useState('');
  const [starting, setStarting] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const category = DEFAULT_CATEGORIES[template.category_key];
  const color = CATEGORY_COLORS[template.category_key];

  useEffect(() => {
    fetchReasons();
  }, [memberId, template.category_key]);

  async function fetchReasons() {
    const data = await getPersonalReasons(memberId);
    // Filter by category or show general reasons
    const filtered = data.filter(
      (r) => r.category_key === template.category_key || r.category_key === null
    );
    setReasons(filtered);
  }

  async function handleStart() {
    setStarting(true);
    const attemptId = await createStartAttempt(
      memberId,
      template.category_key,
      template.id,
      notes.trim() || undefined
    );
    setStarting(false);

    if (attemptId) {
      onStarted(attemptId);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        돌아가기
      </button>

      {/* Challenge Card */}
      <div
        className="p-6 rounded-xl border-2"
        style={{
          borderColor: color,
          backgroundColor: `${color}10`,
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            {category.emoji}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text">{template.title}</h2>
            {template.description && (
              <p className="text-text-muted mt-1">{template.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-1 text-sm text-text-muted">
                <Clock className="w-4 h-4" />
                {template.duration_minutes}분
              </span>
              <span
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `${DIFFICULTY_COLORS[template.difficulty]}20`,
                  color: DIFFICULTY_COLORS[template.difficulty],
                }}
              >
                {DIFFICULTY_LABELS[template.difficulty]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My Reasons (if any) */}
      {reasons.length > 0 && (
        <div className="p-4 bg-bg rounded-lg border border-border">
          <h3 className="font-medium text-text mb-3 flex items-center gap-2">
            <span className="text-red-500">❤️</span>
            내가 이걸 하려는 이유
          </h3>
          <div className="space-y-2">
            {reasons.slice(0, 2).map((reason) => (
              <div
                key={reason.id}
                className="flex items-start gap-2 text-sm text-text-muted"
              >
                <span>{getImportanceEmoji(reason.importance)}</span>
                <span>"{reason.reason_text}"</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {template.tips && template.tips.length > 0 && (
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-medium text-text flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              시작 팁
            </h3>
            <span className="text-sm text-primary">
              {showTips ? '접기' : '보기'}
            </span>
          </button>

          {showTips && (
            <ul className="mt-3 space-y-2">
              {template.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-text-muted">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Notes (optional) */}
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          메모 (선택사항)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="오늘의 목표나 다짐을 적어보세요..."
          className="w-full p-3 bg-bg border border-border rounded-lg text-text resize-none"
          rows={2}
        />
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full py-4 bg-primary text-white rounded-xl text-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
      >
        {starting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            시작하는 중...
          </>
        ) : (
          <>
            <Play className="w-6 h-6" />
            지금 시작!
          </>
        )}
      </button>

      {/* Info */}
      <p className="text-xs text-text-muted text-center">
        시작하면 24시간 안에 카카오톡에서 인증해주세요.
        <br />
        인증하면 EXP가 확정됩니다!
      </p>
    </div>
  );
}
