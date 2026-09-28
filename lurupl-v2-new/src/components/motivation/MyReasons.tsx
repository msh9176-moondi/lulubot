import { useState, useEffect } from 'react';
import { Plus, Trash2, Heart, Edit2, Save, X } from 'lucide-react';
import {
  getPersonalReasons,
  createPersonalReason,
  updatePersonalReason,
  deletePersonalReason,
} from '@/lib/motivation-api';
import type { PersonalReason } from '@/domain/motivation';
import { getImportanceEmoji } from '@/domain/motivation';
import { DEFAULT_CATEGORIES, type CategoryKey, CATEGORY_COLORS } from '@/domain/categories';

interface MyReasonsProps {
  memberId: string;
}

export function MyReasons({ memberId }: MyReasonsProps) {
  const [reasons, setReasons] = useState<PersonalReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState<CategoryKey | ''>('');
  const [newImportance, setNewImportance] = useState(3);

  // Edit form
  const [editReason, setEditReason] = useState('');
  const [editImportance, setEditImportance] = useState(3);

  useEffect(() => {
    fetchReasons();
  }, [memberId]);

  async function fetchReasons() {
    setLoading(true);
    const data = await getPersonalReasons(memberId);
    setReasons(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newReason.trim()) return;

    const reason = await createPersonalReason(
      memberId,
      newReason.trim(),
      newCategory || null,
      newImportance
    );

    if (reason) {
      setReasons([reason, ...reasons]);
      setNewReason('');
      setNewCategory('');
      setNewImportance(3);
      setShowAdd(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editReason.trim()) return;

    const success = await updatePersonalReason(id, {
      reason_text: editReason.trim(),
      importance: editImportance,
    });

    if (success) {
      setReasons(
        reasons.map((r) =>
          r.id === id
            ? { ...r, reason_text: editReason.trim(), importance: editImportance }
            : r
        )
      );
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 이유를 삭제하시겠습니까?')) return;

    const success = await deletePersonalReason(id);
    if (success) {
      setReasons(reasons.filter((r) => r.id !== id));
    }
  }

  function startEdit(reason: PersonalReason) {
    setEditingId(reason.id);
    setEditReason(reason.reason_text);
    setEditImportance(reason.importance);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            나의 이유
          </h3>
          <p className="text-sm text-text-muted mt-1">
            왜 이 습관을 원하나요? 진짜 이유를 적어보세요
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="p-4 bg-bg rounded-lg border border-border">
          <textarea
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="예: 아침에 일찍 일어나면 하루가 여유로워지고, 나만의 시간을 가질 수 있어서"
            className="w-full p-3 bg-bg-card border border-border rounded-lg text-text resize-none"
            rows={3}
          />

          <div className="mt-3 flex flex-wrap gap-3">
            {/* Category Select */}
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as CategoryKey | '')}
              className="px-3 py-2 bg-bg-card border border-border rounded-lg text-sm text-text"
            >
              <option value="">전체 (특정 카테고리 없음)</option>
              {Object.values(DEFAULT_CATEGORIES).map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>

            {/* Importance */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">중요도:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setNewImportance(level)}
                    className={`w-8 h-8 rounded-lg text-lg transition-colors ${
                      newImportance >= level
                        ? 'bg-primary/20 text-primary'
                        : 'bg-bg-card text-text-muted'
                    }`}
                  >
                    {getImportanceEmoji(level)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newReason.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              저장
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setNewReason('');
                setNewCategory('');
                setNewImportance(3);
              }}
              className="px-4 py-2 bg-bg-card text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Reasons List */}
      {reasons.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>아직 작성한 이유가 없습니다</p>
          <p className="text-sm mt-1">나만의 동기를 적어보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reasons.map((reason) => {
            const category = reason.category_key
              ? DEFAULT_CATEGORIES[reason.category_key]
              : null;
            const color = reason.category_key
              ? CATEGORY_COLORS[reason.category_key]
              : '#6b7280';

            const isEditing = editingId === reason.id;

            return (
              <div
                key={reason.id}
                className="p-4 bg-bg rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full p-3 bg-bg-card border border-border rounded-lg text-text resize-none"
                      rows={3}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-muted">중요도:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => setEditImportance(level)}
                            className={`w-8 h-8 rounded-lg text-lg transition-colors ${
                              editImportance >= level
                                ? 'bg-primary/20 text-primary'
                                : 'bg-bg-card text-text-muted'
                            }`}
                          >
                            {getImportanceEmoji(level)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(reason.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-bg-card text-text-muted rounded-lg text-sm hover:bg-bg-hover transition-colors"
                      >
                        <X className="w-4 h-4" />
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start gap-3">
                      {/* Importance indicator */}
                      <div className="text-2xl">{getImportanceEmoji(reason.importance)}</div>

                      <div className="flex-1 min-w-0">
                        <p className="text-text">{reason.reason_text}</p>

                        {category && (
                          <span
                            className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                            }}
                          >
                            {category.emoji} {category.name}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(reason)}
                          className="p-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reason.id)}
                          className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
