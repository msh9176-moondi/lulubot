/**
 * AdminSkinModal Component
 * 관리자용 스킨 부여/수거 모달
 */

import { useState, useEffect } from 'react';
import { Check, Gift, X } from 'lucide-react';
import { Modal, Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import {
  CATEGORY_SKINS,
  BABY_SKINS,
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

// 모든 스킨 타입 정의
type SkinTier = 'baby' | 'master';

interface SkinItem {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  tier: SkinTier;
  requiredStage: number;
}

export function AdminSkinModal({ isOpen, onClose, member, onUpdate }: AdminSkinModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlockedSkins, setUnlockedSkins] = useState<Set<string>>(new Set());
  const [selectedSkin, setSelectedSkin] = useState<string>('default');

  // 모든 스킨 목록 생성
  const allSkins: SkinItem[] = [
    // 베이비 스킨 (1단계)
    ...Object.entries(BABY_SKINS)
      .filter(([, skin]) => skin !== undefined)
      .map(([key, skin]) => ({
        id: skin!.id,
        name: skin!.name,
        categoryKey: key as CategoryKey,
        tier: 'baby' as SkinTier,
        requiredStage: 1,
      })),
    // 마스터 스킨 (5단계)
    ...Object.entries(CATEGORY_SKINS).map(([key, skin]) => ({
      id: skin.id,
      name: skin.name,
      categoryKey: key as CategoryKey,
      tier: 'master' as SkinTier,
      requiredStage: 5,
    })),
  ];

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

          // 1단계 이상이면 베이비 스킨 해금
          if (unlock.stage_number >= 1 && BABY_SKINS[categoryKey]) {
            unlocked.add(BABY_SKINS[categoryKey]!.id);
          }

          // 5단계 이상이면 마스터 스킨 해금
          if (unlock.stage_number >= 5 && CATEGORY_SKINS[categoryKey as Exclude<CategoryKey, 'diary'>]) {
            unlocked.add(CATEGORY_SKINS[categoryKey as Exclude<CategoryKey, 'diary'>].id);
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

  // 스킨 부여
  const handleGrantSkin = async (skin: SkinItem) => {
    if (!member) return;
    setSaving(true);

    try {
      // category_stage_unlocks에 해당 스테이지 추가
      const { error } = await supabase
        .from('category_stage_unlocks')
        .upsert({
          member_id: member.id,
          category_key: skin.categoryKey,
          stage_number: skin.requiredStage,
          verified_count_at_unlock: 0, // 관리자 부여
          unlocked_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id,category_key,stage_number',
        });

      if (error) throw error;

      // 해금 상태 업데이트
      setUnlockedSkins(prev => new Set([...prev, skin.id]));
      onUpdate();
    } catch (error) {
      console.error('Failed to grant skin:', error);
    } finally {
      setSaving(false);
    }
  };

  // 스킨 수거
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
        .gte('stage_number', skin.requiredStage);

      if (deleteError) throw deleteError;

      // 해당 스킨 선택 중이면 기본으로 변경
      if (selectedSkin === skin.id) {
        const { error: updateError } = await supabase
          .from('members')
          .update({ selected_tree_skin: 'default' })
          .eq('id', member.id);

        if (updateError) throw updateError;
        setSelectedSkin('default');
      }

      // 해금 상태 업데이트
      setUnlockedSkins(prev => {
        const next = new Set(prev);
        next.delete(skin.id);
        // 마스터 스킨 수거 시 베이비 스킨도 수거 (같은 카테고리)
        if (skin.tier === 'baby' && CATEGORY_SKINS[skin.categoryKey as Exclude<CategoryKey, 'diary'>]) {
          next.delete(CATEGORY_SKINS[skin.categoryKey as Exclude<CategoryKey, 'diary'>].id);
        }
        return next;
      });
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
      const { error } = await supabase
        .from('members')
        .update({ selected_tree_skin: skinId })
        .eq('id', member.id);

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
                      {skin.name} ({skin.tier === 'baby' ? '베이비' : '마스터'})
                    </option>
                  ))}
              </select>
            </div>

            {/* 베이비 스킨 (1단계) */}
            <div>
              <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">1단계</span>
                베이비 스킨
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allSkins
                  .filter(s => s.tier === 'baby')
                  .map(skin => {
                    const isUnlocked = unlockedSkins.has(skin.id);
                    const category = DEFAULT_CATEGORIES[skin.categoryKey];
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
                          <span className="text-lg">{category?.emoji}</span>
                          {isUnlocked && <Check className="w-4 h-4 text-success" />}
                        </div>
                        <p className="text-sm font-medium text-text truncate">{skin.name}</p>
                        <p className="text-xs text-text-muted">{category?.name}</p>
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

            {/* 마스터 스킨 (5단계) */}
            <div>
              <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">5단계</span>
                마스터 스킨
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allSkins
                  .filter(s => s.tier === 'master')
                  .map(skin => {
                    const isUnlocked = unlockedSkins.has(skin.id);
                    const category = DEFAULT_CATEGORIES[skin.categoryKey];
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
                          <span className="text-lg">{category?.emoji}</span>
                          {isUnlocked && <Check className="w-4 h-4 text-success" />}
                        </div>
                        <p className="text-sm font-medium text-text truncate">{skin.name}</p>
                        <p className="text-xs text-text-muted">{category?.name}</p>
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
