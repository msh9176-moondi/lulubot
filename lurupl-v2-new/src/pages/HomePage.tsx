import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-6">
          루루플 인증 레벨 시스템
        </h1>
        <p className="text-text-muted text-lg mb-10">
          ADHD 실행력 향상을 위한 과학적 설계 기반
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/result"
            className="px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary-dark transition-colors"
          >
            결과 보기
          </Link>
          <Link
            to="/admin"
            className="px-8 py-4 bg-bg-card border border-border text-text rounded-xl font-semibold text-lg hover:bg-bg-hover transition-colors"
          >
            관리자 로그인
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-8 text-text-muted text-sm">
        V2 - React + Supabase
      </footer>
    </div>
  );
}
