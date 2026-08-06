/**
 * 루루플 결과 페이지
 * Google Sheets에서 데이터를 가져와 표시
 */

// ========== 설정 ==========
// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
const API_URL =
  'https://script.google.com/macros/s/AKfycbzZhAgOpYY9hoaArj4hvXBl6_3GKqHhJxDl-joKzc57qNgLy3dEjl5_MZzjKGA_Uo755w/exec';

// ========== 상수 ==========
const CERT_CATEGORIES = {
  cleaning: { name: '청소', emoji: '🧹', exp: 2, dailyLimit: 3 }, // 1→2: 생활 안정 행동 가치 상향
  exercise: { name: '운동', emoji: '🏃', exp: 3, dailyLimit: 2 }, // 4→3, 3→2회: 고EXP 쏠림 완화
  morning: { name: '기상', emoji: '⏰', exp: 2, dailyLimit: 1 },
  planning: { name: '계획', emoji: '📋', exp: 3, dailyLimit: 1 },
  study: { name: '공부', emoji: '📚', exp: 3, dailyLimit: 3 }, // 4→3: 부담 감소
  medicine: { name: '약', emoji: '💊', exp: 1, dailyLimit: 1 },
  diary: { name: '일기', emoji: '📝', exp: 2, dailyLimit: 1 }, // 1→2: 감정 조절 중요성
  meditation: { name: '명상', emoji: '🧘', exp: 2, dailyLimit: 2 }, // 아침/저녁 명상 패턴 지원
  comeback: { name: '복귀', emoji: '🔄', exp: 3, dailyLimit: 999, cooldownHours: 72 }, // 10→3+2 보너스
};

const EXP_PER_LEVEL = 5;

// ========== 도전 과제 시스템 ==========
const ACHIEVEMENTS = {
  // 🧹 청소
  cleaning_first: { name: '첫 걸음', emoji: '🧹', category: 'cleaning', type: 'first', target: 1, difficulty: 1 },
  cleaning_weekly: { name: '깔끔러', emoji: '🧹', category: 'cleaning', type: 'weekly', target: 3, difficulty: 2 },
  cleaning_streak: { name: '청소 습관', emoji: '🧹✨', category: 'cleaning', type: 'streak', target: 14, difficulty: 3 },
  cleaning_master: { name: '정리왕', emoji: '🧹👑', category: 'cleaning', type: 'monthly', target: 20, difficulty: 4 },

  // 🏃 운동
  exercise_first: { name: '몸풀기', emoji: '🏃', category: 'exercise', type: 'first', target: 1, difficulty: 1 },
  exercise_weekly: { name: '러너', emoji: '🏃', category: 'exercise', type: 'weekly', target: 4, difficulty: 2 },
  exercise_streak: { name: '운동 루틴', emoji: '🏃✨', category: 'exercise', type: 'streak', target: 10, difficulty: 3 },
  exercise_master: { name: '철인', emoji: '🏃👑', category: 'exercise', type: 'monthly', target: 25, difficulty: 4 },

  // ⏰ 기상
  morning_first: { name: '눈뜸', emoji: '⏰', category: 'morning', type: 'first', target: 1, difficulty: 1 },
  morning_weekly: { name: '얼리버드', emoji: '⏰', category: 'morning', type: 'streak', target: 5, difficulty: 2 },
  morning_streak: { name: '아침형 인간', emoji: '⏰✨', category: 'morning', type: 'streak', target: 14, difficulty: 3 },
  morning_early: { name: '새벽빛', emoji: '🌅', category: 'morning', type: 'early', target: 10, difficulty: 4 },

  // 📚 공부
  study_first: { name: '학습 시작', emoji: '📚', category: 'study', type: 'first', target: 1, difficulty: 1 },
  study_weekly: { name: '꾸준러', emoji: '📚', category: 'study', type: 'weekly', target: 5, difficulty: 2 },
  study_streak: { name: '학습 습관', emoji: '📚✨', category: 'study', type: 'streak', target: 10, difficulty: 3 },
  study_master: { name: '공부벌레', emoji: '📚👑', category: 'study', type: 'monthly', target: 30, difficulty: 4 },

  // 💊 약
  medicine_first: { name: '첫 복약', emoji: '💊', category: 'medicine', type: 'first', target: 1, difficulty: 1 },
  medicine_streak: { name: '복약 습관', emoji: '💊✨', category: 'medicine', type: 'streak', target: 7, difficulty: 2 },

  // 📋 계획
  planning_first: { name: '첫 계획', emoji: '📋', category: 'planning', type: 'first', target: 1, difficulty: 1 },
  planning_streak: { name: '계획러', emoji: '📋✨', category: 'planning', type: 'streak', target: 7, difficulty: 2 },

  // 📝 일기
  diary_first: { name: '첫 일기', emoji: '📝', category: 'diary', type: 'first', target: 1, difficulty: 1 },
  diary_streak: { name: '일기쓰기', emoji: '📝✨', category: 'diary', type: 'streak', target: 7, difficulty: 2 },

  // 🧘 명상
  meditation_first: { name: '첫 명상', emoji: '🧘', category: 'meditation', type: 'first', target: 1, difficulty: 1 },
  meditation_streak: { name: '마음챙김', emoji: '🧘✨', category: 'meditation', type: 'streak', target: 7, difficulty: 2 },

  // 🌈 통합 도전
  balance_daily: { name: '균형잡기', emoji: '🌈', category: null, type: 'daily_variety', target: 3, difficulty: 2 },
  allrounder: { name: '올라운더', emoji: '🌈✨', category: null, type: 'weekly_variety', target: 6, difficulty: 3 },
  life_master: { name: '생활왕', emoji: '🌈👑', category: null, type: 'monthly_all', target: 9, difficulty: 4 },
};

// ========== 도전 과제 알림 배지 ==========
const ACHIEVEMENT_SEEN_KEY = 'lurupl_achievements_seen';

