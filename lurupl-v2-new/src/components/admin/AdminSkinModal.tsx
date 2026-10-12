/**
 * AdminSkinModal Component
 * 관리자용 스킨 부여/수거 모달
 */

import { useState, useEffect } from 'react';
import { Check, Gift, X } from 'lucide-react';
import { Modal, Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import {
  CATEGORY_SKIN_CONFIG,
  getSkinImage,
  shouldScaleSkin,
} from '@/domain/tree-skins';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface MemberSkinInfo {
  id: string;
  display_name: string;
  selected_tree_skin: string;
}

interface AdminSkinModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberSkinInfo | null;
  onUpdate: () => void;
}

// 스킨 아이템 타입
interface SkinItem {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  stageNumber: number;
}

export function AdminSkinModal({ isOpen, onClose, member, onUpdate }: AdminSkinModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlockedSkins, setUnlockedSkins] = useState<Set<string>>(new Set());
  const [selectedSkin, setSelectedSkin] = useState<string>('default');

  // 모든 스킨 목록 생성 (카테고리별, 단계별)
  const allSkins: SkinItem[] = Object.entries(CATEGORY_SKIN_CONFIG).flatMap(([categoryKey, config]) =>
    Object.keys(config.stages)
      .map(stageStr => parseInt(stageStr, 10))
      .sort((a, b) => a - b)
      .map(stageNumber => ({
        id: `${categoryKey}-${stageNumber}`,
        name: config.stageNames[stageNumber] || `${config.categoryName} ${stageNumber}단계`,
        categoryKey: categoryKey as CategoryKey,
        stageNumber,
      }))
  );

  // 멤버 스킨 정보 로드
  useEffect(() => {
    if (!isOpen || !member) return;

    const loadMemberSkins = async () => {
      setLoading(true);
      try {
        // 현재 선택된 스킨
        setSelectedSkin(member.selected_tree_skin || 'default');

        // 해금된 스킨 조회
        const { data: unlocks, error } = await supabase
          .from('category_stage_unlocks')
          .select('category_key, stage_number')
          .eq('member_id', member.id);

        if (error) throw error;

        // 해금된 스킨 ID 계산
        const unlocked = new Set<string>(['default']);

        for (const unlock of unlocks || []) {
          const categoryKey = unlock.category_key as CategoryKey;
          const config = CATEGORY_SKIN_CONFIG[categoryKey];

          if (config) {
            // 해당 카테고리의 해금된 단계까지 모든 스킨 추가
            for (const stageStr of Object.keys(config.stages)) {
              const stageNumber = parseInt(stageStr, 10);
              if (unlock.stage_number >= stageNumber) {
                unlocked.add(`${categoryKey}-${stageNumber}`);
              }
            }
          }
        }

        setUnlockedSkins(unlocked);
      } catch (error) {
        console.error('Failed to load member skins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMemberSkins();
  }, [isOpen, member]);

  // 스킨 부여 (해당 단계까지 모든 스테이지 해금)
  const handleGrantSkin = async (skin: SkinItem) => {
    if (!member) return;
    setSaving(true);

    try {
      // 1단계부터 해당 단계까지 모두 해금
      for (let stage = 1; stage <= skin.stageNumber; stage++) {
        const { error } = await supabase
          .from('category_stage_unlocks')
          .upsert({
            member_id: member.id,
            category_key: skin.categoryKey,
            stage_number: stage,
            verified_count_at_unlock: 0, // 관리자 부여
            unlocked_at: new Date().toISOString(),
          }, {
            onConflict: 'member_id,category_key,stage_number',
          });

        if (error) throw error;
      }

      // 해금 상태 업데이트
      const newUnlocked = new Set(unlockedSkins);
      const config = CATEGORY_SKIN_CONFIG[skin.categoryKey];
      if (config) {
        for (const stageStr of Object.keys(config.stages)) {
          const stageNumber = parseInt(stageStr, 10);
          if (skin.stageNumber >= stageNumber) {
            newUnlocked.add(`${skin.categoryKey}-${stageNumber}`);
          }
        }
      }
      setUnlockedSkins(newUnlocked);
      onUpdate();
    } catch (error) {
      console.error('Failed to grant skin:', error);
    } finally {
      setSaving(false);
    }
  };

  // 스킨 수거 (해당 단계 이상 모두 수거)
  const handleRevokeSkin = async (skin: SkinItem) => {
    if (!member) return;
    setSaving(true);

    try {
      // 해당 카테고리의 스테이지 언락 삭제 (해당 단계 이상)
      const { error: deleteError } = await supabase
        .from('category_stage_unlocks')
        .delete()
        .eq('member_id', member.id)
        .eq('category_key', skin.categoryKey)
        .gte('stage_number', skin.stageNumber);

      if (deleteError) throw deleteError;

      // 해당 스킨 또는 상위 스킨 선택 중이면 기본으로 변경
      const selectedMatch = selectedSkin.match(/^([a-z]+)-(\d+)$/);
      if (selectedMatch) {
        const [, selCategory, selStageStr] = selectedMatch;
        const selStage = parseInt(selStageStr, 10);
        if (selCategory === skin.categoryKey && selStage >= skin.stageNumber) {
          const { error: updateError } = await supabase
            .from('members')
            .update({ selected_tree_skin: 'default' })
            .eq('id', member.id);

          if (updateError) throw updateError;
          setSelectedSkin('default');
        }
      }

      // 해금 상태 업데이트
      const newUnlocked = new Set(unlockedSkins);
      const config = CATEGORY_SKIN_CONFIG[skin.categoryKey];
      if (config) {
        for (const stageStr of Object.keys(config.stages)) {
          const stageNumber = parseInt(stageStr, 10);
          if (stageNumber >= skin.stageNumber) {
            newUnlocked.delete(`${skin.categoryKey}-${stageNumber}`);
          }
        }
      }
      setUnlockedSkins(newUnlocked);
      onUpdate();
    } catch (error) {
      console.error('Failed to revoke skin:', error);
    } finally {
      setSaving(false);
    }
  };

  // 선택 스킨 변경
  const handleChangeSkin = async (skinId: string) => {
    if (!member) return;
    setSaving(true);

    try {
      const { error } = await supabase.rpc('update_member_tree_skin', {
        p_member_id: member.id,
        p_skin_id: skinId,
      });

      if (error) throw error;
      setSelectedSkin(skinId);
      onUpdate();
    } catch (error) {
      console.error('Failed to change skin:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  // 카테고리별로 그룹화
  const skinsByCategory = Object.entries(CATEGORY_SKIN_CONFIG).map(([categoryKey, config]) => ({
    categoryKey: categoryKey as CategoryKey,
    categoryName: config.categoryName,
    skins: allSkins.filter(s => s.categoryKey === categoryKey),
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`🌳 ${member.display_name} 스킨 관리`} size="lg">
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 현재 선택 스킨 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                현재 선택된 스킨
              </label>
              <select
                value={selectedSkin}
                onChange={(e) => handleChangeSkin(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-text"
              >
                <option value="default">기본 스킨</option>
                {allSkins
                  .filter(skin => unlockedSkins.has(skin.id))
                  .map(skin => (
                    <option key={skin.id} value={skin.id}>
                      {skin.name} ({skin.stageNumber}단계)
                    </option>
                  ))}
              </select>
            </div>

            {/* 카테고리별 스킨 목록 */}
            {skinsByCategory.map(({ categoryKey, categoryName, skins }) => {
              const category = DEFAULT_CATEGORIES[categoryKey];
              return (
                <div key={categoryKey}>
                  <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                    <span className="text-lg">{category?.emoji}</span>
                    {categoryName}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {skins.map(skin => {
                      const isUnlocked = unlockedSkins.has(skin.id);
                      const skinImage = getSkinImage(skin.id, 100);

                      return (
                        <div
                          key={skin.id}
                          className={`p-3 rounded-lg border ${
                            isUnlocked
                              ? 'bg-success/10 border-success/30'
                              : 'bg-bg border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              skin.stageNumber === 1
                                ? 'bg-purple-500/20 text-purple-400'
                                : skin.stageNumber === 5
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-primary/20 text-primary'
                            }`}>
                              {skin.stageNumber}단계
                            </span>
                            {isUnlocked && <Check className="w-4 h-4 text-success" />}
                          </div>
                          <div className="flex justify-center mb-2">
                            <img
                              src={skinImage}
                              alt={skin.name}
                              className={`w-12 h-16 object-contain ${shouldScaleSkin(skin.id) ? 'scale-[1.3]' : ''}`}
                            />
                          </div>
                          <p className="text-xs font-medium text-text truncate text-center">{skin.name}</p>
                          <button
                            onClick={() => isUnlocked ? handleRevokeSkin(skin) : handleGrantSkin(skin)}
                            disabled={saving}
                            className={`mt-2 w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isUnlocked
                                ? 'bg-error/10 text-error hover:bg-error/20'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            } disabled:opacity-50`}
                          >
                            {isUnlocked ? (
                              <span className="flex items-center justify-center gap-1">
                                <X className="w-3 h-3" /> 수거
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1">
                                <Gift className="w-3 h-3" /> 부여
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* 닫기 버튼 */}
            <div className="flex justify-end pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-bg border border-border rounded-lg text-text hover:bg-bg-hover"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AdminSkinModal;
