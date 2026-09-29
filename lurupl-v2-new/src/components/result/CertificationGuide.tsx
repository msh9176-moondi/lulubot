import { DEFAULT_CATEGORIES, CATEGORY_COLORS, type CategoryKey } from '@/domain/categories';

const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  cleaning: '집안일, 정리정돈, 청소 관련 활동',
  exercise: '운동, 산책, 건강 관리 활동',
  morning: '아침 기상 인증 (목표 시간 설정 가능)',
  planning: '하루 계획 세우기, 할일 목록 작성',
  study: '공부, 독서, 학습 활동',
  medicine: '약 복용, 영양제 섭취',
  diary: '일기 작성, 하루 기록',
  meditation: '명상, 마음챙김, 호흡 운동',
  comeback: '72시간 이상 휴식 후 복귀',
};

const SPECIAL_RULES: Record<CategoryKey, string | null> = {
  cleaning: null,
  exercise: null,
  morning: '목표 기상 시간 ±30분 내 인증 시 보너스 +1 EXP',
  planning: null,
  study: null,
  medicine: null,
  diary: null,
  meditation: null,
  comeback: '마지막 인증 후 72시간 경과 필요',
};

export function CertificationGuide() {
  const categories = Object.values(DEFAULT_CATEGORIES);

  return (
    <div className="bg-bg-card rounded-xl border border-border p-[28px]">
      <h2 className="text-lg font-semibold text-text mb-2">인증 가이드</h2>
      <p className="text-sm text-text-muted mb-6">
        카카오톡 채팅방에서 해시태그와 함께 인증하세요
      </p>

      {/* 기본 규칙 */}
      <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="font-medium text-text mb-3 flex items-center gap-2">
          <span>📌</span> 기본 규칙
        </h3>
        <ul className="text-sm text-text-muted space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>인증 메시지에 <strong className="text-text">해시태그</strong>를 포함해주세요</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>카테고리별 <strong className="text-text">일일 제한</strong>이 있습니다 (초과 시 0 EXP)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>인증 사진과 함께 올리면 더 좋아요!</span>
          </li>
        </ul>
      </div>

      {/* 카테고리별 가이드 */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat.key];
          const description = CATEGORY_DESCRIPTIONS[cat.key];
          const specialRule = SPECIAL_RULES[cat.key];

          return (
            <div
              key={cat.key}
              className="p-4 bg-bg rounded-lg border border-border hover:border-primary/30 transition-colors"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {cat.emoji}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">{cat.name}</h3>
                    <p className="text-xs text-text-muted">{description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color }}>
                    {cat.baseExp} EXP
                  </p>
                  <p className="text-xs text-text-muted">
                    {cat.cooldownHours
                      ? `${cat.cooldownHours}시간당 1회`
                      : `일일 ${cat.dailyLimit}회`
                    }
                  </p>
                </div>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-2 mb-2">
                {cat.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{
                      backgroundColor: `${color}15`,
                      color: color,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 특별 규칙 */}
              {specialRule && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-accent flex items-center gap-1">
                    <span>✨</span>
                    {specialRule}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 레벨 시스템 설명 */}
      <div className="mt-8 p-5 bg-accent/5 border border-accent/20 rounded-lg space-y-5">
        <h3 className="font-semibold text-text flex items-center gap-2 text-base">
          <span>⭐</span> 레벨 시스템
        </h3>

        {/* 기본 레벨업 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text flex items-center gap-2">
            <span>📈</span> 레벨업 규칙
          </h4>
          <ul className="text-sm text-text-muted space-y-1.5 ml-6">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span><strong className="text-text">5 EXP</strong> 획득 시 1 레벨 상승</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span>레벨 1부터 시작, 상한선 없음</span>
            </li>
          </ul>
        </div>

        {/* 레벨 타이틀 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text flex items-center gap-2">
            <span>🏷️</span> 레벨별 타이틀 (10레벨 순환)
          </h4>
          <div className="grid grid-cols-5 gap-2 ml-6">
            {['새싹', '성장', '발전', '열정', '습관', '루틴', '마스터', '전문가', '영웅', '전설'].map((title, i) => (
              <div key={title} className="text-center p-2 bg-bg-card rounded-lg border border-accent/30 shadow-sm">
                <p className="text-xs text-accent">Lv.{i + 1}</p>
                <p className="text-sm font-medium text-text">{title}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted ml-6">
            * Lv.11부터는 타이틀에 등급 추가 (예: 새싹 II, 성장 III...)
          </p>
        </div>

        {/* 누적 등급 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text flex items-center gap-2">
            <span>🎖️</span> 누적 EXP 등급
          </h4>
          <div className="overflow-x-auto ml-6">
            <div className="flex gap-2 pb-2">
              {[
                { exp: 0, title: '뉴비', icon: '🌱' },
                { exp: 30, title: '루키', icon: '🥉' },
                { exp: 80, title: '브론즈', icon: '🥈' },
                { exp: 150, title: '실버', icon: '🥇' },
                { exp: 300, title: '골드', icon: '⭐' },
                { exp: 500, title: '플래티넘', icon: '💎' },
                { exp: 800, title: '다이아', icon: '👑' },
                { exp: 1200, title: '마스터', icon: '🔥' },
                { exp: 2000, title: '그랜드마스터', icon: '⚡' },
                { exp: 3000, title: '레전드', icon: '🏆' },
              ].map((rank, i, arr) => (
                <div key={rank.title} className="flex items-center">
                  <div className="text-center p-2 bg-bg-card rounded-lg border border-accent/30 shadow-sm min-w-[72px]">
                    <p className="text-lg">{rank.icon}</p>
                    <p className="text-xs font-medium text-text">{rank.title}</p>
                    <p className="text-[10px] text-accent">{rank.exp}+</p>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-accent mx-1">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 월간 수상 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text flex items-center gap-2">
            <span>🏅</span> 월간 수상 제도
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-6">
            <div className="p-3 bg-bg-card rounded-lg border border-accent/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>🏆</span>
                <span className="font-medium text-text text-sm">MVP</span>
              </div>
              <p className="text-xs text-text-muted">월간 최다 EXP 획득자</p>
            </div>
            <div className="p-3 bg-bg-card rounded-lg border border-accent/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>📈</span>
                <span className="font-medium text-text text-sm">성장왕</span>
              </div>
              <p className="text-xs text-text-muted">전월 대비 가장 많이 성장</p>
            </div>
            <div className="p-3 bg-bg-card rounded-lg border border-accent/30 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span>🎯</span>
                <span className="font-medium text-text text-sm">도전왕</span>
              </div>
              <p className="text-xs text-text-muted">가장 많은 도전과제 달성</p>
            </div>
          </div>
        </div>

        {/* 보너스 규칙 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text flex items-center gap-2">
            <span>✨</span> 보너스 EXP
          </h4>
          <ul className="text-sm text-text-muted space-y-1.5 ml-6">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span><strong className="text-text">기상 보너스</strong>: 목표 시간 ±30분 내 인증 시 +1 EXP</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              <span><strong className="text-text">복귀 보너스</strong>: 72시간 이상 휴식 후 복귀 시 +2 EXP</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 인증 예시 */}
      <div className="mt-6 p-4 bg-bg rounded-lg border border-border">
        <h3 className="font-medium text-text mb-3 flex items-center gap-2">
          <span>💬</span> 인증 예시
        </h3>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-bg-card rounded-lg">
            <p className="text-text">오늘도 30분 러닝 완료! 🏃‍♂️ <span className="text-primary">#운동</span></p>
          </div>
          <div className="p-3 bg-bg-card rounded-lg">
            <p className="text-text">방 정리하고 청소기 돌렸어요 <span className="text-primary">#청소</span></p>
          </div>
          <div className="p-3 bg-bg-card rounded-lg">
            <p className="text-text">7시 기상 성공! <span className="text-primary">#기상</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
