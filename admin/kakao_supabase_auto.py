"""
카카오톡 자동 수집 + Supabase 직접 연동 (완전 자동화 버전)
- pyautokakao.read()만 사용 (카톡 충돌 없음)
- 완전 자동: 실행만 하면 자동으로 수집
- Supabase DB에 직접 저장
- 시작 시 스크롤 백필: 마지막 수집 시점부터 과거 메시지 수집

설치:
    pip install pyautokakao supabase pyautogui
"""

import time
import re
import os
import sys
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple, List

# 패키지 확인
try:
    import pyautokakao
except ImportError:
    print("패키지 필요: pip install pyautokakao")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("패키지 필요: pip install supabase")
    sys.exit(1)

try:
    import pyautogui
    import pygetwindow as gw
    import pyperclip
    import win32gui
    import win32con
    # fail-safe 비활성화 (마우스가 모서리로 가도 에러 안 남)
    pyautogui.FAILSAFE = False
except ImportError:
    print("패키지 필요: pip install pyautogui pygetwindow pyperclip pywin32")
    sys.exit(1)

# 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'supabase_auto_config.json')

# 설정
CHATROOM_TITLE = "ADHD 인증방"
SCRAP_INTERVAL = 10  # 스크립트 실행 주기 (초)
BACKFILL_MAX_SCROLL = 500  # 백필 최대 스크롤 횟수 (안전장치)
BACKFILL_SCROLL_AMOUNT = 10  # 한 번에 스크롤하는 양
BACKFILL_SCROLL_DELAY = 0.15  # 스크롤 간 딜레이 (초) - 빠르게
DEBUG_MODE = False  # 디버그 모드

# 카테고리 정의
CATEGORIES = {
    'cleaning': {
        'name': '청소',
        'tags': ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
        'base_exp': 2,
        'daily_limit': 3,
    },
    'exercise': {
        'name': '운동',
        'tags': ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
        'base_exp': 3,
        'daily_limit': 2,
    },
    'morning': {
        'name': '기상',
        'tags': ['#기상', '#굿모닝', '#아침'],
        'base_exp': 2,
        'daily_limit': 1,
    },
    'planning': {
        'name': '계획',
        'tags': ['#계획', '#계획표', '#투두', '#todo', '#할일'],
        'base_exp': 3,
        'daily_limit': 1,
    },
    'study': {
        'name': '공부',
        'tags': ['#공부', '#스터디', '#독서', '#학습'],
        'base_exp': 3,
        'daily_limit': 3,
    },
    'medicine': {
        'name': '약',
        'tags': ['#약', '#복약', '#약먹기', '#약복용', '#영양제'],
        'base_exp': 1,
        'daily_limit': 1,
    },
    'diary': {
        'name': '일기',
        'tags': ['#일기', '#감사일기', '#하루기록', '#오늘하루', '#일상'],
        'base_exp': 2,
        'daily_limit': 1,
    },
    'meditation': {
        'name': '명상',
        'tags': ['#명상', '#마음챙김', '#호흡', '#묵상'],
        'base_exp': 2,
        'daily_limit': 2,
    },
    'comeback': {
        'name': '복귀',
        'tags': ['#복귀', '#컴백', '#돌아왔어'],
        'base_exp': 3,
        'cooldown_hours': 72,
    },
}

# 모든 태그
ALL_TAGS = []
for cat in CATEGORIES.values():
    ALL_TAGS.extend(cat['tags'])
TAG_PATTERN = re.compile('|'.join(re.escape(t) for t in ALL_TAGS), re.IGNORECASE)

# 메시지 패턴
MSG_PATTERN = re.compile(r'^\[(.+?)\]\s*\[(.+?)\]\s*(.*)$')


def log(message: str):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")


def load_config() -> dict:
    default = {
        'chatroom_title': CHATROOM_TITLE,
        'scrap_interval': SCRAP_INTERVAL,
        'supabase_url': '',
        'supabase_key': '',
        'backfill_max_scroll': BACKFILL_MAX_SCROLL,
        'backfill_enabled': True,
    }
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                default.update(saved)
    except:
        pass
    return default


def save_config(config: dict):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except:
        pass


def detect_category(content: str) -> Optional[Tuple[str, str, int]]:
    content_lower = content.lower()
    for key, cat in CATEGORIES.items():
        for tag in cat['tags']:
            if tag.lower() in content_lower:
                return (key, tag, cat['base_exp'])
    return None


