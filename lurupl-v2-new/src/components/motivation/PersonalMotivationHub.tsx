/**
 * PersonalMotivationHub - 개인 프로필용 동기부여 허브
 * 멤버 선택 단계 없이 바로 해당 멤버의 동기부여 허브를 표시
 */

import { useState, useEffect } from 'react';
import { Heart, Sparkles, Play, Calendar, Lock } from 'lucide-react';
import { PinSetup } from './PinSetup';
import { MyReasons } from './MyReasons';
import { ChallengeSelector } from './ChallengeSelector';
import { StartNow } from './StartNow';
import { ActiveAttempts } from './ActiveAttempts';
import { WeeklyReflection } from './WeeklyReflection';
import { hasMemberPin, setMemberPin, verifyMemberPin, getMotivationStats } from '@/lib/motivation-api';
import type { ChallengeTemplate } from '@/domain/motivation';

type View = 'locked' | 'pin' | 'hub' | 'reasons' | 'challenges' | 'start' | 'attempts' | 'reflection';

interface PersonalMotivationHubProps {
  memberId: string;
  memberName: string;
}

export function PersonalMotivationHub({ memberId, memberName }: PersonalMotivationHubProps) {
  const [view, setView] = useState<View>('locked');
  const [hasPin, setHasPin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, [memberId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  async function checkPinStatus() {
    setLoading(true);
    const pinExists = await hasMemberPin(memberId);
    setHasPin(pinExists);
    setLoading(false);
  }

  async function fetchStats() {
    const data = await getMotivationStats(memberId);
    setStats(data);
  }

  async function handlePinSet(pin: string): Promise<boolean> {
    const success = await setMemberPin(memberId, pin);
    if (success) {
      setIsAuthenticated(true);
      setView('hub');
    }
    return success;
  }

  async function handlePinVerify(pin: string): Promise<boolean> {
    const success = await verifyMemberPin(memberId, pin);
    if (success) {
      setIsAuthenticated(true);
      setView('hub');
    }
    return success;
  }

  function handleSelectChallenge(template: ChallengeTemplate) {
    setSelectedTemplate(template);
    setView('start');
  }

  function handleStarted(_attemptId: string) {
    setSelectedTemplate(null);
    setView('attempts');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 잠금 상태 - 접근 버튼 표시
  if (view === 'locked') {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-border p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-text mb-2">동기부여 허브</h3>
          <p className="text-sm text-text-muted mb-4">
            나만의 이유를 찾고, 작은 도전을 시작하세요
          </p>
          <button
            onClick={() => setView('pin')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            <Lock className="w-4 h-4" />
            {hasPin ? 'PIN으로 접속' : '시작하기'}
          </button>
        </div>
      </div>
    );
  }

  // PIN 설정/인증
  if (view === 'pin') {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <button
          onClick={() => setView('locked')}
          className="text-sm text-text-muted hover:text-text mb-4"
        >
          ← 돌아가기
        </button>

        <div className="text-center mb-4">
          <p className="text-lg font-medium text-text">{memberName}</p>
        </div>

        <PinSetup
          hasPin={hasPin}
          onPinSet={handlePinSet}
          onPinVerify={handlePinVerify}
        />
      </div>
    );
  }

  // 메인 허브
  if (view === 'hub') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-muted">동기부여 허브</p>
                <p className="font-medium text-text">{memberName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setView('locked');
              }}
              className="text-xs text-text-muted hover:text-text px-2 py-1"
            >
              잠금
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 bg-bg rounded-lg text-center">
                <p className="text-xl font-bold text-primary">{stats.totalAttempts}</p>
                <p className="text-xs text-text-muted">총 시도</p>
              </div>
              <div className="p-2 bg-bg rounded-lg text-center">
                <p className="text-xl font-bold text-green-500">{stats.confirmRate}%</p>
                <p className="text-xs text-text-muted">완료율</p>
              </div>
              <div className="p-2 bg-bg rounded-lg text-center">
                <p className="text-xl font-bold text-amber-500">{stats.streakDays}</p>
                <p className="text-xs text-text-muted">연속일</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="grid grid-cols-2 gap-2">
          <CompactMenuButton
            icon={<Heart className="w-5 h-5 text-red-500" />}
            title="나의 이유"
            onClick={() => setView('reasons')}
          />
          <CompactMenuButton
            icon={<Sparkles className="w-5 h-5 text-primary" />}
            title="작은 도전"
            onClick={() => setView('challenges')}
          />
          <CompactMenuButton
            icon={<Play className="w-5 h-5 text-green-500" />}
            title="진행 중"
            onClick={() => setView('attempts')}
          />
          <CompactMenuButton
            icon={<Calendar className="w-5 h-5 text-amber-500" />}
            title="주간 회고"
            onClick={() => setView('reflection')}
          />
        </div>
      </div>
    );
  }

  // Sub-views
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      {view !== 'start' && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setView('hub');
          }}
          className="text-sm text-text-muted hover:text-text mb-4"
        >
          ← 메뉴로 돌아가기
        </button>
      )}

      {view === 'reasons' && <MyReasons memberId={memberId} />}

      {view === 'challenges' && (
        <ChallengeSelector
          memberId={memberId}
          onSelect={handleSelectChallenge}
        />
      )}

      {view === 'start' && selectedTemplate && (
        <StartNow
          memberId={memberId}
          template={selectedTemplate}
          onBack={() => {
            setSelectedTemplate(null);
            setView('challenges');
          }}
          onStarted={handleStarted}
        />
      )}

      {view === 'attempts' && (
        <ActiveAttempts
          memberId={memberId}
          onNewChallenge={() => setView('challenges')}
        />
      )}

      {view === 'reflection' && <WeeklyReflection memberId={memberId} />}
    </div>
  );
}

interface CompactMenuButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

function CompactMenuButton({ icon, title, onClick }: CompactMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 bg-bg-card rounded-xl border border-border text-left hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium text-text">{title}</span>
    </button>
  );
}
