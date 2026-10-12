-- =====================================================
-- 루루플 V2.1 - 정원 시스템 더미 데이터
-- Supabase SQL Editor에서 실행하세요
-- 먼저 010, 011, 012 마이그레이션을 실행한 후 이 파일을 실행하세요
-- =====================================================

-- 1. 기존 더미 데이터 정리 (선택적)
-- DELETE FROM garden_cheers;
-- DELETE FROM project_contributions;
-- DELETE FROM project_participants;
-- DELETE FROM community_projects;
-- DELETE FROM garden_placements;
-- DELETE FROM member_items;
-- DELETE FROM member_characters;
-- DELETE FROM item_unlock_conditions;
-- DELETE FROM item_definitions;
-- DELETE FROM garden_share_settings;

-- 2. 기본 아이템 정의 (스테이지 보상)
INSERT INTO item_definitions (item_key, name, description, category, slot, zone_key, rarity, icon_emoji, is_public_safe) VALUES
-- 청소 카테고리
('cleaning_pot_1', '작은 화분', '정돈된 공간의 시작', 'decoration', 'garden_deco', 'cleaning', 1, '🪴', true),
('cleaning_shelf_1', '미니 선반', '깔끔한 정리 공간', 'decoration', 'garden_deco', 'cleaning', 2, '🗄️', true),
('cleaning_deck_1', '휴식 데크', '정돈된 쉼터', 'decoration', 'garden_deco', 'cleaning', 3, '🛋️', true),

-- 운동 카테고리
('exercise_step_1', '작은 발자국', '산책의 시작', 'decoration', 'garden_deco', 'exercise', 1, '👣', true),
('exercise_tree_1', '작은 나무', '산책길의 나무', 'decoration', 'garden_deco', 'exercise', 2, '🌳', true),
('exercise_path_1', '산책로', '건강한 길', 'decoration', 'garden_deco', 'exercise', 3, '🛤️', true),

-- 아침 카테고리
('morning_sun_1', '아침 햇살', '상쾌한 시작', 'decoration', 'garden_deco', 'morning', 1, '☀️', true),
('morning_plant_1', '창가 식물', '햇살을 받는 식물', 'decoration', 'garden_deco', 'morning', 2, '🌱', true),
('morning_terrace_1', '테라스', '아침 휴식 공간', 'decoration', 'garden_deco', 'morning', 3, '🏡', true),

-- 계획 카테고리
('planning_memo_1', '메모판', '계획의 시작', 'decoration', 'garden_deco', 'planning', 1, '📝', true),
('planning_desk_1', '작업대', '아이디어 공간', 'decoration', 'garden_deco', 'planning', 2, '🪑', true),
('planning_board_1', '안내소', '완벽한 계획', 'decoration', 'garden_deco', 'planning', 3, '📋', true),

-- 공부 카테고리
('study_book_1', '작은 책', '지식의 시작', 'decoration', 'garden_deco', 'study', 1, '📖', true),
('study_shelf_1', '책장', '지식의 보고', 'decoration', 'garden_deco', 'study', 2, '📚', true),
('study_cabin_1', '독서 오두막', '깊은 몰입', 'decoration', 'garden_deco', 'study', 3, '🏠', true),

-- 일기 카테고리
('diary_card_1', '엽서', '기록의 시작', 'decoration', 'garden_deco', 'diary', 1, '💌', true),
('diary_photo_1', '사진 걸이', '추억 수집', 'decoration', 'garden_deco', 'diary', 2, '🖼️', true),
('diary_tree_1', '추억 나무', '성장의 기록', 'decoration', 'garden_deco', 'diary', 3, '🌲', true),

-- 명상 카테고리
('meditation_ripple_1', '물결', '고요한 시작', 'decoration', 'garden_deco', 'meditation', 1, '🌊', true),
('meditation_stone_1', '돌 의자', '평온한 휴식', 'decoration', 'garden_deco', 'meditation', 2, '🪨', true),
('meditation_pond_1', '연못', '깊은 평화', 'decoration', 'garden_deco', 'meditation', 3, '💧', true),

-- 약 카테고리 (비공개)
('medicine_pillow_1', '쿠션', '편안한 휴식', 'decoration', 'garden_deco', 'medicine', 1, '🛏️', false),
('medicine_bench_1', '벤치', '휴식 공간', 'decoration', 'garden_deco', 'medicine', 2, '🪑', false),
('medicine_rest_1', '휴식처', '완전한 돌봄', 'decoration', 'garden_deco', 'medicine', 3, '🏥', false),

-- 웰컴 아이템
('welcome_pot', '첫 걸음 화분', '루루플과의 첫 만남을 기념하는 화분', 'decoration', 'garden_deco', NULL, 1, '🌷', true),

-- 공동 정원 보상
('community_bench', '함께 벤치', '공동 프로젝트 완성 보상', 'decoration', 'garden_deco', NULL, 2, '🪑', true),

-- 캐릭터 악세서리
('hat_flower', '꽃 머리띠', '귀여운 꽃 장식', 'accessory', 'head', NULL, 1, '🌸', true),
('hat_leaf', '나뭇잎 모자', '자연의 모자', 'accessory', 'head', NULL, 2, '🍃', true)
ON CONFLICT (item_key) DO NOTHING;

-- 3. 아이템 획득 조건 설정
INSERT INTO item_unlock_conditions (item_id, unlock_type, condition_data)
SELECT id, 'stage_unlock', jsonb_build_object('category_key', 'cleaning', 'stage_number', 1)
FROM item_definitions WHERE item_key = 'cleaning_pot_1'
ON CONFLICT DO NOTHING;

