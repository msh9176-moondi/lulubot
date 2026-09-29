-- =====================================================
-- 동기부여 MVP 기능 - Schema
-- =====================================================

-- 1. 멤버 테이블에 PIN 컬럼 추가 (간단 인증용)
ALTER TABLE members ADD COLUMN IF NOT EXISTS pin VARCHAR(4);
ALTER TABLE members ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;

-- 2. 나의 이유 테이블
CREATE TABLE IF NOT EXISTS personal_reasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category_key VARCHAR(20) REFERENCES categories(key),
  reason_text TEXT NOT NULL,
  importance INTEGER DEFAULT 1, -- 1~5 중요도
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_reasons_member ON personal_reasons(member_id);
CREATE INDEX idx_personal_reasons_category ON personal_reasons(category_key);

-- 3. 도전 템플릿 테이블
CREATE TABLE IF NOT EXISTS challenge_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key VARCHAR(20) NOT NULL REFERENCES categories(key),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  difficulty INTEGER DEFAULT 1, -- 1: 쉬움, 2: 보통, 3: 어려움
  duration_minutes INTEGER DEFAULT 5, -- 예상 소요 시간
  tips TEXT[], -- 실행 팁 목록
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenge_templates_category ON challenge_templates(category_key);
CREATE INDEX idx_challenge_templates_difficulty ON challenge_templates(difficulty);

-- 4. 유저 도전 선택 테이블
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES challenge_templates(id),
  is_favorite BOOLEAN DEFAULT false,
  times_completed INTEGER DEFAULT 0,
  times_started INTEGER DEFAULT 0,
  last_started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, template_id)
);

CREATE INDEX idx_user_challenges_member ON user_challenges(member_id);
CREATE INDEX idx_user_challenges_template ON user_challenges(template_id);

-- 5. 시작 시도 테이블
CREATE TABLE IF NOT EXISTS start_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id UUID REFERENCES challenge_templates(id),
  category_key VARCHAR(20) NOT NULL REFERENCES categories(key),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'started', -- started, pending, confirmed, expired
  certification_id UUID REFERENCES certifications(id), -- 매칭된 인증
  confirmed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  notes TEXT, -- 유저 메모
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_start_attempts_member ON start_attempts(member_id);
CREATE INDEX idx_start_attempts_status ON start_attempts(status);
CREATE INDEX idx_start_attempts_started ON start_attempts(started_at);
CREATE INDEX idx_start_attempts_category ON start_attempts(category_key);

-- 6. 주간 회고 테이블
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- 해당 주 월요일
  what_worked TEXT, -- 잘 된 점
  what_didnt TEXT, -- 어려웠던 점
  next_week_focus TEXT, -- 다음 주 집중할 것
  energy_level INTEGER, -- 1~5
  motivation_level INTEGER, -- 1~5
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, week_start)
);

CREATE INDEX idx_weekly_reflections_member ON weekly_reflections(member_id);
CREATE INDEX idx_weekly_reflections_week ON weekly_reflections(week_start);

-- 7. PIN 설정/검증 함수
CREATE OR REPLACE FUNCTION set_member_pin(
  p_member_id UUID,
  p_pin VARCHAR(4)
) RETURNS BOOLEAN AS $$
BEGIN
  -- PIN은 4자리 숫자만 허용
  IF p_pin !~ '^[0-9]{4}$' THEN
    RETURN FALSE;
  END IF;

  UPDATE members
  SET pin = p_pin, pin_set_at = NOW(), updated_at = NOW()
  WHERE id = p_member_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_member_pin(
  p_member_id UUID,
  p_pin VARCHAR(4)
) RETURNS BOOLEAN AS $$
DECLARE
  v_stored_pin VARCHAR(4);
BEGIN
  SELECT pin INTO v_stored_pin FROM members WHERE id = p_member_id;
  RETURN v_stored_pin IS NOT NULL AND v_stored_pin = p_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 시작 시도 생성 함수
