-- =============================================
-- 기존 데이터 기반 랭킹 도전과제 부여
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 먼저 랭킹 도전과제 정의 추가 (없으면)
INSERT INTO achievement_definitions (key, name, emoji, category, type, target, difficulty, is_hidden, hint, is_active, is_sensitive)
VALUES
  ('ranking_first', '챔피언', '👑', NULL, 'ranking_first', 1, 4, false, NULL, true, false),
  ('ranking_second', '준우승', '🥈', NULL, 'ranking_second', 1, 3, false, NULL, true, false),
  ('ranking_third', '입상', '🥉', NULL, 'ranking_third', 1, 3, false, NULL, true, false),
  ('ranking_first_3', '트리플 챔피언', '🏆', NULL, 'ranking_first_count', 3, 4, false, NULL, true, false),
  ('ranking_top3_5', '명예의 전당', '🌟', NULL, 'ranking_top3_count', 5, 4, false, NULL, true, false),
  ('ranking_top3_streak', '스테디셀러', '💎', NULL, 'ranking_top3_streak', 3, 4, true, '꾸준함이 빛을 발할 때', true, false)
ON CONFLICT (key) DO NOTHING;

-- 2. 월별 랭킹 계산 (2024년 1월부터 현재까지)
-- 임시 테이블에 월별 랭킹 저장
CREATE TEMP TABLE temp_monthly_rankings AS
WITH monthly_exp AS (
  SELECT
    member_id,
    TO_CHAR(cert_date, 'YYYY-MM') AS year_month,
    SUM(final_exp) AS total_exp
  FROM certifications
  WHERE final_exp > 0
  GROUP BY member_id, TO_CHAR(cert_date, 'YYYY-MM')
),
ranked AS (
  SELECT
    member_id,
    year_month,
    total_exp,
    ROW_NUMBER() OVER (PARTITION BY year_month ORDER BY total_exp DESC) AS rank
  FROM monthly_exp
  WHERE total_exp > 0
)
SELECT * FROM ranked;

-- 3. 1위 달성자에게 '챔피언' 도전과제 부여
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT DISTINCT member_id, 'ranking_first', CURRENT_DATE
FROM temp_monthly_rankings
WHERE rank = 1
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 4. 2위 달성자에게 '준우승' 도전과제 부여
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT DISTINCT member_id, 'ranking_second', CURRENT_DATE
FROM temp_monthly_rankings
WHERE rank = 2
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 5. 3위 달성자에게 '입상' 도전과제 부여
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT DISTINCT member_id, 'ranking_third', CURRENT_DATE
FROM temp_monthly_rankings
WHERE rank = 3
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 6. 1위 3회 이상 달성자에게 '트리플 챔피언' 부여
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT member_id, 'ranking_first_3', CURRENT_DATE
FROM temp_monthly_rankings
WHERE rank = 1
GROUP BY member_id
HAVING COUNT(*) >= 3
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 7. TOP3 5회 이상 달성자에게 '명예의 전당' 부여
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT member_id, 'ranking_top3_5', CURRENT_DATE
FROM temp_monthly_rankings
WHERE rank <= 3
GROUP BY member_id
HAVING COUNT(*) >= 5
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 8. 3개월 연속 TOP3 달성자에게 '스테디셀러' 부여
WITH consecutive_months AS (
  SELECT
    member_id,
    year_month,
    rank,
    (year_month || '-01')::DATE AS month_date,
    LAG((year_month || '-01')::DATE, 1) OVER (PARTITION BY member_id ORDER BY year_month) AS prev_month,
    LAG((year_month || '-01')::DATE, 2) OVER (PARTITION BY member_id ORDER BY year_month) AS prev2_month
  FROM temp_monthly_rankings
  WHERE rank <= 3
),
three_consecutive AS (
  SELECT DISTINCT member_id
  FROM consecutive_months
  WHERE
    prev_month IS NOT NULL
    AND prev2_month IS NOT NULL
    AND month_date - INTERVAL '1 month' = prev_month
    AND month_date - INTERVAL '2 months' = prev2_month
)
INSERT INTO member_achievements (member_id, achievement_key, achieved_at)
SELECT member_id, 'ranking_top3_streak', CURRENT_DATE
FROM three_consecutive
ON CONFLICT (member_id, achievement_key) DO NOTHING;

-- 9. 결과 확인
SELECT
  m.display_name,
  ad.name AS achievement_name,
  ad.emoji
FROM member_achievements ma
JOIN members m ON ma.member_id = m.id
JOIN achievement_definitions ad ON ma.achievement_key = ad.key
WHERE ad.type LIKE 'ranking_%'
ORDER BY m.display_name, ad.name;

-- 10. 임시 테이블 삭제
DROP TABLE temp_monthly_rankings;
