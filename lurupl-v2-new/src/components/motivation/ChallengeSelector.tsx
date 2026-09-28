import { useState, useEffect } from 'react';
import { Star, Clock, ChevronRight, Sparkles, Heart } from 'lucide-react';
import { getChallengeTemplates, toggleFavoriteChallenge, getFavoriteChallenges } from '@/lib/motivation-api';
import type { ChallengeTemplate, UserChallenge } from '@/domain/motivation';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/domain/motivation';
import { DEFAULT_CATEGORIES, type CategoryKey, CATEGORY_COLORS } from '@/domain/categories';

interface ChallengeSelectorProps {
  memberId: string;
  onSelect: (template: ChallengeTemplate) => void;
}

export function ChallengeSelector({ memberId, onSelect }: ChallengeSelectorProps) {
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all' | 'favorites'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [memberId]);

  async function fetchData() {
    setLoading(true);
    const [templatesData, favoritesData] = await Promise.all([
      getChallengeTemplates(),
      getFavoriteChallenges(memberId),
    ]);
    setTemplates(templatesData);
    setFavorites(new Set(favoritesData.map((f) => f.template_id)));
    setLoading(false);
  }

  async function handleToggleFavorite(templateId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const isFavorite = favorites.has(templateId);
    const success = await toggleFavoriteChallenge(memberId, templateId, !isFavorite);

    if (success) {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.delete(templateId);
        } else {
          next.add(templateId);
        }
        return next;
      });
    }
  }

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'favorites') return favorites.has(t.id);
    return t.category_key === selectedCategory;
  });

  const categories = Object.values(DEFAULT_CATEGORIES);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-border/50 rounded-lg"></div>
        <div className="h-24 bg-border/50 rounded-lg"></div>
        <div className="h-24 bg-border/50 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          작은 도전 선택
        </h3>
        <p className="text-sm text-text-muted mt-1">
          지금 바로 시작할 수 있는 작은 도전을 선택하세요
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-white'
              : 'bg-bg text-text-muted hover:bg-bg-hover'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedCategory('favorites')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
            selectedCategory === 'favorites'
              ? 'bg-red-500 text-white'
              : 'bg-bg text-text-muted hover:bg-bg-hover'
          }`}
        >
          <Heart className="w-3 h-3" />
          즐겨찾기
        </button>
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
              selectedCategory === cat.key
                ? 'bg-primary text-white'
                : 'bg-bg text-text-muted hover:bg-bg-hover'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>
            {selectedCategory === 'favorites'
              ? '즐겨찾기한 도전이 없습니다'
              : '해당 카테고리에 도전이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTemplates.map((template) => {
            const category = DEFAULT_CATEGORIES[template.category_key];
            const color = CATEGORY_COLORS[template.category_key];
            const isFavorite = favorites.has(template.id);

            return (
              <div
                key={template.id}
                onClick={() => onSelect(template)}
                className="p-4 bg-bg rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-all hover:shadow-md group"
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {category.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text">{template.title}</h4>
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

                    {template.description && (
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {template.duration_minutes}분
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${color}15`,
                          color: color,
                        }}
                      >
                        {category.name}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleToggleFavorite(template.id, e)}
                      className={`p-2 rounded-lg transition-colors ${
                        isFavorite
                          ? 'text-red-500 bg-red-500/10'
                          : 'text-text-muted hover:text-red-500 hover:bg-red-500/10'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </div>

                {/* Tips Preview */}
                {template.tips && template.tips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-muted">
                      팁: {template.tips[0]}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
