import { useState, useCallback } from 'react';
import { parseChatFile, type ParseResult } from '@/domain/chat-parser';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/common';

interface ChatUploaderProps {
  onParseComplete: (result: ParseResult) => void;
}

export function ChatUploader({ onParseComplete }: ChatUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.txt')) {
      setFile(droppedFile);
    } else {
      setError('txt 파일만 업로드 가능합니다');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);

    try {
      const content = await file.text();

      // Fetch member wake times
      const { data: members } = await supabase
        .from('members')
        .select('display_name, wake_up_time');

      const wakeTimes: Record<string, string> = {};
      members?.forEach((m) => {
        if (m.wake_up_time) {
          wakeTimes[m.display_name] = m.wake_up_time;
        }
      });

      // Fetch active events
      const { data: events } = await supabase
        .from('xp_events')
        .select('*')
        .eq('is_enabled', true);

      const mappedEvents = (events || []).map((e) => ({
        name: e.name,
        startDate: e.start_date,
        endDate: e.end_date,
        multiplier: Number(e.multiplier),
        categories: e.categories || undefined,
      }));

      // Parse chat
      const result = parseChatFile(content, wakeTimes, mappedEvents);
      onParseComplete(result);
    } catch (err) {
      console.error('Parse error:', err);
      setError('파일 파싱 중 오류가 발생했습니다');
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        {file ? (
          <div>
            <p className="text-text font-medium mb-2">{file.name}</p>
            <p className="text-text-muted text-sm">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={() => setFile(null)}
              className="text-red-400 text-sm mt-2 hover:underline"
            >
              파일 제거
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="w-12 h-12 mx-auto text-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-text-muted mb-2">
              카카오톡 대화 내보내기 파일을 드래그하거나
            </p>
            <label className="text-primary cursor-pointer hover:underline">
              파일 선택
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {/* Parse Button */}
      {file && (
        <button
          onClick={handleParse}
          disabled={parsing}
          className="w-full bg-primary text-white rounded-lg py-3 font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {parsing ? (
            <>
              <Spinner size="sm" />
              분석 중...
            </>
          ) : (
            '분석 시작'
          )}
        </button>
      )}
    </div>
  );
}
