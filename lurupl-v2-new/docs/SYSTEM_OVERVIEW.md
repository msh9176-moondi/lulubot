# 루루플 인증 레벨 시스템 - 완전 가이드

## 1. 시스템 개요

### 1.1 목적
루루플(Lurupl)은 **ADHD 실행력 향상**을 위한 게이미피케이션 기반 습관 형성 시스템입니다. 카카오톡 그룹 채팅방에서 해시태그를 사용해 일상 활동을 인증하면, 자동으로 경험치(EXP)가 부여되고 레벨이 상승합니다.

### 1.2 핵심 흐름
```
카카오톡 인증 메시지 → 수집기(Collector) → Supabase DB 저장 → 웹 대시보드 표시
```

### 1.3 주요 기능
- **인증 시스템**: 카테고리별 해시태그 인증 및 EXP 부여
- **레벨 시스템**: EXP 기반 레벨업 및 칭호 시스템
- **도전과제**: 다양한 조건의 업적 달성 시스템
- **랭킹**: 월간 EXP 기준 순위 및 수상 제도
- **동기부여 허브**: 개인 목표 및 도전 기록 관리

---

## 2. 인증 카테고리 시스템

### 2.1 카테고리 목록

| 카테고리 | 이모지 | 기본 EXP | 일일 제한 | 해시태그 |
|---------|--------|----------|----------|----------|
| 청소 (cleaning) | 🧹 | 2 | 3회 | #청소, #방청소, #정리, #설거지, #빨래, #집안일 |
| 운동 (exercise) | 🏃 | 3 | 2회 | #운동, #헬스, #러닝, #산책, #식단 |
| 기상 (morning) | ⏰ | 2 | 1회 | #기상, #굿모닝, #아침 |
| 계획 (planning) | 📋 | 3 | 1회 | #계획, #계획표, #투두, #todo, #할일 |
| 공부 (study) | 📚 | 3 | 3회 | #공부, #스터디, #독서, #학습 |
| 약 (medicine) | 💊 | 1 | 1회 | #약, #복약, #약먹기, #영복용, #영양제 |
| 일기 (diary) | 📝 | 2 | 1회 | #일기, #감사일기, #하루기록, #오늘하루, #일상 |
| 명상 (meditation) | 🧘 | 2 | 2회 | #명상, #마음챙김, #호흡, #휴식 |
| 복귀 (comeback) | 🔄 | 3 | 특수 | #복귀, #컴백, #돌아왔어 |

### 2.2 특수 규칙

#### 기상 보너스
- 사용자가 설정한 목표 기상 시간 ±30분 이내 인증 시 **+1 EXP 보너스**
- 목표 시간은 개인 설정에서 변경 가능

#### 복귀 보너스
- 마지막 인증 후 **72시간(3일) 이상** 경과 시에만 인증 가능
- 복귀 인증 시 **3 EXP** 부여
- 쿨다운 기반 (일일 제한 없음, 72시간당 1회)

### 2.3 EXP 계산 로직
```
final_exp = base_exp + bonus_exp

조건:
- 일일 제한 초과 시: final_exp = 0
- 쿨다운 미충족 시: final_exp = 0
- 기상 목표 달성 시: bonus_exp = 1
```

---

## 3. 레벨 시스템

### 3.1 레벨 계산
```
레벨 = floor(누적 EXP / 5) + 1
```
- **5 EXP당 1 레벨** 상승
- 레벨 1부터 시작, 상한선 없음

### 3.2 레벨별 타이틀 (10레벨 순환)

| 레벨 | 타이틀 | 레벨 | 타이틀 |
|------|--------|------|--------|
| 1 | 새싹 | 6 | 루틴 |
| 2 | 성장 | 7 | 마스터 |
| 3 | 발전 | 8 | 전문가 |
| 4 | 열정 | 9 | 영웅 |
| 5 | 습관 | 10 | 전설 |

**레벨 11 이상**: 타이틀에 등급 추가
- Lv.11 → 새싹 II
- Lv.21 → 새싹 III
- Lv.31 → 새싹 IV
- ...

### 3.3 누적 EXP 등급 (Rank)

레벨과 별개로, **총 누적 EXP**에 따른 등급 시스템:

| 등급 | 아이콘 | 필요 EXP |
|------|--------|----------|
| 뉴비 | 🌱 | 0+ |
| 루키 | 🥉 | 30+ |
| 브론즈 | 🥈 | 80+ |
| 실버 | 🥇 | 150+ |
| 골드 | ⭐ | 300+ |
| 플래티넘 | 💎 | 500+ |
| 다이아 | 👑 | 800+ |
| 마스터 | 🔥 | 1200+ |
| 그랜드마스터 | ⚡ | 2000+ |
| 레전드 | 🏆 | 3000+ |

