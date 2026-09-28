import { useState } from 'react';

interface ExportButtonsProps {
  yearMonth: string;
  onExportPng?: () => Promise<void>;
}

export function ExportButtons({ yearMonth }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'png' | 'txt' | null>(null);

  async function handleExportPng() {
    setExporting('png');
    try {
      // Dynamic import html2canvas
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const element = document.querySelector('main');
      if (!element) {
        alert('내보낼 영역을 찾을 수 없습니다.');
        return;
      }

      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `루루플_${yearMonth}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG 내보내기 실패:', error);
      alert('PNG 내보내기를 사용하려면 npm install html2canvas를 실행해주세요.');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportTxt() {
    setExporting('txt');
    try {
      const { supabase } = await import('@/lib/supabase');

      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${new Date(year, month, 0).getDate()}`;

      // Fetch all data
      const { data: certs, error } = await supabase
        .from('certifications')
        .select('cert_date, cert_time, category_key, final_exp, members!inner(display_name)')
        .gte('cert_date', startDate)
        .lte('cert_date', endDate)
        .order('cert_date', { ascending: false })
        .order('cert_time', { ascending: false });

      if (error) throw error;

      // Generate text content
      let content = `루루플 인증 기록 - ${year}년 ${month}월\n`;
      content += '='.repeat(50) + '\n\n';

      // Summary
      const memberExp: Record<string, number> = {};
      const categoryCount: Record<string, number> = {};

      certs?.forEach((cert: any) => {
        const name = cert.members.display_name;
        memberExp[name] = (memberExp[name] || 0) + (cert.final_exp || 0);
        categoryCount[cert.category_key] = (categoryCount[cert.category_key] || 0) + 1;
      });

      content += '[ 월간 순위 ]\n';
      Object.entries(memberExp)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, exp], idx) => {
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          content += `${medal} ${name}: ${exp} EXP\n`;
        });

      content += '\n[ 카테고리별 현황 ]\n';
      Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          content += `${cat}: ${count}회\n`;
        });

      content += '\n[ 상세 기록 ]\n';
      certs?.forEach((cert: any) => {
        content += `${cert.cert_date} ${cert.cert_time?.slice(0, 5)} | ${cert.members.display_name} | ${cert.category_key} | +${cert.final_exp} EXP\n`;
      });

      // Download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `루루플_${yearMonth}.txt`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('TXT 내보내기 실패:', error);
      alert('TXT 내보내기에 실패했습니다.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportPng}
        disabled={exporting !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-bg border border-border rounded-lg hover:bg-bg-card transition-colors disabled:opacity-50"
      >
        {exporting === 'png' ? (
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>🖼️</span>
        )}
        <span>PNG</span>
      </button>
      <button
        onClick={handleExportTxt}
        disabled={exporting !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-bg border border-border rounded-lg hover:bg-bg-card transition-colors disabled:opacity-50"
      >
        {exporting === 'txt' ? (
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>📄</span>
        )}
        <span>TXT</span>
      </button>
    </div>
  );
}
