# 루루플 인증 레벨 시스템 V2

ADHD 실행력 향상을 위한 과학적 설계 기반 인증 레벨 시스템

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: Zustand

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 Supabase 프로젝트 정보 입력:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Supabase 설정

#### 3.1 테이블 생성

Supabase SQL Editor에서 다음 파일 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_functions.sql`

#### 3.2 시드 데이터 입력

```sql
-- 카테고리 데이터
-- supabase/seed/001_categories.sql 내용 실행

-- 도전 과제 데이터
-- supabase/seed/002_achievements.sql 내용 실행
```

#### 3.3 첫 관리자 등록

1. Supabase Auth에서 관리자 계정 생성 (이메일 인증)
2. `admins` 테이블에 해당 사용자 추가:

```sql
INSERT INTO admins (id, email, display_name)
VALUES ('auth-user-id-here', 'admin@example.com', '관리자');
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3001 에서 확인

## 폴더 구조

```
src/
├── domain/        # 비즈니스 로직 (카테고리, 레벨, 파서 등)
├── lib/           # 공통 라이브러리 (Supabase, 날짜 유틸 등)
├── features/      # 기능별 컴포넌트
├── components/    # 공통 UI 컴포넌트
└── pages/         # 페이지 컴포넌트
```

## 레거시 데이터 이전

```bash
# 레거시 JSON 내보내기 후
npx ts-node scripts/migrate-legacy.ts
```

자세한 내용은 `docs/architecture.md` 참조

## 주의사항

- 기존 운영 시스템(`admin/` 폴더)은 변경하지 않습니다
- 관리자 비밀번호(`lurupl2024`)는 V2에서 사용하지 않습니다
- Supabase service_role 키는 절대 클라이언트에 노출하지 마세요

## 문서

- `docs/legacy-audit.md` - 기존 시스템 분석
- `docs/architecture.md` - V2 아키텍처
- `docs/decisions.md` - 정책 결정 기록
