-- =====================================================
-- 루루플 인증 레벨 시스템 V2 - Achievement Seed Data
-- =====================================================

INSERT INTO achievement_definitions (key, name, emoji, category, type, target, difficulty, is_hidden, hint, is_sensitive) VALUES
  -- 🧹 청소
  ('cleaning_first', '첫 걸음', '🧹', 'cleaning', 'first', 1, 1, false, NULL, false),
  ('cleaning_weekly', '깔끔러', '🧹', 'cleaning', 'weekly', 3, 2, false, NULL, false),
  ('cleaning_streak', '청소 습관', '🧹✨', 'cleaning', 'streak', 14, 3, false, NULL, false),
  ('cleaning_master', '정리왕', '🧹👑', 'cleaning', 'monthly', 20, 4, false, NULL, false),

  -- 🏃 운동
  ('exercise_first', '몸풀기', '🏃', 'exercise', 'first', 1, 1, false, NULL, false),
  ('exercise_weekly', '러너', '🏃', 'exercise', 'weekly', 4, 2, false, NULL, false),
  ('exercise_streak', '운동 루틴', '🏃✨', 'exercise', 'streak', 10, 3, false, NULL, false),
  ('exercise_master', '철인', '🏃👑', 'exercise', 'monthly', 25, 4, false, NULL, false),

  -- ⏰ 기상
  ('morning_first', '눈뜸', '⏰', 'morning', 'first', 1, 1, false, NULL, false),
  ('morning_weekly', '얼리버드', '⏰', 'morning', 'streak', 5, 2, false, NULL, false),
  ('morning_streak', '아침형 인간', '⏰✨', 'morning', 'streak', 14, 3, false, NULL, false),
  ('morning_early', '새벽빛', '🌅', 'morning', 'early', 10, 4, false, NULL, false),

  -- 📚 공부
  ('study_first', '학습 시작', '📚', 'study', 'first', 1, 1, false, NULL, false),
  ('study_weekly', '꾸준러', '📚', 'study', 'weekly', 5, 2, false, NULL, false),
  ('study_streak', '학습 습관', '📚✨', 'study', 'streak', 10, 3, false, NULL, false),
  ('study_master', '공부벌레', '📚👑', 'study', 'monthly', 30, 4, false, NULL, false),

  -- 💊 약 (민감 정보로 표시)
  ('medicine_first', '첫 복약', '💊', 'medicine', 'first', 1, 1, false, NULL, true),
  ('medicine_streak', '복약 습관', '💊✨', 'medicine', 'streak', 7, 2, false, NULL, true),

  -- 📋 계획
  ('planning_first', '첫 계획', '📋', 'planning', 'first', 1, 1, false, NULL, false),
  ('planning_streak', '계획러', '📋✨', 'planning', 'streak', 7, 2, false, NULL, false),

  -- 📝 일기
  ('diary_first', '첫 일기', '📝', 'diary', 'first', 1, 1, false, NULL, false),
  ('diary_streak', '일기쓰기', '📝✨', 'diary', 'streak', 7, 2, false, NULL, false),

  -- 🧘 명상
  ('meditation_first', '첫 명상', '🧘', 'meditation', 'first', 1, 1, false, NULL, false),
  ('meditation_streak', '마음챙김', '🧘✨', 'meditation', 'streak', 7, 2, false, NULL, false),

  -- 🌈 통합 도전
  ('balance_daily', '균형잡기', '🌈', NULL, 'daily_variety', 3, 2, false, NULL, false),
  ('allrounder', '올라운더', '🌈✨', NULL, 'weekly_variety', 6, 3, false, NULL, false),
  ('life_master', '생활왕', '🌈👑', NULL, 'monthly_all', 9, 4, false, NULL, false),

  -- 🔮 히든 도전
  ('hidden_owl', '올빼미', '🌙', NULL, 'hidden_owl', 1, 3, true, '밤이 깊을 때...', false),
  ('hidden_santa', '산타', '🎄', NULL, 'hidden_santa', 1, 3, true, '특별한 날에...', false),
  ('hidden_phoenix', '불사조', '🔥', NULL, 'hidden_phoenix', 1, 3, true, '다시 일어나는 자...', false),
  ('hidden_perfect', '퍼펙트 데이', '🌈✨', NULL, 'hidden_perfect', 1, 4, true, '완벽한 하루...', false),
  ('hidden_century', '천 리 길', '🏅', NULL, 'hidden_century', 100, 4, true, '긴 여정의 끝...', false),
  ('hidden_ghost', '유령', '👻', NULL, 'hidden_ghost', 3, 4, true, '주말의 존재...', false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  category = EXCLUDED.category,
  type = EXCLUDED.type,
  target = EXCLUDED.target,
  difficulty = EXCLUDED.difficulty,
  is_hidden = EXCLUDED.is_hidden,
  hint = EXCLUDED.hint,
  is_sensitive = EXCLUDED.is_sensitive;
