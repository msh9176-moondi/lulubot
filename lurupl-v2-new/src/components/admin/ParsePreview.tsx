import { useState } from 'react';
import type { ParseResult } from '@/domain/chat-parser';
import { supabase } from '@/lib/supabase';
import { Badge, Spinner } from '@/components/common';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';
import { checkAchievements, type AchievementContext } from '@/domain/achievement-checker';

interface ParsePreviewProps {
  result: ParseResult;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export function ParsePreview({ result, onSaveComplete, onCancel }: ParsePreviewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safely access certifications
  const certifications = result?.certifications || [];

  // Calculate stats
  const totalCerts = certifications.length;
  const totalExp = certifications.reduce((sum, c) => sum + c.finalExp, 0);
  const memberCount = new Set(certifications.map((c) => c.nickname)).size;

  // Group by category
  const categoryStats = certifications.reduce((acc, cert) => {
    const key = cert.category;
    if (!acc[key]) {
      acc[key] = { count: 0, exp: 0 };
    }
    acc[key].count += 1;
    acc[key].exp += cert.finalExp;
    return acc;
  }, {} as Record<string, { count: number; exp: number }>);

  // Group by member
  const memberStats = certifications.reduce((acc, cert) => {
    if (!acc[cert.nickname]) {
      acc[cert.nickname] = { count: 0, exp: 0 };
    }
    acc[cert.nickname].count += 1;
    acc[cert.nickname].exp += cert.finalExp;
    return acc;
  }, {} as Record<string, { count: number; exp: number }>);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      // Create import batch
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert([
          {
            admin_id: user.id,
            file_name: 'chat_export.txt',
            cert_count: totalCerts,
            total_exp: totalExp,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (batchError) throw batchError;

      // Get or create members
      const memberMap: Record<string, string> = {};
      const uniqueNicknames = [...new Set(certifications.map(c => c.nickname))];

      for (const nickname of uniqueNicknames) {
        // Check if member exists
        const { data: existingMember } = await supabase
          .from('members')
          .select('id')
          .eq('display_name', nickname)
          .single();

        if (existingMember) {
          memberMap[nickname] = existingMember.id;
        } else {
          // Create new member
          const { data: newMember, error: memberError } = await supabase
            .from('members')
            .insert([{ display_name: nickname }])
            .select('id')
            .single();

          if (memberError) {
            console.error(`Failed to create member ${nickname}:`, memberError);
            continue;
          }
          if (newMember) {
            memberMap[nickname] = newMember.id;
          }
        }
      }

      // Prepare and insert certifications
      const certData = certifications
        .filter(cert => memberMap[cert.nickname])
        .map((cert) => ({
          member_id: memberMap[cert.nickname],
          category_key: cert.category,
          cert_date: cert.certDate,
          cert_time: cert.certTime,
          tag_used: cert.tag || null,
          raw_message: cert.message,
          base_exp: cert.baseExp,
          multiplier: cert.multiplier,
          final_exp: cert.finalExp,
          comeback_bonus_exp: cert.comebackBonusExp || 0,
          is_valid_morning: cert.isValidMorning,
          is_valid_comeback: cert.isValidComeback,
          is_over_limit: cert.isOverLimit || false,
          target_wake_time: cert.targetWakeTime || null,
          daily_cert_num: cert.dailyCertNum || 1,
          batch_id: batch.id,
        }));

      // Insert in batches of 100
      let insertedCount = 0;
      for (let i = 0; i < certData.length; i += 100) {
        const batchData = certData.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('certifications')
          .upsert(batchData, {
            onConflict: 'member_id,cert_date,cert_time,category_key',
            ignoreDuplicates: true,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
        } else {
          insertedCount += batchData.length;
        }
      }

      // Update batch status
      await supabase
        .from('import_batches')
        .update({
          status: 'confirmed',
          cert_count: insertedCount,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', batch.id);

      // Update accumulated exp and check achievements for each member
      for (const [, memberId] of Object.entries(memberMap)) {
        // Get all certifications for this member
        const { data: memberCertsData } = await supabase
          .from('certifications')
          .select('category_key, cert_date, cert_time, final_exp')
          .eq('member_id', memberId)
          .gt('final_exp', 0);

        const memberCerts = (memberCertsData || []).map(c => ({
          memberId,
          category: c.category_key as CategoryKey,
          certDate: c.cert_date,
          certTime: c.cert_time || '00:00',
          finalExp: c.final_exp || 0,
        }));

        // Update accumulated exp
        const totalExp = memberCerts.reduce((sum, c) => sum + c.finalExp, 0);
        await supabase
          .from('members')
          .update({ accumulated_exp: totalExp })
          .eq('id', memberId);

        // Check achievements
        const { data: existingAchs } = await supabase
          .from('member_achievements')
          .select('achievement_key')
          .eq('member_id', memberId);

        const existingSet = new Set((existingAchs || []).map(a => a.achievement_key));

        const ctx: AchievementContext = {
          certifications: memberCerts,
          memberCerts,
          existingAchievements: existingSet,
        };

        const newAchievements = checkAchievements(ctx);

        // Save new achievements
        for (const ach of newAchievements) {
          if (ach.achieved) {
            await supabase
              .from('member_achievements')
              .upsert({
                member_id: memberId,
                achievement_key: ach.key,
                achieved_at: new Date().toISOString(),
              }, {
                onConflict: 'member_id,achievement_key',
                ignoreDuplicates: true,
              });
          }
        }
      }

      onSaveComplete();
    } catch (err) {
      console.error('Save error:', err);
      setError('저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalCerts}</p>
          <p className="text-text-muted text-sm">총 인증</p>
        </div>
        <div className="bg-bg rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent">{totalExp}</p>
          <p className="text-text-muted text-sm">총 EXP</p>
        </div>
        <div className="bg-bg rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-text">{memberCount}</p>
          <p className="text-text-muted text-sm">참여 멤버</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3">카테고리별 분포</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryStats).map(([key, stats]) => {
            const cat = DEFAULT_CATEGORIES[key as keyof typeof DEFAULT_CATEGORIES];
            return (
              <Badge key={key} variant="category" categoryKey={key} size="md">
                {cat?.emoji || ''} {cat?.name || key}: {stats.count}회 ({stats.exp} EXP)
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Member List */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-3">
          멤버별 인증 ({memberCount}명)
        </h3>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {Object.entries(memberStats)
            .sort((a, b) => b[1].exp - a[1].exp)
            .map(([name, stats]) => (
              <div
                key={name}
                className="flex items-center justify-between py-2 px-3 bg-bg rounded-lg"
              >
                <span className="text-text">{name}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-text-muted">{stats.count}회</span>
                  <span className="text-primary font-medium">{stats.exp} EXP</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Warnings */}
      {(result.warnings?.length || 0) > 0 && (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <h3 className="text-sm font-semibold text-warning mb-2">
            경고 ({result.warnings?.length || 0})
          </h3>
          <ul className="text-sm text-warning/80 space-y-1 max-h-24 overflow-y-auto">
            {(result.warnings || []).slice(0, 10).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {(result.warnings?.length || 0) > 10 && (
              <li>... 외 {(result.warnings?.length || 0) - 10}건</li>
            )}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-border rounded-lg text-text-muted hover:bg-bg-hover transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving || totalCerts === 0}
          className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Spinner size="sm" />
              저장 중...
            </>
          ) : (
            '저장하기'
          )}
        </button>
      </div>
    </div>
  );
}
