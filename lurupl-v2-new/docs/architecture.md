# V2 Architecture - 루루플 인증 레벨 시스템

## 1. 폴더 구조

```
lurupl-v2-new/
├── docs/
│   ├── legacy-audit.md        # 기존 시스템 분석
│   ├── architecture.md        # 이 문서
│   └── decisions.md           # 정책 결정 기록
│
├── src/
│   ├── features/
│   │   ├── auth/              # 인증 (Supabase Auth)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── admin/             # 관리자 기능
│   │   │   ├── components/
│   │   │   │   ├── ChatUploader.tsx
│   │   │   │   ├── ParsePreview.tsx
│   │   │   │   ├── MemberSettings.tsx
│   │   │   │   ├── EventManager.tsx
│   │   │   │   └── BatchConfirm.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── public/            # 공개 결과 페이지
│   │   │   ├── components/
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   ├── MemberProfile.tsx
│   │   │   │   ├── CategoryStats.tsx
│   │   │   │   └── AchievementGrid.tsx
│   │   │   └── hooks/
│   │   │
│   │   └── certifications/    # 인증 관련
│   │       ├── components/
│   │       ├── hooks/
│   │       └── types.ts
│   │
│   ├── domain/                # 비즈니스 로직
│   │   ├── categories.ts      # 카테고리 정의
│   │   ├── achievements.ts    # 도전 과제 정의
│   │   ├── levels.ts          # 레벨/칭호 계산
│   │   ├── exp-calculator.ts  # 경험치 계산
│   │   ├── chat-parser.ts     # 채팅 파싱
│   │   └── validators.ts      # 검증 로직
│   │
│   ├── lib/                   # 공통 라이브러리
│   │   ├── supabase.ts        # Supabase 클라이언트
│   │   ├── date-utils.ts      # 날짜 유틸리티
│   │   └── constants.ts       # 상수
│   │
│   ├── components/            # 공통 UI 컴포넌트
│   │   ├── ui/                # 기본 UI (Button, Card, etc.)
│   │   └── layout/            # 레이아웃 (Header, Footer, etc.)
│   │
│   ├── pages/                 # 페이지 컴포넌트
│   │   ├── HomePage.tsx
│   │   ├── AdminPage.tsx
│   │   └── ResultPage.tsx
│   │
│   └── App.tsx
│
├── supabase/
│   ├── migrations/            # SQL 마이그레이션
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions.sql
│   │
│   └── seed/                  # 개발용 시드 데이터
│       ├── categories.sql
│       └── test_members.sql
│
├── scripts/
│   ├── migrate-legacy.ts      # 레거시 데이터 이전
│   └── compare-data.ts        # 데이터 비교 스크립트
│
└── .env.example
```

## 2. 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        관리자 흐름                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 로그인 (Supabase Auth)                                      │
│     ↓                                                           │
│  2. .txt 파일 업로드                                             │
│     ↓                                                           │
│  3. 클라이언트에서 파싱 (chat-parser.ts)                         │
│     ↓                                                           │
│  4. 미리보기 표시 (인증 후보, 적용 규칙, 제외 사유)               │
│     ↓                                                           │
│  5. 관리자 검토/수정                                             │
│     ↓                                                           │
│  6. 확정 요청 → Edge Function (서버 측 검증)                     │
│     ↓                                                           │
│  7. DB 트랜잭션으로 일괄 저장                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        공개 결과 흐름                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 페이지 접속                                                  │
│     ↓                                                           │
│  2. Supabase RPC 호출 (공개용 뷰/함수)                           │
│     ↓                                                           │
│  3. 월간 통계, 순위, 도전 과제 표시                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. ERD (테이블 관계)

