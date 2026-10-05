-- 009_tree_skin_feature.sql
-- 나무 스킨 커스터마이징 기능

-- members 테이블에 선택된 스킨 컬럼 추가
ALTER TABLE members ADD COLUMN IF NOT EXISTS selected_tree_skin VARCHAR(50) DEFAULT 'default';

-- 스킨 업데이트 함수
CREATE OR REPLACE FUNCTION update_member_tree_skin(
  p_member_id UUID,
  p_skin_id VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  -- 유효한 스킨 ID인지 확인 (default 또는 카테고리 키)
  IF p_skin_id NOT IN ('default', 'exercise', 'cleaning', 'study', 'morning', 'planning', 'meditation', 'comeback', 'medicine') THEN
    RETURN FALSE;
  END IF;

  UPDATE members
  SET
    selected_tree_skin = p_skin_id,
    updated_at = NOW()
  WHERE id = p_member_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 멤버의 스킨 정보 조회 함수
CREATE OR REPLACE FUNCTION get_member_tree_skin(
  p_member_id UUID
) RETURNS VARCHAR(50) AS $$
DECLARE
  v_skin VARCHAR(50);
BEGIN
  SELECT selected_tree_skin INTO v_skin
  FROM members
  WHERE id = p_member_id;

  RETURN COALESCE(v_skin, 'default');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인덱스 추가 (선택적)
CREATE INDEX IF NOT EXISTS idx_members_selected_tree_skin ON members(selected_tree_skin);