---

## 4. 도전과제 시스템

### 4.1 도전과제 유형

#### 카테고리별 도전과제
각 카테고리마다 동일한 패턴의 도전과제 존재:

| 유형 | 조건 | 난이도 |
|------|------|--------|
| first | 해당 카테고리 첫 인증 | ★☆☆☆ |
| weekly | 7일간 N회 이상 인증 | ★★☆☆ |
| streak | N일 연속 인증 | ★★★☆ |
| monthly | 월 N회 이상 인증 | ★★★★ |

#### 통합 도전과제 (special)
- **daily_variety**: 하루에 N개 카테고리 인증
- **weekly_variety**: 일주일간 N개 카테고리 인증
- **monthly_all**: 한 달간 전체 카테고리 인증

#### 히든 도전과제 (is_hidden = true)
달성 전까지 이름과 조건이 숨겨짐. 힌트만 표시.

| 키 | 이름 | 조건 | 힌트 |
|----|------|------|------|
| hidden_owl | 올빼미 | 자정~새벽 4시 인증 | 밤의 친구 |
| hidden_santa | 산타 | 12월 25일 인증 | 특별한 날 |
| hidden_phoenix | 불사조 | 7일 이상 공백 후 복귀 | 재기의 상징 |
| hidden_perfect | 완벽주의자 | 하루에 모든 카테고리 인증 | 오늘 하루를 완벽하게 |
| hidden_century | 센추리 | 총 100회 인증 | 꾸준함의 힘 |
| hidden_ghost | 유령 | 주말에만 N주 연속 인증 | 주말의 존재감 |

#### 랭킹 도전과제
| 키 | 이름 | 이모지 | 조건 | 난이도 |
|----|------|--------|------|--------|
| ranking_first | 챔피언 | 👑 | 월간 랭킹 1위 | ★★★★ |
| ranking_second | 준우승 | 🥈 | 월간 랭킹 2위 | ★★★☆ |
| ranking_third | 입상 | 🥉 | 월간 랭킹 3위 | ★★★☆ |
| ranking_first_3 | 트리플 챔피언 | 🏆 | 월간 1위 3회 달성 | ★★★★ |
| ranking_top3_5 | 명예의 전당 | 🌟 | 월간 TOP3 5회 달성 | ★★★★ |
| ranking_top3_streak | 스테디셀러 | 💎 | 3개월 연속 TOP3 | ★★★★ (히든) |

### 4.2 도전과제 난이도 색상
- ★☆☆☆ (1): 초록색 (success)
- ★★☆☆ (2): 파란색 (primary)
- ★★★☆ (3): 노란색 (warning)
- ★★★★ (4): 빨간색 (error)

### 4.3 도전과제 달성 로직
인증이 저장될 때마다 `check_achievements()` 함수가 트리거되어 조건 충족 여부 확인.

---

## 5. 랭킹 시스템

### 5.1 월간 랭킹
- 매월 1일~말일까지의 **획득 EXP 합계** 기준
- 동점 시 인증 횟수로 구분

### 5.2 월간 수상 제도

| 수상 | 이모지 | 선정 기준 |
|------|--------|----------|
| MVP | 🏆 | 월간 최다 EXP 획득자 |
| 성장왕 | 📈 | 전월 대비 가장 많이 성장 |
| 도전왕 | 🎯 | 가장 많은 도전과제 달성 |

---

## 6. 동기부여 허브

### 6.1 개인 이유 (Personal Reasons)
사용자가 "왜 습관을 형성하고 싶은지" 기록하는 기능.
- PIN 인증 후 접근 가능 (4자리)
- 암호화되어 저장

### 6.2 작은 도전 (Mini Challenges)
- 사용자가 직접 설정하는 단기 목표
- 완료/미완료 체크 가능

### 6.3 시도 기록 (Attempts)
- 실패한 시도도 기록 가능
- "시도 자체가 성공"이라는 마인드셋 강화

### 6.4 회고 (Reflections)
- 주기적인 자기 성찰 기록
- 기분, 배운 점 등 자유 형식

---

## 7. 데이터베이스 스키마

### 7.1 주요 테이블

#### members (멤버)
```sql
id: UUID (PK)
kakao_id: TEXT (카카오톡 ID)
display_name: TEXT (표시 이름)
total_exp: INTEGER (누적 EXP)
current_level: INTEGER (현재 레벨)
wake_time_goal: TIME (목표 기상 시간)
created_at: TIMESTAMP
```

