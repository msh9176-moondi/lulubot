# 동기부여 MVP 기능 - 시스템 분석 보고서

## 현재 시스템 구조

### 1. 인증 모델
- **Supabase Auth**: 관리자 전용 (일반 유저 계정 없음)
- **멤버 식별**: 카카오 닉네임으로 식별
- **닉네임 매핑**: `member_aliases` 테이블로 닉네임 변경 추적

### 2. 인증 등록 경로
- **유일한 방법**: 카카오톡 TXT 파일 업로드
- 실시간 카카오 읽기 불가
- 관리자가 TXT 업로드 → 파싱 → DB 저장

### 3. EXP/레벨 계산
- 5 EXP = 1 레벨
- 누적 EXP (월별 리셋 없음)
- 카테고리별 일일 제한 또는 쿨다운

## 핵심 제약사항

### 실시간 인증 불가
카카오톡 실시간 읽기가 없으므로:
- "지금 시작" 시도와 "확정된 EXP"를 분리해야 함
- 시작 시도 → TXT 업로드 후 → 인증 확정

### 유저 인증 없음
- 현재 일반 유저 로그인 시스템 없음
- 닉네임 기반 식별만 가능
- 개인 데이터 저장 시 닉네임 연동 필요

## 신규 기능 설계 방향

### 1. 유저 연동 방식
```
옵션 A: 닉네임 + 간단 PIN (추천)
- 멤버 선택 → 4자리 PIN 설정
- 개인 데이터 접근 시 PIN 입력
- 장점: 구현 간단, UX 친화적

옵션 B: Supabase Auth 확장
- 이메일/비밀번호 계정 생성
- 카카오 닉네임과 연동
- 장점: 보안 강화 / 단점: 복잡도 증가
```

### 2. 상태 분리 설계
```
start_attempts 테이블:
- member_id
- challenge_id
- started_at (시작 시점)
- status: 'started' | 'pending' | 'confirmed' | 'expired'

인증 흐름:
1. "지금 시작" 클릭 → started
2. TXT 업로드 시 매칭 → pending → confirmed
3. 24시간 경과 시 → expired
```

### 3. 필요한 테이블

| 테이블 | 용도 |
|--------|------|
| personal_reasons | 나의 이유 (왜 이 습관을 원하는가) |
| challenge_templates | 도전 템플릿 (카테고리별 작은 도전) |
| user_challenges | 유저가 선택한 도전 |
| start_attempts | 시작 시도 기록 |
| weekly_reflections | 주간 회고 |

## 구현 우선순위

### Phase 1: 기반 구축
1. PIN 인증 시스템 추가 (members 테이블에 pin 컬럼)
2. personal_reasons 테이블 생성
3. "나의 이유" 설정 UI

### Phase 2: 도전 시스템
4. challenge_templates 테이블 + 시드 데이터
5. user_challenges 테이블
6. 도전 선택 UI

### Phase 3: 시작 & 피드백
7. start_attempts 테이블
8. "지금 시작" 버튼 + 타이머 UI
9. TXT 파싱 시 start_attempts 매칭 로직

### Phase 4: 회고
10. weekly_reflections 테이블
11. 주간 회고 UI
