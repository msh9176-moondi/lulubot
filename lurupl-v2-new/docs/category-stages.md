# 카테고리 스테이지 시스템

## 개요

카테고리별 이모티콘 스태킹 및 스테이지 해금 시스템입니다. 기존 EXP/레벨 시스템과 별개로, 각 카테고리의 **확정된 인증 건수**에 따라 이모티콘이 시각적으로 쌓이고, 특정 기준에 도달하면 사용자가 직접 해금 버튼을 눌러 새 스테이지를 열 수 있습니다.

## 핵심 규칙

### 이모티콘 = 인증 1건

- **1 인증 = 1 이모티콘**: EXP 배수, 이벤트, 보너스와 무관하게 확정된 인증 1건당 이모티콘 1개가 쌓입니다.
- **확정된 인증만 카운트**: `final_exp > 0`인 인증만 집계합니다. 일일 상한 초과로 EXP가 0인 인증은 제외됩니다.
- **쌓임 유지**: 월이 바뀌어도 누적 이모티콘과 스테이지는 유지됩니다 (영구 기록).

### 수동 해금

- **자동 해금 없음**: 기준에 도달해도 스테이지가 자동으로 열리지 않습니다.
- **직접 버튼 클릭 필요**: 사용자가 "해금하기" 버튼을 눌러야만 스테이지가 열립니다.
- **축하 연출**: 성공적으로 해금된 순간에만 파티클 애니메이션과 축하 메시지가 표시됩니다.
- **순차 해금**: 이전 스테이지를 먼저 해금해야 다음 스테이지를 해금할 수 있습니다.

### 이모티콘 보존

- 해금 후에도 모아 둔 이모티콘은 사라지지 않습니다.
- 해금을 미뤄도 인증은 계속 쌓입니다.
- 여러 스테이지가 해금 가능 상태여도 각각 직접 해금해야 합니다.

## 카테고리별 스테이지 기준

| 카테고리 | 일일상한 | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 | 근거 |
|---------|---------|---------|---------|---------|---------|---------|------|
| 청소 🧹 | 3회 | 5회 | 15회 | 30회 | 50회 | 80회 | 자주 가능, 높은 기준 |
| 운동 🏃 | 2회 | 5회 | 15회 | 30회 | 50회 | 80회 | 자주 가능, 높은 기준 |
| 기상 ⏰ | 1회 | 5회 | 14회 | 30회 | 60회 | 100회 | 매일 1회, 중간 기준 |
| 계획 📋 | 1회 | 5회 | 14회 | 30회 | 60회 | 100회 | 매일 1회, 중간 기준 |
| 공부 📚 | 3회 | 5회 | 15회 | 30회 | 50회 | 80회 | 자주 가능, 높은 기준 |
| 약 💊 | 1회 | 5회 | 14회 | 30회 | 60회 | 100회 | 민감 카테고리 |
| 일기 📝 | 1회 | 5회 | 14회 | 30회 | 60회 | 100회 | 매일 1회, 중간 기준 |
| 명상 🧘 | 2회 | 5회 | 14회 | 30회 | 50회 | 80회 | 중간 빈도 |
| 복귀 🔄 | 999회* | 1회 | 3회 | 5회 | 8회 | 12회 | 72시간 쿨다운, 가장 낮은 기준 |

*복귀는 72시간 쿨다운으로 드물게 발생

## 기준 조정 방법

### DB에서 직접 수정

```sql
-- 특정 카테고리의 스테이지 기준 변경
UPDATE category_stage_definitions
SET required_count = 20
WHERE category_key = 'cleaning' AND stage_number = 2;

-- 새 스테이지 추가
INSERT INTO category_stage_definitions
  (category_key, stage_number, required_count, stage_name, stage_description, theme_color)
VALUES
  ('cleaning', 6, 120, '청소 신화', '청소의 신화적 존재', '#164e63');

-- 스테이지 비활성화
UPDATE category_stage_definitions
SET is_active = false
WHERE category_key = 'comeback' AND stage_number = 5;
```

### Seed 파일 수정

`supabase/seed/stage_definitions.sql` 파일을 수정하고 다시 실행합니다.

## 시각 효과

### 이모티콘 드롭 애니메이션

새 인증이 추가되면 해당 이모티콘이 위에서 떨어지며 쌓입니다.

