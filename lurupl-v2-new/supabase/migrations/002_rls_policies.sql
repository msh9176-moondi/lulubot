-- =====================================================
-- 루루플 인증 레벨 시스템 V2 - RLS Policies
-- =====================================================

-- RLS 활성화
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========== 관리자 확인 함수 ==========
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== admins 테이블 ==========
-- 관리자만 조회/수정 가능
CREATE POLICY "admins_select" ON admins FOR SELECT USING (is_admin());
CREATE POLICY "admins_insert" ON admins FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admins_update" ON admins FOR UPDATE USING (is_admin());

-- ========== categories 테이블 ==========
-- 모두 읽기 가능, 관리자만 수정
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (is_admin());
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (is_admin());

-- ========== category_tags 테이블 ==========
-- 모두 읽기 가능, 관리자만 수정
CREATE POLICY "category_tags_select" ON category_tags FOR SELECT USING (true);
CREATE POLICY "category_tags_insert" ON category_tags FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "category_tags_update" ON category_tags FOR UPDATE USING (is_admin());
CREATE POLICY "category_tags_delete" ON category_tags FOR DELETE USING (is_admin());

-- ========== members 테이블 ==========
-- 공개 필드만 읽기 가능 (wake_up_time 제외), 관리자만 수정
CREATE POLICY "members_select" ON members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "members_update" ON members FOR UPDATE USING (is_admin());
CREATE POLICY "members_delete" ON members FOR DELETE USING (is_admin());

-- ========== member_aliases 테이블 ==========
-- 관리자만 접근
CREATE POLICY "member_aliases_select" ON member_aliases FOR SELECT USING (is_admin());
CREATE POLICY "member_aliases_insert" ON member_aliases FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "member_aliases_update" ON member_aliases FOR UPDATE USING (is_admin());
CREATE POLICY "member_aliases_delete" ON member_aliases FOR DELETE USING (is_admin());

-- ========== xp_events 테이블 ==========
-- 모두 읽기 가능, 관리자만 수정
CREATE POLICY "xp_events_select" ON xp_events FOR SELECT USING (true);
CREATE POLICY "xp_events_insert" ON xp_events FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "xp_events_update" ON xp_events FOR UPDATE USING (is_admin());
CREATE POLICY "xp_events_delete" ON xp_events FOR DELETE USING (is_admin());

-- ========== import_batches 테이블 ==========
-- 관리자만 접근
CREATE POLICY "import_batches_select" ON import_batches FOR SELECT USING (is_admin());
CREATE POLICY "import_batches_insert" ON import_batches FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "import_batches_update" ON import_batches FOR UPDATE USING (is_admin());

-- ========== certifications 테이블 ==========
-- 공개 필드만 읽기 가능 (raw_message 제외), 관리자만 쓰기
CREATE POLICY "certifications_select" ON certifications FOR SELECT USING (true);
CREATE POLICY "certifications_insert" ON certifications FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "certifications_update" ON certifications FOR UPDATE USING (is_admin());
CREATE POLICY "certifications_delete" ON certifications FOR DELETE USING (is_admin());

-- ========== achievement_definitions 테이블 ==========
-- 모두 읽기 가능, 관리자만 수정
CREATE POLICY "achievement_definitions_select" ON achievement_definitions FOR SELECT USING (true);
CREATE POLICY "achievement_definitions_insert" ON achievement_definitions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "achievement_definitions_update" ON achievement_definitions FOR UPDATE USING (is_admin());

-- ========== member_achievements 테이블 ==========
-- 비민감 과제만 공개, 관리자만 쓰기
CREATE POLICY "member_achievements_select" ON member_achievements FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM achievement_definitions ad
      WHERE ad.key = member_achievements.achievement_key
      AND ad.is_sensitive = true
    )
    OR is_admin()
  );
CREATE POLICY "member_achievements_insert" ON member_achievements FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "member_achievements_update" ON member_achievements FOR UPDATE USING (is_admin());

-- ========== monthly_snapshots 테이블 ==========
-- 모두 읽기 가능, 관리자만 쓰기
CREATE POLICY "monthly_snapshots_select" ON monthly_snapshots FOR SELECT USING (true);
CREATE POLICY "monthly_snapshots_insert" ON monthly_snapshots FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "monthly_snapshots_update" ON monthly_snapshots FOR UPDATE USING (is_admin());

-- ========== audit_logs 테이블 ==========
-- 관리자만 접근
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (is_admin());

-- ========== 공개용 뷰 (민감 정보 제외) ==========

-- 멤버 공개 정보 뷰
CREATE OR REPLACE VIEW public_members AS
SELECT
  id,
  display_name,
  accumulated_exp,
  is_active,
  joined_at,
  created_at
FROM members
WHERE is_active = true;

-- 인증 공개 정보 뷰 (raw_message 제외)
CREATE OR REPLACE VIEW public_certifications AS
SELECT
  c.id,
  c.member_id,
  m.display_name as member_name,
  c.category_key,
  cat.name as category_name,
  cat.emoji as category_emoji,
  c.cert_date,
  c.cert_time,
  c.tag_used,
  c.final_exp,
  c.comeback_bonus_exp,
  c.is_over_limit,
  c.created_at
FROM certifications c
JOIN members m ON c.member_id = m.id
JOIN categories cat ON c.category_key = cat.key
WHERE c.final_exp > 0;

-- 도전 과제 공개 정보 뷰 (민감 과제 제외)
CREATE OR REPLACE VIEW public_achievements AS
SELECT
  ma.member_id,
  m.display_name as member_name,
  ma.achievement_key,
  ad.name as achievement_name,
  ad.emoji,
  ad.difficulty,
  ad.is_hidden,
  ma.achieved_at
FROM member_achievements ma
JOIN members m ON ma.member_id = m.id
JOIN achievement_definitions ad ON ma.achievement_key = ad.key
WHERE ad.is_sensitive = false;
