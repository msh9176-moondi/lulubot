-- =====================================================
-- 기상 시간 업데이트 함수 (RLS 우회)
-- =====================================================

-- 누구나 기상 시간 업데이트 가능
CREATE OR REPLACE FUNCTION update_wake_time(
  p_member_id UUID,
  p_wake_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE members
  SET wake_up_time = p_wake_time,
      updated_at = NOW()
  WHERE id = p_member_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
