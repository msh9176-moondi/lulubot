import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ChatUploader, ParsePreview, MemberManagement, EventManager } from '@/components/admin';
import { Tabs, Spinner, ErrorBoundary } from '@/components/common';
import type { ParseResult } from '@/domain/chat-parser';

export function AdminPage() {
  const { user, isAdmin, loading, error, initialize, signIn, signOut } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    await signIn(email, password);
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    setParseResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-bg-card rounded-xl border border-border p-8">
            <h1 className="text-2xl font-bold text-text text-center mb-8">
              관리자 로그인
            </h1>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-primary text-white rounded-lg py-3 font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Spinner size="sm" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            <p className="text-text-muted text-sm text-center mt-6">
              Supabase Auth 기반 인증
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - Admin Dashboard
  const tabs = [
    { id: 'upload', label: '채팅 업로드', icon: '📤' },
    { id: 'members', label: '멤버 관리', icon: '👥' },
    { id: 'events', label: '이벤트', icon: '🎉' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">관리자 대시보드</h1>
            <p className="text-sm text-text-muted">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-text-muted hover:text-text hover:bg-bg-hover rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
          <Tabs tabs={tabs} defaultTab="upload">
            {(activeTab) => (
              <div className="px-6 pb-6">
                {activeTab === 'upload' && (
                  <ErrorBoundary>
                    <div>
                      {parseResult ? (
                        <ParsePreview
                          result={parseResult}
                          onSaveComplete={() => {
                            setParseResult(null);
                            alert('저장 완료!');
                          }}
                          onCancel={() => setParseResult(null)}
                        />
                      ) : (
                        <ChatUploader onParseComplete={setParseResult} />
                      )}
                    </div>
                  </ErrorBoundary>
                )}
                {activeTab === 'members' && <MemberManagement />}
                {activeTab === 'events' && <EventManager />}
              </div>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
