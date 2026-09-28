-- 멤버 EXP 증가 함수 (자동 수집기용)
CREATE OR REPLACE FUNCTION increment_member_exp(
  p_member_id UUID,
  p_exp INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE members
  SET
    accumulated_exp = accumulated_exp + p_exp,
    updated_at = NOW()
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
