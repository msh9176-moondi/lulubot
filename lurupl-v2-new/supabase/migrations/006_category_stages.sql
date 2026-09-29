-- Category Stage System Migration
-- 카테고리별 이모티콘 스태킹 및 스테이지 해금 시스템

-- 1. 스테이지 정의 테이블
CREATE TABLE IF NOT EXISTS category_stage_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL REFERENCES categories(key) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number >= 1),
  required_count INTEGER NOT NULL CHECK (required_count > 0),
  stage_name TEXT NOT NULL,
  stage_description TEXT,
  theme_color TEXT, -- HEX color for visual theme
  reward_icon TEXT, -- Optional decorative icon
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_key, stage_number)
);

-- 2. 사용자 스테이지 해금 기록
CREATE TABLE IF NOT EXISTS category_stage_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL REFERENCES categories(key) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number >= 1),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_count_at_unlock INTEGER NOT NULL, -- 해금 당시의 인증 횟수
  animation_seen BOOLEAN NOT NULL DEFAULT false, -- 애니메이션 재생 여부
  UNIQUE(member_id, category_key, stage_number)
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_stage_definitions_category ON category_stage_definitions(category_key);
CREATE INDEX IF NOT EXISTS idx_stage_definitions_active ON category_stage_definitions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stage_unlocks_member ON category_stage_unlocks(member_id);
CREATE INDEX IF NOT EXISTS idx_stage_unlocks_member_category ON category_stage_unlocks(member_id, category_key);

-- 4. RLS 정책
ALTER TABLE category_stage_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_stage_unlocks ENABLE ROW LEVEL SECURITY;

-- 스테이지 정의는 모두 읽기 가능
CREATE POLICY "stage_definitions_public_read" ON category_stage_definitions
  FOR SELECT USING (is_active = true);

-- 스테이지 정의는 관리자만 수정 가능
CREATE POLICY "stage_definitions_admin_write" ON category_stage_definitions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- 스테이지 해금 기록은 본인만 읽기 가능 (또는 공개 요약 뷰 사용)
CREATE POLICY "stage_unlocks_own_read" ON category_stage_unlocks
  FOR SELECT USING (true); -- 공개 랭킹용으로 전체 읽기 허용 (민감 정보 없음)

-- 스테이지 해금은 RPC를 통해서만 가능 (직접 INSERT 금지)
CREATE POLICY "stage_unlocks_no_direct_write" ON category_stage_unlocks
  FOR INSERT WITH CHECK (false);

CREATE POLICY "stage_unlocks_no_direct_update" ON category_stage_unlocks
  FOR UPDATE USING (false);

CREATE POLICY "stage_unlocks_no_direct_delete" ON category_stage_unlocks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  );

-- 5. 멤버별 카테고리 인증 수 집계 함수
CREATE OR REPLACE FUNCTION get_member_category_counts(p_member_id UUID)
RETURNS TABLE (
  category_key TEXT,
  verified_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.category_key,
    COUNT(*)::BIGINT as verified_count
  FROM certifications c
  WHERE c.member_id = p_member_id
    AND c.final_exp > 0  -- 확정된 인증만 (일일 상한 초과 제외)
  GROUP BY c.category_key;
END;
$$;

-- 6. 스테이지 해금 RPC 함수 (원자적 처리)
CREATE OR REPLACE FUNCTION claim_stage(
  p_member_id UUID,
  p_category_key TEXT,
  p_stage_number INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verified_count BIGINT;
  v_required_count INTEGER;
  v_prev_stage_unlocked BOOLEAN;
  v_already_unlocked BOOLEAN;
  v_stage_def RECORD;
  v_result JSON;
BEGIN
  -- 1. 해당 스테이지 정의 확인
  SELECT * INTO v_stage_def
  FROM category_stage_definitions
  WHERE category_key = p_category_key
    AND stage_number = p_stage_number
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'STAGE_NOT_FOUND',
      'message', '해당 스테이지 정의를 찾을 수 없습니다.'
    );
  END IF;

  v_required_count := v_stage_def.required_count;

  -- 2. 이미 해금했는지 확인
  SELECT EXISTS(
    SELECT 1 FROM category_stage_unlocks
    WHERE member_id = p_member_id
      AND category_key = p_category_key
      AND stage_number = p_stage_number
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_UNLOCKED',
      'message', '이미 해금된 스테이지입니다.'
    );
  END IF;

  -- 3. 이전 스테이지 해금 확인 (stage_number > 1인 경우)
  IF p_stage_number > 1 THEN
    SELECT EXISTS(
      SELECT 1 FROM category_stage_unlocks
      WHERE member_id = p_member_id
        AND category_key = p_category_key
        AND stage_number = p_stage_number - 1
    ) INTO v_prev_stage_unlocked;

    IF NOT v_prev_stage_unlocked THEN
      RETURN json_build_object(
        'success', false,
        'error', 'PREV_STAGE_REQUIRED',
        'message', '이전 스테이지를 먼저 해금해야 합니다.'
      );
    END IF;
  END IF;

  -- 4. 실제 확정 인증 수 계산
  SELECT COUNT(*)::BIGINT INTO v_verified_count
  FROM certifications
  WHERE member_id = p_member_id
    AND category_key = p_category_key
    AND final_exp > 0;  -- 확정된 인증만

  -- 5. 기준 충족 여부 확인
  IF v_verified_count < v_required_count THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NOT_ENOUGH_CERTS',
      'message', format('인증 %s회가 필요합니다. (현재: %s회)', v_required_count, v_verified_count),
      'required', v_required_count,
      'current', v_verified_count
    );
  END IF;

  -- 6. 해금 기록 생성 (UPSERT로 동시성 처리)
  INSERT INTO category_stage_unlocks (
    member_id, category_key, stage_number, verified_count_at_unlock
  )
  VALUES (
    p_member_id, p_category_key, p_stage_number, v_verified_count
  )
  ON CONFLICT (member_id, category_key, stage_number)
  DO NOTHING;  -- 이미 있으면 무시 (동시 요청 방지)

  -- 7. 성공 응답
  RETURN json_build_object(
    'success', true,
    'stage_number', p_stage_number,
    'stage_name', v_stage_def.stage_name,
    'stage_description', v_stage_def.stage_description,
    'verified_count', v_verified_count,
    'unlocked_at', now()
  );
