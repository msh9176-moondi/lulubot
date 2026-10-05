/**
 * Certification Types
 */

import type { CategoryKey } from '@/domain/categories';

export interface Certification {
  id: string;
  member_id: string;
  cert_date: string;
  cert_time: string;
  category_key: CategoryKey;
  final_exp: number;
  is_over_limit: boolean;
  original_text: string;
  import_batch_id: string | null;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  created_at: string;
  cert_count: number;
  total_exp: number;
  status: string;
  file_name: string;
  confirmed_at: string | null;
}

export type TabType = 'list' | 'batches' | 'stats';

export const PAGE_SIZE = 20;
