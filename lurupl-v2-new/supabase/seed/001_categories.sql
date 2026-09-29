-- =====================================================
-- 루루플 인증 레벨 시스템 V2 - Category Seed Data
-- =====================================================

-- 카테고리 데이터
INSERT INTO categories (key, name, emoji, base_exp, daily_limit, cooldown_hours, description, sort_order) VALUES
  ('cleaning', '청소', '🧹', 2, 3, NULL, '환경 정리와 청결 유지 활동', 1),
  ('exercise', '운동', '🏃', 3, 2, NULL, '신체 활동과 건강 관리', 2),
  ('morning', '기상', '⏰', 2, 1, NULL, '목표 시간에 기상하기 (±30분)', 3),
  ('planning', '계획', '📋', 3, 1, NULL, '하루 또는 주간 계획 세우기', 4),
  ('study', '공부', '📚', 3, 3, NULL, '학습 및 자기계발 활동', 5),
  ('medicine', '약', '💊', 1, 1, NULL, '복약 루틴 관리', 6),
  ('diary', '일기', '📝', 2, 1, NULL, '하루 기록 및 감정 정리', 7),
  ('meditation', '명상', '🧘', 2, 2, NULL, '마음챙김 및 명상 활동', 8),
  ('comeback', '복귀', '🔄', 3, 999, 72, '72시간 미인증 후 복귀 인증', 9)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  base_exp = EXCLUDED.base_exp,
  daily_limit = EXCLUDED.daily_limit,
  cooldown_hours = EXCLUDED.cooldown_hours,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 카테고리별 태그 데이터
INSERT INTO category_tags (category_key, tag) VALUES
  -- 청소
  ('cleaning', '#청소'),
  ('cleaning', '#방청소'),
  ('cleaning', '#정리'),
  ('cleaning', '#설거지'),
  ('cleaning', '#빨래'),
  ('cleaning', '#집안일'),
  -- 운동
  ('exercise', '#운동'),
  ('exercise', '#헬스'),
  ('exercise', '#러닝'),
  ('exercise', '#산책'),
  ('exercise', '#식단'),
  -- 기상
  ('morning', '#기상'),
  ('morning', '#굿모닝'),
  ('morning', '#아침'),
  -- 계획
  ('planning', '#계획'),
  ('planning', '#계획표'),
  ('planning', '#투두'),
  ('planning', '#todo'),
  ('planning', '#할일'),
  -- 공부
  ('study', '#공부'),
  ('study', '#스터디'),
  ('study', '#독서'),
  ('study', '#학습'),
  -- 약
  ('medicine', '#약'),
  ('medicine', '#복약'),
  ('medicine', '#약먹기'),
  ('medicine', '#약복용'),
  ('medicine', '#영양제'),
  -- 일기
  ('diary', '#일기'),
  ('diary', '#감사일기'),
  ('diary', '#하루기록'),
  ('diary', '#오늘하루'),
  ('diary', '#일상'),
  -- 명상
  ('meditation', '#명상'),
  ('meditation', '#마음챙김'),
  ('meditation', '#호흡'),
  ('meditation', '#묵상'),
  -- 복귀
  ('comeback', '#복귀'),
  ('comeback', '#컴백'),
  ('comeback', '#돌아왔어')
ON CONFLICT (category_key, tag) DO NOTHING;
