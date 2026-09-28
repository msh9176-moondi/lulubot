import { useState, useEffect } from 'react';
import { Heart, Sparkles, Play, Calendar, ChevronRight } from 'lucide-react';
import { PinSetup } from './PinSetup';
import { MyReasons } from './MyReasons';
import { ChallengeSelector } from './ChallengeSelector';
import { StartNow } from './StartNow';
import { ActiveAttempts } from './ActiveAttempts';
import { WeeklyReflection } from './WeeklyReflection';
import { hasMemberPin, setMemberPin, verifyMemberPin, getMotivationStats } from '@/lib/motivation-api';
import type { ChallengeTemplate } from '@/domain/motivation';
import { useMembersStore } from '@/stores/membersStore';

type View = 'select-member' | 'pin' | 'hub' | 'reasons' | 'challenges' | 'start' | 'attempts' | 'reflection';

interface MemberOption {
  id: string;
  display_name: string;
}

export function MotivationHub() {
  const { monthlyStats } = useMembersStore();
  const [view, setView] = useState<View>('select-member');
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Member list for selection
  const members: MemberOption[] = monthlyStats.map((m) => ({
    id: m.id,
    display_name: m.display_name,
  }));

  useEffect(() => {
    if (selectedMember && isAuthenticated) {
      fetchStats();
    }
  }, [selectedMember, isAuthenticated]);

  async function fetchStats() {
    if (!selectedMember) return;
    const data = await getMotivationStats(selectedMember.id);
    setStats(data);
  }

  async function handleMemberSelect(member: MemberOption) {
    setSelectedMember(member);
    setLoading(true);
    const pinExists = await hasMemberPin(member.id);
    setHasPin(pinExists);
    setLoading(false);
    setView('pin');
  }

  async function handlePinSet(pin: string): Promise<boolean> {
    if (!selectedMember) return false;
    const success = await setMemberPin(selectedMember.id, pin);
    if (success) {
      setIsAuthenticated(true);
      setView('hub');
    }
    return success;
  }

  async function handlePinVerify(pin: string): Promise<boolean> {
    if (!selectedMember) return false;
    const success = await verifyMemberPin(selectedMember.id, pin);
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

  // Render member selection
  if (view === 'select-member') {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-text">동기부여 허브</h2>
          <p className="text-text-muted mt-2">
            나만의 이유를 찾고, 작은 도전을 시작하세요
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-muted mb-3">본인을 선택해주세요</p>
          <div className="grid gap-2 max-h-80 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                className="w-full p-4 bg-bg rounded-lg border border-border text-left hover:border-primary/30 hover:bg-bg-hover transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-text">{member.display_name}</span>
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </button>
            ))}
          </div>
        </div>

        {members.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p>등록된 멤버가 없습니다</p>
            <p className="text-sm mt-1">먼저 인증 데이터를 업로드해주세요</p>
          </div>
        )}
      </div>
    );
  }

  // Render PIN setup/verification
  if (view === 'pin' && selectedMember) {
    return (
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <button
          onClick={() => {
            setSelectedMember(null);
            setView('select-member');
          }}
          className="text-sm text-text-muted hover:text-text mb-4"
        >
          ← 다른 멤버 선택
        </button>

        <div className="text-center mb-4">
          <p className="text-lg font-medium text-text">{selectedMember.display_name}</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <PinSetup
            hasPin={hasPin}
            onPinSet={handlePinSet}
            onPinVerify={handlePinVerify}
          />
        )}
      </div>
    );
  }

  // Render Hub (main menu)
  if (view === 'hub' && selectedMember) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-text-muted">안녕하세요</p>
              <h2 className="text-xl font-bold text-text">{selectedMember.display_name}님</h2>
            </div>
            <button
              onClick={() => {
                setSelectedMember(null);
                setIsAuthenticated(false);
                setView('select-member');
              }}
              className="text-sm text-text-muted hover:text-text"
            >
              로그아웃
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-bg rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalAttempts}</p>
                <p className="text-xs text-text-muted">총 시도</p>
              </div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <p className="text-2xl font-bold text-green-500">{stats.confirmRate}%</p>
                <p className="text-xs text-text-muted">완료율</p>
              </div>
              <div className="p-3 bg-bg rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-500">{stats.streakDays}</p>
                <p className="text-xs text-text-muted">연속일</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="grid gap-3">
          <MenuButton
            icon={<Heart className="w-6 h-6 text-red-500" />}
            title="나의 이유"
            description="왜 이 습관을 원하는지 적어보세요"
            onClick={() => setView('reasons')}
          />
          <MenuButton
            icon={<Sparkles className="w-6 h-6 text-primary" />}
            title="작은 도전"
            description="지금 바로 할 수 있는 도전 선택"
            onClick={() => setView('challenges')}
          />
          <MenuButton
            icon={<Play className="w-6 h-6 text-green-500" />}
            title="진행 중인 도전"
            description="시작한 도전 확인하기"
            onClick={() => setView('attempts')}
          />
          <MenuButton
            icon={<Calendar className="w-6 h-6 text-amber-500" />}
            title="주간 회고"
            description="이번 주를 돌아보세요"
            onClick={() => setView('reflection')}
          />
        </div>
      </div>
    );
  }

  // Render sub-views
  if (!selectedMember) return null;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      {/* Back to hub */}
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

      {view === 'reasons' && <MyReasons memberId={selectedMember.id} />}

      {view === 'challenges' && (
        <ChallengeSelector
          memberId={selectedMember.id}
          onSelect={handleSelectChallenge}
        />
      )}

      {view === 'start' && selectedTemplate && (
        <StartNow
          memberId={selectedMember.id}
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
          memberId={selectedMember.id}
          onNewChallenge={() => setView('challenges')}
        />
      )}

      {view === 'reflection' && <WeeklyReflection memberId={selectedMember.id} />}
    </div>
  );
}

interface MenuButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function MenuButton({ icon, title, description, onClick }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-bg-card rounded-xl border border-border text-left hover:border-primary/30 hover:shadow-md transition-all flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-text">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </button>
  );
}
