/**
 * EditCertModal Component
 * 인증 수정 모달
 */

import { useState } from 'react';
import { Modal } from '@/components/common';
import { useMembersStore } from '@/stores/membersStore';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { checkAchievements, type AchievementContext } from '@/domain/achievement-checker';
import type { Certification } from './types';

interface EditCertModalProps {
  certification: Certification;
  onClose: () => void;
  onSaved: (updated: Certification) => void;
}

export function EditCertModal({ certification, onClose, onSaved }: EditCertModalProps) {
  const [editForm, setEditForm] = useState({
    final_exp: certification.final_exp,
    is_over_limit: certification.is_over_limit,
  });

  const { members } = useMembersStore();

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.display_name || memberId;
  };

  const getCategoryInfo = (key: CategoryKey) => {
    const cat = DEFAULT_CATEGORIES[key];
    return cat ? `${cat.emoji} ${cat.name}` : key;
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('certifications')
      .update({
        final_exp: editForm.final_exp,
        is_over_limit: editForm.is_over_limit,
      })
      .eq('id', certification.id);

    if (error) {
      alert('수정 실패: ' + error.message);
      return;
    }

    // 도전과제 자동 갱신
    try {
      const { data: memberCertsData } = await supabase
        .from('certifications')
        .select('category_key, cert_date, cert_time, final_exp')
        .eq('member_id', certification.member_id)
        .gt('final_exp', 0);

      const memberCerts = (memberCertsData || []).map(c => ({
        memberId: certification.member_id,
        category: c.category_key as CategoryKey,
        certDate: c.cert_date,
        certTime: c.cert_time || '00:00',
        finalExp: c.final_exp || 0,
      }));

      const { data: existingAchs } = await supabase
        .from('member_achievements')
        .select('achievement_key')
        .eq('member_id', certification.member_id);

      const existingSet = new Set((existingAchs || []).map(a => a.achievement_key));

      const ctx: AchievementContext = {
        certifications: memberCerts,
        memberCerts,
        existingAchievements: existingSet,
      };

      const newAchievements = checkAchievements(ctx);

      for (const ach of newAchievements) {
        if (ach.achieved) {
          await supabase
            .from('member_achievements')
            .upsert({
              member_id: certification.member_id,
              achievement_key: ach.key,
              achieved_at: new Date().toISOString(),
            }, {
              onConflict: 'member_id,achievement_key',
              ignoreDuplicates: true,
            });
        }
      }

      // 누적 경험치 업데이트
      const totalExp = memberCerts.reduce((sum, c) => sum + c.finalExp, 0);
      await supabase
        .from('members')
        .update({ accumulated_exp: totalExp })
        .eq('id', certification.member_id);
    } catch (err) {
      console.error('Achievement check error:', err);
    }

    onSaved({
      ...certification,
      final_exp: editForm.final_exp,
      is_over_limit: editForm.is_over_limit,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="인증 수정"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <div>
          <p className="text-sm text-text-muted mb-1">멤버</p>
          <p className="font-medium text-text">{getMemberName(certification.member_id)}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted mb-1">날짜/시간</p>
          <p className="font-medium text-text">{certification.cert_date} {certification.cert_time}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted mb-1">카테고리</p>
          <p className="font-medium text-text">{getCategoryInfo(certification.category_key)}</p>
        </div>
        <div>
          <label className="block text-sm text-text-muted mb-1">최종 EXP</label>
          <input
            type="number"
            value={editForm.final_exp}
            onChange={(e) => setEditForm({ ...editForm, final_exp: parseInt(e.target.value) || 0 })}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-text"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_over_limit"
            checked={editForm.is_over_limit}
            onChange={(e) => setEditForm({ ...editForm, is_over_limit: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="is_over_limit" className="text-sm text-text">
            일일 제한 초과 여부
          </label>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-bg-hover text-text rounded-lg hover:bg-border transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default EditCertModal;
