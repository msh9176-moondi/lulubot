/**
 * Google Apps Script - 루루플 인증 시스템 API
 *
 * 설정 방법:
 * 1. Google Drive에서 Google Sheets 새로 만들기
 * 2. 확장 프로그램 > Apps Script 클릭
 * 3. 이 코드를 전체 복사해서 붙여넣기
 * 4. SHEET_ID를 실제 스프레드시트 ID로 변경
 * 5. ADMIN_PASSWORD를 원하는 비밀번호로 변경 (app.js와 동일하게)
 * 6. 배포 > 새 배포 > 웹 앱 선택
 *    - 설명: 루루플 API
 *    - 실행 사용자: 나
 *    - 액세스 권한: 모든 사용자
 * 7. 배포 후 URL을 복사해서 app.js와 result.js의 API_URL에 붙여넣기
 *
 * !! 중요: 코드 수정 후 반드시 "새 배포"로 다시 배포해야 합니다 !!
 */

// ========== 설정 ==========
const SHEET_ID = '1BK33w3bZv0lqvL-VgLyi5dCjgNEJwj8V-Nwf2ygRi4g'; // 스프레드시트 ID (URL에서 복사)
const ADMIN_PASSWORD = 'lurupl2024'; // 관리자 비밀번호

// ========== 인증 카테고리 설정 ==========
const CERT_CATEGORIES = {
  cleaning: {
    name: '청소',
    emoji: '🧹',
    exp: 2,
    dailyLimit: 3,
    tags: ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
  },
  exercise: {
    name: '운동',
    emoji: '🏃',
    exp: 3,
    dailyLimit: 2,
    tags: ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
  },
  morning: {
    name: '기상',
    emoji: '⏰',
    exp: 2,
    dailyLimit: 1,
    tags: ['#기상', '#굿모닝', '#아침'],
  },
  planning: {
    name: '계획',
    emoji: '📋',
    exp: 3,
    dailyLimit: 1,
    tags: ['#계획', '#계획표', '#투두', '#todo', '#할일'],
  },
  study: {
    name: '공부',
    emoji: '📚',
    exp: 3,
    dailyLimit: 3,
    tags: ['#공부', '#스터디', '#독서', '#학습'],
  },
  medicine: {
    name: '약',
    emoji: '💊',
    exp: 1,
    dailyLimit: 1,
    tags: ['#약', '#복약', '#약먹기', '#약복용', '#영양제'],
  },
  diary: {
    name: '일기',
    emoji: '📝',
    exp: 2,
    dailyLimit: 1,
    tags: ['#일기', '#감사일기', '#하루기록', '#오늘하루', '#일상'],
  },
  meditation: {
    name: '명상',
    emoji: '🧘',
    exp: 2,
    dailyLimit: 2,
    tags: ['#명상', '#마음챙김', '#호흡', '#묵상'],
  },
  comeback: {
    name: '복귀',
    emoji: '🔄',
    exp: 3,
    dailyLimit: 999,
    cooldownHours: 72,
    tags: ['#복귀', '#컴백', '#돌아왔어'],
  },
};

// ========== 헬퍼 함수 ==========
function findCategory(message) {
  const lowerMessage = message.toLowerCase();
  for (const [category, data] of Object.entries(CERT_CATEGORIES)) {
    for (const tag of data.tags) {
      if (lowerMessage.includes(tag.toLowerCase())) {
        return category;
      }
    }
  }
  return null;
}

function extractTag(message, category) {
  const data = CERT_CATEGORIES[category];
  for (const tag of data.tags) {
    if (message.toLowerCase().includes(tag.toLowerCase())) {
      return tag;
    }
  }
  return '';
}

