-- 인증 삽입 함수 (자동 수집기용)
-- RLS 정책을 우회하여 자동 수집기가 인증을 삽입할 수 있도록 함
CREATE OR REPLACE FUNCTION insert_certification(
  p_member_id UUID,
  p_category_key TEXT,
  p_cert_date DATE,
  p_cert_time TIME,
  p_tag_used TEXT,
  p_base_exp INTEGER,
  p_final_exp INTEGER,
  p_is_over_limit BOOLEAN,
  p_daily_cert_num INTEGER
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO certifications (
    member_id, category_key, cert_date, cert_time,
    tag_used, base_exp, final_exp, is_over_limit, daily_cert_num
  ) VALUES (
    p_member_id, p_category_key, p_cert_date, p_cert_time,
    p_tag_used, p_base_exp, p_final_exp, p_is_over_limit, p_daily_cert_num
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
