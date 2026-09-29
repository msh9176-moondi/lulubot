-- =====================================================
-- 루루플 인증 레벨 시스템 V2 - Initial Schema
-- =====================================================

-- 1. 관리자 테이블
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 카테고리 테이블 (DB에서 관리 가능)
CREATE TABLE IF NOT EXISTS categories (
  key VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  base_exp INTEGER NOT NULL DEFAULT 1,
  daily_limit INTEGER NOT NULL DEFAULT 1,
  cooldown_hours INTEGER DEFAULT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 카테고리 태그 테이블
CREATE TABLE IF NOT EXISTS category_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key VARCHAR(20) NOT NULL REFERENCES categories(key) ON DELETE CASCADE,
  tag VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_key, tag)
);

CREATE INDEX idx_category_tags_tag ON category_tags(tag);
CREATE INDEX idx_category_tags_category ON category_tags(category_key);

-- 4. 멤버 테이블
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  wake_up_time TIME DEFAULT '07:00',
  accumulated_exp INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  joined_at DATE,
  left_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_display_name ON members(display_name);
CREATE INDEX idx_members_is_active ON members(is_active);

-- 5. 멤버 별칭 테이블 (카카오톡 닉네임 매핑)
CREATE TABLE IF NOT EXISTS member_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  kakao_nickname VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kakao_nickname)
);

CREATE INDEX idx_member_aliases_nickname ON member_aliases(kakao_nickname);
CREATE INDEX idx_member_aliases_member ON member_aliases(member_id);

-- 6. 경험치 이벤트 테이블
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  emoji VARCHAR(10) DEFAULT '🎉',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  categories TEXT[], -- NULL이면 전체 카테고리 적용
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_events_dates ON xp_events(start_date, end_date);
CREATE INDEX idx_xp_events_enabled ON xp_events(is_enabled);

-- 7. 업로드 배치 테이블
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admins(id),
  file_name VARCHAR(255),
  file_hash VARCHAR(64), -- SHA-256 해시
  file_size_bytes INTEGER,
  cert_count INTEGER DEFAULT 0,
  total_exp INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
  error_message TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_batches_hash ON import_batches(file_hash);
CREATE INDEX idx_import_batches_admin ON import_batches(admin_id);
CREATE INDEX idx_import_batches_status ON import_batches(status);

-- 8. 인증 기록 테이블
CREATE TABLE IF NOT EXISTS certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  category_key VARCHAR(20) NOT NULL REFERENCES categories(key),
  cert_date DATE NOT NULL,
  cert_time TIME NOT NULL,
  tag_used VARCHAR(50),
  raw_message TEXT, -- 원본 메시지 (비공개)
  base_exp INTEGER NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.00,
  final_exp INTEGER NOT NULL,
  comeback_bonus_exp INTEGER DEFAULT 0,
  is_valid_morning BOOLEAN,
  is_valid_comeback BOOLEAN,
  is_over_limit BOOLEAN DEFAULT false,
  target_wake_time TIME,
  daily_cert_num INTEGER DEFAULT 1,
  event_id UUID REFERENCES xp_events(id),
  batch_id UUID REFERENCES import_batches(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 방지 (같은 멤버, 같은 날짜, 같은 시간, 같은 카테고리)
  UNIQUE(member_id, cert_date, cert_time, category_key)
);

CREATE INDEX idx_certifications_member ON certifications(member_id);
CREATE INDEX idx_certifications_date ON certifications(cert_date);
CREATE INDEX idx_certifications_category ON certifications(category_key);
CREATE INDEX idx_certifications_member_date ON certifications(member_id, cert_date);
CREATE INDEX idx_certifications_batch ON certifications(batch_id);

-- 9. 도전 과제 정의 테이블
CREATE TABLE IF NOT EXISTS achievement_definitions (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  category VARCHAR(20) REFERENCES categories(key), -- NULL이면 통합 과제
  type VARCHAR(30) NOT NULL, -- first, weekly, streak, monthly, early, daily_variety, etc.
  target INTEGER NOT NULL DEFAULT 1,
  difficulty INTEGER DEFAULT 1, -- 1~4
  is_hidden BOOLEAN DEFAULT false,
  hint TEXT, -- 히든 과제 힌트
  is_sensitive BOOLEAN DEFAULT false, -- medicine 관련 등 민감 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 멤버 도전 과제 달성 테이블
CREATE TABLE IF NOT EXISTS member_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  achievement_key VARCHAR(50) NOT NULL REFERENCES achievement_definitions(key),
  achieved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, achievement_key)
);

CREATE INDEX idx_member_achievements_member ON member_achievements(member_id);
CREATE INDEX idx_member_achievements_key ON member_achievements(achievement_key);

-- 11. 월간 스냅샷 테이블
CREATE TABLE IF NOT EXISTS monthly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL, -- YYYY-MM
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  total_exp INTEGER DEFAULT 0,
  cert_count INTEGER DEFAULT 0,
  cert_days INTEGER DEFAULT 0,
  rank INTEGER,
  category_counts JSONB DEFAULT '{}',
  achievements_earned TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_month, member_id)
);

CREATE INDEX idx_monthly_snapshots_month ON monthly_snapshots(year_month);
CREATE INDEX idx_monthly_snapshots_member ON monthly_snapshots(member_id);

-- 12. 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(50) NOT NULL, -- create, update, delete, import, etc.
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