// ========== GET 요청 처리 (데이터 조회) ==========
function doGet(e) {
  try {
    // e가 undefined일 경우 대비
    e = e || { parameter: {} };
    const callback = e.parameter.callback; // JSONP 콜백
    const type = e.parameter.type || 'data'; // 'data' 또는 'events'
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);

    // 이벤트 데이터 조회
    if (type === 'events') {
      const eventSheet = spreadsheet.getSheetByName('Events');
      if (!eventSheet) {
        return createResponse({ events: [] }, callback);
      }
      const eventData = eventSheet.getRange('A1').getValue();
      if (!eventData) {
        return createResponse({ events: [] }, callback);
      }
      return createResponse({ events: JSON.parse(eventData) }, callback);
    }

    // 기본: 인증 데이터 조회
    const sheet = spreadsheet.getSheetByName('Data');

    if (!sheet) {
      return createResponse({ error: '데이터가 없습니다.' }, callback);
    }

    // 청크 개수 확인 (B1)
    const chunkCount = sheet.getRange('B1').getValue();

    let jsonStr = '';
    if (chunkCount && typeof chunkCount === 'number' && chunkCount > 0) {
      // 여러 셀에서 데이터 읽기
      for (let i = 1; i <= chunkCount; i++) {
        const chunk = sheet.getRange(i, 1).getValue();
        if (chunk) {
          jsonStr += chunk;
        }
      }
    } else {
      // 이전 방식 호환 (단일 셀)
      jsonStr = sheet.getRange('A1').getValue();
    }

    if (!jsonStr) {
      return createResponse({ error: '저장된 데이터가 없습니다.' }, callback);
    }

    const jsonData = JSON.parse(jsonStr);

    // 이벤트 데이터도 함께 포함
    const eventSheet = spreadsheet.getSheetByName('Events');
    if (eventSheet) {
      const eventData = eventSheet.getRange('A1').getValue();
      if (eventData) {
        jsonData.events = JSON.parse(eventData);
      }
    }

    return createResponse(jsonData, callback);

  } catch (error) {
    return createResponse({ error: error.message }, e.parameter.callback);
  }
}

// ========== POST 요청 처리 (데이터 저장) ==========
function doPost(e) {
  try {
    // e가 undefined일 경우 대비
    e = e || { parameter: {}, postData: {} };

    // 디버깅 로그
    console.log('doPost 시작');
    console.log('e.parameter:', JSON.stringify(e.parameter));
    console.log('e.postData:', e.postData ? e.postData.contents : 'undefined');

    // form data 또는 JSON 파싱
    let data;
    if (e.parameter && e.parameter.data) {
      // form 방식 - JSON.parse가 유니코드 이스케이프(\uXXXX)를 자동 처리
      console.log('form 방식으로 파싱');
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      // JSON 방식
      console.log('JSON 방식으로 파싱');
      data = JSON.parse(e.postData.contents);
    } else {
      console.log('데이터 없음');
      return createResponse({ error: '데이터가 없습니다.' });
    }

    // 비밀번호 검증
    if (data.password !== ADMIN_PASSWORD) {
      return createResponse({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 필드 제거 후 저장
    delete data.password;

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);

    // 이벤트 데이터 저장 요청
    if (data.type === 'events') {
      let eventSheet = spreadsheet.getSheetByName('Events');
      if (!eventSheet) {
        eventSheet = spreadsheet.insertSheet('Events');
      }
      eventSheet.getRange('A1').setValue(JSON.stringify(data.events));
      eventSheet.getRange('B1').setValue(new Date().toISOString());
      return createResponse({ success: true, message: '이벤트가 저장되었습니다.' });
    }

    // 카카오톡 채팅 로그 처리 (자동화 스크립트에서 전송)
    if (data.chat_logs) {
      return processChatLogs(spreadsheet, data.chat_logs);
    }

    // 기본: 인증 데이터 저장
    let sheet = spreadsheet.getSheetByName('Data');

    // Data 시트가 없으면 생성
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Data');
    }

    // JSON 데이터를 청크로 나눠서 저장 (셀당 40000자 제한)
    const jsonStr = JSON.stringify(data);
    const CHUNK_SIZE = 40000;
    const chunks = [];
    for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
      chunks.push(jsonStr.substring(i, i + CHUNK_SIZE));
    }

    // 기존 데이터 클리어 (A열)
    const lastRow = Math.max(sheet.getLastRow(), 1);
    if (lastRow > 0) {
      sheet.getRange(1, 1, lastRow, 1).clearContent();
    }

    // 청크별로 저장 (A1, A2, A3, ...)
    chunks.forEach((chunk, index) => {
      sheet.getRange(index + 1, 1).setValue(chunk);
    });

    // 청크 개수 저장 (B1)
    sheet.getRange('B1').setValue(chunks.length);

    // 저장 시간 기록 (C1)
    sheet.getRange('C1').setValue(new Date().toISOString());

    // 히스토리 시트에도 기록 (백업용)
    let historySheet = spreadsheet.getSheetByName('History');
    if (!historySheet) {
      historySheet = spreadsheet.insertSheet('History');
      historySheet.getRange('A1:C1').setValues([['날짜', '시간', '데이터']]);
    }

    const now = new Date();
    const historyLastRow = historySheet.getLastRow() + 1;
    historySheet.getRange(historyLastRow, 1, 1, 3).setValues([[
      Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd'),
      Utilities.formatDate(now, 'Asia/Seoul', 'HH:mm:ss'),
      JSON.stringify(data)
    ]]);

    return createResponse({ success: true, message: '저장되었습니다.' });

  } catch (error) {
    return createResponse({ error: error.message });
  }
}

