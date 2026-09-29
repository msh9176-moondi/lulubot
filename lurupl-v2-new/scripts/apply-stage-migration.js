/**
 * Apply Stage Migration Script
 * 스테이지 시스템 마이그레이션 적용
 *
 * 사용법: node scripts/apply-stage-migration.js
 *
 * 주의: 이 스크립트는 service_role 키가 필요합니다.
 * .env에 SUPABASE_SERVICE_ROLE_KEY를 설정하거나
 * Supabase Dashboard에서 SQL Editor를 사용하세요.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  console.log('');
  console.log('수동 적용 방법:');
  console.log('1. Supabase Dashboard > SQL Editor로 이동');
  console.log('2. supabase/migrations/006_category_stages.sql 내용을 복사하여 실행');
  console.log('3. supabase/seed/stage_definitions.sql 내용을 복사하여 실행');
  console.log('');
  console.log('또는 .env 파일에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('스테이지 마이그레이션 시작...');

  try {
    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_category_stages.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('마이그레이션 SQL 실행 중...');

    // SQL을 세미콜론으로 분리하여 실행
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error && !error.message.includes('already exists')) {
          console.warn('Statement warning:', error.message.slice(0, 100));
        }
      }
    }

    console.log('마이그레이션 완료!');

    // Seed 파일 실행
    const seedPath = path.join(__dirname, '..', 'supabase', 'seed', 'stage_definitions.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    console.log('Seed 데이터 삽입 중...');

    const seedStatements = seedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of seedStatements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error && !error.message.includes('duplicate')) {
          console.warn('Seed warning:', error.message.slice(0, 100));
        }
      }
    }

    console.log('Seed 완료!');
    console.log('');
    console.log('스테이지 시스템이 성공적으로 설정되었습니다.');

  } catch (error) {
    console.error('마이그레이션 오류:', error);
    process.exit(1);
  }
}

runMigration();
