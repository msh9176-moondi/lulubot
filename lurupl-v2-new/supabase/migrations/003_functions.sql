-- =====================================================
-- 루루플 인증 레벨 시스템 V2 - RPC Functions
-- =====================================================

-- ========== 월간 통계 조회 ==========
CREATE OR REPLACE FUNCTION get_monthly_stats(target_year_month VARCHAR(7))
RETURNS TABLE (
  member_id UUID,
  display_name VARCHAR,
  monthly_exp BIGINT,
  monthly_count BIGINT,
  cert_days BIGINT,
  accumulated_exp INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.display_name,
    COALESCE(SUM(c.final_exp), 0)::BIGINT AS monthly_exp,
    COUNT(c.id)::BIGINT AS monthly_count,
    COUNT(DISTINCT c.cert_date)::BIGINT AS cert_days,
    m.accumulated_exp
  FROM members m
  LEFT JOIN certifications c ON m.id = c.member_id
    AND TO_CHAR(c.cert_date, 'YYYY-MM') = target_year_month
    AND c.final_exp > 0
  WHERE m.is_active = true
  GROUP BY m.id, m.display_name, m.accumulated_exp
  ORDER BY monthly_exp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 카테고리별 분포 조회 ==========
CREATE OR REPLACE FUNCTION get_category_distribution(target_year_month VARCHAR(7))
RETURNS TABLE (
  category_key VARCHAR,
  category_name VARCHAR,
  category_emoji VARCHAR,
  cert_count BIGINT,
  total_exp BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cat.key::VARCHAR,
    cat.name::VARCHAR,
    cat.emoji::VARCHAR,
    COUNT(c.id)::BIGINT AS cert_count,
    COALESCE(SUM(c.final_exp), 0)::BIGINT AS total_exp
  FROM categories cat
  LEFT JOIN certifications c ON cat.key = c.category_key
    AND TO_CHAR(c.cert_date, 'YYYY-MM') = target_year_month
    AND c.final_exp > 0
  WHERE cat.is_active = true
  GROUP BY cat.key, cat.name, cat.emoji, cat.sort_order
  ORDER BY cat.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 시간대별 분포 조회 ==========
CREATE OR REPLACE FUNCTION get_hourly_distribution(target_year_month VARCHAR(7))
RETURNS TABLE (
  hour INTEGER,
  cert_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM c.cert_time)::INTEGER AS hour,
    COUNT(*)::BIGINT AS cert_count
  FROM certifications c
  WHERE TO_CHAR(c.cert_date, 'YYYY-MM') = target_year_month
    AND c.final_exp > 0
  GROUP BY EXTRACT(HOUR FROM c.cert_time)
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 멤버 상세 정보 조회 ==========
CREATE OR REPLACE FUNCTION get_member_details(p_member_id UUID, target_year_month VARCHAR(7))
RETURNS TABLE (
  member_id UUID,
  display_name VARCHAR,
  monthly_exp BIGINT,
  monthly_count BIGINT,
  cert_days BIGINT,
  accumulated_exp INTEGER,
  monthly_level INTEGER,
  accumulated_title VARCHAR,
  category_counts JSONB
) AS $$
DECLARE
  v_monthly_exp BIGINT;
BEGIN
  -- 월간 경험치 계산
  SELECT COALESCE(SUM(final_exp), 0) INTO v_monthly_exp
  FROM certifications
  WHERE member_id = p_member_id
    AND TO_CHAR(cert_date, 'YYYY-MM') = target_year_month
    AND final_exp > 0;

  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.display_name,
    v_monthly_exp AS monthly_exp,
    (SELECT COUNT(*) FROM certifications WHERE member_id = p_member_id AND TO_CHAR(cert_date, 'YYYY-MM') = target_year_month AND final_exp > 0)::BIGINT AS monthly_count,
    (SELECT COUNT(DISTINCT cert_date) FROM certifications WHERE member_id = p_member_id AND TO_CHAR(cert_date, 'YYYY-MM') = target_year_month AND final_exp > 0)::BIGINT AS cert_days,
    m.accumulated_exp,
    (FLOOR(v_monthly_exp::NUMERIC / 5) + 1)::INTEGER AS monthly_level,
    CASE
      WHEN m.accumulated_exp >= 3000 THEN '레전드'
      WHEN m.accumulated_exp >= 2000 THEN '그랜드마스터'
      WHEN m.accumulated_exp >= 1200 THEN '마스터'
      WHEN m.accumulated_exp >= 800 THEN '다이아'
      WHEN m.accumulated_exp >= 500 THEN '플래티넘'
      WHEN m.accumulated_exp >= 300 THEN '골드'
      WHEN m.accumulated_exp >= 150 THEN '실버'
      WHEN m.accumulated_exp >= 80 THEN '브론즈'
      WHEN m.accumulated_exp >= 30 THEN '루키'
      ELSE '뉴비'
    END::VARCHAR AS accumulated_title,
    (
      SELECT jsonb_object_agg(category_key, cnt)
      FROM (
        SELECT category_key, COUNT(*) as cnt
        FROM certifications
        WHERE member_id = p_member_id
          AND TO_CHAR(cert_date, 'YYYY-MM') = target_year_month
          AND final_exp > 0
        GROUP BY category_key
      ) sub
    ) AS category_counts
  FROM members m
  WHERE m.id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 닉네임으로 멤버 찾기 ==========
CREATE OR REPLACE FUNCTION find_member_by_nickname(p_nickname VARCHAR)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
BEGIN
  -- 별칭 테이블에서 찾기
  SELECT member_id INTO v_member_id
  FROM member_aliases
  WHERE kakao_nickname = p_nickname;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  -- 표시 이름으로 찾기
  SELECT id INTO v_member_id
  FROM members
  WHERE display_name = p_nickname
  LIMIT 1;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 멤버 누적 경험치 업데이트 ==========
CREATE OR REPLACE FUNCTION update_member_accumulated_exp(p_member_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_exp INTEGER;
BEGIN
  -- 모든 인증 경험치 합산
  SELECT COALESCE(SUM(final_exp), 0)::INTEGER INTO v_total_exp
  FROM certifications
  WHERE member_id = p_member_id
    AND final_exp > 0;

  -- 멤버 테이블 업데이트
  UPDATE members
  SET accumulated_exp = v_total_exp,
      updated_at = NOW()
  WHERE id = p_member_id;

  RETURN v_total_exp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 배치 인증 저장 (트랜잭션) ==========
CREATE OR REPLACE FUNCTION save_certification_batch(
  p_batch_id UUID,
  p_certifications JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  cert_count INTEGER,
  total_exp INTEGER,
  message TEXT
) AS $$
DECLARE
  v_cert JSONB;
  v_member_id UUID;
  v_cert_count INTEGER := 0;
  v_total_exp INTEGER := 0;
BEGIN
  -- 배치 상태 확인
  IF NOT EXISTS (SELECT 1 FROM import_batches WHERE id = p_batch_id AND status = 'pending') THEN
    RETURN QUERY SELECT false, 0, 0, '유효하지 않은 배치입니다.'::TEXT;
    RETURN;
  END IF;

  -- 각 인증 삽입
  FOR v_cert IN SELECT * FROM jsonb_array_elements(p_certifications)
  LOOP
    -- 멤버 ID 조회
    SELECT find_member_by_nickname(v_cert->>'nickname') INTO v_member_id;

    -- 멤버가 없으면 생성
    IF v_member_id IS NULL THEN
      INSERT INTO members (display_name)
      VALUES (v_cert->>'nickname')
      RETURNING id INTO v_member_id;

      -- 별칭 등록
      INSERT INTO member_aliases (member_id, kakao_nickname, is_primary)
      VALUES (v_member_id, v_cert->>'nickname', true);
    END IF;

    -- 인증 삽입 (중복 무시)
    INSERT INTO certifications (
      member_id, category_key, cert_date, cert_time,
      tag_used, raw_message, base_exp, multiplier, final_exp,
      comeback_bonus_exp, is_valid_morning, is_valid_comeback,
      is_over_limit, target_wake_time, daily_cert_num, batch_id
    ) VALUES (
      v_member_id,
      v_cert->>'category',
      (v_cert->>'cert_date')::DATE,
      (v_cert->>'cert_time')::TIME,
      v_cert->>'tag',
      v_cert->>'message',
      (v_cert->>'base_exp')::INTEGER,
      COALESCE((v_cert->>'multiplier')::DECIMAL, 1.00),
      (v_cert->>'final_exp')::INTEGER,
      COALESCE((v_cert->>'comeback_bonus_exp')::INTEGER, 0),
      (v_cert->>'is_valid_morning')::BOOLEAN,
      (v_cert->>'is_valid_comeback')::BOOLEAN,
      COALESCE((v_cert->>'is_over_limit')::BOOLEAN, false),
      (v_cert->>'target_wake_time')::TIME,
      COALESCE((v_cert->>'daily_cert_num')::INTEGER, 1),
      p_batch_id
    )
    ON CONFLICT (member_id, cert_date, cert_time, category_key) DO NOTHING;

    IF FOUND THEN
      v_cert_count := v_cert_count + 1;
      v_total_exp := v_total_exp + (v_cert->>'final_exp')::INTEGER;
    END IF;
  END LOOP;

  -- 배치 상태 업데이트
  UPDATE import_batches
  SET status = 'confirmed',
      cert_count = v_cert_count,
      total_exp = v_total_exp,
      confirmed_at = NOW()
  WHERE id = p_batch_id;

  -- 멤버별 누적 경험치 업데이트
  PERFORM update_member_accumulated_exp(DISTINCT member_id)
  FROM certifications WHERE batch_id = p_batch_id;

  RETURN QUERY SELECT true, v_cert_count, v_total_exp, '저장 완료'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 이벤트 배수 조회 ==========
CREATE OR REPLACE FUNCTION get_event_multiplier(
  p_date DATE,
  p_category VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  v_multiplier DECIMAL := 1.00;
BEGIN
  SELECT COALESCE(MAX(multiplier), 1.00) INTO v_multiplier
  FROM xp_events
  WHERE is_enabled = true
    AND p_date BETWEEN start_date AND end_date
    AND (categories IS NULL OR p_category = ANY(categories));

  RETURN v_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
