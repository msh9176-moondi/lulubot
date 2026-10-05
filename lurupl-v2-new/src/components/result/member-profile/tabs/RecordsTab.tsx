/**
 * RecordsTab Component
 * 기록 탭 - 최근 인증 기록
 */

import { Badge } from '@/components/common';
import { DEFAULT_CATEGORIES, type CategoryKey } from '@/domain/categories';

interface Certification {
  id?: string;
  category_key: string;
  cert_date: string;
  cert_time: string;
  final_exp: number;
  message?: string;
}

interface RecordsTabProps {
  certifications: Certification[];
}

export function RecordsTab({ certifications }: RecordsTabProps) {
  if (certifications.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        인증 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {certifications.map((cert, idx) => {
        const cat = DEFAULT_CATEGORIES[cert.category_key as CategoryKey];
        return (
          <div
            key={cert.id || idx}
            className="flex items-center gap-3 p-3 bg-bg rounded-lg"
          >
            <span className="text-xl">{cat?.emoji || '📌'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">
                {cert.message || cat?.name}
              </p>
              <p className="text-xs text-text-muted">
                {cert.cert_date} {cert.cert_time?.slice(0, 5)}
              </p>
            </div>
            <Badge variant={cert.final_exp > 0 ? 'primary' : 'default'}>
              {cert.final_exp > 0 ? `+${cert.final_exp}` : '0'} EXP
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export default RecordsTab;
