/**
 * SkinManagement Component
 * 관리자용 나무 스킨 관리 - 스킨 목록 조회, 멤버별 선택 스킨 확인
 */

import { useState, useEffect } from 'react';
import { Sparkles, User, Check } from 'lucide-react';
import { Spinner } from '@/components/common';
import {
  DEFAULT_GROWTH_STAGES,
  CATEGORY_SKINS,
  type SkinId,
} from '@/domain/tree-skins';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { supabase } from '@/lib/supabase';

interface MemberSkinInfo {
  id: string;
  display_name: string;
  selected_tree_skin: string;
  accumulated_exp: number;
  unlocked_skins: SkinId[];
}

type TabType = 'default' | 'special' | 'members';

export function SkinManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('default');
  const [memberSkins, setMemberSkins] = useState<MemberSkinInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 멤버별 스킨 정보 로드
  useEffect(() => {
    const loadMemberSkins = async () => {
      if (activeTab !== 'members') return;
      setLoading(true);

      try {
        // 활성 멤버 조회
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, display_name, selected_tree_skin, accumulated_exp')
          .eq('is_active', true)
          .order('display_name');

        if (membersError) throw membersError;

        // 모든 멤버의 스테이지 해금 정보 조회
        const { data: unlocks, error: unlocksError } = await supabase
          .from('category_stage_unlocks')
          .select('member_id, category_key, stage_number');

        if (unlocksError) throw unlocksError;

        // 멤버별로 해금된 스킨 계산
        const skinInfos: MemberSkinInfo[] = (members || []).map(member => {
          const memberUnlocks = (unlocks || []).filter(u => u.member_id === member.id);

          // 해금된 스킨 계산
          const unlockedSkins: SkinId[] = ['default'];
          for (const [categoryKey, skin] of Object.entries(CATEGORY_SKINS)) {
            const maxStage = memberUnlocks
              .filter(u => u.category_key === categoryKey)
              .reduce((max, u) => Math.max(max, u.stage_number), 0);

            if (maxStage >= skin.requiredStage) {
              unlockedSkins.push(skin.id);
            }
          }

          return {
            id: member.id,
            display_name: member.display_name,
            selected_tree_skin: member.selected_tree_skin || 'default',
            accumulated_exp: member.accumulated_exp || 0,
            unlocked_skins: unlockedSkins,
          };
        });

        setMemberSkins(skinInfos);
      } catch (error) {
        console.error('Failed to load member skins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMemberSkins();
  }, [activeTab]);

  const tabs = [
    { id: 'default' as TabType, label: '기본 스킨', icon: '🌱' },
    { id: 'special' as TabType, label: '특별 스킨', icon: '✨' },
    { id: 'members' as TabType, label: '멤버별 현황', icon: '👥' },
  ];

  return (
    <div className="space-y-6">
      {/* 탭 헤더 */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 기본 스킨 (10단계 성장) */}
      {activeTab === 'default' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="text-lg">🌳</span>
            <h3 className="font-medium">기본 스킨 - 성장 단계 (10단계)</h3>
          </div>
          <p className="text-sm text-text-muted">
            인증 횟수에 따라 자동으로 성장하는 기본 나무 스킨입니다.
          </p>

          <div className="overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {DEFAULT_GROWTH_STAGES.map((stage, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-4 bg-bg rounded-xl border border-border min-w-[100px]"
                >
                  <img
                    src={stage.image}
                    alt={stage.name}
                    className="w-16 h-20 object-contain mb-2"
                  />
                  <p className="text-sm font-medium text-text">{stage.name}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {stage.minCount}회 이상
                  </p>
                  <span className="text-xs text-primary mt-1">
                    {idx + 1}/10단계
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-600 dark:text-green-400">
              <strong>성장 조건:</strong> 총 인증 횟수가 각 단계의 최소 횟수를 넘으면 자동으로 다음 단계로 성장합니다.
            </p>
          </div>
        </div>
      )}

      {/* 특별 스킨 (카테고리 5단계 달성 보상) */}
      {activeTab === 'special' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-medium">특별 스킨 - 카테고리 마스터 보상 (8종)</h3>
          </div>
          <p className="text-sm text-text-muted">
            각 카테고리에서 5단계를 달성하면 해금되는 특별 스킨입니다.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(CATEGORY_SKINS).map(([key, skin]) => {
              const category = DEFAULT_CATEGORIES[key as CategoryKey];
              return (
                <div
                  key={skin.id}
                  className="flex flex-col items-center p-4 bg-bg rounded-xl border border-border"
                >
                  <img
                    src={skin.image}
                    alt={skin.name}
                    className={`w-16 h-20 object-contain mb-2 ${
                      skin.id === 'planning' ? 'scale-[1.5]' : ''
                    }`}
                  />
                  <p className="text-sm font-medium text-text">{skin.name}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {category?.emoji} {category?.name}
                  </p>
                  <span className="text-xs text-yellow-500 mt-1">
                    5단계 달성 시 해금
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              <strong>해금 조건:</strong> 해당 카테고리에서 5단계(마스터)를 달성하면 특별 스킨이 해금됩니다.
              다이어리 카테고리는 특별 스킨이 없습니다.
            </p>
          </div>
        </div>
      )}

      {/* 멤버별 스킨 현황 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <User className="w-5 h-5" />
            <h3 className="font-medium">멤버별 스킨 현황</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-bg">
                    <th className="text-left p-3 border-b border-border text-sm font-medium text-text-muted">
                      멤버
                    </th>
                    <th className="text-left p-3 border-b border-border text-sm font-medium text-text-muted">
                      현재 스킨
                    </th>
                    <th className="text-left p-3 border-b border-border text-sm font-medium text-text-muted">
                      해금된 스킨
                    </th>
                    <th className="text-right p-3 border-b border-border text-sm font-medium text-text-muted">
                      누적 경험치
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {memberSkins.map(member => (
                    <tr key={member.id} className="hover:bg-bg-hover">
                      <td className="p-3 border-b border-border text-text">
                        {member.display_name}
                      </td>
                      <td className="p-3 border-b border-border">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          <Check className="w-3 h-3" />
                          {member.selected_tree_skin === 'default'
                            ? '기본 스킨'
                            : CATEGORY_SKINS[member.selected_tree_skin as keyof typeof CATEGORY_SKINS]?.name || member.selected_tree_skin}
                        </span>
                      </td>
                      <td className="p-3 border-b border-border text-text-muted text-sm">
                        {member.unlocked_skins.length}개
                        <span className="ml-2 text-xs">
                          ({member.unlocked_skins.join(', ')})
                        </span>
                      </td>
                      <td className="p-3 border-b border-border text-right text-text">
                        {member.accumulated_exp.toLocaleString()} EXP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SkinManagement;