def parse_msg_date(msg_date: str) -> str:
    """날짜 문자열을 YYYY-MM-DD 형식으로 변환

    형식 예시: "2026년 9월 29일 화요일" 또는 "2026년 9월 29일"
    """
    try:
        # 정규식으로 년월일 추출
        match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', msg_date)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3))
            return f"{year}-{month:02d}-{day:02d}"
    except:
        pass
    return datetime.now().strftime('%Y-%m-%d')


def parse_time(time_str: str) -> str:
    """시간 문자열을 HH:MM:SS 형식으로 변환"""
    try:
        parts = time_str.split()
        if len(parts) >= 2:
            ampm = parts[0]
            t = parts[1].split(':')
            h, m = int(t[0]), int(t[1]) if len(t) > 1 else 0
            if ampm == '오후' and h != 12:
                h += 12
            elif ampm == '오전' and h == 12:
                h = 0
            return f"{h:02d}:{m:02d}:00"
    except:
        pass
    return datetime.now().strftime('%H:%M:%S')


def find_window_by_title(title: str) -> int:
    """창 제목으로 핸들 찾기"""
    result = []

    def callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            window_title = win32gui.GetWindowText(hwnd)
            if title in window_title:
                result.append(hwnd)
        return True

    win32gui.EnumWindows(callback, None)
    return result[0] if result else 0


def activate_window(title: str) -> bool:
    """창 제목으로 찾아서 활성화 + 클릭"""
    try:
        hwnd = find_window_by_title(title)
        if hwnd:
            # 최소화 상태면 복원
            if win32gui.IsIconic(hwnd):
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            # 창을 최상위로
            win32gui.SetForegroundWindow(hwnd)
            time.sleep(0.1)

            # 창 위치 가져와서 클릭
            rect = win32gui.GetWindowRect(hwnd)
            center_x = (rect[0] + rect[2]) // 2
            center_y = (rect[1] + rect[3]) // 2
            pyautogui.click(center_x, center_y)
            return True
    except Exception as e:
        if DEBUG_MODE:
            log(f"[DEBUG] 창 활성화 오류: {e}")
    return False


