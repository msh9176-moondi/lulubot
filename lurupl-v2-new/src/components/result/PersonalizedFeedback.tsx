import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PersonalizedFeedbackProps {
  memberId: string;
  monthlyExp: number;
  monthlyCount: number;
  certDays: number;
}

interface FeedbackData {
  icon: string;
  messages: string[];
}

export function PersonalizedFeedback({
  memberId,
  monthlyExp,
  monthlyCount,
  certDays
}: PersonalizedFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackData>({ icon: '💬', messages: [] });
  const [lastMonthData, setLastMonthData] = useState({ exp: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberId) {
      fetchLastMonthData();
    }
  }, [memberId]);

  async function fetchLastMonthData() {
    setLoading(true);
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const startDate = lastMonth.toISOString().split('T')[0];
      const endDate = lastMonthEnd.toISOString().split('T')[0];

      const { data: certs, error } = await supabase
        .from('certifications')
        .select('final_exp')
        .eq('member_id', memberId)
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .gt('final_exp', 0);

      if (error) throw error;

      const lastExp = certs?.reduce((sum, c) => sum + (c.final_exp || 0), 0) || 0;
      const lastCount = certs?.length || 0;

      setLastMonthData({ exp: lastExp, count: lastCount });
      generateFeedback(lastExp, lastCount);
    } catch (error) {
      console.error('Failed to fetch last month data:', error);
      generateFeedback(0, 0);
    } finally {
      setLoading(false);
    }
  }

  function generateFeedback(lastExp: number, _lastCount: number) {
    const messages: string[] = [];
    let icon = '💬';

    // EXP growth comparison
    if (lastExp > 0) {
      const expGrowth = Math.round(((monthlyExp - lastExp) / lastExp) * 100);
      if (expGrowth > 50) {
        messages.push(`지난달 대비 ${expGrowth}% 성장! 대단해요! 🚀`);
        icon = '🔥';
      } else if (expGrowth > 20) {
        messages.push(`지난달보다 ${expGrowth}% 더 성장하고 있어요!`);
        icon = '📈';
      } else if (expGrowth > 0) {
        messages.push(`조금씩 성장하고 있어요. 꾸준함이 힘!`);
        icon = '🌱';
      } else if (expGrowth > -20) {
        messages.push(`지난달과 비슷한 페이스예요. 유지하고 계시네요!`);
        icon = '💪';
      } else {
        messages.push(`지난달보다 조금 주춤하지만, 다시 시작하면 돼요!`);
        icon = '💪';
      }
    } else if (monthlyExp > 0) {
      messages.push('이번 달 새롭게 시작하셨네요! 화이팅!');
      icon = '🎉';
    }

    // Certification frequency
    const now = new Date();
    const dayOfMonth = now.getDate();

    if (certDays > 0) {
      const avgPerDay = monthlyCount / dayOfMonth;
      if (avgPerDay >= 2) {
        messages.push('하루에 여러 번 인증하시는 열정러! 👏');
      } else if (certDays >= dayOfMonth * 0.8) {
        messages.push('거의 매일 인증하고 계시네요! 습관이 되었어요.');
      } else if (certDays >= dayOfMonth * 0.5) {
        messages.push('꾸준히 절반 이상 인증하고 계세요.');
      } else if (certDays >= 7) {
        messages.push('일주일에 며칠은 꼭 인증하시네요. 좋은 습관!');
      }
    }

    // Monthly EXP level feedback
    if (monthlyExp >= 100) {
      messages.push('이번 달 100 EXP 이상! 챔피언급이에요! 🏆');
    } else if (monthlyExp >= 50) {
      messages.push('50 EXP 이상 달성! 꾸준한 노력이 빛나요.');
    } else if (monthlyExp >= 20) {
      messages.push('조금씩 쌓이는 경험치, 계속 이어가세요!');
    } else if (monthlyExp > 0) {
      messages.push('시작이 반! 조금씩 늘려가 봐요.');
    }

    // Encouragement if no messages
    if (messages.length === 0) {
      messages.push('아직 이번 달 인증이 없어요. 오늘 시작해볼까요?');
      icon = '✨';
    }

    setFeedback({ icon, messages });
  }

  if (loading) {
    return (
      <div className="p-4 bg-bg rounded-lg animate-pulse">
        <div className="h-4 bg-border rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
      <div className="flex gap-3">
        <span className="text-2xl flex-shrink-0">{feedback.icon}</span>
        <div className="space-y-1">
          {feedback.messages.map((msg, idx) => (
            <p key={idx} className="text-sm text-text">
              {msg}
            </p>
          ))}
        </div>
      </div>

      {/* Last month comparison */}
      {lastMonthData.exp > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-4 text-xs text-text-muted">
          <span>지난달: {lastMonthData.exp} EXP ({lastMonthData.count}회)</span>
          <span className={monthlyExp > lastMonthData.exp ? 'text-success' : monthlyExp < lastMonthData.exp ? 'text-error' : ''}>
            {monthlyExp > lastMonthData.exp ? '▲' : monthlyExp < lastMonthData.exp ? '▼' : '→'}
            {' '}이번달: {monthlyExp} EXP ({monthlyCount}회)
          </span>
        </div>
      )}
    </div>
  );
}