// 확인한 도전 과제 목록 가져오기
function getSeenAchievements(nickname) {
  try {
    const data = localStorage.getItem(ACHIEVEMENT_SEEN_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return parsed[nickname] || [];
  } catch (e) {
    return [];
  }
}

// 도전 과제 확인 처리
function markAchievementsSeen(nickname, achievements) {
  try {
    const data = localStorage.getItem(ACHIEVEMENT_SEEN_KEY);
    const parsed = data ? JSON.parse(data) : {};
    parsed[nickname] = achievements || [];
    localStorage.setItem(ACHIEVEMENT_SEEN_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error('도전 과제 저장 오류:', e);
  }
}

// 새 도전 과제 개수 계산
function getNewAchievementsCount(nickname, currentAchievements) {
  const seen = getSeenAchievements(nickname);
  if (!Array.isArray(seen)) return currentAchievements.length;
  const newOnes = currentAchievements.filter(ach => !seen.includes(ach));
  return newOnes.length;
}

// 새 도전 과제 목록 가져오기
function getNewAchievements(nickname, currentAchievements) {
  const seen = getSeenAchievements(nickname);
  if (!Array.isArray(seen)) return currentAchievements;
  return currentAchievements.filter(ach => !seen.includes(ach));
}

// 리더보드 배지 업데이트
function updateLeaderboardBadge(nickname) {
  const btn = document.querySelector(`.profile-btn[data-nickname="${nickname}"]`);
  if (btn) {
    const badge = btn.querySelector('.new-badge');
    if (badge) badge.remove();
  }
}

// ========== 카테고리별 칭호 ==========
const CATEGORY_TITLES = {
  cleaning: { title: '가정의 수호자', emoji: '🏠', minCount: 30 },
  exercise: { title: '운동선수', emoji: '💪', minCount: 30 },
  morning: { title: '얼리버드', emoji: '🌅', minCount: 20 },
  planning: { title: '전략가', emoji: '🎯', minCount: 20 },
  study: { title: '학자', emoji: '🎓', minCount: 30 },
  medicine: { title: '건강지킴이', emoji: '❤️', minCount: 20 },
  diary: { title: '기록왕', emoji: '✍️', minCount: 20 },
  meditation: { title: '마음챙김 마스터', emoji: '🧘', minCount: 20 },
  comeback: { title: '불사조', emoji: '🔥', minCount: 10 },
};

// 카테고리 칭호 계산
function getCategoryTitle(categoryCount) {
  if (!categoryCount) return null;

  // 가장 많이 인증한 카테고리 찾기
  let topCategory = null;
  let maxCount = 0;

  Object.entries(categoryCount).forEach(([category, count]) => {
    if (count > maxCount && CATEGORY_TITLES[category]) {
      maxCount = count;
      topCategory = category;
    }
  });

  // 최소 횟수 충족 확인
  if (topCategory && maxCount >= CATEGORY_TITLES[topCategory].minCount) {
    return {
      category: topCategory,
      ...CATEGORY_TITLES[topCategory],
      count: maxCount
    };
  }

  return null;
}

// ========== 이벤트 히스토리 ==========
const EVENT_HISTORY_STORAGE_KEY = 'lurupl_event_history';

// 서버에서 가져온 이벤트 캐시
let cachedEvents = null;

// 로컬 시간대 기준 날짜 문자열 (YYYY-MM-DD)
function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 저장된 이벤트 히스토리 불러오기 (서버 우선, 로컬 백업)
function loadEventHistory() {
  // 캐시된 이벤트가 있으면 사용
  if (cachedEvents !== null) {
    return cachedEvents;
  }

  // API 응답에 이벤트가 포함되어 있으면 사용
  if (resultData && resultData.events) {
    cachedEvents = resultData.events;
    return cachedEvents;
  }

  // 로컬 스토리지 폴백
  try {
    const saved = localStorage.getItem(EVENT_HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('이벤트 히스토리 불러오기 실패:', e);
    return [];
  }
}

// 현재 진행 중인 이벤트 가져오기
function getActiveEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter(
    (e) => e.enabled && e.startDate <= today && e.endDate >= today,
  );
}

// 예정된 이벤트 가져오기
function getUpcomingEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter((e) => e.enabled && e.startDate > today);
}

// 모든 활성 이벤트 (진행중 + 예정)
function getAllActiveEvents() {
  const events = loadEventHistory();
  const today = toLocalDateStr(new Date());
  return events.filter((e) => e.enabled && e.endDate >= today);
}

const LEVEL_TITLES = [
  '새싹',
  '성장',
  '발전',
  '열정',
  '습관',
  '루틴',
  '마스터',
  '전문가',
  '영웅',
  '전설',
];

const ACCUMULATED_TITLES = [
  { minExp: 0, title: '뉴비', icon: '🌱' },
  { minExp: 30, title: '루키', icon: '🥉' },
  { minExp: 80, title: '브론즈', icon: '🥈' },
  { minExp: 150, title: '실버', icon: '🥇' },
  { minExp: 300, title: '골드', icon: '⭐' },
  { minExp: 500, title: '플래티넘', icon: '💎' },
  { minExp: 800, title: '다이아', icon: '👑' },
  { minExp: 1200, title: '마스터', icon: '🔥' },
  { minExp: 2000, title: '그랜드마스터', icon: '⚡' },
  { minExp: 3000, title: '레전드', icon: '🏆' },
];

// 저장된 데이터
let resultData = null;

// ========== 유틸리티 함수 ==========
function calculateLevel(totalExp) {
  if (totalExp <= 0) return 1;
  return Math.floor(totalExp / EXP_PER_LEVEL) + 1;
}

function getLevelColor(level) {
  const hue = (level * 25) % 360;
  const saturation = 70 + (level % 10) * 2;
  const lightness = 55 + (level % 5) * 2;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getLevelTitle(level) {
  const baseTitle = LEVEL_TITLES[(level - 1) % 10];
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return baseTitle;
  const tierNames = [
    '',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
  ];
  if (tier < 10) return `${baseTitle} ${tierNames[tier]}`;
  return `${baseTitle} +${tier}`;
}

function getLevel(totalExp) {
  const level = calculateLevel(totalExp);
  return {
    level: level,
    name: getLevelTitle(level),
    minExp: (level - 1) * EXP_PER_LEVEL,
    color: getLevelColor(level),
  };
}

function getNextLevel(totalExp) {
  const currentLevel = calculateLevel(totalExp);
  const nextLevel = currentLevel + 1;
  return {
    level: nextLevel,
    minExp: (nextLevel - 1) * EXP_PER_LEVEL,
  };
}

function getAccumulatedTitle(totalExp) {
  let result = ACCUMULATED_TITLES[0];
  for (const title of ACCUMULATED_TITLES) {
    if (totalExp >= title.minExp) {
      result = title;
    } else {
      break;
    }
  }
  return result;
}

// ========== 데이터 로드 ==========
async function loadData() {
  const loadingSection = document.getElementById('loadingSection');
  const errorSection = document.getElementById('errorSection');
  const resultsSection = document.getElementById('resultsSection');

  loadingSection.style.display = 'block';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';

  try {
    // 캐시 방지를 위한 타임스탬프 추가
    const url = `${API_URL}?t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!response.ok)
      throw new Error(`데이터를 불러올 수 없습니다. (${response.status})`);

    resultData = await response.json();
    console.log('API 응답:', resultData);

    // 에러 응답 처리
    if (resultData.error) {
      throw new Error(resultData.error);
    }

    // 데이터가 없으면 빈 데이터로 초기화
    if (!resultData.members) {
      resultData = {
        members: {},
        categoryCount: {},
        hourlyCount: new Array(24).fill(0),
        monthlyCount: 0,
        monthlyExp: 0,
        weeklyData: [],
        monthlyRankings: [],
        lastUpdated: '데이터 없음'
      };
    }

    // 서버에서 가져온 이벤트 데이터 캐시
    if (resultData.events) {
      cachedEvents = resultData.events;
      console.log('서버에서 이벤트 로드 완료:', cachedEvents.length, '개');
    }

    loadingSection.style.display = 'none';
    resultsSection.style.display = 'block';

    displayResults();
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    loadingSection.style.display = 'none';
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = error.message;
  }
}

// ========== 주간 마감 계산 ==========
function getWeekDeadline() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);

  return sunday;
}

function getTimeRemaining() {
  const deadline = getWeekDeadline();
  const now = new Date();
  const diff = deadline - now;

  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes, expired: false };
}

function getAlertLevel(certCount, hoursRemaining) {
  const MIN_CERTS = 3;
  const remaining = MIN_CERTS - certCount;

  if (certCount >= MIN_CERTS) {
    return { level: 'safe', icon: '', text: '완료', color: '#22c55e' };
  }

  if (certCount === 0 && hoursRemaining < 24) {
    return { level: 'danger', icon: '', text: '강퇴 임박', color: '#ef4444' };
  }

  if (remaining >= 2 && hoursRemaining < 24) {
    return { level: 'danger', icon: '', text: '강퇴 임박', color: '#ef4444' };
  }

  if (remaining >= 1 && hoursRemaining < 48) {
    return {
      level: 'warning',
      icon: '',
      text: `${remaining}회 부족`,
      color: '#f59e0b',
    };
  }

  if (certCount === 2) {
    return { level: 'caution', icon: '', text: '1회 남음', color: '#eab308' };
  }

  if (certCount === 1) {
    return { level: 'warning', icon: '', text: '2회 부족', color: '#f59e0b' };
  }

  return { level: 'danger', icon: '', text: '3회 필요', color: '#ef4444' };
}

// ========== 주간 경고 표시 ==========
function displayWeeklyAlerts() {
  const alertSection = document.getElementById('weeklyAlertSection');
  const alertGrid = document.getElementById('alertGrid');
  const deadlineTimer = document.getElementById('deadlineTimer');

  if (!resultData || !resultData.members) {
    alertSection.style.display = 'none';
    return;
  }

  // 마감까지 남은 시간 표시
  const timeRemaining = getTimeRemaining();
  if (timeRemaining.expired) {
    deadlineTimer.innerHTML = `<span class="timer-expired">이번 주 마감됨</span>`;
  } else {
    const urgencyClass =
      timeRemaining.hours < 24
        ? 'timer-urgent'
        : timeRemaining.hours < 48
          ? 'timer-warning'
          : 'timer-normal';
    deadlineTimer.innerHTML = `
      <span class="${urgencyClass}">
        마감까지 ${timeRemaining.hours}시간 ${timeRemaining.minutes}분
      </span>
    `;
  }

  alertGrid.innerHTML = '';

  const memberAlerts = [];

  for (const [nickname, data] of Object.entries(resultData.members)) {
    const weeklyCertCount = data.weeklyCertCount || 0;
    const alert = getAlertLevel(weeklyCertCount, timeRemaining.hours);

    memberAlerts.push({
      name: nickname,
      certCount: weeklyCertCount,
      alert: alert,
    });
  }

  // 위험도 순으로 정렬 (위험 > 경고 > 주의 > 안전)
  const levelOrder = { danger: 0, warning: 1, caution: 2, safe: 3 };
  memberAlerts.sort((a, b) => {
    const levelDiff = levelOrder[a.alert.level] - levelOrder[b.alert.level];
    if (levelDiff !== 0) return levelDiff;
    return a.certCount - b.certCount;
  });

  memberAlerts.forEach(({ name, certCount, alert }) => {
    const card = document.createElement('div');
    card.className = `alert-card alert-${alert.level}`;

    const progressWidth = Math.min((certCount / 3) * 100, 100);

    card.innerHTML = `
      <div class="alert-icon">${alert.icon}</div>
      <div class="alert-content">
        <div class="alert-name clickable" data-nickname="${name}">${name}</div>
        <div class="alert-progress">
          <div class="alert-progress-bar">
            <div class="alert-progress-fill" style="width: ${progressWidth}%; background: ${alert.color}"></div>
          </div>
          <span class="alert-count">${certCount}/3회</span>
        </div>
      </div>
      <div class="alert-status" style="background: ${alert.color}20; color: ${alert.color}">
        ${alert.text}
      </div>
    `;

    // 닉네임 클릭 시 프로필 모달 열기
    const nameEl = card.querySelector('.alert-name');
    nameEl.addEventListener('click', () => {
      openProfileModal(name);
    });

    alertGrid.appendChild(card);
  });

  alertSection.style.display = 'block';
}

// ========== 결과 표시 ==========
function displayResults() {
  if (!resultData) return;

  // 마지막 업데이트 시간
  if (resultData.lastUpdated) {
    document.getElementById('lastUpdated').textContent =
      `마지막 업데이트: ${resultData.lastUpdated}`;
  }

  // 요약 정보
  const now = new Date();
  const monthName = `${now.getMonth() + 1}월`;
  document.getElementById('totalCount').textContent =
    `${monthName} ${resultData.monthlyCount || 0}회 (${resultData.monthlyExp || 0}EXP)`;

  // 1위 정보
  const members = Object.entries(resultData.members || {}).sort(
    (a, b) => (b[1].netExp || 0) - (a[1].netExp || 0),
  );

  if (members.length > 0) {
    const [topName, topData] = members[0];
    const topNetExp = topData.netExp || 0;
    const level = getLevel(topNetExp);
    const nextLevel = getNextLevel(topNetExp);

    document.getElementById('currentLevel').textContent = `Lv.${level.level}`;
    document.getElementById('currentLevel').style.color = level.color;
    document.getElementById('levelName').textContent = `${level.name} (1위)`;

    const progress =
      ((topNetExp - level.minExp) / (nextLevel.minExp - level.minExp)) * 100;
    document.getElementById('progressFill').style.width =
      `${Math.max(0, progress)}%`;
    document.getElementById('progressText').textContent =
      `${topNetExp} / ${nextLevel.minExp} EXP`;
  }

  displayEventBanners(); // 이벤트 배너 표시
  displayWeeklyAlerts(); // 주간 경고 먼저 표시
  displayWeeklyRankings();
  displayTimeActivity();
  displayCategories();
  displayAchievementsGuide(); // 도전 과제 안내
  displayLeaderboard();
  displayRankingHistory();
}

// ========== 이벤트 배너 표시 ==========
function displayEventBanners() {
  const container = document.getElementById('eventBanners');
  if (!container) return;

  const activeEvents = getActiveEvents();
  const upcomingEvents = getUpcomingEvents();

  container.innerHTML = '';

  // 진행 중인 이벤트
  activeEvents.forEach((event) => {
    const daysLeft = Math.ceil(
      (new Date(event.endDate) - new Date()) / (1000 * 60 * 60 * 24),
    );

    let categoryText = '전체 카테고리';
    if (event.categories && event.categories.length > 0) {
      categoryText = event.categories
        .map((c) => {
          const cat = CERT_CATEGORIES[c];
          return cat ? `${cat.emoji} ${cat.name}` : c;
        })
        .join(', ');
    }

    const banner = document.createElement('div');
    banner.className = 'event-banner active';
    banner.innerHTML = `
      <div class="event-emoji">${event.emoji || '🎉'}</div>
      <div class="event-info">
        <div class="event-name">${event.name}</div>
        <div class="event-details">
          <span class="event-period">📅 ${event.startDate} ~ ${event.endDate}</span>
          <span class="event-categories">| 대상: ${categoryText}</span>
        </div>
      </div>
      <div class="event-right">
        <div class="event-multiplier">x${event.expMultiplier}</div>
        <div class="event-days-left">D-${daysLeft}</div>
      </div>
    `;
    container.appendChild(banner);
  });

  // 예정된 이벤트 (1개만 표시)
  if (upcomingEvents.length > 0) {
    const event = upcomingEvents[0];
    const daysUntil = Math.ceil(
      (new Date(event.startDate) - new Date()) / (1000 * 60 * 60 * 24),
    );

    const banner = document.createElement('div');
    banner.className = 'event-banner upcoming';
    banner.innerHTML = `
      <div class="event-emoji">📢</div>
      <div class="event-info">
        <div class="event-name">예정: ${event.name}</div>
        <div class="event-details">
          <span class="event-period">📅 ${event.startDate} 시작</span>
          <span class="event-multiplier-text">경험치 ${event.expMultiplier}배</span>
        </div>
      </div>
      <div class="event-right">
        <div class="event-countdown">${daysUntil}일 후 시작</div>
      </div>
    `;
    container.appendChild(banner);
  }

  // 이벤트가 없으면 숨김
  if (activeEvents.length === 0 && upcomingEvents.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
  }
}

// ========== 주간 랭킹 ==========
function displayWeeklyRankings() {
  const container = document.getElementById('weeklyRankings');
  container.innerHTML = '';

  if (!resultData.weeklyData || resultData.weeklyData.length === 0) {
    container.innerHTML = '<div class="no-data">주간 데이터가 없습니다</div>';
    return;
  }

  resultData.weeklyData.forEach((weekInfo, idx) => {
    const weekCard = document.createElement('div');
    weekCard.className = `week-card ${weekInfo.isCurrentWeek ? 'current' : ''} ${weekInfo.isPastWeek ? 'past' : ''}`;

    let rankingsHtml = '';
    const top3 = weekInfo.rankings?.slice(0, 3) || [];

    if (top3.length === 0) {
      rankingsHtml = '<div class="no-data">아직 데이터가 없습니다</div>';
    } else {
      const rankClasses = ['gold', 'silver', 'bronze'];
      const rankEmojis = ['🥇', '🥈', '🥉'];

      top3.forEach((member, i) => {
        let changeIndicator = '';
        if (member.rankChange !== undefined && member.rankChange !== null) {
          if (member.rankChange > 0) {
            changeIndicator = `<span class="rank-up">▲${member.rankChange}</span>`;
          } else if (member.rankChange < 0) {
            changeIndicator = `<span class="rank-down">▼${Math.abs(member.rankChange)}</span>`;
          } else {
            changeIndicator = `<span class="rank-same">-</span>`;
          }
        } else if (idx > 0) {
          changeIndicator = `<span class="rank-new">NEW</span>`;
        }

        rankingsHtml += `
                    <div class="week-rank-item ${rankClasses[i]}">
                        <span class="rank-emoji">${rankEmojis[i]}</span>
                        <span class="rank-name">${member.name}</span>
                        <span class="rank-exp">${member.exp} EXP</span>
                        ${changeIndicator}
                    </div>
                `;
      });
    }

    weekCard.innerHTML = `
            <div class="week-header">
                <span class="week-title">${weekInfo.week}주차</span>
                <span class="week-date">${weekInfo.dateRange || ''}</span>
                ${weekInfo.isCurrentWeek ? '<span class="week-badge">진행중</span>' : ''}
                ${weekInfo.isPastWeek ? '<span class="week-badge settled">정산완료</span>' : ''}
            </div>
            <div class="week-rankings">
                ${rankingsHtml}
            </div>
        `;

    container.appendChild(weekCard);
  });
}

// ========== 시간대별 활동 ==========
function displayTimeActivity() {
  const timeChart = document.getElementById('timeChart');
  const timeLabels = document.getElementById('timeLabels');
  const timeStats = document.getElementById('timeStats');

  timeChart.innerHTML = '';
  timeLabels.innerHTML = '';

  const hourlyCount = resultData.hourlyCount || new Array(24).fill(0);
  const maxCount = Math.max(...hourlyCount, 1);

  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
    diary: '#fb923c',
    meditation: '#c084fc',
    comeback: '#38bdf8',
  };

  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyCount[hour] || 0;
    const heightPercent = (count / maxCount) * 100;

    const bar = document.createElement('div');
    bar.className = 'time-bar';
    bar.style.height = `${Math.max(heightPercent, 2)}%`;
    bar.style.background = count > 0 ? 'var(--primary)' : 'var(--border)';
    bar.title = `${hour}시: ${count}회`;

    timeChart.appendChild(bar);

    const label = document.createElement('span');
    label.className = 'time-label';
    if (hour % 3 === 0) {
      label.textContent = `${hour}`;
    }
    timeLabels.appendChild(label);
  }

  // 통계
  const peakHour = hourlyCount.indexOf(Math.max(...hourlyCount));
  const morningCount = hourlyCount.slice(5, 12).reduce((a, b) => a + b, 0);
  const afternoonCount = hourlyCount.slice(12, 18).reduce((a, b) => a + b, 0);
  const eveningCount = hourlyCount.slice(18, 24).reduce((a, b) => a + b, 0);
  const nightCount = hourlyCount.slice(0, 5).reduce((a, b) => a + b, 0);
  const totalValid = morningCount + afternoonCount + eveningCount + nightCount;

  timeStats.innerHTML = `
        <div class="time-stat">
            <span class="stat-icon">🌅</span>
            <span class="stat-label">피크 시간</span>
            <span class="stat-value">${peakHour}시</span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">🌄</span>
            <span class="stat-label">오전 (5-11시)</span>
            <span class="stat-value">${morningCount}회 <small>(${totalValid > 0 ? ((morningCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">☀️</span>
            <span class="stat-label">오후 (12-17시)</span>
            <span class="stat-value">${afternoonCount}회 <small>(${totalValid > 0 ? ((afternoonCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
        <div class="time-stat">
            <span class="stat-icon">🌙</span>
            <span class="stat-label">저녁 (18-23시)</span>
            <span class="stat-value">${eveningCount}회 <small>(${totalValid > 0 ? ((eveningCount / totalValid) * 100).toFixed(0) : 0}%)</small></span>
        </div>
    `;
}

// ========== 카테고리 ==========
function displayCategories() {
  const grid = document.getElementById('categoryGrid');
  const pieChart = document.getElementById('pieChart');
  const pieLegend = document.getElementById('pieLegend');
  const pieTotal = document.getElementById('pieTotal');

  console.log('[DEBUG] displayCategories 호출됨');
  console.log('[DEBUG] CERT_CATEGORIES:', Object.keys(CERT_CATEGORIES));

  grid.innerHTML = '';
  pieLegend.innerHTML = '';

  const rawCategoryCount = resultData.categoryCount || {};
  // 모든 카테고리에 대해 기본값 0 보장
  const categoryCount = {
    cleaning: rawCategoryCount.cleaning || 0,
    exercise: rawCategoryCount.exercise || 0,
    morning: rawCategoryCount.morning || 0,
    planning: rawCategoryCount.planning || 0,
    study: rawCategoryCount.study || 0,
    medicine: rawCategoryCount.medicine || 0,
    diary: rawCategoryCount.diary || 0,
    meditation: rawCategoryCount.meditation || 0,
    comeback: rawCategoryCount.comeback || 0,
  };
  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
    diary: '#fb923c',
    meditation: '#c084fc',
    comeback: '#38bdf8',
  };

  const total = Object.values(categoryCount).reduce((a, b) => a + (b || 0), 0);
  pieTotal.textContent = total;

  let gradientParts = [];
  let currentAngle = 0;

  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    const count = categoryCount[category] || 0;
    const totalExp = count * data.exp;

    console.log(`[DEBUG] 카테고리 카드 생성: ${category} (${data.name})`);

    // 72시간 쿨다운이 있으면 쿨다운으로, 아니면 일일로 표시
    const limitText = data.cooldownHours
      ? `${data.cooldownHours}시간 미인증 후 사용 가능`
      : `일일 ${data.dailyLimit}회 제한`;

    // 복귀 카테고리는 보너스 EXP 표시
    const expDisplay = category === 'comeback'
      ? `+${data.exp}EXP (+2 보너스)`
      : `+${data.exp}EXP`;

    const card = document.createElement('div');
    card.className = `category-card ${category}`;
    card.innerHTML = `
            <div class="emoji">${data.emoji}</div>
            <div class="name">${data.name} <span class="exp-badge">${expDisplay}</span></div>
            <div class="count">${count}회</div>
            <div class="exp-total">${totalExp} EXP</div>
            <div class="daily-limit">${limitText}</div>
        `;
    grid.appendChild(card);

    // 파이 차트
    if (count > 0) {
      const angle = (count / total) * 360;
      gradientParts.push(
        `${colors[category]} ${currentAngle}deg ${currentAngle + angle}deg`,
      );
      currentAngle += angle;
    }

    // 범례
    const percent = total > 0 ? (count / total) * 100 : 0;
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
            <span class="legend-color" style="background: ${colors[category]}"></span>
            <span class="legend-name">${data.emoji} ${data.name}</span>
            <span class="legend-value">${count}회</span>
            <span class="legend-percent">${percent.toFixed(1)}%</span>
        `;
    pieLegend.appendChild(legendItem);
  }

  if (gradientParts.length > 0) {
    pieChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;
  } else {
    pieChart.style.background = `conic-gradient(var(--border) 0deg 360deg)`;
  }
}

// ========== 도전 과제 안내 ==========
function displayAchievementsGuide() {
  const container = document.getElementById('achievementsGuideGrid');
  if (!container) return;

  // 카테고리별 그룹화
  const categoryGroups = {
    cleaning: { name: '청소', emoji: '🧹' },
    exercise: { name: '운동', emoji: '🏃' },
    morning: { name: '기상', emoji: '⏰' },
    study: { name: '공부', emoji: '📚' },
    medicine: { name: '약', emoji: '💊' },
    planning: { name: '계획', emoji: '📋' },
    diary: { name: '일기', emoji: '📝' },
    meditation: { name: '명상', emoji: '🧘' },
    integrated: { name: '통합', emoji: '🌈' }
  };

  // 도전 과제 조건 설명
  const conditionText = {
    first: '첫 인증',
    weekly: (target) => `7일간 ${target}회 이상`,
    streak: (target) => `${target}일 연속`,
    monthly: (target) => `월 ${target}회 이상`,
    early: (target) => `오전 6시 이전 ${target}회`,
    daily_variety: (target) => `하루 ${target}카테고리 이상`,
    weekly_variety: (target) => `주간 ${target}카테고리 이상`,
    monthly_all: () => `월간 전 카테고리 인증`
  };

  let html = '';

  // 카테고리별로 도전 과제 그룹화
  const groupedAchievements = {};

  for (const [achId, ach] of Object.entries(ACHIEVEMENTS)) {
    const groupKey = ach.category || 'integrated';
    if (!groupedAchievements[groupKey]) {
      groupedAchievements[groupKey] = [];
    }
    groupedAchievements[groupKey].push({ id: achId, ...ach });
  }

  // 카테고리 순서대로 렌더링
  const categoryOrder = ['cleaning', 'exercise', 'morning', 'study', 'medicine', 'planning', 'diary', 'meditation', 'integrated'];

  for (const catKey of categoryOrder) {
    const achievements = groupedAchievements[catKey];
    if (!achievements || achievements.length === 0) continue;

    const catInfo = categoryGroups[catKey];

    html += `
      <div class="achievement-category-group">
        <div class="achievement-category-header">
          <span class="cat-emoji">${catInfo.emoji}</span>
          <span class="cat-name">${catInfo.name}</span>
        </div>
        <div class="achievement-list">
    `;

    // 난이도 순서로 정렬
    achievements.sort((a, b) => a.difficulty - b.difficulty);

    for (const ach of achievements) {
      const stars = '★'.repeat(ach.difficulty) + '☆'.repeat(4 - ach.difficulty);

      // 조건 텍스트 생성
      let condition = '';
      if (typeof conditionText[ach.type] === 'function') {
        condition = conditionText[ach.type](ach.target);
      } else {
        condition = conditionText[ach.type] || '';
      }

      html += `
        <div class="achievement-guide-item">
          <span class="ach-emoji">${ach.emoji}</span>
          <div class="ach-info">
            <div class="ach-name">${ach.name}</div>
            <div class="ach-condition">${condition}</div>
          </div>
          <span class="ach-stars">${stars}</span>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// ========== 리더보드 ==========
function displayLeaderboard() {
  const leaderboard = document.getElementById('leaderboard');
  leaderboard.innerHTML = '';

  const members = Object.entries(resultData.members || {}).sort(
    (a, b) => (b[1].netExp || 0) - (a[1].netExp || 0),
  );

  members.forEach(([nickname, data], index) => {
    const netExp = data.netExp || 0;
    const totalExp = data.totalExp || 0;
    const monthlyLevel = getLevel(netExp);
    const totalLevel = getLevel(totalExp);
    const accTitle = getAccumulatedTitle(totalExp);
    const rankClass =
      index === 0
        ? 'gold'
        : index === 1
          ? 'silver'
          : index === 2
            ? 'bronze'
            : '';

    // 새 도전 과제 개수 계산
    const currentAchievements = data.achievements || [];
    const newCount = getNewAchievementsCount(nickname, currentAchievements);
    const badgeHtml = newCount > 0 ? `<span class="new-badge">${newCount}</span>` : '';

    const item = document.createElement('div');
    item.className = 'leaderboard-item';
    item.innerHTML = `
            <div class="rank ${rankClass}">${index + 1}</div>
            <div class="member-info">
                <div class="member-name">${nickname}</div>
                <div class="member-levels">
                    <span class="level-monthly" style="color: ${monthlyLevel.color}">월간 Lv.${monthlyLevel.level}</span>
                    <span class="level-divider">|</span>
                    <span class="level-total" style="color: ${totalLevel.color}">누적 Lv.${totalLevel.level}</span>
                </div>
                <div class="member-badges">
                    <span class="acc-title">${accTitle.icon} ${accTitle.title}</span>
                </div>
            </div>
            <div class="member-stats">
                <div class="member-count">${netExp} EXP</div>
                <div class="member-categories">${data.monthlyCount || 0}회 (${data.certDays || 0}일)</div>
                <div class="member-total">누적 ${totalExp} EXP</div>
            </div>
            <button class="profile-btn" data-nickname="${nickname}" title="개인 통계 보기">상세${badgeHtml}</button>
        `;
    leaderboard.appendChild(item);
  });
}

// ========== 랭킹 히스토리 ==========
function displayRankingHistory() {
  const tbody = document.getElementById('historyBody');
  tbody.innerHTML = '';

  const rankings = resultData.monthlyRankings || [];

  if (rankings.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">데이터가 없습니다</td></tr>';
    return;
  }

  rankings.forEach(({ month, top3, isCurrentMonth }) => {
    const row = document.createElement('tr');
    if (isCurrentMonth) row.className = 'current-month';

    const rankCells = [0, 1, 2]
      .map((idx) => {
        const data = top3[idx];
        if (data) {
          return `<td><div class="rank-cell"><span>${data.name}</span><span class="rank-exp">${data.exp}EXP</span></div></td>`;
        }
        return '<td>-</td>';
      })
      .join('');

    row.innerHTML = `
            <td class="month-cell">${month}${isCurrentMonth ? ' (진행중)' : ''}</td>
            ${rankCells}
        `;

    tbody.appendChild(row);
  });
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadData().then(() => {
    initMainTabs();
    initProfileModal();
    handleHashChange();
  });
});

// ========== 메인 탭 네비게이션 ==========
function initMainTabs() {
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // 탭 버튼 활성화
      document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 탭 콘텐츠 전환
      document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
      const tabId = 'tab' + capitalize(tab.dataset.tab);
      document.getElementById(tabId).classList.add('active');

      // 스크롤 위치 조정 (탭 네비게이션 바로 아래로)
      const mainTabs = document.getElementById('mainTabs');
      if (mainTabs) {
        mainTabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ========== 개인 프로필 모달 ==========

// 프로필 모달 초기화
function initProfileModal() {
  const leaderboard = document.getElementById('leaderboard');

  // 통계 버튼 클릭 이벤트
  leaderboard.addEventListener('click', (e) => {
    const btn = e.target.closest('.profile-btn');
    if (btn) {
      const nickname = btn.dataset.nickname;
      openProfileModal(nickname);
    }
  });

  // 탭 전환 이벤트
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab' + capitalize(tab.dataset.tab)).classList.add('active');

      // 도전 과제 탭 선택 시 렌더링 및 확인 처리
      if (tab.dataset.tab === 'achievements' && currentProfileData) {
        renderAchievementsTab(currentProfileData);

        // 확인 처리 - 배지 제거 및 localStorage 저장
        const badge = tab.querySelector('.new-badge');
        if (badge) badge.remove();
        markAchievementsSeen(currentProfileData.nickname, currentProfileData.achievements || []);

        // 리더보드의 배지도 업데이트
        updateLeaderboardBadge(currentProfileData.nickname);
      }
    });
  });

  // 성장 차트 기간 선택 이벤트
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (currentProfileData) {
        renderGrowthChart(currentProfileData, btn.dataset.period);
      }
    });
  });

  // 오버레이 클릭으로 닫기
  document.getElementById('profileModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'profileModalOverlay') {
      closeProfileModal();
    }
  });

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProfileModal();
    }
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 현재 프로필 데이터 저장
let currentProfileData = null;

// 프로필 모달 열기
function openProfileModal(nickname) {
  const member = resultData.members[nickname];
  if (!member) {
    console.error('멤버를 찾을 수 없습니다:', nickname);
    return;
  }

  // 디버깅: 저장된 데이터 확인
  console.log('=== 프로필 데이터 디버깅 ===');
  console.log('닉네임:', nickname);
  console.log('member 객체:', member);
  console.log('hourlyCount:', member.hourlyCount);
  console.log('dailyExp:', member.dailyExp);
  console.log('monthlyExpHistory:', member.monthlyExpHistory);
  console.log('records:', member.records);
  console.log('lastMonthExp:', member.lastMonthExp);
  console.log('categoryCount:', member.categoryCount);

  // URL 해시 업데이트
  window.location.hash = `profile=${encodeURIComponent(nickname)}`;

  // 프로필 데이터 생성
  currentProfileData = generateProfileData(nickname, member);
  console.log('생성된 프로필 데이터:', currentProfileData);
  renderProfileModal(currentProfileData);

  // 모달 표시
  document.getElementById('profileModalOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// 프로필 모달 닫기
function closeProfileModal() {
  document.getElementById('profileModalOverlay').style.display = 'none';
  document.body.style.overflow = '';
  history.pushState('', document.title, window.location.pathname + window.location.search);
}

// URL 해시 변경 처리
function handleHashChange() {
  const hash = window.location.hash;
  const match = hash.match(/^#profile=(.+)$/);

  if (match && resultData && resultData.members) {
    const nickname = decodeURIComponent(match[1]);
    if (resultData.members[nickname]) {
      openProfileModal(nickname);
    }
  }
}

window.addEventListener('hashchange', handleHashChange);

// 프로필 데이터 생성
function generateProfileData(nickname, member) {
  const records = member.records || [];

  // 시간대별 집계 - 저장된 데이터 사용
  const hourlyCount = member.hourlyCount || new Array(24).fill(0);

  // 카테고리별 집계 - 저장된 데이터 사용
  const categoryCount = member.categoryCount || { cleaning: 0, exercise: 0, morning: 0, planning: 0, study: 0, medicine: 0, diary: 0, meditation: 0, comeback: 0 };

  // 일별 EXP - 저장된 데이터 사용 (최근 60일)
  const dailyExp = member.dailyExp || {};

  // 월별 EXP - 저장된 데이터 사용 (전체 기간)
  const monthlyExpHistory = member.monthlyExpHistory || {};

  // 레벨 및 칭호
  const netExp = member.netExp || 0;
  const totalExp = member.totalExp || 0;
  const level = getLevel(netExp);
  const accTitle = getAccumulatedTitle(totalExp);

  // 저번달 대비 성장
  const lastMonthExp = member.lastMonthExp || 0;
  const lastMonthCount = member.lastMonthCount || 0;
  const monthlyExp = member.monthlyExp || netExp;
  const monthlyCount = member.monthlyCount || 0;

  const expGrowth = lastMonthExp > 0 ? Math.round((monthlyExp - lastMonthExp) / lastMonthExp * 100) : (monthlyExp > 0 ? 100 : 0);
  const countGrowth = lastMonthCount > 0 ? Math.round((monthlyCount - lastMonthCount) / lastMonthCount * 100) : (monthlyCount > 0 ? 100 : 0);

  // 카테고리 칭호
  const categoryTitle = getCategoryTitle(categoryCount);

  return {
    nickname,
    level,
    accTitle,
    categoryTitle,
    totalExp,
    totalCount: member.totalCount || 0,
    monthlyExp,
    monthlyCount,
    certDays: member.certDays || 0,
    weeklyCount: member.weeklyCertCount || 0,
    lastMonthExp,
    lastMonthCount,
    expGrowth,
    countGrowth,
    dailyExp,
    monthlyExpHistory,
    hourlyCount,
    categoryCount,
    recentRecords: records.slice().reverse(),
    // 도전 과제
    achievements: member.achievements || [],
    achievementDates: member.achievementDates || {},
    records: records
  };
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
}

// 프로필 모달 렌더링
function renderProfileModal(data) {
  // 헤더
  document.getElementById('profileAvatar').textContent = data.accTitle.icon;
  document.getElementById('profileNickname').textContent = data.nickname;
  document.getElementById('profileLevel').textContent = `Lv.${data.level.level}`;
  document.getElementById('profileLevel').style.background = data.level.color;
  document.getElementById('profileTitle').textContent = `${data.accTitle.icon} ${data.accTitle.title}`;

  // 카테고리 칭호
  const categoryTitleEl = document.getElementById('profileCategoryTitle');
  if (data.categoryTitle) {
    categoryTitleEl.textContent = `${data.categoryTitle.emoji} ${data.categoryTitle.title}`;
    categoryTitleEl.style.display = 'inline-block';
    categoryTitleEl.title = `${CERT_CATEGORIES[data.categoryTitle.category].name} ${data.categoryTitle.count}회 인증`;
  } else {
    categoryTitleEl.style.display = 'none';
  }

  // 통계 카드
  document.getElementById('profileMonthlyExp').textContent = `${data.monthlyExp} EXP`;
  document.getElementById('profileMonthlyCount').textContent = `${data.monthlyCount}회 (${data.certDays}일)`;
  document.getElementById('profileLastMonthExp').textContent = `${data.lastMonthExp} EXP`;
  document.getElementById('profileLastMonthCount').textContent = `${data.lastMonthCount}회`;

  document.getElementById('profileTotalExp').textContent = `${data.totalExp} EXP`;
  document.getElementById('profileTotalCount').textContent = `${data.totalCount}회`;

  // 개인화 피드백
  const feedbacks = generatePersonalizedFeedback(data);
  document.querySelector('.feedback-icon').textContent = feedbacks.icon;
  document.getElementById('feedbackText').innerHTML = feedbacks.messages.join('<br>');

  // 탭 초기화 (성장 추이 탭 활성화)
  document.querySelectorAll('.profile-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  document.querySelectorAll('.profile-tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('.period-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

  // 도전 과제 탭에 새 배지 표시
  const achievementTab = document.querySelector('.profile-tab[data-tab="achievements"]');
  if (achievementTab) {
    const newCount = getNewAchievementsCount(data.nickname, data.achievements || []);
    // 기존 배지 제거
    const existingBadge = achievementTab.querySelector('.new-badge');
    if (existingBadge) existingBadge.remove();
    // 새 배지 추가
    if (newCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'new-badge';
      badge.textContent = newCount;
      achievementTab.appendChild(badge);
    }
  }

  // 각 탭 렌더링
  renderGrowthChart(data, 'daily');
  renderCategoryPie(data);
  renderAchievementsTab(data);
  renderTimeHeatmap(data);
  renderRecentRecords(data);
}

// 성장 추이 차트 (선 그래프)
function renderGrowthChart(data, period) {
  const container = document.getElementById('profileGrowthChart');
  container.innerHTML = '';

  let entries;
  if (period === 'daily') {
    // 일별: 저장된 dailyExp 사용 (최근 30일만 표시)
    const allEntries = Object.entries(data.dailyExp || {}).sort((a, b) => a[0].localeCompare(b[0]));
    entries = allEntries.slice(-30);
  } else if (period === 'weekly') {
    // 주별: dailyExp를 주별로 집계
    const weeklyAgg = {};
    Object.entries(data.dailyExp || {}).forEach(([date, exp]) => {
      const weekStart = getWeekStart(new Date(date));
      weeklyAgg[weekStart] = (weeklyAgg[weekStart] || 0) + exp;
    });
    entries = Object.entries(weeklyAgg).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  } else {
    // 월별: 저장된 monthlyExpHistory 사용 (전체 기간)
    if (data.monthlyExpHistory) {
      entries = Object.entries(data.monthlyExpHistory).sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      // 이전 데이터 호환: dailyExp에서 월별 집계
      const monthlyAgg = {};
      Object.entries(data.dailyExp || {}).forEach(([date, exp]) => {
        const month = date.slice(0, 7);
        monthlyAgg[month] = (monthlyAgg[month] || 0) + exp;
      });
      entries = Object.entries(monthlyAgg).sort((a, b) => a[0].localeCompare(b[0]));
    }
  }

  if (entries.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 3rem;">데이터가 없습니다</div>';
    return;
  }

  // SVG 크기 설정
  const width = container.clientWidth || 300;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxExp = Math.max(...entries.map(e => e[1]), 1);
  const minExp = 0;

  // 좌표 계산
  const xStep = chartWidth / Math.max(entries.length - 1, 1);
  const points = entries.map(([date, exp], i) => ({
    x: padding.left + (entries.length === 1 ? chartWidth / 2 : i * xStep),
    y: padding.top + chartHeight - (exp / maxExp) * chartHeight,
    date,
    exp
  }));

  // SVG 생성
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // 그라데이션 정의
  svg.innerHTML = `
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#a78bfa"/>
        <stop offset="100%" style="stop-color:#22d3ee"/>
      </linearGradient>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#a78bfa"/>
        <stop offset="100%" style="stop-color:transparent"/>
      </linearGradient>
    </defs>
  `;

  // Y축 그리드 라인 (3개)
  const ySteps = [0, 0.5, 1];
  ySteps.forEach(ratio => {
    const y = padding.top + chartHeight * (1 - ratio);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'growth-grid-line');
    svg.appendChild(line);

    // Y축 라벨
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', padding.left - 5);
    label.setAttribute('y', y + 3);
    label.setAttribute('class', 'growth-y-label');
    label.textContent = Math.round(maxExp * ratio);
    svg.appendChild(label);
  });

  // 영역 채우기 (area)
  if (points.length > 1) {
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const areaD = `M${points[0].x},${padding.top + chartHeight} ` +
      points.map(p => `L${p.x},${p.y}`).join(' ') +
      ` L${points[points.length - 1].x},${padding.top + chartHeight} Z`;
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('class', 'growth-area');
    svg.appendChild(areaPath);
  }

  // 선 그리기
  if (points.length > 1) {
    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    linePath.setAttribute('d', lineD);
    linePath.setAttribute('class', 'growth-line');
    svg.appendChild(linePath);
  }

  // 데이터 포인트
  points.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', 4);
    circle.setAttribute('class', 'growth-point');
    circle.setAttribute('data-index', i);
    svg.appendChild(circle);
  });

  // X축 라벨 (일부만 표시)
  const labelInterval = Math.ceil(entries.length / 6);
  points.forEach((p, i) => {
    if (i % labelInterval === 0 || i === points.length - 1) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', p.x);
      label.setAttribute('y', height - 8);
      label.setAttribute('class', 'growth-x-label');
      // 기간에 따라 라벨 형식 변경
      if (period === 'monthly') {
        label.textContent = parseInt(p.date.slice(5, 7)) + '월';
      } else {
        label.textContent = p.date.slice(5).replace('-', '/');
      }
      svg.appendChild(label);
    }
  });

  container.appendChild(svg);

  // 툴팁 생성
  const tooltip = document.createElement('div');
  tooltip.className = 'growth-tooltip';
  container.appendChild(tooltip);

  // 날짜 형식 포맷터
  const formatDateLabel = (dateStr) => {
    if (period === 'monthly') {
      const [year, month] = dateStr.split('-');
      return `${year}년 ${parseInt(month)}월`;
    } else if (period === 'weekly') {
      return `${dateStr.slice(5).replace('-', '/')} 주`;
    }
    return dateStr;
  };

  // 툴팁 이벤트
  svg.querySelectorAll('.growth-point').forEach(circle => {
    circle.addEventListener('mouseenter', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const p = points[idx];
      tooltip.innerHTML = `
        <div class="growth-tooltip-date">${formatDateLabel(p.date)}</div>
        <div class="growth-tooltip-exp">${p.exp} EXP</div>
      `;
      tooltip.classList.add('visible');

      const rect = container.getBoundingClientRect();
      const circleRect = e.target.getBoundingClientRect();
      tooltip.style.left = `${circleRect.left - rect.left + 10}px`;
      tooltip.style.top = `${circleRect.top - rect.top - 40}px`;
    });

    circle.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  });
}

// 카테고리 파이차트
function renderCategoryPie(data) {
  const pieChart = document.getElementById('profilePieChart');
  const pieLegend = document.getElementById('profilePieLegend');
  const pieTotal = document.getElementById('profilePieTotal');

  const colors = {
    cleaning: '#f472b6', exercise: '#22d3ee', morning: '#fbbf24',
    planning: '#a78bfa', study: '#4ade80', medicine: '#f87171',
    diary: '#fb923c', meditation: '#c084fc', comeback: '#38bdf8'
  };

  const names = {
    cleaning: '청소', exercise: '운동', morning: '기상',
    planning: '계획', study: '공부', medicine: '약',
    diary: '일기', meditation: '명상', comeback: '복귀'
  };

  const total = Object.values(data.categoryCount).reduce((a, b) => a + b, 0);
  pieTotal.textContent = total;

  if (total === 0) {
    pieChart.style.background = 'var(--border)';
    pieLegend.innerHTML = '<div style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">인증 기록이 없습니다</div>';
    return;
  }

  // 파이 차트 그라데이션
  let currentAngle = 0;
  const gradientParts = [];

  Object.entries(data.categoryCount)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const angle = (count / total) * 360;
      gradientParts.push(`${colors[category]} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    });

  pieChart.style.background = `conic-gradient(${gradientParts.join(', ')})`;

  // 범례
  pieLegend.innerHTML = Object.entries(data.categoryCount)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `
      <div class="profile-legend-item">
        <span class="profile-legend-color" style="background: ${colors[category]}"></span>
        <span>${names[category]} ${count}</span>
      </div>
    `).join('');
}

// 시간대 히트맵
function renderTimeHeatmap(data) {
  const container = document.getElementById('profileTimeHeatmap');
  const insight = document.getElementById('profileTimeInsight');
  container.innerHTML = '';

  const maxCount = Math.max(...data.hourlyCount, 1);

  for (let hour = 0; hour < 24; hour++) {
    const count = data.hourlyCount[hour];
    const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 5);

    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${level}`;
    cell.textContent = hour;
    cell.title = `${hour}시: ${count}회`;
    container.appendChild(cell);
  }

  // 피크 시간 분석
  const peakHour = data.hourlyCount.indexOf(Math.max(...data.hourlyCount));
  const morningCount = data.hourlyCount.slice(5, 12).reduce((a, b) => a + b, 0);
  const eveningCount = data.hourlyCount.slice(18, 24).reduce((a, b) => a + b, 0);

  let insightText = '';
  if (data.hourlyCount[peakHour] > 0) {
    insightText = `<strong>${peakHour}시</strong>에 가장 활발하게 인증합니다.`;
    if (eveningCount > morningCount * 1.5) {
      insightText += ' 저녁형 패턴이에요.';
    } else if (morningCount > eveningCount * 1.5) {
      insightText += ' 아침형 패턴이에요.';
    }
  } else {
    insightText = '아직 인증 기록이 부족합니다.';
  }
  insight.innerHTML = insightText;
}

// 최근 기록 목록
function renderRecentRecords(data) {
  const container = document.getElementById('profileRecordsList');

  const names = {
    cleaning: '청소', exercise: '운동', morning: '기상',
    planning: '계획', study: '공부', medicine: '약',
    diary: '일기', meditation: '명상', comeback: '복귀'
  };

  if (data.recentRecords.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">기록이 없습니다</div>';
    return;
  }

  container.innerHTML = data.recentRecords.map(r => `
    <div class="profile-record-item">
      <span class="record-date">${r.date ? r.date.slice(5) : ''} ${r.time || ''}</span>
      <span class="record-category-badge ${r.category}">${names[r.category] || r.category}</span>
      <span class="record-message">${r.tag || ''}</span>
      <span class="record-exp">+${r.exp}</span>
    </div>
  `).join('');
}

// 개인화 피드백 생성
function generatePersonalizedFeedback(data) {
  const messages = [];
  let icon = '💡';

  // 1. 시간대 분석
  const hourlyCount = data.hourlyCount;
  const morningCount = hourlyCount.slice(5, 12).reduce((a, b) => a + b, 0);
  const eveningCount = hourlyCount.slice(18, 24).reduce((a, b) => a + b, 0);

  if (eveningCount > morningCount * 1.5) {
    messages.push(`${data.nickname}님은 아침보다 저녁 인증이 잘 맞는 편입니다.`);
  } else if (morningCount > eveningCount * 1.5) {
    messages.push(`${data.nickname}님은 아침형 인증 패턴을 보입니다.`);
    icon = '🌅';
  }

  // 2. 주요 카테고리 분석
  const sortedCategories = Object.entries(data.categoryCount)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedCategories.length > 0) {
    const names = { cleaning: '청소', exercise: '운동', morning: '기상', planning: '계획', study: '공부', medicine: '약', diary: '일기', meditation: '명상', comeback: '복귀' };
    const topCategory = sortedCategories[0][0];
    messages.push(`${names[topCategory]} 인증이 가장 활발합니다.`);
  }

  // 3. 인증 일수 분석
  const currentDay = new Date().getDate();
  const certRate = data.certDays > 0 ? (data.certDays / currentDay * 100).toFixed(0) : 0;

  if (certRate >= 80) {
    messages.push(`이번 달 인증률 ${certRate}%! 정말 꾸준해요.`);
    icon = '🔥';
  } else if (certRate >= 50) {
    messages.push(`이번 달 절반 이상 인증하셨어요.`);
  } else if (data.certDays > 0) {
    messages.push(`다시 돌아온 것만으로도 충분합니다.`);
    icon = '🌱';
  }

  if (messages.length === 0) {
    messages.push('꾸준히 인증하며 성장하고 계세요.');
  }

  return { icon, messages: messages.slice(0, 2) };
}

// ========== 도전 과제 렌더링 ==========

// 날짜 문자열 변환 (result.js용)
function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 이번 달 체크
function isCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return dateStr.startsWith(currentMonth);
}

// 카테고리별 연속 일수 계산
function calculateCategoryStreak(records, category) {
  const validRecords = records.filter(r => r.category === category && r.exp > 0);
  if (validRecords.length === 0) return 0;

  const dates = new Set(validRecords.map(r => r.date));
  const today = toLocalDateStr(new Date());
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

  let streak = 0;
  let checkDate = dates.has(today) ? today : (dates.has(yesterday) ? yesterday : null);

  if (!checkDate) return 0;

  while (dates.has(checkDate)) {
    streak++;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = toLocalDateStr(d);
  }

  return streak;
}

// 도전 과제 진행률 계산
function getAchievementProgress(records, categoryCount, achId, ach) {
  switch (ach.type) {
    case 'first':
      return { current: Math.min(categoryCount[ach.category] || 0, 1), target: 1 };
    case 'weekly': {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const weekAgoStr = toLocalDateStr(weekAgo);
      const count = records.filter(r => r.category === ach.category && r.exp > 0 && r.date >= weekAgoStr).length;
      return { current: Math.min(count, ach.target), target: ach.target };
    }
    case 'streak': {
      const streak = calculateCategoryStreak(records, ach.category);
      return { current: Math.min(streak, ach.target), target: ach.target };
    }
    case 'monthly': {
      const count = records.filter(r => r.category === ach.category && r.exp > 0 && isCurrentMonth(r.date)).length;
      return { current: Math.min(count, ach.target), target: ach.target };
    }
    case 'early': {
      const count = records.filter(r => {
        if (r.category !== 'morning' || r.exp <= 0 || !r.time) return false;
        const hour = parseInt(r.time.split(':')[0]);
        return hour < 6;
      }).length;
      return { current: Math.min(count, ach.target), target: ach.target };
    }
    case 'daily_variety': {
      const dateCategories = {};
      records.forEach(r => {
        if (r.exp > 0) {
          if (!dateCategories[r.date]) dateCategories[r.date] = new Set();
          dateCategories[r.date].add(r.category);
        }
      });
      const maxVariety = Math.max(0, ...Object.values(dateCategories).map(s => s.size));
      return { current: Math.min(maxVariety, ach.target), target: ach.target };
    }
    case 'weekly_variety': {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const weekAgoStr = toLocalDateStr(weekAgo);
      const cats = new Set();
      records.forEach(r => { if (r.exp > 0 && r.date >= weekAgoStr) cats.add(r.category); });
      return { current: Math.min(cats.size, ach.target), target: ach.target };
    }
    case 'monthly_all': {
      const cats = new Set();
      records.forEach(r => { if (r.exp > 0 && isCurrentMonth(r.date) && r.category !== 'comeback') cats.add(r.category); });
      return { current: Math.min(cats.size, ach.target), target: ach.target };
    }
    default:
      return { current: 0, target: ach.target };
  }
}

// 도전 과제 탭 렌더링
function renderAchievementsTab(data) {
  const container = document.getElementById('achievementsGrid');
  if (!container) return;

  const achievements = data.achievements || [];
  const achievementDates = data.achievementDates || {};
  const records = data.records || [];
  const categoryCount = data.categoryCount || {};

  // 카테고리 순서
  const categoryOrder = ['cleaning', 'exercise', 'morning', 'study', 'medicine', 'planning', 'diary', 'meditation', null];
  const categoryNames = {
    cleaning: '🧹 청소',
    exercise: '🏃 운동',
    morning: '⏰ 기상',
    study: '📚 공부',
    medicine: '💊 약',
    planning: '📋 계획',
    diary: '📝 일기',
    meditation: '🧘 명상',
    null: '🌈 통합'
  };

  let html = '';

  categoryOrder.forEach((cat, index) => {
    const catAchievements = Object.entries(ACHIEVEMENTS).filter(([id, ach]) => ach.category === cat);
    if (catAchievements.length === 0) return;

    // 달성 개수 계산
    const unlockedCount = catAchievements.filter(([achId]) => achievements.includes(achId)).length;
    const totalCount = catAchievements.length;

    // 첫 번째 카테고리만 기본 열림
    const isOpen = index === 0;

    html += `
      <div class="achievement-accordion">
        <div class="achievement-accordion-header ${isOpen ? 'open' : ''}" data-category="${cat}">
          <span class="accordion-title">${categoryNames[cat]}</span>
          <span class="accordion-badge">${unlockedCount}/${totalCount}</span>
          <span class="accordion-arrow">${isOpen ? '▼' : '▶'}</span>
        </div>
        <div class="achievement-accordion-content ${isOpen ? 'open' : ''}">
          <div class="achievement-cards">
    `;

    catAchievements.forEach(([achId, ach]) => {
      const isUnlocked = achievements.includes(achId);
      const progress = getAchievementProgress(records, categoryCount, achId, ach);
      const progressPercent = Math.round((progress.current / progress.target) * 100);
      const stars = '★'.repeat(ach.difficulty) + '☆'.repeat(4 - ach.difficulty);
      const unlockedDate = achievementDates[achId] || '';

      html += `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <span class="achievement-emoji">${ach.emoji}</span>
          <div class="achievement-name">${ach.name}</div>
          ${isUnlocked
            ? `<div class="achievement-date">${unlockedDate}</div>`
            : `<div class="achievement-progress">${progress.current}/${progress.target}</div>
               <div class="achievement-progress-bar">
                 <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
               </div>`
          }
          <div class="difficulty-stars">${stars}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // 아코디언 클릭 이벤트
  container.querySelectorAll('.achievement-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const arrow = header.querySelector('.accordion-arrow');
      const isOpen = header.classList.toggle('open');
      content.classList.toggle('open', isOpen);
      arrow.textContent = isOpen ? '▼' : '▶';
    });
  });
}
