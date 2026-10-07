-- 010_expand_stages_with_first_step.sql
-- 스테이지 시스템 확장: 5단계 → 11단계
-- 1단계: 첫걸음마 (1회) 추가
-- 6~11단계: 추가 목표 제공

-- =====================================================
-- 1. 기존 스테이지 번호를 +1로 업데이트 (역순으로 진행)
-- =====================================================
-- 10 → 11, 9 → 10, ..., 1 → 2 순서로 업데이트 (unique 제약조건 회피)

-- 먼저 10단계가 있는지 확인하고 처리 (이미 확장된 DB인 경우)
UPDATE category_stage_definitions SET stage_number = 11 WHERE stage_number = 10;
UPDATE category_stage_definitions SET stage_number = 10 WHERE stage_number = 9;
UPDATE category_stage_definitions SET stage_number = 9 WHERE stage_number = 8;
UPDATE category_stage_definitions SET stage_number = 8 WHERE stage_number = 7;
UPDATE category_stage_definitions SET stage_number = 7 WHERE stage_number = 6;
UPDATE category_stage_definitions SET stage_number = 6 WHERE stage_number = 5;
UPDATE category_stage_definitions SET stage_number = 5 WHERE stage_number = 4;
UPDATE category_stage_definitions SET stage_number = 4 WHERE stage_number = 3;
UPDATE category_stage_definitions SET stage_number = 3 WHERE stage_number = 2;
UPDATE category_stage_definitions SET stage_number = 2 WHERE stage_number = 1;

-- =====================================================
-- 2. 기존 사용자 해금 데이터도 +1 업데이트 (역순으로 진행)
-- =====================================================
-- unique constraint 회피를 위해 역순으로 업데이트
UPDATE category_stage_unlocks SET stage_number = 11 WHERE stage_number = 10;
UPDATE category_stage_unlocks SET stage_number = 10 WHERE stage_number = 9;
UPDATE category_stage_unlocks SET stage_number = 9 WHERE stage_number = 8;
UPDATE category_stage_unlocks SET stage_number = 8 WHERE stage_number = 7;
UPDATE category_stage_unlocks SET stage_number = 7 WHERE stage_number = 6;
UPDATE category_stage_unlocks SET stage_number = 6 WHERE stage_number = 5;
UPDATE category_stage_unlocks SET stage_number = 5 WHERE stage_number = 4;
UPDATE category_stage_unlocks SET stage_number = 4 WHERE stage_number = 3;
UPDATE category_stage_unlocks SET stage_number = 3 WHERE stage_number = 2;
UPDATE category_stage_unlocks SET stage_number = 2 WHERE stage_number = 1;

-- =====================================================
-- 3. 새로운 1단계 "첫걸음마" 추가 (1회 인증)
-- =====================================================
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon) VALUES
('cleaning', 1, 1, '첫걸음마', '청소의 첫 발자국을 내딛었어요!', '#a5f3fc', '👣'),
('exercise', 1, 1, '첫걸음마', '운동의 첫 발자국을 내딛었어요!', '#bbf7d0', '👣'),
('morning', 1, 1, '첫걸음마', '기상의 첫 발자국을 내딛었어요!', '#fef08a', '👣'),
('planning', 1, 1, '첫걸음마', '계획의 첫 발자국을 내딛었어요!', '#fbcfe8', '👣'),
('study', 1, 1, '첫걸음마', '공부의 첫 발자국을 내딛었어요!', '#c7d2fe', '👣'),
('medicine', 1, 1, '첫걸음마', '건강관리의 첫 발자국을 내딛었어요!', '#99f6e4', '👣'),
('diary', 1, 1, '첫걸음마', '기록의 첫 발자국을 내딛었어요!', '#e9d5ff', '👣'),
('meditation', 1, 1, '첫걸음마', '명상의 첫 발자국을 내딛었어요!', '#ddd6fe', '👣');
-- 복귀는 이미 1회로 시작하므로 첫걸음마 추가 불필요

-- =====================================================
-- 4. 7~11단계 추가 (기존 5단계 DB인 경우 → 6단계가 됨)
-- =====================================================
-- 기존에 6단계가 없는 경우에만 추가 (ON CONFLICT DO NOTHING)

-- 청소 (cleaning): 일일 3회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'cleaning', 7, 120, '정리정돈 달인', '어디든 깔끔하게 만드는 능력자', '#0c4a6e', '🧹'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'cleaning' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'cleaning', 8, 170, '청소 전문가', '청소의 모든 것을 꿰뚫는 전문가', '#083344', '🪣'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'cleaning' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'cleaning', 9, 230, '클린 마스터', '먼지 하나 용납하지 않는 완벽주의자', '#042f2e', '💎'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'cleaning' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'cleaning', 10, 300, '청결의 화신', '청결함 그 자체가 된 당신', '#022c22', '🌟'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'cleaning' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'cleaning', 11, 400, '가사 레전드', '전설로 남을 청소의 신', '#020617', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'cleaning' AND stage_number = 11);

-- 운동 (exercise): 일일 2회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'exercise', 7, 120, '스포츠맨', '운동이 일상의 중심이 된 당신', '#052e16', '🥇'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'exercise' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'exercise', 8, 170, '철인', '강철 같은 체력의 소유자', '#022c22', '🦾'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'exercise' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'exercise', 9, 230, '체력왕', '누구도 따라올 수 없는 체력', '#064e3b', '🎖️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'exercise' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'exercise', 10, 300, '운동의 화신', '운동 그 자체가 된 당신', '#0f172a', '💫'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'exercise' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'exercise', 11, 400, '피트니스 레전드', '전설로 남을 운동의 신', '#020617', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'exercise' AND stage_number = 11);