INSERT INTO item_unlock_conditions (item_id, unlock_type, condition_data)
SELECT id, 'stage_unlock', jsonb_build_object('category_key', 'cleaning', 'stage_number', 2)
FROM item_definitions WHERE item_key = 'cleaning_shelf_1'
ON CONFLICT DO NOTHING;

INSERT INTO item_unlock_conditions (item_id, unlock_type, condition_data)
SELECT id, 'stage_unlock', jsonb_build_object('category_key', 'cleaning', 'stage_number', 3)
FROM item_definitions WHERE item_key = 'cleaning_deck_1'
ON CONFLICT DO NOTHING;

-- 웰컴 아이템 조건
INSERT INTO item_unlock_conditions (item_id, unlock_type, condition_data)
SELECT id, 'welcome', '{}'::jsonb
FROM item_definitions WHERE item_key = 'welcome_pot'
ON CONFLICT DO NOTHING;

-- 4. 멤버 캐릭터 설정 (모든 기존 멤버에게)
INSERT INTO member_characters (member_id, character_name, color_primary, color_secondary)
SELECT id, '루루', '#8b5cf6', '#c4b5fd'
FROM members
ON CONFLICT (member_id) DO NOTHING;

-- 5. 일부 멤버에게 더미 아이템 지급
INSERT INTO member_items (member_id, item_id, acquired_from, source_data, is_new)
SELECT
  m.id,
  i.id,
  'migration',
  jsonb_build_object('demo', true),
  false
FROM members m
CROSS JOIN item_definitions i
WHERE i.item_key IN ('welcome_pot', 'cleaning_pot_1', 'hat_flower')
LIMIT 30
ON CONFLICT (member_id, item_id) DO NOTHING;

-- 6. 공동 프로젝트 생성
INSERT INTO community_projects (
  title,
  description,
  icon_emoji,
  goal_count,
  current_count,
  start_date,
  end_date,
  reward_item_id,
  status
) VALUES (
  '함께 만드는 쉼터',
  '모두가 함께 만드는 정원 벤치! 100번의 기여로 완성됩니다.',
  '🪑',
  100,
  45,
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '23 days',
  (SELECT id FROM item_definitions WHERE item_key = 'community_bench'),
  'active'
), (
  '봄맞이 꽃밭',
  '정원에 꽃을 심어요! 50번의 기여로 완성!',
  '🌸',
  50,
  50,
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE - INTERVAL '1 day',
  (SELECT id FROM item_definitions WHERE item_key = 'hat_flower'),
  'completed'
)
ON CONFLICT DO NOTHING;

-- 7. 프로젝트 참여자 추가 (첫 5명의 멤버)
INSERT INTO project_participants (project_id, member_id, contribution_count, reward_claimed)
SELECT
  cp.id,
  m.id,
  FLOOR(RANDOM() * 10 + 1)::INTEGER,
  false
FROM community_projects cp
CROSS JOIN (SELECT id FROM members ORDER BY created_at LIMIT 5) m
WHERE cp.status = 'active'
ON CONFLICT (project_id, member_id) DO NOTHING;

-- 완료된 프로젝트에도 참여자 추가
INSERT INTO project_participants (project_id, member_id, contribution_count, reward_claimed)
SELECT
  cp.id,
  m.id,
  FLOOR(RANDOM() * 15 + 5)::INTEGER,
  RANDOM() > 0.5
FROM community_projects cp
CROSS JOIN (SELECT id FROM members ORDER BY created_at LIMIT 8) m
WHERE cp.status = 'completed'
ON CONFLICT (project_id, member_id) DO NOTHING;

-- 8. 정원 공개 설정 (일부 멤버)
INSERT INTO garden_share_settings (member_id, is_public, show_character, show_items, show_growth_level, allow_cheers)
SELECT id, true, true, true, true, true
FROM members
ORDER BY created_at
LIMIT 5
ON CONFLICT (member_id) DO UPDATE
SET is_public = true, show_character = true, show_items = true, show_growth_level = true, allow_cheers = true;

-- 9. 더미 응원 데이터
INSERT INTO garden_cheers (to_member_id, from_member_id, sticker_type, cheer_date)
SELECT
  m1.id,
  m2.id,
  (ARRAY['flower', 'star', 'heart'])[FLOOR(RANDOM() * 3 + 1)],
  CURRENT_DATE - (FLOOR(RANDOM() * 7))::INTEGER
FROM (SELECT id FROM members ORDER BY created_at LIMIT 3) m1
CROSS JOIN (SELECT id FROM members ORDER BY created_at DESC LIMIT 3) m2
WHERE m1.id != m2.id
ON CONFLICT DO NOTHING;

-- 확인 쿼리
SELECT 'item_definitions' as table_name, COUNT(*) as count FROM item_definitions
UNION ALL
SELECT 'member_characters', COUNT(*) FROM member_characters
UNION ALL
SELECT 'member_items', COUNT(*) FROM member_items
UNION ALL
SELECT 'community_projects', COUNT(*) FROM community_projects
UNION ALL
SELECT 'project_participants', COUNT(*) FROM project_participants
UNION ALL
SELECT 'garden_share_settings', COUNT(*) FROM garden_share_settings
UNION ALL
SELECT 'garden_cheers', COUNT(*) FROM garden_cheers;