#### certifications (인증)
```sql
id: UUID (PK)
member_id: UUID (FK → members)
category: TEXT (카테고리 키)
cert_date: DATE (인증 날짜)
cert_time: TIME (인증 시간)
message: TEXT (원본 메시지)
base_exp: INTEGER (기본 EXP)
bonus_exp: INTEGER (보너스 EXP)
final_exp: INTEGER (최종 EXP)
created_at: TIMESTAMP
```

#### achievement_definitions (도전과제 정의)
```sql
key: TEXT (PK, 고유 키)
name: TEXT (표시 이름)
emoji: TEXT (이모지)
category: TEXT (카테고리, nullable)
type: TEXT (조건 유형)
target: INTEGER (목표 수치)
difficulty: INTEGER (1-4)
is_hidden: BOOLEAN (히든 여부)
hint: TEXT (힌트, 히든용)
is_active: BOOLEAN (활성화 여부)
is_sensitive: BOOLEAN (민감 도전과제 여부)
```

#### member_achievements (멤버 도전과제)
```sql
member_id: UUID (FK → members)
achievement_key: TEXT (FK → achievement_definitions)
achieved_at: DATE (달성 날짜)
PRIMARY KEY (member_id, achievement_key)
```

#### personal_reasons (개인 이유)
```sql
id: UUID (PK)
member_id: UUID (FK → members)
reason: TEXT (이유 내용, 암호화)
pin_hash: TEXT (PIN 해시)
created_at: TIMESTAMP
```

### 7.2 주요 함수

#### calculate_level(exp INTEGER)
EXP를 받아 레벨 반환
```sql
RETURN FLOOR(exp / 5) + 1;
```

#### check_achievements(p_member_id UUID)
멤버의 모든 도전과제 조건 확인 및 자동 부여

#### save_monthly_rankings(p_year INTEGER, p_month INTEGER)
월간 랭킹 저장 및 랭킹 도전과제 확인

---

## 8. UI 구조

### 8.1 페이지 구성

#### ResultPage (/result)
메인 대시보드. 4개 탭으로 구성:
- **요약**: 월간 통계 요약
- **가이드**: 인증 방법 및 레벨 시스템 설명
- **도전**: 도전과제 목록 (아코디언 UI)
- **랭킹**: 월간 랭킹 및 순위

#### HomePage (/)
서비스 소개 및 시작하기 페이지

### 8.2 주요 컴포넌트

#### ProfileModal
멤버 클릭 시 표시되는 상세 프로필 모달.
탭 구성:
- **🌱 개요**: 기본 정보 + 성장 정원
- **📈 성장**: 성장 차트 + 개인 동기부여 허브
- **🏆 도전**: 개인 도전과제 현황

#### AchievementsGuide
전체 도전과제 가이드 (아코디언 UI)
- 카테고리별 접기/펼치기
- 전체 펼치기/접기 버튼

#### AchievementsGrid
개인 도전과제 현황 그리드
- 달성/미달성 상태 표시
- 호버 시 해금 조건 표시

#### GrowthGarden
성장 정원 시각화
- 카테고리별 식물 성장 표현
- 인증 횟수에 따른 단계별 이미지

---

## 9. 기술 스택

### 프론트엔드
- **React 18** + TypeScript
- **Vite** (빌드 도구)
- **TailwindCSS** (스타일링)
- **Zustand** (상태 관리)
- **Recharts** (차트)
- **Lucide React** (아이콘)

### 백엔드
- **Supabase** (BaaS)
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - Edge Functions

### 데이터 수집
- **Python** 기반 카카오톡 메시지 수집기
- 정규식 기반 해시태그 파싱
- Supabase API로 실시간 저장

---

## 10. 환경 설정

### 10.1 환경 변수
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 10.2 개발 서버
```bash
npm run dev  # localhost:3002
```

### 10.3 빌드
```bash
npm run build
```

---

## 11. 확장 가능성

### 계획된 기능
- 카테고리별 스테이지 시스템 (이모지 스택)
- 주간 미션 시스템
- 팀 챌린지
- 알림 시스템

### 데이터 마이그레이션
모든 스키마 변경은 `supabase/migrations/` 디렉토리에 순차적 SQL 파일로 관리.

---

## 12. 요약

루루플은 **일상 활동의 게이미피케이션**을 통해 ADHD 사용자의 실행력을 향상시키는 시스템입니다.

핵심 메커니즘:
1. **인증** → 해시태그로 활동 기록
2. **EXP** → 인증마다 경험치 획득
3. **레벨** → 5 EXP당 1레벨 상승
4. **등급** → 누적 EXP로 등급 상승
5. **도전과제** → 다양한 조건의 업적 달성
6. **랭킹** → 월간 경쟁 및 수상

이 시스템은 **즉각적인 보상**(EXP)과 **장기적 목표**(등급, 도전과제)를 조합하여 지속적인 동기부여를 제공합니다.
