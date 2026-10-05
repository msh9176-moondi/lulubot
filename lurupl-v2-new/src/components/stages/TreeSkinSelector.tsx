/**
 * TreeSkinSelector Component
 * 나무 스킨 선택 모달 - 획득한 스킨 중에서 선택 가능
 */

import { useState, useEffect } from 'react';
import { Check, Lock, Sparkles, Eye } from 'lucide-react';
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
  const isPreviewLocked = !unlockedSkinIds.has(previewSkin);

  // 스킨 프리뷰 이미지
  const previewImage = getSkinImage(previewSkin, totalCount);
  const growthStage = getCurrentGrowthStage(totalCount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="나무 스킨 선택" size="lg">
      <div className="p-6">
        {/* 프리뷰 영역 */}
        <div className="mb-6 p-6 bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900/30 dark:to-green-900/30 rounded-xl">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={previewImage}
                  alt="스킨 프리뷰"
                  className={`w-32 h-40 object-contain mx-auto drop-shadow-lg ${isPreviewLocked ? 'opacity-70' : ''} ${previewSkin === 'planning' ? 'scale-[1.4]' : ''}`}
                />
                {isPreviewLocked && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    미리보기
                  </div>
                )}
              </div>
              <p className="mt-3 font-medium text-text">
                {previewSkin === 'default'
                  ? `${growthStage.name} (${growthStage.stage + 1}/10)`
                  : CATEGORY_SKINS[previewSkin as Exclude<CategoryKey, 'diary'>]?.name}
              </p>
              {previewSkin !== 'default' && (
                <p className="text-sm text-text-muted mt-1">
                  {DEFAULT_CATEGORIES[previewSkin as CategoryKey]?.emoji}{' '}
                  {DEFAULT_CATEGORIES[previewSkin as CategoryKey]?.name} 마스터
                </p>
              )}
              {isPreviewLocked && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  {categoryStages.get(previewSkin as CategoryKey) || 0}/5 단계 달성 시 획득
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 스킨 목록 */}
        <div className="space-y-4">
          {/* 기본 스킨 */}
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-2">기본 스킨</h3>
            <button
              onClick={() => {
                setPreviewSkin('default');
                setSelectedSkin('default');
              }}
              onMouseEnter={() => setPreviewSkin('default')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                selectedSkin === 'default'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-bg'
              }`}
            >
              <img
                src={growthStage.image}
                alt={DEFAULT_SKIN.name}
                className="w-16 h-20 object-contain"
              />
              <div className="flex-1 text-left">
                <p className="font-medium text-text">{DEFAULT_SKIN.name}</p>
                <p className="text-sm text-text-muted">
                  인증 횟수에 따라 성장하는 나무
                </p>
                <p className="text-xs text-primary mt-1">
                  현재: {growthStage.name} ({growthStage.stage + 1}/10)
                </p>
              </div>
              {selectedSkin === 'default' && (
                <Check className="w-6 h-6 text-primary" />
              )}
            </button>
          </div>

          {/* 특별 스킨 */}
          <div>
            <h3 className="text-sm font-medium text-text-muted mb-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              특별 스킨 (카테고리 5단계 달성 보상)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CATEGORY_SKINS).map(([key, skin]) => {
                const isUnlocked = unlockedSkinIds.has(skin.id);
                const currentStage = categoryStages.get(key as CategoryKey) || 0;
                const category = DEFAULT_CATEGORIES[key as CategoryKey];

                return (
                  <button
                    key={skin.id}
                    onClick={() => {
                      setPreviewSkin(skin.id);
                      if (isUnlocked) {
                        setSelectedSkin(skin.id);
                      }
                    }}
                    onMouseEnter={() => setPreviewSkin(skin.id)}
                    className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      !isUnlocked
                        ? 'border-border bg-bg opacity-60 hover:opacity-80 cursor-pointer'
                        : selectedSkin === skin.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-bg'
                    }`}
                  >
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-xl">
                        <div className="text-center">
                          <Lock className="w-6 h-6 text-text-muted mx-auto mb-1" />
                          <p className="text-xs text-text-muted">
                            {currentStage}/5 단계
                          </p>
                        </div>
                      </div>
                    )}
                    <img
                      src={skin.image}
                      alt={skin.name}
                      className={`w-14 h-18 object-contain mb-2 ${
                        skin.id === 'planning' ? 'scale-[1.4]' : ''
                      }`}
                    />
                    <p className="font-medium text-sm text-text">{skin.name}</p>
                    <p className="text-xs text-text-muted">
                      {category?.emoji} {category?.name}
                    </p>
                    {isUnlocked && selectedSkin === skin.id && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-6">
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
