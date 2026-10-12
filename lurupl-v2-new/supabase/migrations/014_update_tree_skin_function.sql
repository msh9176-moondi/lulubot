-- 014_update_tree_skin_function.sql
-- 나무 스킨 함수 업데이트: 새로운 스킨 ID 형식 지원 (category-stage)

-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS update_member_tree_skin(UUID, VARCHAR(50));

-- 스킨 업데이트 함수 (새 형식 지원: 'default', 'exercise-1', 'exercise-2', ... 'exercise-5' 등)
CREATE OR REPLACE FUNCTION update_member_tree_skin(
  p_member_id UUID,
  p_skin_id VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_category VARCHAR(20);
  v_stage INTEGER;
BEGIN
  -- default는 항상 허용
  IF p_skin_id = 'default' THEN
    UPDATE members
    SET
      selected_tree_skin = p_skin_id,
      updated_at = NOW()
    WHERE id = p_member_id;
    RETURN FOUND;
  END IF;

  -- 새 형식 검증: category-stage (예: exercise-3)
  IF p_skin_id ~ '^[a-z]+-[1-5]$' THEN
    v_category := split_part(p_skin_id, '-', 1);
    v_stage := split_part(p_skin_id, '-', 2)::INTEGER;

    -- 유효한 카테고리인지 확인
    IF v_category IN ('exercise', 'cleaning', 'study', 'morning', 'planning', 'meditation', 'comeback', 'medicine', 'diary') THEN
      UPDATE members
      SET
        selected_tree_skin = p_skin_id,
        updated_at = NOW()
      WHERE id = p_member_id;
      RETURN FOUND;
    END IF;
  END IF;

  -- 레거시 형식도 지원 (exercise, study 등 - 5단계로 변환)
  IF p_skin_id IN ('exercise', 'cleaning', 'study', 'morning', 'planning', 'meditation', 'comeback', 'medicine', 'diary') THEN
    UPDATE members
    SET
      selected_tree_skin = p_skin_id || '-5',
      updated_at = NOW()
    WHERE id = p_member_id;
    RETURN FOUND;
  END IF;

  -- 유효하지 않은 스킨 ID
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION update_member_tree_skin(UUID, VARCHAR(50)) TO anon, authenticated;