CREATE OR REPLACE FUNCTION create_start_attempt(
  p_member_id UUID,
  p_category_key VARCHAR(20),
  p_template_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO start_attempts (member_id, template_id, category_key, notes)
  VALUES (p_member_id, p_template_id, p_category_key, p_notes)
  RETURNING id INTO v_attempt_id;

  -- user_challenges 업데이트
  IF p_template_id IS NOT NULL THEN
    INSERT INTO user_challenges (member_id, template_id, times_started, last_started_at)
    VALUES (p_member_id, p_template_id, 1, NOW())
    ON CONFLICT (member_id, template_id) DO UPDATE
    SET times_started = user_challenges.times_started + 1,
        last_started_at = NOW();
  END IF;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 시작 시도 만료 처리 함수 (24시간 경과)
CREATE OR REPLACE FUNCTION expire_old_attempts() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE start_attempts
  SET status = 'expired', expired_at = NOW()
  WHERE status = 'started'
    AND started_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 도전 템플릿 시드 데이터
INSERT INTO challenge_templates (category_key, title, description, difficulty, duration_minutes, tips, sort_order) VALUES
-- 청소 카테고리
('cleaning', '책상 위 5분 정리', '책상 위 물건들을 제자리에 정리하기', 1, 5,
  ARRAY['타이머 5분 설정하고 시작', '일단 손에 잡히는 것부터', '완벽하지 않아도 OK'], 1),
('cleaning', '설거지 하기', '싱크대 설거지 정리하기', 1, 10,
  ARRAY['물 틀어놓고 시작', '큰 것부터 작은 것 순서로', '음악 틀면서 하기'], 2),
('cleaning', '빨래 돌리기', '세탁기 돌리기', 1, 5,
  ARRAY['분리수거 빨래통 확인', '세제 넣고 버튼만 누르면 끝'], 3),
('cleaning', '방 청소기 돌리기', '방 바닥 청소기 돌리기', 2, 15,
  ARRAY['구석부터 시작', '가구 아래도 한번씩'], 4),

-- 운동 카테고리
('exercise', '스트레칭 5분', '간단한 스트레칭으로 몸 풀기', 1, 5,
  ARRAY['목, 어깨, 허리 순서로', '천천히 호흡하며', '유튜브 스트레칭 영상 따라하기'], 1),
('exercise', '산책 10분', '동네 한 바퀴 산책', 1, 10,
  ARRAY['신발 신고 문 밖으로 나가기만 해도 반 성공', '음악이나 팟캐스트 준비'], 2),
('exercise', '제자리 걷기 5분', '집에서 제자리 걷기', 1, 5,
  ARRAY['TV 보면서 해도 OK', '팔 크게 흔들기'], 3),
('exercise', '플랭크 1분', '코어 운동 플랭크', 2, 5,
  ARRAY['30초씩 나눠서 해도 OK', '폼 무너지면 쉬었다 다시'], 4),

-- 기상 카테고리
('morning', '알람 끄고 바로 일어나기', '알람 소리에 바로 침대에서 일어나기', 2, 1,
  ARRAY['핸드폰 멀리 두기', '알람 끄자마자 세수하러 가기'], 1),
('morning', '커튼 열기', '아침에 일어나서 커튼 열기', 1, 1,
  ARRAY['햇빛 받으면 잠 깸', '창문도 같이 열면 더 좋음'], 2),

-- 계획 카테고리
('planning', '오늘 할 일 3개 적기', '오늘 할 일 딱 3개만 적기', 1, 5,
  ARRAY['많으면 안함, 적게 적기', '가장 중요한 것 1개 별표'], 1),
('planning', '내일 할 일 미리 적기', '자기 전 내일 할 일 적어두기', 1, 5,
  ARRAY['3개 이하로', '적으면 마음이 편해짐'], 2),

-- 공부 카테고리
('study', '책 5분 읽기', '어떤 책이든 5분만 읽기', 1, 5,
  ARRAY['아무 페이지나 열어서 시작', '5분 지나면 더 읽고 싶어짐'], 1),
('study', '강의 영상 1개 보기', '온라인 강의 1개 시청', 1, 15,
  ARRAY['1.5배속으로 봐도 OK', '배운 것 한 줄 메모'], 2),
('study', '단어 10개 암기', '외국어 단어 10개 외우기', 2, 10,
  ARRAY['앱 사용 추천', '소리내서 읽기'], 3),

-- 약 복용 카테고리
('medicine', '아침 약 챙겨먹기', '아침 약/영양제 복용', 1, 1,
  ARRAY['물 한 잔 마시기', '알람 설정해두기'], 1),
('medicine', '영양제 먹기', '비타민 등 영양제 복용', 1, 1,
  ARRAY['식사 후에 먹으면 좋음'], 2),

-- 일기 카테고리
('diary', '오늘 하루 한 줄 적기', '오늘 있었던 일 한 줄로 적기', 1, 3,
  ARRAY['완벽한 문장 아니어도 됨', '감정 이모지로 시작해도 OK'], 1),
('diary', '감사한 것 3가지 적기', '오늘 감사한 것 3가지 적기', 1, 5,
  ARRAY['사소한 것도 OK', '날씨, 음식, 사람 등'], 2),

-- 명상 카테고리
('meditation', '심호흡 1분', '눈 감고 심호흡 1분', 1, 1,
  ARRAY['4초 들이쉬고 4초 내쉬기', '어디서든 가능'], 1),
('meditation', '명상 앱 5분', '명상 앱으로 가이드 명상', 1, 5,
  ARRAY['마음챙김, 캄 등 앱 추천', '잠들어도 괜찮음'], 2)

ON CONFLICT DO NOTHING;

-- RLS 정책
ALTER TABLE personal_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE start_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 것 조회 가능
CREATE POLICY "Admins can view all personal_reasons" ON personal_reasons
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all challenge_templates" ON challenge_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all user_challenges" ON user_challenges
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all start_attempts" ON start_attempts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all weekly_reflections" ON weekly_reflections
  FOR SELECT TO authenticated USING (true);

-- 비로그인 유저도 템플릿은 조회 가능
CREATE POLICY "Anyone can view active challenge_templates" ON challenge_templates
  FOR SELECT TO anon USING (is_active = true);

-- 비로그인 유저 (멤버) 데이터 접근은 RPC 함수로 처리
