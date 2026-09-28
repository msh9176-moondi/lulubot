import type { CategoryKey, Category } from './categories';
import { DEFAULT_CATEGORIES } from './categories';

export interface ParsedMessage {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  nickname: string;
  message: string;
  category: CategoryKey | null;
  tag: string | null;
}

export interface ParsedCertification {
  certDate: string;
  certTime: string;
  nickname: string;
  message: string;
  category: CategoryKey;
  tag: string;
  baseExp: number;
  multiplier: number;
  finalExp: number;
  comebackBonusExp: number;
  isValidMorning: boolean | null;
  isValidComeback: boolean | null;
  isOverLimit: boolean;
  dailyCertNum: number;
  targetWakeTime: string | null;
}

export interface ParseResult {
  certifications: ParsedCertification[];
  members: Set<string>;
  leftMembers: Set<string>;
  errors: string[];
  warnings: string[];
}

/**
 * 카카오톡 채팅 파일 파싱
 */
export function parseChatFile(
  content: string,
  memberWakeTimes: Record<string, string> = {},
  events: Array<{ startDate: string; endDate: string; multiplier: number; categories: string[] | null }> = [],
  categories: Record<CategoryKey, Category> = DEFAULT_CATEGORIES
): ParseResult {
  const lines = content.split('\n');
  const certifications: ParsedCertification[] = [];
  const members = new Set<string>();
  const leftMembers = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];

  // 날짜 패턴
  const datePattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
  // 메시지 패턴
  const messagePattern = /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.+)/;
  // 나간 사람 / 내보낸 사람 / 들어온 사람 패턴
  const leftPattern = /(.+)님이 나갔습니다/;
  const kickedPattern = /(.+)님을 내보냈습니다/;
  const joinedPattern = /(.+)님이 들어왔습니다/;

  let currentDate = '';

  // 일일 인증 횟수 추적
  const dailyCertCounts: Record<string, number> = {};

  // 마지막 인증 시간 추적 (복귀 계산용)
  const lastCertTime: Record<string, { date: string; time: string }> = {};

  // 복귀 날짜 추적
  const comebackDates: Record<string, boolean> = {};

  // 1단계: 나간 사람 / 들어온 사람 추적
  lines.forEach((line) => {
    const leftMatch = line.match(leftPattern);
    if (leftMatch) {
      leftMembers.add(leftMatch[1].trim());
      return;
    }

    const kickedMatch = line.match(kickedPattern);
    if (kickedMatch) {
      leftMembers.add(kickedMatch[1].trim());
      return;
    }

    const joinedMatch = line.match(joinedPattern);
    if (joinedMatch) {
      const joinedName = joinedMatch[1].trim();
      if (leftMembers.has(joinedName)) {
        leftMembers.delete(joinedName);
      }
      return;
    }

    // 메시지에서 멤버 추출
    const messageMatch = line.match(messagePattern);
    if (messageMatch) {
      members.add(messageMatch[1].trim());
    }
  });

  // 최종 나간 사람 제외
  leftMembers.forEach((name) => members.delete(name));

  // 2단계: 메시지 파싱 및 인증 추출
  lines.forEach((line) => {
    // 날짜 헤더 확인
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      currentDate = `${year}-${month}-${day}`;
      return;
    }

    // 메시지 파싱
    const messageMatch = line.match(messagePattern);
    if (!messageMatch) return;

    const [, nickname, ampm, hourStr, minute, message] = messageMatch;
    const trimmedNickname = nickname.trim();

    // 나간 사람 무시
    if (leftMembers.has(trimmedNickname)) return;

    // 카테고리 찾기
    const { category, tag } = findCategory(message, categories);
    if (!category) return;

    // 시간 변환 (12시간 → 24시간)
    let hour = parseInt(hourStr);
    if (ampm === '오후' && hour !== 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute}`;

    // 경험치 계산
    const categoryData = categories[category];
    const baseExp = categoryData.baseExp;
    const multiplier = getEventMultiplier(currentDate, category, events);
    let finalExp = baseExp * multiplier;
    let isValidMorning: boolean | null = null;
    let isOverLimit = false;
    let isValidComeback: boolean | null = null;
    let comebackBonusExp = 0;

    // 기상 인증 시간 검증
    // 기상 인증은 항상 기본 경험치 제공, 목표 시간 내 인증 시 보너스 +1
    if (category === 'morning') {
      const targetTime = memberWakeTimes[trimmedNickname];
      if (targetTime) {
        isValidMorning = isWithinTolerance(timeStr, targetTime, 30);
        if (isValidMorning) {
          // 목표 시간 내 인증: 보너스 +1
          finalExp += 1;
        }
        // 시간 외 인증도 기본 경험치는 유지
      } else {
        // 목표 시간 미설정 시 기본 exp 적용
        isValidMorning = null;
      }
    }

    // 일일 제한 검증
    const dailyKey = `${trimmedNickname}|${currentDate}|${category}`;
    if (!dailyCertCounts[dailyKey]) {
      dailyCertCounts[dailyKey] = 0;
    }
    dailyCertCounts[dailyKey]++;

    const dailyLimit = categoryData.dailyLimit;
    if (dailyCertCounts[dailyKey] > dailyLimit) {
      isOverLimit = true;
      finalExp = 0;
    }

    // 복귀 검증
    if (category === 'comeback') {
      const cooldownHours = categoryData.cooldownHours || 72;

      if (lastCertTime[trimmedNickname]) {
        const lastDate = lastCertTime[trimmedNickname].date;
        const lastTime = lastCertTime[trimmedNickname].time;
        const lastDateTime = new Date(`${lastDate}T${lastTime}:00`);
        const currentDateTime = new Date(`${currentDate}T${timeStr}:00`);
        const hoursDiff = (currentDateTime.getTime() - lastDateTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < cooldownHours) {
          isValidComeback = false;
          isOverLimit = true;
          finalExp = 0;
        } else {
          isValidComeback = true;
          comebackDates[`${trimmedNickname}|${currentDate}`] = true;
        }
      } else {
        // 첫 인증인 경우 복귀 불가
        isValidComeback = false;
        isOverLimit = true;
        finalExp = 0;
      }
    } else {
      // 복귀 후 당일 추가 인증 보너스
      const comebackKey = `${trimmedNickname}|${currentDate}`;
      if (comebackDates[comebackKey]) {
        const bonusKey = `${trimmedNickname}|${currentDate}|comebackBonus`;
        if (!dailyCertCounts[bonusKey]) {
          dailyCertCounts[bonusKey] = 1;
          comebackBonusExp = 2;
          finalExp += comebackBonusExp;
        }
      }

      // 마지막 인증 시간 업데이트
      lastCertTime[trimmedNickname] = { date: currentDate, time: timeStr };
    }

    certifications.push({
      certDate: currentDate,
      certTime: timeStr,
      nickname: trimmedNickname,
      message: message.trim(),
      category,
      tag: tag as string, // category가 있으면 tag도 항상 존재
      baseExp,
      multiplier,
      finalExp,
      comebackBonusExp,
      isValidMorning,
      isValidComeback,
      isOverLimit,
      dailyCertNum: dailyCertCounts[dailyKey],
      targetWakeTime: category === 'morning' ? memberWakeTimes[trimmedNickname] || null : null,
    });
  });

  // 최신순 정렬
  certifications.sort((a, b) => {
    if (a.certDate !== b.certDate) return b.certDate.localeCompare(a.certDate);
    return b.certTime.localeCompare(a.certTime);
  });

  // 경고 메시지 생성
  if (leftMembers.size > 0) {
    warnings.push(`나간 멤버 ${leftMembers.size}명이 제외되었습니다`);
  }

  const overLimitCerts = certifications.filter(c => c.isOverLimit);
  if (overLimitCerts.length > 0) {
    warnings.push(`일일 한도 초과 인증 ${overLimitCerts.length}건`);
  }

  const validMorning = certifications.filter(c => c.isValidMorning === true);
  if (validMorning.length > 0) {
    warnings.push(`기상 보너스 적용 ${validMorning.length}건 (+1 EXP)`);
  }

  return { certifications, members, leftMembers, errors, warnings };
}

/**
 * 메시지에서 카테고리와 태그 찾기
 */
function findCategory(
  message: string,
  categories: Record<CategoryKey, Category>
): { category: CategoryKey | null; tag: string | null } {
  const lowerMessage = message.toLowerCase();

  for (const [key, data] of Object.entries(categories) as [CategoryKey, Category][]) {
    for (const tagName of data.tags) {
      if (lowerMessage.includes(tagName.toLowerCase())) {
        return { category: key, tag: tagName };
      }
    }
  }

  return { category: null, tag: null };
}

/**
 * 이벤트 배수 계산
 */
function getEventMultiplier(
  dateStr: string,
  category: CategoryKey,
  events: Array<{ startDate: string; endDate: string; multiplier: number; categories: string[] | null }>
): number {
  let multiplier = 1;

  for (const event of events) {
    if (dateStr >= event.startDate && dateStr <= event.endDate) {
      if (event.categories === null || event.categories.includes(category)) {
        multiplier = Math.max(multiplier, event.multiplier);
      }
    }
  }

  return multiplier;
}

/**
 * 시간이 목표 시간 ±허용범위 내인지 확인
 */
function isWithinTolerance(
  actualTime: string,
  targetTime: string,
  toleranceMinutes: number
): boolean {
  const [actualHour, actualMin] = actualTime.split(':').map(Number);
  const [targetHour, targetMin] = targetTime.split(':').map(Number);

  const actualTotalMin = actualHour * 60 + actualMin;
  const targetTotalMin = targetHour * 60 + targetMin;

  const diff = Math.abs(actualTotalMin - targetTotalMin);
  return diff <= toleranceMinutes;
}

/**
 * 채팅 내용에서 멤버 목록만 빠르게 추출
 */
export function extractMembersQuick(content: string): string[] {
  const members = new Set<string>();
  const leftMembers = new Set<string>();
  const lines = content.split('\n');

  const messagePattern = /\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]/;
  const leftPattern = /(.+)님이 나갔습니다/;
  const kickedPattern = /(.+)님을 내보냈습니다/;
  const joinedPattern = /(.+)님이 들어왔습니다/;

  lines.forEach((line) => {
    const leftMatch = line.match(leftPattern);
    if (leftMatch) {
      leftMembers.add(leftMatch[1].trim());
      return;
    }

    const kickedMatch = line.match(kickedPattern);
    if (kickedMatch) {
      leftMembers.add(kickedMatch[1].trim());
      return;
    }

    const joinedMatch = line.match(joinedPattern);
    if (joinedMatch) {
      const joinedName = joinedMatch[1].trim();
      leftMembers.delete(joinedName);
      return;
    }

    const match = line.match(messagePattern);
    if (match) {
      members.add(match[1].trim());
    }
  });

  // 나간 사람 제외
  leftMembers.forEach((name) => members.delete(name));

  return Array.from(members).sort();
}
