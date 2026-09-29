/**
 * Legacy Data Migration Script
 *
 * This script migrates data from the legacy Google Apps Script system
 * to the new Supabase-based V2 system.
 *
 * Usage:
 *   1. Export data from legacy system as JSON
 *   2. Place JSON file as scripts/legacy-data.json
 *   3. Run: npx tsx scripts/migrate-legacy.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables:');
  console.error('  VITE_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY (use service role key for migrations)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LegacyMember {
  nickname: string;
  accumulatedExp: number;
  wakeUpTime?: string;
  achievements?: string[];
}

interface LegacyCert {
  nickname: string;
  category: string;
  date: string;
  time: string;
  exp: number;
  tag?: string;
}

interface LegacyData {
  members: LegacyMember[];
  certifications: LegacyCert[];
  events?: any[];
}

async function main() {
  console.log('Starting migration...\n');

  // Load legacy data
  const dataPath = path.join(__dirname, 'legacy-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Error: legacy-data.json not found');
    console.error('Please export data from the legacy system and save as scripts/legacy-data.json');
    process.exit(1);
  }

  const legacyData: LegacyData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${legacyData.members?.length || 0} members`);
  console.log(`Loaded ${legacyData.certifications?.length || 0} certifications\n`);

  // Migrate members
  console.log('Migrating members...');
  const memberIdMap: Record<string, string> = {};

  for (const member of legacyData.members || []) {
    try {
      const { data, error } = await supabase
        .from('members')
        .upsert(
          {
            display_name: member.nickname,
            accumulated_exp: member.accumulatedExp || 0,
            wake_up_time: member.wakeUpTime || '07:00',
            is_active: true,
          },
          { onConflict: 'display_name' }
        )
        .select()
        .single();

      if (error) {
        console.error(`  Failed to migrate member ${member.nickname}:`, error.message);
      } else if (data) {
        memberIdMap[member.nickname] = data.id;
        console.log(`  Migrated: ${member.nickname}`);

        // Add alias
        await supabase.from('member_aliases').upsert(
          {
            member_id: data.id,
            kakao_nickname: member.nickname,
            is_primary: true,
          },
          { onConflict: 'kakao_nickname' }
        );
      }
    } catch (err) {
      console.error(`  Error migrating ${member.nickname}:`, err);
    }
  }

  console.log(`\nMigrated ${Object.keys(memberIdMap).length} members`);

  // Migrate certifications
  console.log('\nMigrating certifications...');
  let certCount = 0;
  let certErrors = 0;

  // Batch insert for performance
  const batchSize = 100;
  const certs = legacyData.certifications || [];

  for (let i = 0; i < certs.length; i += batchSize) {
    const batch = certs.slice(i, i + batchSize);
    const insertData = batch
      .filter((cert) => memberIdMap[cert.nickname])
      .map((cert) => ({
        member_id: memberIdMap[cert.nickname],
        category_key: cert.category,
        cert_date: cert.date,
        cert_time: cert.time,
        tag_used: cert.tag || null,
        base_exp: cert.exp,
        multiplier: 1.0,
        final_exp: cert.exp,
        is_over_limit: false,
        daily_cert_num: 1,
      }));

    if (insertData.length > 0) {
      const { error } = await supabase
        .from('certifications')
        .upsert(insertData, {
          onConflict: 'member_id,cert_date,cert_time,category_key',
          ignoreDuplicates: true,
        });

      if (error) {
        console.error(`  Batch error:`, error.message);
        certErrors += batch.length;
      } else {
        certCount += insertData.length;
      }
    }

    // Progress update
    if ((i + batchSize) % 500 === 0 || i + batchSize >= certs.length) {
      console.log(`  Progress: ${Math.min(i + batchSize, certs.length)}/${certs.length}`);
    }
  }

  console.log(`\nMigrated ${certCount} certifications (${certErrors} errors)`);

  // Migrate achievements
  console.log('\nMigrating achievements...');
  let achCount = 0;

  for (const member of legacyData.members || []) {
    if (!member.achievements?.length || !memberIdMap[member.nickname]) continue;

    for (const achKey of member.achievements) {
      try {
        const { error } = await supabase.from('member_achievements').upsert(
          {
            member_id: memberIdMap[member.nickname],
            achievement_key: achKey,
            achieved_at: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'member_id,achievement_key' }
        );

        if (!error) achCount++;
      } catch (err) {
        // Ignore duplicate errors
      }
    }
  }

  console.log(`Migrated ${achCount} achievements`);

  // Update accumulated exp for all members
  console.log('\nRecalculating accumulated EXP...');
  for (const memberId of Object.values(memberIdMap)) {
    await supabase.rpc('update_member_accumulated_exp', { p_member_id: memberId });
  }

  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
