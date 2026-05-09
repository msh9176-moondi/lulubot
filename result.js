/**
 * 루루플 결과 페이지
 * Google Sheets에서 데이터를 가져와 표시
 */

// ========== 설정 ==========
// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
const API_URL = 'https://script.google.com/macros/s/AKfycbx-ZJFYDoIu4T3xYeyjvf4fWo8gv7-bt0V4spPe-FGSSCzjSHNzX6_nv0Ck_pj7QM3y/exec';

// ========== 상수 ==========
const CERT_CATEGORIES = {
  cleaning: { name: '청소', emoji: '🧹', exp: 2 },
  exercise: { name: '운동', emoji: '🏃', exp: 2 },
  morning: { name: '기상', emoji: '⏰', exp: 1 },
  planning: { name: '계획', emoji: '📋', exp: 3 },
  study: { name: '공부', emoji: '📚', exp: 2 },
  medicine: { name: '약', emoji: '💊', exp: 1 },
};

const EXP_PER_LEVEL = 5;

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

// ========== 데이터 로드 (JSONP 방식) ==========
function loadData() {
  const loadingSection = document.getElementById('loadingSection');
  const errorSection = document.getElementById('errorSection');
  const resultsSection = document.getElementById('resultsSection');

  loadingSection.style.display = 'block';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';

  // 기존 스크립트 제거
  const oldScript = document.getElementById('jsonpScript');
  if (oldScript) oldScript.remove();

  // JSONP 콜백 함수 정의
  window.handleData = function(data) {
    try {
      if (data.error) {
        throw new Error(data.error);
      }

      resultData = data;

      if (!resultData || !resultData.members) {
        throw new Error('유효하지 않은 데이터입니다.');
      }

      loadingSection.style.display = 'none';
      resultsSection.style.display = 'block';

      displayResults();
    } catch (error) {
      console.error('데이터 처리 오류:', error);
      loadingSection.style.display = 'none';
      errorSection.style.display = 'block';
      document.getElementById('errorMessage').textContent = error.message;
    }
  };

  // JSONP 스크립트 태그 생성
  const script = document.createElement('script');
  script.id = 'jsonpScript';
  script.src = API_URL + '?callback=handleData';
  script.onerror = function() {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'block';
    document.getElementById('errorMessage').textContent = '데이터를 불러올 수 없습니다.';
  };
  document.body.appendChild(script);
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

  displayWeeklyRankings();
  displayTimeActivity();
  displayCategories();
  displayLeaderboard();
  displayRankingHistory();
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

  grid.innerHTML = '';
  pieLegend.innerHTML = '';

  const categoryCount = resultData.categoryCount || {};
  const colors = {
    cleaning: '#f472b6',
    exercise: '#22d3ee',
    morning: '#fbbf24',
    planning: '#a78bfa',
    study: '#4ade80',
    medicine: '#f87171',
  };

  const total = Object.values(categoryCount).reduce((a, b) => a + b, 0);
  pieTotal.textContent = total;

  let gradientParts = [];
  let currentAngle = 0;

  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    const count = categoryCount[category] || 0;
    const totalExp = count * data.exp;

    const card = document.createElement('div');
    card.className = `category-card ${category}`;
    card.innerHTML = `
            <div class="emoji">${data.emoji}</div>
            <div class="name">${data.name} <span class="exp-badge">+${data.exp}EXP</span></div>
            <div class="count">${count}회</div>
            <div class="exp-total">${totalExp} EXP</div>
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

    const penaltyText =
      data.penalty > 0 ? `<span class="penalty">-${data.penalty}</span>` : '';

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
                <div class="member-count">${netExp} EXP ${penaltyText}</div>
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
