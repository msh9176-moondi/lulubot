/**
 * 루루플 결과 페이지
 * Google Sheets에서 데이터를 가져와 표시
 */

// ========== 설정 ==========
// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
const API_URL =
  'https://script.google.com/macros/s/AKfycby1H56l1jG9YFZahPeyB6_hIFPSRloe8zIPPGjJZp-kcs4LNSUzcpaj8SXwUxVF9pEf/exec';

// ========== 상수 ==========
const CERT_CATEGORIES = {
  cleaning: { name: '청소', emoji: '🧹', exp: 1, dailyLimit: 3 },
  exercise: { name: '운동', emoji: '🏃', exp: 4, dailyLimit: 3 },
  morning: { name: '기상', emoji: '⏰', exp: 2, dailyLimit: 1 },
  planning: { name: '계획', emoji: '📋', exp: 3, dailyLimit: 1 },
  study: { name: '공부', emoji: '📚', exp: 4, dailyLimit: 3 },
  medicine: { name: '약', emoji: '💊', exp: 1, dailyLimit: 1 },
  diary: { name: '일기', emoji: '📝', exp: 1, dailyLimit: 1 },
  comeback: { name: '복귀', emoji: '🔄', exp: 10, dailyLimit: 999, monthlyLimit: 1 },
};

const EXP_PER_LEVEL = 5;

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

    if (!resultData || !resultData.members) {
      throw new Error('유효하지 않은 데이터입니다.');
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
        <div class="alert-name">${name}</div>
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

    // 월간 제한이 있으면 월간으로, 아니면 일일로 표시
    const limitText = data.monthlyLimit
      ? `월간 ${data.monthlyLimit}회 제한`
      : `일일 ${data.dailyLimit}회 제한`;

    const card = document.createElement('div');
    card.className = `category-card ${category}`;
    card.innerHTML = `
            <div class="emoji">${data.emoji}</div>
            <div class="name">${data.name} <span class="exp-badge">+${data.exp}EXP</span></div>
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
document.addEventListener('DOMContentLoaded', loadData);