-- 기상 (morning): 일일 1회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'morning', 7, 150, '일출의 친구', '해와 함께 일어나는 습관', '#713f12', '🌤️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'morning' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'morning', 8, 210, '새벽 정복자', '새벽을 완전히 정복했어요', '#451a03', '🌄'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'morning' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'morning', 9, 280, '아침의 제왕', '아침 시간의 절대 지배자', '#422006', '🌞'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'morning' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'morning', 10, 365, '1년의 아침', '365일 아침을 함께한 당신', '#1c1917', '✨'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'morning' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'morning', 11, 500, '새벽 레전드', '전설로 남을 아침형 인간', '#0c0a09', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'morning' AND stage_number = 11);

-- 계획 (planning): 일일 1회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'planning', 7, 150, '계획의 귀재', '체계적인 계획 수립의 달인', '#701a75', '📅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'planning' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'planning', 8, 210, '전략 마스터', '모든 일정을 완벽히 통제', '#581c87', '🗓️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'planning' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'planning', 9, 280, '시간 지배자', '시간을 마음대로 다루는 능력자', '#3b0764', '⏱️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'planning' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'planning', 10, 365, '1년의 계획가', '365일을 계획한 당신', '#1e1b4b', '🎯'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'planning' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'planning', 11, 500, '플래닝 레전드', '전설로 남을 계획의 신', '#0c0a09', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'planning' AND stage_number = 11);

-- 공부 (study): 일일 3회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'study', 7, 120, '지식 탐험가', '새로운 지식을 끊임없이 탐구', '#1e1b4b', '🔬'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'study' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'study', 8, 170, '배움의 달인', '학습의 진정한 의미를 아는 자', '#172554', '📜'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'study' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'study', 9, 230, '지혜의 현자', '깊은 지혜를 갖춘 현자', '#0c4a6e', '🦉'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'study' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'study', 10, 300, '학문의 대가', '학문의 경지에 오른 대가', '#0f172a', '🎓'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'study' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'study', 11, 400, '지식 레전드', '전설로 남을 학문의 신', '#020617', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'study' AND stage_number = 11);

-- 약 (medicine): 일일 1회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'medicine', 7, 150, '건강 전문가', '건강 관리의 전문가', '#0f766e', '💚'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'medicine' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'medicine', 8, 210, '웰빙 마스터', '완벽한 건강 관리의 달인', '#134e4a', '🌿'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'medicine' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'medicine', 9, 280, '건강 수호자', '건강을 철저히 지키는 수호자', '#0f172a', '🛡️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'medicine' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'medicine', 10, 365, '1년의 건강', '365일 건강을 지킨 당신', '#1e1b4b', '⭐'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'medicine' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'medicine', 11, 500, '건강 레전드', '전설로 남을 건강의 신', '#020617', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'medicine' AND stage_number = 11);

-- 일기 (diary): 일일 1회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'diary', 7, 150, '이야기꾼', '매일의 이야기를 엮어가는 당신', '#4c1d95', '📖'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'diary' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'diary', 8, 210, '기억의 수호자', '소중한 기억을 지키는 수호자', '#3b0764', '📕'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'diary' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'diary', 9, 280, '일기 마스터', '기록의 진정한 마스터', '#2e1065', '📚'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'diary' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'diary', 10, 365, '1년의 기록', '365일을 기록한 당신', '#1e1b4b', '🌟'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'diary' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'diary', 11, 500, '기록 레전드', '전설로 남을 기록의 신', '#0c0a09', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'diary' AND stage_number = 11);

-- 명상 (meditation): 일일 2회 상한
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'meditation', 7, 120, '선禅의 길', '명상의 깊은 경지에 입문', '#3b0764', '🌺'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'meditation' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'meditation', 8, 170, '내면의 스승', '자신의 내면을 다스리는 스승', '#2e1065', '🪷'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'meditation' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'meditation', 9, 230, '평정심', '어떤 상황에도 흔들리지 않는 마음', '#1e1b4b', '☮️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'meditation' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'meditation', 10, 300, '깨달음', '진정한 깨달음에 다가간 당신', '#0f172a', '🔮'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'meditation' AND stage_number = 10);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'meditation', 11, 400, '명상 레전드', '전설로 남을 명상의 신', '#020617', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'meditation' AND stage_number = 11);

-- 복귀 (comeback): 72시간 쿨다운 (6~10단계 추가)
INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'comeback', 6, 18, '강철 멘탈', '몇 번이든 다시 일어서는 강인함', '#7f1d1d', '🦸'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'comeback' AND stage_number = 6);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'comeback', 7, 25, '불굴의 전사', '절대 포기하지 않는 전사', '#450a0a', '⚔️'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'comeback' AND stage_number = 7);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'comeback', 8, 35, '재기의 왕', '재기의 진정한 의미를 아는 자', '#3b0764', '💪'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'comeback' AND stage_number = 8);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'comeback', 9, 50, '부활의 화신', '몇 번이든 부활하는 불사신', '#1e1b4b', '🔱'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'comeback' AND stage_number = 9);

INSERT INTO category_stage_definitions (category_key, stage_number, required_count, stage_name, stage_description, theme_color, reward_icon)
SELECT 'comeback', 10, 70, '복귀 레전드', '전설로 남을 복귀의 신', '#0f172a', '🏅'
WHERE NOT EXISTS (SELECT 1 FROM category_stage_definitions WHERE category_key = 'comeback' AND stage_number = 10);
