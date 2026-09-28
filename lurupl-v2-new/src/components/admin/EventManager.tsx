import { useEffect, useState } from 'react';
import { useEventsStore, type XpEvent } from '@/stores/eventsStore';
import { Modal, Spinner, Badge } from '@/components/common';
import { DEFAULT_CATEGORIES } from '@/domain/categories';

export function EventManager() {
  const { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent } =
    useEventsStore();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<XpEvent | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEdit = (event: XpEvent) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteEvent(id);
    }
  };

  const handleToggle = async (event: XpEvent) => {
    await updateEvent(event.id, { is_enabled: !event.is_enabled });
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">
          이벤트 관리 ({events.length}개)
        </h3>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          + 이벤트 추가
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`p-4 bg-bg rounded-lg ${
              !event.is_enabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text">
                  {event.emoji} {event.name}
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {event.start_date} ~ {event.end_date}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="primary" size="md">
                    x{event.multiplier} 배율
                  </Badge>
                  {event.categories?.map((cat) => (
                    <Badge key={cat} variant="category" categoryKey={cat}>
                      {DEFAULT_CATEGORIES[cat as keyof typeof DEFAULT_CATEGORIES]?.emoji}{' '}
                      {DEFAULT_CATEGORIES[cat as keyof typeof DEFAULT_CATEGORIES]?.name}
                    </Badge>
                  ))}
                  {!event.categories && (
                    <Badge variant="default">전체 카테고리</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(event)}
                  className={`px-3 py-1 rounded text-sm ${
                    event.is_enabled
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {event.is_enabled ? '활성' : '비활성'}
                </button>
                <button
                  onClick={() => handleEdit(event)}
                  className="px-3 py-1 bg-bg-card border border-border rounded text-sm text-text-muted hover:text-text"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="px-3 py-1 text-error hover:bg-error/10 rounded text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <p className="text-center py-8 text-text-muted">등록된 이벤트가 없습니다</p>
        )}
      </div>

      <EventFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        event={editingEvent}
        onSave={async (data) => {
          if (editingEvent) {
            await updateEvent(editingEvent.id, data);
          } else {
            await createEvent(data as Omit<XpEvent, 'id' | 'created_at'>);
          }
          setShowModal(false);
        }}
      />
    </div>
  );
}

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: XpEvent | null;
  onSave: (data: Partial<XpEvent>) => Promise<void>;
}

function EventFormModal({ isOpen, onClose, event, onSave }: EventFormModalProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState('1.5');
  const [allCategories, setAllCategories] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setEmoji(event.emoji);
      setStartDate(event.start_date);
      setEndDate(event.end_date);
      setMultiplier(String(event.multiplier));
      setAllCategories(!event.categories);
      setSelectedCategories(event.categories || []);
    } else {
      setName('');
      setEmoji('');
      setStartDate('');
      setEndDate('');
      setMultiplier('1.5');
      setAllCategories(true);
      setSelectedCategories([]);
    }
  }, [event, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      emoji: emoji || '',
      start_date: startDate,
      end_date: endDate,
      multiplier: parseFloat(multiplier),
      categories: allCategories ? null : selectedCategories,
      is_enabled: true,
    });
    setSaving(false);
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? '이벤트 수정' : '이벤트 추가'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <label className="block text-sm text-text-muted mb-1">이벤트명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">이모지</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-center"
              placeholder=""
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">EXP 배율</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="5"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-2">적용 카테고리</label>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={allCategories}
              onChange={(e) => setAllCategories(e.target.checked)}
              className="rounded"
            />
            <span className="text-text">전체 카테고리</span>
          </label>

          {!allCategories && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategories.includes(key)
                      ? 'bg-primary text-white'
                      : 'bg-bg-hover text-text-muted hover:text-text'
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-border rounded-lg text-text-muted hover:bg-bg-hover"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