```css
@keyframes emoji-drop {
  0% { transform: translateY(-20px) scale(0.5); opacity: 0; }
  60% { transform: translateY(3px) scale(1.1); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
```

### 스테이지 레벨별 장식

| 레벨 | 스타일 |
|-----|-------|
| 0 (시작 전) | 기본 배경 |
| 1 | 그라데이션 + 그림자 |
| 2 | 카테고리 색상 틴트 |
| 3-4 | 강한 그라데이션 + 그림자 |
| 5 (최종) | 골드 링 + 특별 효과 |

### 축하 애니메이션

- 파티클 버스트 (30개 기본)
- 빛 펄스 효과
- 2초 내외 완결
- 건너뛰기 가능
- `prefers-reduced-motion` 지원

## 데이터 불완전성

### 과거 데이터

시스템 도입 이전의 데이터는 개별 인증 기록이 있어야만 이모티콘으로 표시됩니다. 과거 데이터가 불완전한 경우:

- 집계 시작일이 표시됩니다.
- 추정값으로 이모티콘을 생성하지 않습니다.
- 실제 기록된 인증만 카운트됩니다.

### 중복 업로드 방지

같은 인증이 두 번 업로드되어도:
- `UNIQUE(member_id, cert_date, cert_time, category_key)` 제약으로 중복 방지
- 이모티콘 개수는 변하지 않음
- 해금 상태도 영향받지 않음

## 보안

### RLS 정책

- **스테이지 정의**: 모두 읽기 가능 (활성화된 것만)
- **해금 기록**: 모두 읽기 가능 (공개 순위용)
- **해금 실행**: RPC 함수를 통해서만 가능 (직접 INSERT 불가)

### claim_stage() 함수 검증

1. 해당 스테이지 정의 존재 확인
2. 이미 해금했는지 확인
3. 이전 스테이지 해금 여부 확인
4. 실제 확정 인증 수가 기준에 도달했는지 확인
5. 동시 요청 방지 (UPSERT ON CONFLICT DO NOTHING)

## API 참조

### RPC 함수

```typescript
// 스테이지 해금
const { data } = await supabase.rpc('claim_stage', {
  p_member_id: memberId,
  p_category_key: 'cleaning',
  p_stage_number: 1
});
// 반환: { success: boolean, stage_name: string, ... }

// 멤버 스테이지 상태 조회
const { data } = await supabase.rpc('get_member_stage_status', {
  p_member_id: memberId
});
// 반환: [{ category_key, verified_count, current_stage, can_unlock, ... }]

// 애니메이션 확인 표시
const { data } = await supabase.rpc('mark_stage_animation_seen', {
  p_member_id: memberId,
  p_category_key: 'cleaning',
  p_stage_number: 1
});
```

### Zustand Store

```typescript
import { useStageStore } from '@/stores/stageStore';

const {
  definitions,      // 스테이지 정의 목록
  memberStatuses,   // 멤버별 상태 Map
  activeCelebration, // 현재 축하 애니메이션
  fetchDefinitions, // 정의 로드
  fetchMemberStatus, // 멤버 상태 로드
  claimStage,       // 해금 실행
  dismissCelebration, // 애니메이션 닫기
} = useStageStore();
```

## 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `GrowthGarden` | 메인 화면 - 9개 카테고리 그리드 |
| `CategoryStageCard` | 개별 카테고리 카드 |
| `EmojiStack` | 이모티콘 스태킹 시각화 |
| `CategoryDetailModal` | 상세 기록 모달 |
| `StageCelebration` | 축하 애니메이션 오버레이 |

## 확장 포인트

### 해금 보상 연결

현재 MVP에서는 시각적 변화만 제공하지만, 향후 확장 가능:

```typescript
// category_stage_definitions 테이블의 reward_data 필드 활용
{
  "unlock_challenge_id": "uuid", // 새 도전 해금
  "cosmetic_id": "badge_123",    // 장식 아이템
  // EXP 지급은 하지 않음 (반복 지급 방지)
}
```

### 월간 필터

월별로 인증을 필터링해서 볼 수 있지만, 영구 누적과 구별하여 표기합니다:

- "이번 달: 15회 / 누적: 45회"
- 월간 필터는 표시용이며 해금 기준에는 영향 없음