// ========== 응답 생성 함수 (JSONP 지원) ==========
function createResponse(data, callback) {
  const jsonStr = JSON.stringify(data);

  // JSONP 콜백이 있으면 래핑
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + jsonStr + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 일반 JSON 응답
  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== 테스트 함수 ==========
function testGet() {
  const result = doGet({ parameter: {} });
  Logger.log(result.getContent());
}

// ========== 카카오톡 채팅 로그 처리 ==========
function processChatLogs(spreadsheet, chatLogs) {
  // 오늘 날짜 (한국 시간)
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
  const today = Utilities.formatDate(koreaTime, 'Asia/Seoul', 'yyyy-MM-dd');
  const currentTime = Utilities.formatDate(koreaTime, 'Asia/Seoul', 'HH:mm');

  // 기존 데이터 로드
  let existingData = loadExistingData(spreadsheet);

  // 일일 인증 횟수 추적
  const dailyCertCounts = {};

  // 기존 records에서 오늘 인증 횟수 계산
  if (existingData.records) {
    existingData.records.forEach(record => {
      if (record.date === today) {
        const key = `${record.nickname}|${today}|${record.category}`;
        dailyCertCounts[key] = (dailyCertCounts[key] || 0) + 1;
      }
    });
  }

  let newRecordsCount = 0;
  let totalNewExp = 0;

  // 채팅 로그 처리
  chatLogs.forEach(log => {
    const nickname = log.username.trim();
    const message = log.chat;

    // 카테고리 찾기
    const category = findCategory(message);
    if (!category) return;

    // 일일 제한 체크
    const dailyKey = `${nickname}|${today}|${category}`;
    const currentCount = dailyCertCounts[dailyKey] || 0;
    const dailyLimit = CERT_CATEGORIES[category].dailyLimit;

    if (currentCount >= dailyLimit) {
      console.log(`[일일 제한 초과] ${nickname} - ${category}: ${currentCount}/${dailyLimit}`);
      return;
    }

    // 중복 체크 (같은 메시지가 이미 있는지)
    const isDuplicate = existingData.records && existingData.records.some(r =>
      r.date === today &&
      r.nickname === nickname &&
      r.message === message.trim()
    );

    if (isDuplicate) {
      console.log(`[중복 스킵] ${nickname}: ${message.substring(0, 30)}...`);
      return;
    }

    // 새 레코드 생성
    const baseExp = CERT_CATEGORIES[category].exp;
    const record = {
      date: today,
      time: currentTime,
      nickname: nickname,
      message: message.trim(),
      category: category,
      tag: extractTag(message, category),
      baseExp: baseExp,
      expMultiplier: 1,
      exp: baseExp,
      isEventBoost: false,
      isValidMorning: category === 'morning' ? true : null,
      isValidComeback: category === 'comeback' ? true : null,
      comebackBonusExp: 0,
      targetWakeTime: null,
      isOverDailyLimit: false,
      dailyCertNum: currentCount + 1,
    };

    // 데이터에 추가
    if (!existingData.records) existingData.records = [];
    existingData.records.push(record);

    // 멤버 데이터 업데이트
    if (!existingData.members) existingData.members = {};
    if (!existingData.members[nickname]) {
      existingData.members[nickname] = {
        records: [],
        totalCount: 0,
        totalExp: 0,
        categoryCount: {
          cleaning: 0, exercise: 0, morning: 0, planning: 0,
          study: 0, medicine: 0, diary: 0, meditation: 0, comeback: 0
        }
      };
    }

    existingData.members[nickname].records.push(record);
    existingData.members[nickname].totalCount++;
    existingData.members[nickname].totalExp += baseExp;
    existingData.members[nickname].categoryCount[category]++;

    // 일일 카운트 증가
    dailyCertCounts[dailyKey] = currentCount + 1;

    newRecordsCount++;
    totalNewExp += baseExp;

    console.log(`[인증 추가] ${nickname} - ${category} (+${baseExp} EXP)`);
  });

  // 전체 통계 업데이트
  existingData.totalCount = (existingData.totalCount || 0) + newRecordsCount;
  existingData.totalExp = (existingData.totalExp || 0) + totalNewExp;
  existingData.lastUpdated = koreaTime.toISOString();

  // 데이터 저장
  if (newRecordsCount > 0) {
    saveData(spreadsheet, existingData);
  }

  return createResponse({
    success: true,
    message: `${newRecordsCount}건의 인증이 처리되었습니다. (+${totalNewExp} EXP)`,
    newRecords: newRecordsCount,
    newExp: totalNewExp
  });
}

// ========== 기존 데이터 로드 ==========
function loadExistingData(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Data');
  if (!sheet) {
    return { records: [], members: {}, totalCount: 0, totalExp: 0 };
  }

  const chunkCount = sheet.getRange('B1').getValue();
  let jsonStr = '';

  if (chunkCount && typeof chunkCount === 'number' && chunkCount > 0) {
    for (let i = 1; i <= chunkCount; i++) {
      const chunk = sheet.getRange(i, 1).getValue();
      if (chunk) jsonStr += chunk;
    }
  } else {
    jsonStr = sheet.getRange('A1').getValue();
  }

  if (!jsonStr) {
    return { records: [], members: {}, totalCount: 0, totalExp: 0 };
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.log('기존 데이터 파싱 실패:', e.message);
    return { records: [], members: {}, totalCount: 0, totalExp: 0 };
  }
}

// ========== 데이터 저장 ==========
function saveData(spreadsheet, data) {
  let sheet = spreadsheet.getSheetByName('Data');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Data');
  }

  const jsonStr = JSON.stringify(data);
  const CHUNK_SIZE = 40000;
  const chunks = [];

  for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
    chunks.push(jsonStr.substring(i, i + CHUNK_SIZE));
  }

  // 기존 데이터 클리어
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow > 0) {
    sheet.getRange(1, 1, lastRow, 1).clearContent();
  }

  // 청크별 저장
  chunks.forEach((chunk, index) => {
    sheet.getRange(index + 1, 1).setValue(chunk);
  });

  sheet.getRange('B1').setValue(chunks.length);
  sheet.getRange('C1').setValue(new Date().toISOString());

  console.log(`데이터 저장 완료: ${chunks.length}개 청크, ${jsonStr.length}자`);
}
