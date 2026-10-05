/**
 * TreeSkinSelector Component
 * 나무 스킨 선택 모달 - 획득한 스킨 중에서 선택 가능
 * 좌우 슬라이드 캐러셀 방식
 */

import { useState, useEffect, useRef } from 'react';
import { Check, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/common';
import { useStageStore } from '@/stores/stageStore';
import { updateMemberTreeSkin } from '@/lib/motivation-api';
import {
  type SkinId,
  DEFAULT_SKIN,
  CATEGORY_SKINS,
  getSkinImage,
  getCurrentGrowthStage,
} from '@/domain/tree-skins';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface TreeSkinSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  totalCount: number;
  currentSkinId: SkinId;
  onSkinChange: (skinId: SkinId) => void;
}

export function TreeSkinSelector({
  isOpen,
  onClose,
  memberId,
  totalCount,
  currentSkinId,
  onSkinChange,
}: TreeSkinSelectorProps) {
  const [selectedSkin, setSelectedSkin] = useState<SkinId>(currentSkinId);
  const [previewSkin, setPreviewSkin] = useState<SkinId>(currentSkinId);
  const [saving, setSaving] = useState(false);

  const { memberStatuses, fetchMemberStatus, fetchDefinitions } = useStageStore();

  // 멤버 상태 불러오기
  useEffect(() => {
    if (isOpen && memberId) {
      fetchDefinitions();
      fetchMemberStatus(memberId);
    }
  }, [isOpen, memberId, fetchDefinitions, fetchMemberStatus]);

  // 현재 스킨으로 초기화
  useEffect(() => {
    setSelectedSkin(currentSkinId);
    setPreviewSkin(currentSkinId);
  }, [currentSkinId, isOpen]);

  // 카테고리별 현재 스테이지 가져오기
  const statuses = memberStatuses.get(memberId) || [];
  const categoryStages = new Map<CategoryKey, number>();
  statuses.forEach((s) => {
    categoryStages.set(s.categoryKey, s.currentStage);
  });

  // 획득한 스킨 목록 계산
  const getUnlockedSkinIds = (): Set<SkinId> => {
    const unlocked = new Set<SkinId>(['default']);

    for (const [categoryKey, skin] of Object.entries(CATEGORY_SKINS)) {
      const currentStage = categoryStages.get(categoryKey as CategoryKey) || 0;
      if (currentStage >= skin.requiredStage) {
        unlocked.add(skin.id);
      }
    }

    return unlocked;
  };

  // 스킨 저장
  const handleSave = async () => {
    if (selectedSkin === currentSkinId) {
      onClose();
      return;
    }

    setSaving(true);
    const success = await updateMemberTreeSkin(memberId, selectedSkin);
    setSaving(false);

    if (success) {
      onSkinChange(selectedSkin);
      onClose();
    }
  };

  const unlockedSkinIds = getUnlockedSkinIds();
  const growthStage = getCurrentGrowthStage(totalCount);

  // 모든 스킨을 하나의 배열로 (기본 + 특별)
  const allSkins: { id: SkinId; name: string; category?: CategoryKey; isDefault: boolean }[] = [
    { id: 'default', name: DEFAULT_SKIN.name, isDefault: true },
    ...Object.entries(CATEGORY_SKINS).map(([key, skin]) => ({
      id: skin.id,
      name: skin.name,
      category: key as CategoryKey,
      isDefault: false,
    })),
  ];

  // 현재 인덱스
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 스킨 변경 시 인덱스 초기화
  useEffect(() => {
    const idx = allSkins.findIndex(s => s.id === currentSkinId);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [currentSkinId, isOpen]);

  // 현재 보고 있는 스킨
  const currentSkin = allSkins[currentIndex];

  // 캐러셀 이동 시 해금된 스킨이면 자동 선택
  useEffect(() => {
    if (unlockedSkinIds.has(currentSkin.id)) {
      setSelectedSkin(currentSkin.id);
    }
  }, [currentIndex]);
  const isCurrentUnlocked = unlockedSkinIds.has(currentSkin.id);
  const currentSkinImage = getSkinImage(currentSkin.id, totalCount);
  const currentStageProgress = currentSkin.category
    ? categoryStages.get(currentSkin.category) || 0
    : 0;

  // 이전/다음 스킨으로 이동
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allSkins.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < allSkins.length - 1 ? prev + 1 : 0));
  };

  // 터치 스와이프 핸들링
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="나무 스킨 선택" size="lg">
      <div className="p-4">
        {/* 캐러셀 영역 */}
        <div
          ref={carouselRef}
          className="relative bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 rounded-xl py-6 px-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 좌측 화살표 */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-text" />
          </button>

          {/* 우측 화살표 */}
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-text" />
          </button>

          {/* 스킨 미리보기 */}
          <div className="flex flex-col items-center min-h-[280px] justify-center">
            <div className="relative">
              <img
                src={currentSkinImage}
                alt={currentSkin.name}
                className={`w-36 h-44 object-contain drop-shadow-xl transition-all duration-300 ${
                  !isCurrentUnlocked ? 'grayscale opacity-60' : ''
                } ${currentSkin.id === 'planning' ? 'scale-[1.5]' : ''}`}
              />
              {!isCurrentUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-3">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
              {isCurrentUnlocked && selectedSkin === currentSkin.id && (
                <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1.5 shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* 스킨 정보 */}
            <div className="text-center mt-4">
              <p className="font-bold text-lg text-text">{currentSkin.name}</p>
              {currentSkin.isDefault ? (
                <p className="text-sm text-text-muted mt-1">
                  현재: {growthStage.name} ({growthStage.stage + 1}/10)
                </p>
              ) : (
                <p className="text-sm text-text-muted mt-1">
                  {DEFAULT_CATEGORIES[currentSkin.category!]?.emoji}{' '}
                  {DEFAULT_CATEGORIES[currentSkin.category!]?.name} 마스터
                </p>
              )}

              {/* 해금 상태 */}
              {!isCurrentUnlocked && (
                <div className="mt-3 px-4 py-2 bg-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-1">
                    <Lock className="w-4 h-4" />
                    {currentStageProgress}/5 단계 달성 시 해금
                  </p>
                  <div className="mt-2 w-32 mx-auto h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${(currentStageProgress / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 페이지 인디케이터 */}
          <div className="flex justify-center gap-1.5 mt-4">
            {allSkins.map((skin, idx) => (
              <button
                key={skin.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-primary'
                    : unlockedSkinIds.has(skin.id)
                    ? 'bg-primary/40'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 스킨 썸네일 목록 (가로 스크롤) */}
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex gap-2 px-1">
            {allSkins.map((skin, idx) => {
              const isUnlocked = unlockedSkinIds.has(skin.id);
              const skinImg = getSkinImage(skin.id, totalCount);

              return (
                <button
                  key={skin.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 relative w-16 h-20 rounded-lg border-2 p-1 transition-all ${
                    idx === currentIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-bg hover:border-primary/50'
                  }`}
                >
                  <img
                    src={skinImg}
                    alt={skin.name}
                    className={`w-full h-full object-contain ${
                      !isUnlocked ? 'grayscale opacity-50' : ''
                    } ${skin.id === 'planning' ? 'scale-[1.3]' : ''}`}
                  />
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                  {isUnlocked && selectedSkin === skin.id && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-bg border border-border rounded-xl text-text hover:bg-bg-hover transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedSkin === currentSkinId}
            className="flex-1 py-3 px-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '적용하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default TreeSkinSelector;