```
┌──────────────┐       ┌──────────────────┐
│   members    │       │  member_aliases  │
├──────────────┤       ├──────────────────┤
│ id (PK)      │◀──────│ member_id (FK)   │
│ display_name │       │ kakao_nickname   │
│ wake_up_time │       │ created_at       │
│ is_active    │       └──────────────────┘
│ created_at   │
│ updated_at   │
└──────────────┘
        │
        │ 1:N
        ▼
┌──────────────────┐       ┌──────────────┐
│  certifications  │       │  categories  │
├──────────────────┤       ├──────────────┤
│ id (PK)          │       │ key (PK)     │
│ member_id (FK)   │◀──────│ name         │
│ category_key(FK) │       │ emoji        │
│ cert_date        │       │ base_exp     │
│ cert_time        │       │ daily_limit  │
│ base_exp         │       │ is_active    │
│ multiplier       │       └──────────────┘
│ final_exp        │              │
│ batch_id (FK)    │              │ 1:N
│ raw_message      │              ▼
│ tag_used         │       ┌──────────────┐
│ is_valid_morning │       │ category_tags│
│ is_over_limit    │       ├──────────────┤
│ created_at       │       │ category_key │
└──────────────────┘       │ tag          │
        │                  │ is_active    │
        │                  └──────────────┘
        ▼
┌──────────────────┐       ┌──────────────────┐
│  import_batches  │       │    xp_events     │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ admin_id (FK)    │       │ name             │
│ file_hash        │       │ emoji            │
│ file_name        │       │ start_date       │
│ cert_count       │       │ end_date         │
│ total_exp        │       │ multiplier       │
│ status           │       │ categories       │
│ created_at       │       │ is_enabled       │
└──────────────────┘       │ created_at       │
                           └──────────────────┘
        │
        │ N:M
        ▼
┌─────────────────────┐    ┌─────────────────────┐
│ member_achievements │    │achievement_definitions│
├─────────────────────┤    ├─────────────────────┤
│ member_id (FK)      │    │ key (PK)            │
│ achievement_key(FK) │────│ name                │
│ achieved_at         │    │ emoji               │
│ created_at          │    │ category            │
└─────────────────────┘    │ type                │
                           │ target              │
                           │ difficulty          │
                           │ is_hidden           │
                           │ hint                │
                           └─────────────────────┘

┌─────────────────────┐
│  monthly_snapshots  │
├─────────────────────┤
│ id (PK)             │
│ year_month          │
│ member_id (FK)      │
│ total_exp           │
│ cert_count          │
│ rank                │
│ category_counts     │
│ created_at          │
└─────────────────────┘
```

## 4. 권한 표

| 테이블 | anon SELECT | authenticated SELECT | authenticated INSERT | authenticated UPDATE | admin only |
|--------|-------------|---------------------|---------------------|---------------------|------------|
| members | 공개 필드만 | 공개 필드만 | ❌ | ❌ | ✅ |
| member_aliases | ❌ | ❌ | ❌ | ❌ | ✅ |
| categories | ✅ | ✅ | ❌ | ❌ | ✅ |
| category_tags | ✅ | ✅ | ❌ | ❌ | ✅ |
| certifications | 공개 필드만 | 공개 필드만 | ❌ | ❌ | ✅ |
| xp_events | ✅ | ✅ | ❌ | ❌ | ✅ |
| member_achievements | 공개 필드만 | 공개 필드만 | ❌ | ❌ | ✅ |
| monthly_snapshots | ✅ | ✅ | ❌ | ❌ | ✅ |
| import_batches | ❌ | ❌ | ❌ | ❌ | ✅ |
| achievement_definitions | ✅ | ✅ | ❌ | ❌ | ✅ |

**비공개 필드:**
- members.wake_up_time (개인 설정)
- certifications.raw_message (원본 메시지)
- medicine 관련 도전 과제 (민감 건강 정보)

## 5. 레거시 이전 전략

### Phase 1: 데이터 추출
```typescript
// scripts/migrate-legacy.ts
1. Google Sheets에서 JSON 내보내기
2. legacy-export.json 파일로 저장
```

### Phase 2: 변환 및 검증
```typescript
1. 닉네임 → members 테이블 매핑
2. records → certifications 테이블 변환
3. achievements → member_achievements 변환
4. 누적 EXP 검증 (기록 합산 vs 저장 값)
5. 차이 보고서 생성
```

### Phase 3: 병행 운영
```typescript
1. V2에서 읽기 전용 조회 제공
2. 실제 데이터 입력은 기존 시스템 유지
3. 정합성 비교 스크립트 주기적 실행
4. 검증 완료 후 전환
```

## 6. 서버 시각 처리

- **저장**: UTC 타임스탬프
- **표시/계산**: Asia/Seoul 기준
- 인증일(cert_date): DATE 타입 (시간대 없음)
- 인증시각(cert_time): TIME 타입 (시간대 없음)
- 생성일(created_at): TIMESTAMPTZ (UTC)
