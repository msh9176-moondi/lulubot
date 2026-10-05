/**
 * StageManagement Component
 * 관리자용 스테이지 시스템 관리 - 카테고리별 스테이지 정의, 멤버 진행 현황
 */

import { useState, useEffect } from 'react';
import { Edit2, Save, X, BarChart3 } from 'lucide-react';
import { Spinner } from '@/components/common';
import { useStageStore, type StageDefinition } from '@/stores/stageStore';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { supabase } from '@/lib/supabase';

type TabType = 'definitions' | 'progress';

// 수정 폼용 인터페이스 (snake_case - DB/API 형식)
interface EditFormData {
  stage_name: string;
  description: string;
  required_count: number;
  theme_color: string;
}

// 멤버 진행 현황 타입
interface MemberProgress {
  id: string;
  display_name: string;
  stages: Record<string, number>; // categoryKey -> maxStage
}

export function StageManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('definitions');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('cleaning');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EditFormData>>({});
  const [memberProgress, setMemberProgress] = useState<MemberProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const { definitions, loading, fetchDefinitions, updateStageDefinition } = useStageStore();

  // 초기 데이터 로드
  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  // 멤버 진행 현황 로드
  useEffect(() => {
    const loadAllProgress = async () => {
      if (activeTab !== 'progress') return;
      setLoadingProgress(true);

      try {
        // 활성 멤버 조회
        const { data: members, error: membersError } = await supabase
          .from('members')
          .select('id, display_name')
          .eq('is_active', true)
          .order('display_name');

        if (membersError) throw membersError;

        // 모든 스테이지 해금 정보 조회
        const { data: unlocks, error: unlocksError } = await supabase
          .from('category_stage_unlocks')
          .select('member_id, category_key, stage_number');

        if (unlocksError) throw unlocksError;

        // 멤버별 최고 스테이지 계산
        const progressList: MemberProgress[] = (members || []).map(member => {
          const memberUnlocks = (unlocks || []).filter(u => u.member_id === member.id);
          const stages: Record<string, number> = {};

          // 각 카테고리별 최고 스테이지 찾기
          for (const unlock of memberUnlocks) {
            const current = stages[unlock.category_key] || 0;
            stages[unlock.category_key] = Math.max(current, unlock.stage_number);
          }

          return {
            id: member.id,
            display_name: member.display_name,
            stages,
          };
        });

        setMemberProgress(progressList);
      } catch (error) {
        console.error('Failed to load member progress:', error);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadAllProgress();
  }, [activeTab]);

  // 선택된 카테고리의 정의 필터링
  const categoryDefinitions = definitions.filter(d => d.categoryKey === selectedCategory);

  // 수정 시작
  const handleEdit = (def: StageDefinition) => {
    setEditingId(def.id);
    setEditForm({
      stage_name: def.stageName,
      description: def.stageDescription || '',
      required_count: def.requiredCount,
      theme_color: def.themeColor || '#10b981',
    });
  };

  // 수정 취소
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  // 수정 저장
  const handleSave = async (id: string) => {
    const success = await updateStageDefinition(id, editForm);
    if (success) {
      setEditingId(null);
      setEditForm({});
      fetchDefinitions();
    }
  };

  const tabs = [
    { id: 'definitions' as TabType, label: '스테이지 정의', icon: '📊' },
    { id: 'progress' as TabType, label: '멤버 진행 현황', icon: '👥' },
  ];

  const categories = Object.entries(DEFAULT_CATEGORIES);

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

      {/* 스테이지 정의 */}
      {activeTab === 'definitions' && (
        <div className="space-y-4">
          {/* 카테고리 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">카테고리:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-text"
            >
              {categories.map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-3">
              {categoryDefinitions.length === 0 ? (
                <p className="text-center text-text-muted py-8">
                  해당 카테고리의 스테이지 정의가 없습니다.
                </p>
              ) : (
                categoryDefinitions
                  .sort((a, b) => a.stageNumber - b.stageNumber)
                  .map(def => (
                    <div
                      key={def.id}
                      className="p-4 bg-bg rounded-xl border border-border"
                    >
                      {editingId === def.id ? (
                        // 수정 모드
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-primary">
                              {def.stageNumber}단계
                            </span>
                            <input
                              type="text"
                              value={editForm.stage_name || ''}
                              onChange={(e) => setEditForm({ ...editForm, stage_name: e.target.value })}
                              className="flex-1 bg-bg-card border border-border rounded px-3 py-1 text-text"
                              placeholder="스테이지 이름"
                            />
                          </div>
                          <input
                            type="text"
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full bg-bg-card border border-border rounded px-3 py-1 text-text"
                            placeholder="설명"
                          />
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-muted">필요 인증:</span>
                              <input
                                type="number"
                                value={editForm.required_count || 0}
                                onChange={(e) => setEditForm({ ...editForm, required_count: parseInt(e.target.value) })}
                                className="w-20 bg-bg-card border border-border rounded px-3 py-1 text-text"
                              />
                              <span className="text-sm text-text-muted">회</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-muted">테마 색상:</span>
                              <input
                                type="color"
                                value={editForm.theme_color || '#10b981'}
                                onChange={(e) => setEditForm({ ...editForm, theme_color: e.target.value })}
                                className="w-10 h-8 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(def.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90"
                            >
                              <Save className="w-4 h-4" />
                              저장
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex items-center gap-1 px-3 py-1 bg-bg-hover text-text rounded text-sm hover:bg-border"
                            >
                              <X className="w-4 h-4" />
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 보기 모드
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: def.themeColor || '#10b981' }}
                            >
                              {def.stageNumber}
                            </div>
                            <div>
                              <p className="font-medium text-text">
                                {def.stageName}
                              </p>
                              <p className="text-sm text-text-muted">
                                {def.stageDescription}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-text-muted">
                              {def.requiredCount}회 필요
                            </span>
                            <button
                              onClick={() => handleEdit(def)}
                              className="p-2 text-text-muted hover:text-primary hover:bg-bg-hover rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>참고:</strong> 스테이지 정의는 DB의 category_stage_definitions 테이블에 저장됩니다.
              9개 카테고리 × 5단계 = 총 45개의 스테이지가 정의되어 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 멤버 진행 현황 */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-text-muted">
            <BarChart3 className="w-5 h-5" />
            <h3 className="font-medium">멤버별 카테고리 진행 현황</h3>
          </div>

          {loadingProgress ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-bg">
                    <th className="text-left p-3 border-b border-border font-medium text-text-muted sticky left-0 bg-bg">
                      멤버
                    </th>
                    {categories.map(([key, cat]) => (
                      <th
                        key={key}
                        className="text-center p-3 border-b border-border font-medium text-text-muted whitespace-nowrap"
                      >
                        {cat.emoji}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberProgress.map(member => (
                    <tr key={member.id} className="hover:bg-bg-hover">
                      <td className="p-3 border-b border-border text-text sticky left-0 bg-bg-card">
                        {member.display_name}
                      </td>
                      {categories.map(([key]) => {
                        const stage = member.stages[key] || 0;
                        return (
                          <td
                            key={key}
                            className="text-center p-3 border-b border-border"
                          >
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                                stage === 5
                                  ? 'bg-yellow-500 text-white'
                                  : stage >= 3
                                  ? 'bg-green-500 text-white'
                                  : stage >= 1
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-bg-hover text-text-muted'
                              }`}
                            >
                              {stage}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
              5단계 (마스터)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-green-500"></span>
              3-4단계
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-blue-500"></span>
              1-2단계
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-bg-hover"></span>
              0단계
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StageManagement;
