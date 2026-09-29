-- =============================================
-- 008: 랭킹 도전과제 추가
-- =============================================

-- 랭킹 도전과제 정의 추가
INSERT INTO achievement_definitions (key, name, emoji, category, type, target, difficulty, is_hidden, hint, is_active, is_sensitive)
VALUES
  -- 월간 1위 달성
  ('ranking_first', '챔피언', '👑', NULL, 'ranking_first', 1, 4, false, NULL, true, false),
  -- 월간 2위 달성
  ('ranking_second', '준우승', '🥈', NULL, 'ranking_second', 1, 3, false, NULL, true, false),
  -- 월간 3위 달성
  ('ranking_third', '입상', '🥉', NULL, 'ranking_third', 1, 3, false, NULL, true, false),
  -- 월간 1위 3회 달성
  ('ranking_first_3', '트리플 챔피언', '🏆', NULL, 'ranking_first_count', 3, 4, false, NULL, true, false),
  -- 월간 TOP3 5회 달성
  ('ranking_top3_5', '명예의 전당', '🌟', NULL, 'ranking_top3_count', 5, 4, false, NULL, true, false),
  -- 연속 3개월 TOP3
  ('ranking_top3_streak', '스테디셀러', '💎', NULL, 'ranking_top3_streak', 3, 4, true, '꾸준함이 빛을 발할 때', true, false)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  type = EXCLUDED.type,
  target = EXCLUDED.target,
  difficulty = EXCLUDED.difficulty,
  is_hidden = EXCLUDED.is_hidden,
  hint = EXCLUDED.hint;

-- 월간 랭킹 기록 테이블 (도전과제 체크용)
CREATE TABLE IF NOT EXISTS monthly_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM' 형식
  rank INTEGER NOT NULL,
  total_exp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, year_month)
);

-- RLS 정책
ALTER TABLE monthly_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_rankings_select" ON monthly_rankings FOR SELECT USING (true);
CREATE POLICY "monthly_rankings_insert" ON monthly_rankings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "monthly_rankings_update" ON monthly_rankings FOR UPDATE USING (is_admin());
CREATE POLICY "monthly_rankings_delete" ON monthly_rankings FOR DELETE USING (is_admin());

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_member ON monthly_rankings(member_id);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_yearmonth ON monthly_rankings(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_rank ON monthly_rankings(rank);

-- 월말 랭킹 스냅샷 저장 함수
CREATE OR REPLACE FUNCTION save_monthly_rankings(p_year_month VARCHAR(7))
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- 날짜 범위 계산
  v_start_date := (p_year_month || '-01')::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- 기존 데이터 삭제 후 새로 삽입
  DELETE FROM monthly_rankings WHERE year_month = p_year_month;

  -- 랭킹 계산 및 저장
  INSERT INTO monthly_rankings (member_id, year_month, rank, total_exp)
  SELECT
    m.id,
    p_year_month,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.final_exp), 0) DESC),
    COALESCE(SUM(c.final_exp), 0)
  FROM members m
  LEFT JOIN certifications c ON c.member_id = m.id
    AND c.cert_date >= v_start_date
    AND c.cert_date <= v_end_date
    AND c.final_exp > 0
  GROUP BY m.id
  HAVING COALESCE(SUM(c.final_exp), 0) > 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 멤버의 랭킹 도전과제 체크 및 부여 함수
CREATE OR REPLACE FUNCTION check_ranking_achievements(p_member_id UUID)
RETURNS TABLE(achievement_key VARCHAR, newly_achieved BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_count INTEGER;
  v_second_count INTEGER;
  v_third_count INTEGER;
  v_top3_count INTEGER;
  v_top3_streak INTEGER;
  v_current_streak INTEGER;
  v_prev_month VARCHAR(7);
  r RECORD;
BEGIN
  -- 1위 횟수
  SELECT COUNT(*) INTO v_first_count
  FROM monthly_rankings WHERE member_id = p_member_id AND rank = 1;

  -- 2위 횟수
  SELECT COUNT(*) INTO v_second_count
  FROM monthly_rankings WHERE member_id = p_member_id AND rank = 2;

  -- 3위 횟수
  SELECT COUNT(*) INTO v_third_count
  FROM monthly_rankings WHERE member_id = p_member_id AND rank = 3;

  -- TOP3 횟수
  SELECT COUNT(*) INTO v_top3_count
  FROM monthly_rankings WHERE member_id = p_member_id AND rank <= 3;

  -- TOP3 연속 달성 계산
  v_top3_streak := 0;
  v_current_streak := 0;
  v_prev_month := NULL;

  FOR r IN
    SELECT year_month, rank
    FROM monthly_rankings
    WHERE member_id = p_member_id AND rank <= 3
    ORDER BY year_month DESC
  LOOP
    IF v_prev_month IS NULL THEN
      v_current_streak := 1;
    ELSE
      -- 연속 월인지 확인
      IF (r.year_month::DATE + INTERVAL '1 month')::VARCHAR(7) = v_prev_month THEN
        v_current_streak := v_current_streak + 1;
      ELSE
        v_current_streak := 1;
      END IF;
    END IF;

    v_top3_streak := GREATEST(v_top3_streak, v_current_streak);
    v_prev_month := r.year_month;
  END LOOP;

  -- 도전과제 부여
  -- 1위 달성
  IF v_first_count >= 1 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_first')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_first';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- 2위 달성
  IF v_second_count >= 1 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_second')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_second';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- 3위 달성
  IF v_third_count >= 1 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_third')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_third';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- 1위 3회 달성
  IF v_first_count >= 3 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_first_3')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_first_3';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- TOP3 5회 달성
  IF v_top3_count >= 5 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_top3_5')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_top3_5';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  -- TOP3 3개월 연속
  IF v_top3_streak >= 3 THEN
    INSERT INTO member_achievements (member_id, achievement_key)
    VALUES (p_member_id, 'ranking_top3_streak')
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
      achievement_key := 'ranking_top3_streak';
      newly_achieved := true;
      RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;
