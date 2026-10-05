/**
 * BatchList Component
 * 배치 관리 탭
 */

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Spinner } from '@/components/common';
import { supabase } from '@/lib/supabase';
import type { ImportBatch } from './types';

export function BatchList() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBatches = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to load batches:', error);
      } else {
        setBatches(data || []);
      }

      setLoading(false);
    };

    loadBatches();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-text-muted">
        <FileText className="w-5 h-5" />
        <h3 className="font-medium">가져오기 배치 기록</h3>
      </div>

      <div className="space-y-2">
        {batches.map(batch => (
          <div
            key={batch.id}
            className="p-4 bg-bg rounded-lg border border-border flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-text">
                {new Date(batch.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-text-muted flex items-center gap-2">
                <span>{batch.file_name}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  batch.status === 'confirmed'
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-yellow-500/20 text-yellow-600'
                }`}>
                  {batch.status === 'confirmed' ? '완료' : '대기중'}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{batch.cert_count}건</p>
              <p className="text-xs text-text-muted">+{batch.total_exp} EXP</p>
            </div>
          </div>
        ))}
        {batches.length === 0 && (
          <p className="text-center text-text-muted py-8">
            가져오기 기록이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

export default BatchList;
