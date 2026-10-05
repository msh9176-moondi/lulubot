/**
 * Stage Store - Zustand store for category stage management
 * 카테고리별 스테이지 상태 관리
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { CategoryKey } from '@/domain/categories';
import type {
  StageDefinition,
  CategoryStageStatus,
  ClaimStageResult,
  CelebrationConfig
} from '@/domain/stages';
import { DEFAULT_CELEBRATION_CONFIG, prefersReducedMotion } from '@/domain/stages';

interface StageState {
  // 데이터
  definitions: StageDefinition[];
  memberStatuses: Map<string, CategoryStageStatus[]>; // memberId -> statuses
  loading: boolean;
  error: string | null;

  // 애니메이션 상태
  celebrationConfig: CelebrationConfig;
  activeCelebration: {
    memberId: string;
    categoryKey: CategoryKey;
    stageNumber: number;
    stageName: string;
    stageDescription: string | null;
    themeColor: string | null;
  } | null;

  // 새로 추가된 이모티콘 추적 (애니메이션용)
  newEmojis: Map<string, { categoryKey: CategoryKey; indices: number[] }>; // memberId -> new emoji indices

  // 액션
  fetchDefinitions: () => Promise<void>;
  fetchMemberStatus: (memberId: string) => Promise<void>;
  claimStage: (memberId: string, categoryKey: CategoryKey, stageNumber: number) => Promise<ClaimStageResult>;
  markAnimationSeen: (memberId: string, categoryKey: CategoryKey, stageNumber: number) => Promise<void>;
  setCelebrationConfig: (config: Partial<CelebrationConfig>) => void;
  dismissCelebration: () => void;
  clearNewEmojis: (memberId: string, categoryKey: CategoryKey) => void;
  trackNewEmojis: (memberId: string, categoryKey: CategoryKey, previousCount: number, newCount: number) => void;
}

export const useStageStore = create<StageState>((set, get) => ({
  // 초기 상태
  definitions: [],
  memberStatuses: new Map(),
  loading: false,
  error: null,
  celebrationConfig: {
    ...DEFAULT_CELEBRATION_CONFIG,
    reducedMotion: prefersReducedMotion()
  },
  activeCelebration: null,
  newEmojis: new Map(),

  // 스테이지 정의 가져오기
  fetchDefinitions: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('category_stage_definitions')
        .select('*')
        .eq('is_active', true)
        .order('category_key')
        .order('stage_number');

      if (error) throw error;

      const definitions: StageDefinition[] = (data || []).map(d => ({
        id: d.id,
        categoryKey: d.category_key as CategoryKey,
        stageNumber: d.stage_number,
        requiredCount: d.required_count,
        stageName: d.stage_name,
        stageDescription: d.stage_description,
        themeColor: d.theme_color,
        rewardIcon: d.reward_icon
      }));

      set({ definitions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // 멤버의 스테이지 상태 가져오기
  fetchMemberStatus: async (memberId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('get_member_stage_status', { p_member_id: memberId });

      if (error) throw error;

      const statuses: CategoryStageStatus[] = (data || []).map((s: any) => ({
        categoryKey: s.category_key as CategoryKey,
        verifiedCount: Number(s.verified_count) || 0,
        currentStage: s.current_stage || 0,
        nextStage: s.next_stage || 1,
        nextRequired: s.next_required,
        canUnlock: s.can_unlock || false,
        unlocks: (s.unlocks || []).map((u: any) => ({
          stageNumber: u.stage_number,
          unlockedAt: u.unlocked_at,
          animationSeen: u.animation_seen
        }))
      }));

      set(state => {
        const newMap = new Map(state.memberStatuses);
        newMap.set(memberId, statuses);
        return { memberStatuses: newMap, loading: false };
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  // 스테이지 해금 (보상 아이템 자동 지급 포함)
  claimStage: async (memberId: string, categoryKey: CategoryKey, stageNumber: number) => {
    try {
      // claim_stage_with_reward를 시도하고, 없으면 기존 claim_stage 사용
      let data, error;
      ({ data, error } = await supabase
        .rpc('claim_stage_with_reward', {
          p_member_id: memberId,
          p_category_key: categoryKey,
          p_stage_number: stageNumber
        }));

      // claim_stage_with_reward가 없으면 기존 함수 사용 (마이그레이션 전)
      if (error?.code === '42883') {
        ({ data, error } = await supabase
          .rpc('claim_stage', {
            p_member_id: memberId,
            p_category_key: categoryKey,
            p_stage_number: stageNumber
          }));
      }

      if (error) throw error;

      const result = data as ClaimStageResult & { reward_item_id?: string; reward_item_name?: string };

      if (result.success) {
        // 상태 업데이트
        await get().fetchMemberStatus(memberId);

        // 스테이지 정의에서 테마 색상 가져오기
        const definition = get().definitions.find(
          d => d.categoryKey === categoryKey && d.stageNumber === stageNumber
        );

        // 축하 애니메이션 트리거
        set({
          activeCelebration: {
            memberId,
            categoryKey,
            stageNumber,
            stageName: result.stageName || '',
            stageDescription: result.stageDescription || null,
            themeColor: definition?.themeColor || null
          }
        });
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message
      };
    }
  },

  // 애니메이션 확인 플래그 업데이트
  markAnimationSeen: async (memberId: string, categoryKey: CategoryKey, stageNumber: number) => {
    try {
      await supabase.rpc('mark_stage_animation_seen', {
        p_member_id: memberId,
        p_category_key: categoryKey,
        p_stage_number: stageNumber
      });

      // 로컬 상태도 업데이트
      set(state => {
        const newMap = new Map(state.memberStatuses);
        const statuses = newMap.get(memberId);
        if (statuses) {
          const updated = statuses.map(s => {
            if (s.categoryKey === categoryKey) {
              return {
                ...s,
                unlocks: s.unlocks.map(u =>
                  u.stageNumber === stageNumber
                    ? { ...u, animationSeen: true }
                    : u
                )
              };
            }
            return s;
          });
          newMap.set(memberId, updated);
        }
        return { memberStatuses: newMap };
      });
    } catch (error) {
      console.error('Failed to mark animation seen:', error);
    }
  },

  // 축하 설정 변경
  setCelebrationConfig: (config: Partial<CelebrationConfig>) => {
    set(state => ({
      celebrationConfig: { ...state.celebrationConfig, ...config }
    }));
  },

  // 축하 애니메이션 닫기
  dismissCelebration: () => {
    const celebration = get().activeCelebration;
    if (celebration) {
      // 애니메이션 확인 처리
      get().markAnimationSeen(
        celebration.memberId,
        celebration.categoryKey,
        celebration.stageNumber
      );
    }
    set({ activeCelebration: null });
  },

  // 새 이모티콘 초기화
  clearNewEmojis: (memberId: string, categoryKey: CategoryKey) => {
    set(state => {
      const newMap = new Map(state.newEmojis);
      const key = `${memberId}:${categoryKey}`;
      newMap.delete(key);
      return { newEmojis: newMap };
    });
  },

  // 새 이모티콘 추적
  trackNewEmojis: (memberId: string, categoryKey: CategoryKey, previousCount: number, newCount: number) => {
    if (newCount <= previousCount) return;

    const newIndices: number[] = [];
    for (let i = previousCount; i < newCount; i++) {
      newIndices.push(i);
    }

    set(state => {
      const newMap = new Map(state.newEmojis);
      const key = `${memberId}:${categoryKey}`;
      newMap.set(key, { categoryKey, indices: newIndices });
      return { newEmojis: newMap };
    });
  }
}));

// 셀렉터
export const selectDefinitionsForCategory = (categoryKey: CategoryKey) => (state: StageState) =>
  state.definitions.filter(d => d.categoryKey === categoryKey);

export const selectMemberCategoryStatus = (memberId: string, categoryKey: CategoryKey) => (state: StageState) => {
  const statuses = state.memberStatuses.get(memberId);
  return statuses?.find(s => s.categoryKey === categoryKey);
};

export const selectNewEmojis = (memberId: string, categoryKey: CategoryKey) => (state: StageState) => {
  const key = `${memberId}:${categoryKey}`;
  return state.newEmojis.get(key)?.indices || [];
};
