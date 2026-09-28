import { useEffect, useState } from 'react';
import { useMembersStore, type Member } from '@/stores/membersStore';
import { Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import { checkAchievements, type AchievementContext } from '@/domain/achievement-checker';
import type { CategoryKey } from '@/domain/categories';

export function MemberManagement() {
  const { members, loading, fetchMembers, updateMember } = useMembersStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWakeTime, setEditWakeTime] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState('');

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleEdit = (member: Member) => {
    setEditingId(member.id);
    setEditWakeTime(member.wake_up_time || '07:00');
  };

  const handleSave = async (id: string) => {
    await updateMember(id, { wake_up_time: editWakeTime });
    setEditingId(null);
  };

  const handleToggleActive = async (member: Member) => {
    await updateMember(member.id, { is_active: !member.is_active });
  };

  const handleRecalculateAchievements = async () => {
    setRecalculating(true);
    setRecalcMessage('');
    let totalNew = 0;

    try {
      for (const member of members) {
        // Get all certifications for this member
        const { data: certsData } = await supabase
          .from('certifications')
          .select('category_key, cert_date, cert_time, final_exp')
          .eq('member_id', member.id)
          .gt('final_exp', 0);

        const memberCerts = (certsData || []).map(c => ({
          memberId: member.id,
          category: c.category_key as CategoryKey,
          certDate: c.cert_date,
          certTime: c.cert_time || '00:00',
          finalExp: c.final_exp || 0,
        }));

        // Get existing achievements
        const { data: existingAchs } = await supabase
          .from('member_achievements')
          .select('achievement_key')
          .eq('member_id', member.id);

        const existingSet = new Set((existingAchs || []).map(a => a.achievement_key));

        // Check achievements
        const ctx: AchievementContext = {
          certifications: memberCerts,
          memberCerts,
          existingAchievements: existingSet,
        };

        const newAchievements = checkAchievements(ctx);

        // Save new achievements
        for (const ach of newAchievements) {
          if (ach.achieved) {
            const { error } = await supabase
              .from('member_achievements')
              .upsert({
                member_id: member.id,
                achievement_key: ach.key,
                achieved_at: new Date().toISOString(),
              }, {
                onConflict: 'member_id,achievement_key',
                ignoreDuplicates: true,
              });

            if (!error) totalNew++;
          }
        }
      }

      setRecalcMessage(`완료! ${totalNew}개의 새로운 도전 과제가 부여되었습니다.`);
    } catch (error) {
      console.error('Recalculate error:', error);
      setRecalcMessage('오류가 발생했습니다.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">
          멤버 관리 ({members.length}명)
        </h3>
        <button
          onClick={handleRecalculateAchievements}
          disabled={recalculating}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 flex items-center gap-2"
        >
          {recalculating ? (
            <>
              <Spinner size="sm" />
              계산 중...
            </>
          ) : (
            '🏆 도전 과제 재계산'
          )}
        </button>
      </div>

      {recalcMessage && (
        <div className={`p-3 rounded-lg text-sm ${recalcMessage.includes('오류') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {recalcMessage}
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.id}
            className={`flex items-center justify-between p-4 bg-bg rounded-lg ${
              !member.is_active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium text-text">{member.display_name}</p>
                <p className="text-sm text-text-muted">
                  누적 {member.accumulated_exp} EXP
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Wake Time Editor */}
              {editingId === member.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={editWakeTime}
                    onChange={(e) => setEditWakeTime(e.target.value)}
                    className="bg-bg-card border border-border rounded px-2 py-1 text-sm text-text"
                  />
                  <button
                    onClick={() => handleSave(member.id)}
                    className="px-3 py-1 bg-primary text-white rounded text-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-text-muted hover:text-text text-sm"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleEdit(member)}
                  className="flex items-center gap-2 px-3 py-1 bg-bg-card border border-border rounded text-sm text-text-muted hover:text-text"
                >
                  <span>기상</span>
                  <span className="text-text">
                    {member.wake_up_time || '07:00'}
                  </span>
                </button>
              )}

              {/* Active Toggle */}
              <button
                onClick={() => handleToggleActive(member)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  member.is_active
                    ? 'bg-success/20 text-success'
                    : 'bg-error/20 text-error'
                }`}
              >
                {member.is_active ? '활성' : '비활성'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