class SupabaseAutoCollector:
    def __init__(self):
        self.config = load_config()
        self.supabase: Optional[Client] = None
        self.processed_messages: set = set()
        self.member_cache: Dict[str, str] = {}
        self.alias_cache: Dict[str, str] = {}
        self.stats = {'saved': 0, 'skipped': 0, 'errors': 0}
        self.running = True
        self.kakao_window = None  # 카카오톡 창 객체 저장
        self.chatroom_title = ""  # 채팅방 제목

    def get_last_cert_time(self) -> Optional[datetime]:
        """DB에서 마지막 인증 시간 조회"""
        if not self.supabase:
            return None

        try:
            result = self.supabase.table('certifications')\
                .select('cert_date, cert_time')\
                .order('cert_date', desc=True)\
                .order('cert_time', desc=True)\
                .limit(1)\
                .execute()

            if result.data and len(result.data) > 0:
                last = result.data[0]
                cert_date = last['cert_date']
                cert_time = last['cert_time']
                return datetime.strptime(f"{cert_date} {cert_time}", '%Y-%m-%d %H:%M:%S')
        except Exception as e:
            log(f"마지막 인증 시간 조회 오류: {e}")

        return None

    def find_kakao_window(self, chatroom: str, force_refresh: bool = False):
        """카카오톡 채팅방 창 찾기 - 정확한 제목 매칭 필수"""
        # 저장된 창이 있고 유효하면 재사용
        if not force_refresh and self.kakao_window:
            try:
                # 창이 아직 존재하는지 확인
                if self.kakao_window.isActive or self.kakao_window.isMinimized or self.kakao_window.visible:
                    return self.kakao_window
            except:
                self.kakao_window = None

        try:
            # 모든 창 가져오기
            all_windows = gw.getAllWindows()

            if DEBUG_MODE:
                log(f"[DEBUG] 열린 창 개수: {len(all_windows)}")

            # 1. 정확한 제목으로 먼저 시도
            for win in all_windows:
                if win.title and win.title.strip() == chatroom.strip():
                    if DEBUG_MODE:
                        log(f"[DEBUG] 창 찾음 (정확): {win.title}")
                    self.kakao_window = win
                    self.chatroom_title = win.title  # 실제 창 제목 저장
                    return win

            # 2. 제목에 채팅방 이름이 포함된 경우 (카카오톡 채팅창은 보통 정확한 제목)
            for win in all_windows:
                if win.title and chatroom in win.title:
                    # Figma, Chrome 등 다른 앱 제외
                    exclude_apps = ['Figma', 'Chrome', 'Edge', 'Firefox', 'Code', 'Visual Studio']
                    if not any(app in win.title for app in exclude_apps):
                        if DEBUG_MODE:
                            log(f"[DEBUG] 창 찾음 (포함): {win.title}")
                        self.kakao_window = win
                        self.chatroom_title = win.title
                        return win

            # 디버그: 관련 창 출력
            if DEBUG_MODE:
                log(f"[DEBUG] '{chatroom}' 창을 찾지 못함. 관련 창:")
                for w in all_windows:
                    if w.title and (chatroom in w.title or 'ADHD' in w.title or '인증' in w.title):
                        log(f"  - [{w.title}]")

        except Exception as e:
            if DEBUG_MODE:
                log(f"[DEBUG] 창 찾기 오류: {e}")
        return None

    def get_oldest_time_from_log(self, raw_log: str) -> Optional[datetime]:
        """로그에서 가장 오래된 메시지 시간 추출"""
        if not raw_log:
            return None

        # 날짜 블록으로 분리 (요일 포함 가능: "2026년 9월 29일 화요일")
        date_blocks = re.split(r'(?=\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', raw_log)

        oldest_time = None
        for block in date_blocks:
            block = block.strip()
            if not block:
                continue

            lines = block.split('\n')
            if len(lines) < 1:
                continue

            # 첫 줄에서 날짜 추출
            cert_date = parse_msg_date(lines[0])

            if DEBUG_MODE and oldest_time is None:
                log(f"[DEBUG] 블록 첫줄: {lines[0][:50]}")
                log(f"[DEBUG] 파싱된 날짜: {cert_date}")

            # 첫 번째 유효한 메시지의 시간 (가장 오래된 것)
            for line in lines[1:] if len(lines) > 1 else lines:
                line = line.strip()
                if not line:
                    continue
                match = MSG_PATTERN.match(line)
                if match:
                    time_str = match.group(2)
                    cert_time = parse_time(time_str)
                    try:
                        msg_time = datetime.strptime(f"{cert_date} {cert_time}", '%Y-%m-%d %H:%M:%S')
                        if DEBUG_MODE and oldest_time is None:
                            log(f"[DEBUG] 첫 메시지 시간: {time_str} -> {msg_time}")
                        if oldest_time is None or msg_time < oldest_time:
                            oldest_time = msg_time
                        break  # 이 블록의 첫 메시지만 확인
                    except Exception as e:
                        if DEBUG_MODE:
                            log(f"[DEBUG] 시간 파싱 오류: {e}")

        return oldest_time

    def read_chat(self, chatroom: str) -> str:
        """pyautokakao로 채팅 내용 읽기"""
        try:
            return pyautokakao.read(chatroom) or ""
        except Exception as e:
            if DEBUG_MODE:
                log(f"[DEBUG] 채팅 읽기 오류: {e}")
            return ""

    def export_chat_to_file(self, chatroom: str) -> Optional[str]:
        """Ctrl+S로 대화 내보내기 후 파일 경로 반환"""
        import tempfile

        try:
            # 저장할 파일 경로
            export_path = os.path.join(tempfile.gettempdir(), 'kakao_chat_export.txt')

            # 기존 파일 삭제
            if os.path.exists(export_path):
                os.remove(export_path)

            # 카카오톡 창 활성화
            if not activate_window(chatroom):
                log("채팅방 창을 찾을 수 없습니다")
                return None

            time.sleep(0.5)

            # Ctrl+S 전송 (대화 저장)
            log("대화 내보내기 중... (Ctrl+S)")
            pyautogui.hotkey('ctrl', 's')
            time.sleep(1)

            # "다른 이름으로 저장" 창 대기 및 파일명 입력
            for _ in range(10):  # 최대 5초 대기
                save_hwnd = find_window_by_title("다른 이름으로 저장")
                if save_hwnd:
                    break
                time.sleep(0.5)

            if not save_hwnd:
                log("저장 창을 찾을 수 없습니다")
                pyautogui.press('escape')
                return None

            time.sleep(0.3)

            # 파일 경로 입력 (클립보드 사용)
            pyperclip.copy(export_path)
            pyautogui.hotkey('ctrl', 'v')
            time.sleep(0.3)

            # Enter로 저장
            pyautogui.press('enter')
            time.sleep(1)

            # 덮어쓰기 확인 창 처리
            confirm_hwnd = find_window_by_title("다른 이름으로 저장 확인")
            if confirm_hwnd:
                pyautogui.press('enter')  # "예" 선택
                time.sleep(0.5)

            # 파일 생성 확인
            if os.path.exists(export_path):
                log(f"대화 내보내기 완료")
                return export_path
            else:
                log("파일 저장 실패")
                return None

        except Exception as e:
            log(f"대화 내보내기 오류: {e}")
            pyautogui.press('escape')
            return None

    def backfill_from_export(self, chatroom: str, last_cert_time: datetime) -> int:
        """내보낸 파일에서 백필"""
        # 대화 내보내기
        export_path = self.export_chat_to_file(chatroom)
        if not export_path:
            return 0

        return self.process_export_file(export_path, last_cert_time)

    def process_export_file(self, file_path: str, after_time: Optional[datetime] = None) -> int:
        """내보내기 파일 처리"""
        total_saved = 0

        try:
            # 파일 읽기
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 날짜 블록으로 분리 (형식: "--------------- 2026년 4월 30일 목요일 ---------------")
            date_blocks = re.split(r'(?=---+ \d{4}년 \d{1,2}월 \d{1,2}일)', content)

            log("과거 메시지 수집 중...")

            for block in date_blocks:
                block = block.strip()
                if not block:
                    continue

                # 내보내기 파일 형식 파싱
                saved = self.process_export_block(block, after_time)
                total_saved += saved

            log(f"파일 처리 완료")

        except Exception as e:
            log(f"파일 읽기 오류: {e}")

        return total_saved

    def process_export_block(self, block: str, after_time: Optional[datetime] = None) -> int:
        """내보내기 파일 블록 처리"""
        lines = block.split('\n')
        if not lines:
            return 0

        # 첫 줄에서 날짜 추출 (예: "--------------- 2026년 9월 28일 토요일 ---------------")
        date_match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', lines[0])
        if not date_match:
            return 0

        cert_date = f"{date_match.group(1)}-{int(date_match.group(2)):02d}-{int(date_match.group(3)):02d}"

        saved_count = 0

        # 메시지 처리 (예: "[홍길동] [오후 3:30] 메시지 내용")
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            match = MSG_PATTERN.match(line)
            if not match:
                continue

            username = match.group(1)
            time_str = match.group(2)
            chat = match.group(3).strip()

            cert_time = parse_time(time_str)

            # 시간 필터링 (after_time이 있으면)
            if after_time:
                try:
                    msg_datetime = datetime.strptime(f"{cert_date} {cert_time}", '%Y-%m-%d %H:%M:%S')
                    if msg_datetime <= after_time:
                        continue  # 이미 수집한 메시지 스킵
                except:
                    pass

            if self.process_chat(username, chat, cert_date, cert_time):
                saved_count += 1

        return saved_count

    def scroll_until_target(self, chatroom: str, target_time: datetime, max_scroll: int = BACKFILL_MAX_SCROLL) -> bool:
        """목표 시간까지 스크롤 (마지막 수집 시점까지)"""
        log(f"목표 시점까지 스크롤 중... (최대 {max_scroll}회)")

        try:
            # 채팅방 창 찾기
            win = self.find_kakao_window(chatroom)
            if not win:
                log("채팅방 창을 찾을 수 없습니다. 카카오톡에서 채팅방을 열어주세요.")
                return False

            scroll_count = 0
            last_oldest_time = None
            stuck_count = 0

            while scroll_count < max_scroll:
                # 창 제목으로 활성화
                activate_window(chatroom)
                time.sleep(0.2)

                # Page Up 5회
                for _ in range(5):
                    pyautogui.press('pageup')
                    time.sleep(BACKFILL_SCROLL_DELAY)
                    scroll_count += 1

                # pyautokakao로 현재 화면 내용 읽기
                time.sleep(0.5)
                try:
                    current_log = self.read_chat(chatroom)

                    if DEBUG_MODE and scroll_count == 5:
                        log(f"[DEBUG] 클립보드 내용 (처음 500자):")
                        print(repr(current_log[:500]) if current_log else "None")

                    oldest_time = self.get_oldest_time_from_log(current_log)

                    if DEBUG_MODE and scroll_count == 5:
                        log(f"[DEBUG] 파싱된 oldest_time: {oldest_time}")
                        log(f"[DEBUG] target_time: {target_time}")

                    if oldest_time:
                        if scroll_count % 50 == 0:
                            log(f"  스크롤 {scroll_count}회, 현재 위치: {oldest_time.strftime('%m/%d %H:%M')}")

                        if oldest_time <= target_time:
                            log(f"  목표 시점 도달! (스크롤 {scroll_count}회)")
                            time.sleep(0.5)
                            return True

                        if last_oldest_time and oldest_time == last_oldest_time:
                            stuck_count += 1
                            if stuck_count >= 3:
                                log(f"  더 이상 과거 메시지 없음 (스크롤 {scroll_count}회)")
                                return True
                        else:
                            stuck_count = 0

                        last_oldest_time = oldest_time

                except Exception as e:
                    if DEBUG_MODE:
                        log(f"[DEBUG] 스크롤 중 오류: {e}")

            log(f"  최대 스크롤 도달 ({max_scroll}회)")
            return True

        except Exception as e:
            log(f"스크롤 오류: {e}")
            return False

    def backfill_messages(self, chatroom: str, last_cert_time: Optional[datetime], max_scroll: int = BACKFILL_MAX_SCROLL) -> int:
        """시작 시 백필: 마지막 수집 시점 이후 메시지 수집"""
        if last_cert_time:
            time_str = last_cert_time.strftime('%Y-%m-%d %H:%M')
            log(f"마지막 수집 시점: {time_str}")
        else:
            log("이전 수집 기록 없음 - 화면에 보이는 메시지부터 수집")
            return 0

        # 목표 시점까지 스크롤 업
        if not self.scroll_until_target(chatroom, last_cert_time, max_scroll):
            return 0

        # 아래로 스크롤하면서 메시지 읽기 (화면에 보이는 것만 읽히므로)
        log("아래로 스크롤하며 메시지 수집 중...")
        total_saved = 0

        try:
            win = self.find_kakao_window(chatroom)
            if not win:
                log("[!] 백필 중 창을 찾을 수 없음")
                return 0

            # 창 활성화 및 마우스 위치
            win.activate()
            time.sleep(0.3)
            center_x = win.left + win.width // 2
            center_y = win.top + win.height // 2
            pyautogui.moveTo(center_x, center_y)

            scroll_down_count = 0
            consecutive_empty = 0

            while consecutive_empty < 10:
                # 창 제목으로 활성화
                activate_window(chatroom)
                time.sleep(0.2)

                # pyautokakao로 현재 화면 내용 읽기
                current_log = self.read_chat(chatroom)

                if DEBUG_MODE and scroll_down_count == 0:
                    log(f"[DEBUG] 백필 첫 읽기 (500자):")
                    print(repr(current_log[:500]) if current_log else "None")

                if current_log:
                    date_blocks = re.split(r'(?=\d{4}년\s*\d{1,2}월\s*\d{1,2}일)', current_log)
                    saved_this_round = 0

                    if DEBUG_MODE and scroll_down_count == 0:
                        log(f"[DEBUG] date_blocks 개수: {len(date_blocks)}")

                    for block in date_blocks:
                        block = block.strip()
                        if not block:
                            continue
                        saved = self.process_log_with_filter(block, last_cert_time)
                        saved_this_round += saved

                    total_saved += saved_this_round

                    if saved_this_round > 0:
                        consecutive_empty = 0
                    else:
                        consecutive_empty += 1
                else:
                    consecutive_empty += 1
                    if DEBUG_MODE and scroll_down_count < 3:
                        log(f"[DEBUG] current_log이 비어있음 (스크롤 {scroll_down_count})")

                # 아래로 스크롤 (Page Down)
                activate_window(chatroom)
                pyautogui.press('pagedown')
                time.sleep(BACKFILL_SCROLL_DELAY)
                scroll_down_count += 1

                # 진행상황 표시
                if scroll_down_count % 20 == 0:
                    log(f"  수집 진행: {total_saved}건 (스크롤 {scroll_down_count}회)")

                # 최대 스크롤 제한 (무한루프 방지)
                if scroll_down_count >= max_scroll:
                    break

            log(f"백필 완료: {total_saved}건 수집")
        except Exception as e:
            log(f"백필 오류: {e}")

        return total_saved

    def process_log_with_filter(self, raw_log: str, after_time: Optional[datetime]) -> int:
        """시간 필터링하여 로그 처리 (after_time 이후 메시지만)"""
        if not raw_log:
            return 0

        lines = raw_log.strip().split('\n')
        if len(lines) < 2:
            return 0

        # 첫 줄에서 날짜 파싱
        cert_date = parse_msg_date(lines[0])

        # 메시지 처리
        saved_count = 0
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            match = MSG_PATTERN.match(line)
            if not match:
                continue

            username = match.group(1)
            time_str = match.group(2)
            chat = match.group(3).strip()

            cert_time = parse_time(time_str)

            # 시간 필터링
            if after_time:
                try:
                    msg_datetime = datetime.strptime(f"{cert_date} {cert_time}", '%Y-%m-%d %H:%M:%S')
                    if msg_datetime <= after_time:
                        continue  # 이미 수집한 메시지 스킵
                except:
                    pass

            if self.process_chat(username, chat, cert_date, cert_time):
                saved_count += 1

        return saved_count

    def init_supabase(self) -> bool:
        url = self.config.get('supabase_url', '')
        key = self.config.get('supabase_key', '')

        if not url or not key:
            log("Supabase URL/Key 필요")
            return False

        try:
            self.supabase = create_client(url, key)
            self.supabase.table('members').select('id').limit(1).execute()
            log("Supabase 연결 성공")
            return True
        except Exception as e:
            log(f"Supabase 연결 실패: {e}")
            return False

    def load_member_cache(self):
        if not self.supabase:
            return

        try:
            members = self.supabase.table('members').select('id, display_name').eq('is_active', True).execute()
            for m in members.data:
                self.member_cache[m['display_name']] = m['id']

            aliases = self.supabase.table('member_aliases').select('member_id, kakao_nickname').execute()
            for a in aliases.data:
                self.alias_cache[a['kakao_nickname']] = a['member_id']

            log(f"멤버 {len(self.member_cache)}명, 별칭 {len(self.alias_cache)}개 로드")
        except Exception as e:
            log(f"캐시 로드 오류: {e}")

    def get_member_id(self, nickname: str) -> Optional[str]:
        if nickname in self.alias_cache:
            return self.alias_cache[nickname]
        if nickname in self.member_cache:
            return self.member_cache[nickname]
        return None

    def process_chat(self, username: str, chat: str, cert_date: str, cert_time: str) -> bool:
        """채팅 메시지 처리 및 DB 저장"""
        # 인증 태그 확인
        if not TAG_PATTERN.search(chat):
            return False

        # 중복 체크
        msg_key = f"{cert_date}:{username}:{chat[:50]}"
        if msg_key in self.processed_messages:
            return False

        # 카테고리 감지
        detected = detect_category(chat)
        if not detected:
            self.processed_messages.add(msg_key)
            return False

        category_key, tag_used, base_exp = detected

        # 멤버 ID 조회
        member_id = self.get_member_id(username)
        if not member_id:
            log(f"  [!] 미등록: {username}")
            self.stats['skipped'] += 1
            self.processed_messages.add(msg_key)
            return False

        # 일일 제한 체크
        is_over_limit = False
        daily_limit = CATEGORIES[category_key].get('daily_limit', 999)
        daily_count = 0

        try:
            existing = self.supabase.table('certifications')\
                .select('id')\
                .eq('member_id', member_id)\
                .eq('category_key', category_key)\
                .eq('cert_date', cert_date)\
                .gt('final_exp', 0)\
                .execute()

            daily_count = len(existing.data) if existing.data else 0
            if daily_count >= daily_limit:
                is_over_limit = True
        except:
            pass

        final_exp = 0 if is_over_limit else base_exp

        # DB 저장 (RLS 우회를 위해 함수 사용)
        try:
            # insert_certification 함수 사용
            result = self.supabase.rpc('insert_certification', {
                'p_member_id': member_id,
                'p_category_key': category_key,
                'p_cert_date': cert_date,
                'p_cert_time': cert_time,
                'p_tag_used': tag_used,
                'p_base_exp': base_exp,
                'p_final_exp': final_exp,
                'p_is_over_limit': is_over_limit,
                'p_daily_cert_num': daily_count + 1,
            }).execute()

            if final_exp > 0:
                self.supabase.rpc('increment_member_exp', {
                    'p_member_id': member_id,
                    'p_exp': final_exp
                }).execute()

            self.processed_messages.add(msg_key)

            exp_str = f"+{final_exp}EXP" if final_exp > 0 else "(제한초과)"
            log(f"  [+] {username} {CATEGORIES[category_key]['name']} {exp_str}")
            self.stats['saved'] += 1
            return True

        except Exception as e:
            error_str = str(e).lower()
            if 'duplicate' in error_str or '23505' in error_str:
                self.processed_messages.add(msg_key)
                return False
            else:
                log(f"  저장 오류: {e}")
                self.stats['errors'] += 1
                return False

    def process_log(self, raw_log: str) -> int:
        """pyautokakao 로그 처리"""
        if not raw_log:
            return 0

        lines = raw_log.strip().split('\n')
        if len(lines) < 2:
            return 0

        # 첫 줄에서 날짜 파싱
        cert_date = parse_msg_date(lines[0])

        # 메시지 처리
        saved_count = 0
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            # [닉네임] [시간] 채팅 패턴 매칭
            match = MSG_PATTERN.match(line)
            if not match:
                continue

            username = match.group(1)
            time_str = match.group(2)
            chat = match.group(3).strip()

            cert_time = parse_time(time_str)

            if self.process_chat(username, chat, cert_date, cert_time):
                saved_count += 1

        return saved_count

    def run(self):
        print("=" * 55)
        print("  카카오톡 → Supabase 완전 자동 수집기")
        print("=" * 55)
        print()
        print("  pyautokakao.read() 사용 - 카톡 충돌 없음")
        print()

        # Supabase 설정
        if not self.config.get('supabase_url'):
            self.config['supabase_url'] = input("Supabase URL: ").strip()
            self.config['supabase_key'] = input("Supabase Key: ").strip()
            save_config(self.config)

        # 채팅방 설정
        if not self.config.get('chatroom_title'):
            self.config['chatroom_title'] = input("카카오톡 채팅방 이름: ").strip()
            save_config(self.config)

        chatroom = self.config.get('chatroom_title', CHATROOM_TITLE)
        interval = self.config.get('scrap_interval', SCRAP_INTERVAL)

        if not self.init_supabase():
            input("\nEnter로 종료...")
            return

        self.load_member_cache()

        print()
        print("=" * 55)
        print(f"  채팅방: {chatroom}")
        print(f"  수집 간격: {interval}초")
        print()
        print("  카카오톡 PC버전이 실행 중이어야 합니다!")
        print("  Ctrl+C로 종료")
        print("=" * 55)
        print()

        # 시작 시 백필: Ctrl+S로 대화 내보내기 후 파일 읽기
        if self.config.get('backfill_enabled', True):
            last_cert_time = self.get_last_cert_time()
            if last_cert_time:
                log(f"마지막 수집 시점: {last_cert_time.strftime('%Y-%m-%d %H:%M')}")
                backfill_count = self.backfill_from_export(chatroom, last_cert_time)
                if backfill_count > 0:
                    log(f"백필 수집 완료: {backfill_count}건")
            else:
                log("이전 수집 기록 없음")

        print()
        log("실시간 자동 수집 시작...")

        try:
            while self.running:
                try:
                    # pyautokakao로 채팅 읽기
                    current_log = pyautokakao.read(chatroom)

                    if current_log:
                        count = self.process_log(current_log)
                        if count > 0:
                            log(f"=> {count}건 저장 완료 (총 {self.stats['saved']}건)")

                except Exception as e:
                    error_str = str(e)
                    if "창을 찾을 수 없습니다" in error_str or "찾을 수 없습니다" in error_str:
                        log(f"채팅방을 찾을 수 없습니다: {chatroom}")
                    else:
                        log(f"오류: {e}")

                time.sleep(interval)

        except KeyboardInterrupt:
            pass

        self.running = False
        print()
        log(f"종료 - 저장 {self.stats['saved']}건, 스킵 {self.stats['skipped']}건, 오류 {self.stats['errors']}건")


def main():
    collector = SupabaseAutoCollector()
    collector.run()


if __name__ == '__main__':
    main()
