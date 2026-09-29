-- Category Stage Definitions Seed Data
-- 카테고리별 스테이지 정의 초기 데이터
--
-- 기준 설정 근거:
-- - 일일 상한과 실제 사용 빈도를 고려
-- - 청소/운동/공부: 일일 2-3회 가능 → 상대적으로 높은 기준
-- - 기상/계획/일기: 일일 1회 → 중간 기준
-- - 약: 일일 1회, 민감 카테고리 → 낮은 기준
-- - 명상: 일일 2회 → 중간 기준
-- - 복귀: 72시간 쿨다운, 드물게 발생 → 가장 낮은 기준

-- 청소 (cleaning): 일일 3회 상한 - 비교적 자주 가능
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('cleaning', 1, 5, '정리 입문', '첫 번째 발걸음! 깔끔한 공간의 시작', '#06b6d4', '🌱'),
('cleaning', 2, 15, '청소 습관화', '꾸준히 정리하는 습관이 자리잡고 있어요', '#0891b2', '🧽'),
('cleaning', 3, 30, '정돈의 달인', '이제 깔끔함이 일상이 되었네요', '#0e7490', '✨'),
('cleaning', 4, 50, '청결 마스터', '당신의 공간은 언제나 빛나고 있어요', '#155e75', '🏠'),
('cleaning', 5, 80, '가정의 수호자', '완벽한 청결의 수호자가 되었습니다', '#164e63', '👑');

-- 운동 (exercise): 일일 2회 상한 - 꾸준한 실천 필요
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('exercise', 1, 5, '운동 시작', '건강한 몸을 위한 첫 걸음!', '#22c55e', '🌱'),
('exercise', 2, 15, '러너', '꾸준한 움직임이 힘이 됩니다', '#16a34a', '🏃'),
('exercise', 3, 30, '운동 습관화', '운동이 생활의 일부가 되고 있어요', '#15803d', '💪'),
('exercise', 4, 50, '피트니스 마스터', '강인한 체력의 소유자!', '#166534', '🏆'),
('exercise', 5, 80, '운동선수', '운동의 즐거움을 아는 진정한 선수', '#14532d', '⚡');

-- 기상 (morning): 일일 1회 상한 - 매일 꾸준히
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('morning', 1, 5, '얼리버드 입문', '아침을 여는 습관의 시작', '#f59e0b', '🌅'),
('morning', 2, 14, '2주 연속 기상', '2주간 꾸준히 일어났어요!', '#d97706', '☀️'),
('morning', 3, 30, '한 달의 아침', '한 달 동안 아침을 지켰어요', '#b45309', '🌞'),
('morning', 4, 60, '아침형 인간', '아침이 당신의 시간입니다', '#92400e', '⏰'),
('morning', 5, 100, '새벽의 지배자', '누구보다 먼저 하루를 시작하는 당신', '#78350f', '👑');

-- 계획 (planning): 일일 1회 상한 - 매일 계획 세우기
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('planning', 1, 5, '계획 입문', '계획적인 삶의 첫 걸음', '#ec4899', '📝'),
('planning', 2, 14, '2주 계획', '2주간 꾸준히 계획을 세웠어요', '#db2777', '📋'),
('planning', 3, 30, '플래너', '계획이 습관이 되었네요', '#be185d', '🎯'),
('planning', 4, 60, '전략가', '체계적인 일정 관리의 달인', '#9d174d', '📊'),
('planning', 5, 100, '마스터 플래너', '완벽한 계획의 설계자', '#831843', '👑');

-- 공부 (study): 일일 3회 상한 - 집중 학습
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('study', 1, 5, '학습 시작', '배움의 여정이 시작되었어요', '#6366f1', '📖'),
('study', 2, 15, '꾸준한 학습자', '지식이 차곡차곡 쌓이고 있어요', '#4f46e5', '📚'),
('study', 3, 30, '집중력 향상', '깊이 있는 학습이 가능해졌어요', '#4338ca', '🎓'),
('study', 4, 50, '지식인', '넓은 지식의 소유자', '#3730a3', '🧠'),
('study', 5, 80, '학자', '학문의 경지에 오른 당신', '#312e81', '👑');

-- 약 (medicine): 일일 1회 상한 - 민감 카테고리, 낮은 기준
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('medicine', 1, 5, '복약 시작', '건강 관리의 첫 걸음', '#14b8a6', '💊'),
('medicine', 2, 14, '2주 복약', '2주간 꾸준히 챙겼어요', '#0d9488', '💪'),
('medicine', 3, 30, '한 달 복약', '한 달 동안 건강을 지켰어요', '#0f766e', '❤️'),
('medicine', 4, 60, '건강 지킴이', '꾸준한 건강 관리의 모범', '#115e59', '🏥'),
('medicine', 5, 100, '건강 마스터', '완벽한 건강 관리의 달인', '#134e4a', '👑');

-- 일기 (diary): 일일 1회 상한 - 매일 기록
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('diary', 1, 5, '기록 시작', '하루를 기록하는 습관의 시작', '#a855f7', '📝'),
('diary', 2, 14, '2주 기록', '2주간의 기록이 쌓였어요', '#9333ea', '📔'),
('diary', 3, 30, '한 달 기록', '한 달간의 이야기가 담겼어요', '#7e22ce', '📚'),
('diary', 4, 60, '기록의 달인', '당신의 이야기가 책이 되고 있어요', '#6b21a8', '✍️'),
('diary', 5, 100, '기록왕', '100번의 하루를 기록한 당신', '#581c87', '👑');

-- 명상 (meditation): 일일 2회 상한 - 마음 챙김
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('meditation', 1, 5, '마음챙김 입문', '고요함을 찾는 여정의 시작', '#8b5cf6', '🧘'),
('meditation', 2, 14, '2주 명상', '2주간 마음을 다스렸어요', '#7c3aed', '🌸'),
('meditation', 3, 30, '평온함', '내면의 평화를 찾고 있어요', '#6d28d9', '☯️'),
('meditation', 4, 50, '명상가', '깊은 명상의 경지에 올랐어요', '#5b21b6', '🙏'),
('meditation', 5, 80, '마음챙김 마스터', '진정한 마음의 평화를 얻었습니다', '#4c1d95', '👑');

-- 복귀 (comeback): 72시간 쿨다운 - 가장 드문 카테고리
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('comeback', 1, 1, '첫 복귀', '다시 돌아온 것을 환영해요!', '#ef4444', '🔄'),
('comeback', 2, 3, '재도전', '포기하지 않는 당신이 멋져요', '#dc2626', '💪'),
('comeback', 3, 5, '불굴의 의지', '몇 번이고 다시 일어서는 당신', '#b91c1c', '🔥'),
('comeback', 4, 8, '피닉스', '재가 되어도 다시 날아오르는 불사조', '#991b1b', '🦅'),
('comeback', 5, 12, '전설의 복귀자', '어떤 시련도 당신을 막지 못해요', '#7f1d1d', '👑');
