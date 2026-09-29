# Legacy System Audit - 루루플 인증 레벨 시스템

## 1. 기존 시스템 동작 분석

| 기능 | 기존 코드 동작 | 기획서 명세 | V2 결정 |
|------|---------------|------------|---------|
| **채팅 파싱** | `[닉네임] [오전/오후 HH:MM] 메시지` 패턴 사용, 날짜 헤더는 `YYYY년 MM월 DD일` | 동일 | 동일하게 유지 |
| **해시태그 매칭** | 첫 번째 매칭 태그만 인식, 대소문자 무시 | 명시 없음 | 동일하게 유지 |
| **다중 태그 처리** | 한 메시지에서 첫 번째 매칭 카테고리만 인정 | 명시 없음 | 동일하게 유지 |
| **일일 상한** | 카테고리별 dailyLimit 초과 시 exp=0 | 동일 | 동일하게 유지 |
| **기상 검증** | 목표시간 ±30분 이내만 유효, 미설정 시 기본 exp 적용 | ±30분 | 동일하게 유지 |
| **복귀 판정** | 72시간 미인증 후 사용 가능, 복귀 후 당일 추가 인증 시 +2 EXP 보너스 | 72시간 | 동일하게 유지 |
| **이벤트 배수** | 날짜/카테고리 조건 일치 시 최대 배수 적용 | 동일 | 동일하게 유지 |
| **레벨 계산** | `floor(monthlyExp / 5) + 1` | 동일 | 동일하게 유지 |
| **누적 칭호** | accumulatedExp 기준 10단계 | 동일 | 동일하게 유지 |

## 2. 카테고리별 설정 (기존 코드 기준)

| KEY | 이름 | EXP | 일일 상한 | 태그 |
|-----|------|-----|----------|------|
| cleaning | 청소 | 2 | 3 | #청소, #방청소, #정리, #설거지, #빨래, #집안일 |
| exercise | 운동 | 3 | 2 | #운동, #헬스, #러닝, #산책, #식단 |
| morning | 기상 | 2 | 1 | #기상, #굿모닝, #아침 |
| planning | 계획 | 3 | 1 | #계획, #계획표, #투두, #todo, #할일 |
| study | 공부 | 3 | 3 | #공부, #스터디, #독서, #학습 |
| medicine | 약 | 1 | 1 | #약, #복약, #약먹기, #약복용, #영양제 |
| diary | 일기 | 2 | 1 | #일기, #감사일기, #하루기록, #오늘하루, #일상 |
| meditation | 명상 | 2 | 2 | #명상, #마음챙김, #호흡, #묵상 |
| comeback | 복귀 | 3 | 999 | #복귀, #컴백, #돌아왔어 (72시간 쿨다운) |

**참고:** 기획서와 코드의 EXP 값이 다름 - 코드에서 이미 update.md 권장사항 반영됨

## 3. 도전 과제 (27개)

### 카테고리별 과제 (24개)
- cleaning: first(1), weekly(3), streak(14), master(20)
- exercise: first(1), weekly(4), streak(10), master(25)
- morning: first(1), weekly(5연속), streak(14연속), early(6시 이전 10회)
- study: first(1), weekly(5), streak(10), master(30)
- medicine: first(1), streak(7)
- planning: first(1), streak(7)
- diary: first(1), streak(7)
- meditation: first(1), streak(7)

### 통합 과제 (3개)
- balance_daily: 하루 3개 이상 카테고리
- allrounder: 주간 6개 이상 카테고리
- life_master: 월간 9개 전체 카테고리

### 히든 과제 (6개)
- hidden_owl: 새벽 3~5시 인증
- hidden_santa: 12월 25일 인증
- hidden_phoenix: 7일 미인증 후 복귀
- hidden_perfect: 하루 5카테고리 이상 인증
- hidden_century: 총 인증 100회
- hidden_ghost: 주말만 3주 연속 인증

## 4. 기획서와 코드 차이점

| 항목 | 기획서 | 실제 코드 | 비고 |
|------|--------|----------|------|
| 운동 EXP | 4 | 3 | update.md 권장사항 반영됨 |
| 공부 EXP | 4 | 3 | update.md 권장사항 반영됨 |
| 청소 EXP | 1 | 2 | update.md 권장사항 반영됨 |
| 일기 EXP | 1 | 2 | update.md 권장사항 반영됨 |
| 복귀 EXP | 10 | 3 (+2 보너스) | update.md 권장사항 반영됨 |
| 운동 일일상한 | 3 | 2 | update.md 권장사항 반영됨 |

## 5. 미해결 정책 (V2에서 결정 필요)

1. **닉네임 변경 처리**: 현재 닉네임 기준으로만 집계, 변경 시 별도 멤버로 처리됨
2. **동일 시각 메시지**: 순서대로 처리, 명시적 중복 방지 없음
3. **월 경계 처리**: 이번 달 기록만 월간 레벨에 반영, 누적 EXP는 전체 기록 합산
4. **이벤트 중첩**: 최대 배수만 적용 (합산 아님)
5. **과거 기록 수정**: 현재 지원하지 않음

## 6. 데이터 구조 (Google Sheets)

### Data 시트
- 40,000자 청크로 분할된 JSON
- members 객체: 닉네임별 totalExp, accumulatedExp, records, categoryCount, achievements, wakeUpTime

### Events 시트
- 이벤트 배열 JSON: id, name, emoji, startDate, endDate, expMultiplier, categories, enabled

## 7. V2 마이그레이션 시 주의사항

1. 누적 EXP (accumulatedExp)는 별도 보존 필요 - 기록만으로 재계산 불가할 수 있음
2. 도전 과제 달성 날짜 (achievementDates) 보존
3. 멤버별 목표 기상 시간 (wakeUpTime) 보존
4. 이벤트 히스토리 보존