END;
$$;

-- 7. 애니메이션 확인 플래그 업데이트 함수
CREATE OR REPLACE FUNCTION mark_stage_animation_seen(
  p_member_id UUID,
  p_category_key TEXT,
  p_stage_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE category_stage_unlocks
  SET animation_seen = true
  WHERE member_id = p_member_id
    AND category_key = p_category_key
    AND stage_number = p_stage_number;

  RETURN FOUND;
END;
$$;

-- 8. 멤버의 전체 스테이지 상태 조회 함수
CREATE OR REPLACE FUNCTION get_member_stage_status(p_member_id UUID)
RETURNS TABLE (
  category_key TEXT,
  verified_count BIGINT,
  current_stage INTEGER,
  next_stage INTEGER,
  next_required INTEGER,
  can_unlock BOOLEAN,
  unlocks JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cert_counts AS (
    SELECT
      c.category_key,
      COUNT(*)::BIGINT as cnt
    FROM certifications c
    WHERE c.member_id = p_member_id
      AND c.final_exp > 0
    GROUP BY c.category_key
  ),
  member_unlocks AS (
    SELECT
      u.category_key,
      MAX(u.stage_number) as max_unlocked,
      json_agg(json_build_object(
        'stage_number', u.stage_number,
        'unlocked_at', u.unlocked_at,
        'animation_seen', u.animation_seen
      ) ORDER BY u.stage_number) as unlock_list
    FROM category_stage_unlocks u
    WHERE u.member_id = p_member_id
    GROUP BY u.category_key
  ),
  all_categories AS (
    SELECT DISTINCT d.category_key
    FROM category_stage_definitions d
    WHERE d.is_active = true
  )
  SELECT
    ac.category_key,
    COALESCE(cc.cnt, 0)::BIGINT as verified_count,
    COALESCE(mu.max_unlocked, 0)::INTEGER as current_stage,
    (COALESCE(mu.max_unlocked, 0) + 1)::INTEGER as next_stage,
    (
      SELECT d.required_count
      FROM category_stage_definitions d
      WHERE d.category_key = ac.category_key
        AND d.stage_number = COALESCE(mu.max_unlocked, 0) + 1
        AND d.is_active = true
    )::INTEGER as next_required,
    (
      COALESCE(cc.cnt, 0) >= COALESCE(
        (
          SELECT d.required_count
          FROM category_stage_definitions d
          WHERE d.category_key = ac.category_key
            AND d.stage_number = COALESCE(mu.max_unlocked, 0) + 1
            AND d.is_active = true
        ), 999999
      )
    )::BOOLEAN as can_unlock,
    COALESCE(mu.unlock_list, '[]'::json) as unlocks
  FROM all_categories ac
  LEFT JOIN cert_counts cc ON cc.category_key = ac.category_key
  LEFT JOIN member_unlocks mu ON mu.category_key = ac.category_key;
END;
$$;

-- 9. 공개 뷰: 스테이지 해금 요약 (민감 정보 없음)
CREATE OR REPLACE VIEW public_stage_progress AS
SELECT
  m.id as member_id,
  m.display_name,
  csu.category_key,
  csu.stage_number,
  csd.stage_name,
  csu.unlocked_at
FROM category_stage_unlocks csu
JOIN members m ON m.id = csu.member_id AND m.is_active = true
JOIN category_stage_definitions csd ON csd.category_key = csu.category_key
  AND csd.stage_number = csu.stage_number;

-- 10. updated_at 트리거
CREATE OR REPLACE FUNCTION update_stage_definitions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stage_definitions_updated_at ON category_stage_definitions;
CREATE TRIGGER stage_definitions_updated_at
  BEFORE UPDATE ON category_stage_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_definitions_timestamp();
