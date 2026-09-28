/**
 * Date를 YYYY-MM-DD 형식으로 변환 (Asia/Seoul 기준)
 */
export function toLocalDateStr(date: Date): string {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 현재 월 정보 가져오기 (Asia/Seoul 기준)
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 현재 월의 정보 가져오기
 */
export function getCurrentMonthInfo(): {
  year: number;
  month: number;
  today: number;
  firstDayStr: string;
} {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const month = kstDate.getMonth();
  const today = kstDate.getDate();
  const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return { year, month, today, firstDayStr };
}

/**
 * 날짜가 이번 달인지 확인
 */
export function isCurrentMonth(dateStr: string): boolean {
  if (!dateStr) return false;
  const currentMonth = getCurrentMonth();
  return dateStr.startsWith(currentMonth);
}

/**
 * 주차 계산 (해당 월의 몇 주차인지)
 */
export function getWeekOfMonth(dateStr: string): number {
  const date = new Date(dateStr);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;

  const firstMonday = new Date(firstDay);
  firstMonday.setDate(1 + daysUntilMonday);

  if (date < firstMonday) return 1;

  const diffTime = date.getTime() - firstMonday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 2;
}

/**
 * 연-주차 계산 (YYYYWW 형태)
 */
export function getYearWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return d.getFullYear() * 100 + weekNum;
}

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일)
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

/**
 * 시간 포맷팅 (오전/오후 HH:MM)
 */
export function formatTime(timeStr: string): string {
  const [hourStr, minute] = timeStr.split(':');
  let hour = parseInt(hourStr);
  const ampm = hour >= 12 ? '오후' : '오전';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${ampm} ${hour}:${minute}`;
}

/**
 * 두 날짜 사이의 일 수 차이
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * N일 전 날짜 구하기
 */
export function daysAgo(days: number): string {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  kstDate.setDate(kstDate.getDate() - days);
  return toLocalDateStr(kstDate);
}
