"""
카카오톡 자동 수집 + Supabase 직접 연동 (안정 버전)
- 클립보드 감시 방식 (카톡 충돌 없음)
- 카카오톡에서 Ctrl+A → Ctrl+C 하면 자동 수집
- Supabase DB에 직접 저장

설치:
    pip install pyperclip keyboard supabase
"""

import time
import re
import os
import sys
import json
import threading
from datetime import datetime
from typing import Optional, Dict, Tuple

# 패키지 확인
try:
    import pyperclip
    import keyboard
except ImportError:
    print("패키지 필요: pip install pyperclip keyboard")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("패키지 필요: pip install supabase")
    sys.exit(1)

# 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'supabase_collector_config.json')

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
DATE_PATTERN = re.compile(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일')


def log(message: str):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] {message}")


def load_config() -> dict:
    default = {
        'supabase_url': '',
        'supabase_key': '',
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


class SupabaseCollector:
    def __init__(self):
        self.config = load_config()
        self.supabase: Optional[Client] = None
        self.processed_messages: set = set()
        self.member_cache: Dict[str, str] = {}
        self.alias_cache: Dict[str, str] = {}
        self.stats = {'saved': 0, 'skipped': 0, 'errors': 0}
        self.running = True
        self.last_clipboard = ""
        self.current_date = datetime.now().strftime('%Y-%m-%d')

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

    def get_member_id(self, nickname: str, auto_register: bool = True) -> Optional[str]:
        """멤버 ID 조회 (없으면 자동 등록)"""
        if nickname in self.alias_cache:
            return self.alias_cache[nickname]
        if nickname in self.member_cache:
            return self.member_cache[nickname]

        # 자동 등록이 비활성화되어 있으면 None 반환
        if not auto_register:
            return None

        # RPC 함수로 멤버 조회/등록 (RLS 우회)
        try:
            result = self.supabase.rpc('register_member', {
                'p_nickname': nickname
            }).execute()

            if result.data:
                member_id = result.data
                log(f"  [*] 새 멤버 등록: {nickname}")
                self.member_cache[nickname] = member_id
                return member_id
        except Exception as e:
            log(f"  [!] 멤버 등록 실패 ({nickname}): {e}")

        return None

    def process_line(self, line: str, cert_date: str) -> bool:
        """한 줄 처리 및 DB 저장"""
        line = line.strip()
        if not line:
            return False

        # 인증 태그 확인
        if not TAG_PATTERN.search(line):
            return False

        # 메시지 패턴 매칭
        match = MSG_PATTERN.match(line)
        if not match:
            return False

        username = match.group(1)
        time_str = match.group(2)
        chat = match.group(3).strip()

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

        # 멤버 ID 조회 (없으면 자동 등록)
        member_id = self.get_member_id(username)
        if not member_id:
            log(f"  [!] 멤버 등록 실패: {username}")
            self.stats['skipped'] += 1
            self.processed_messages.add(msg_key)
            return False

        # 시간 파싱
        cert_time = datetime.now().strftime('%H:%M:%S')
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
                cert_time = f"{h:02d}:{m:02d}:00"
        except:
            pass

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

        # DB 저장
        try:
            cert_data = {
                'member_id': member_id,
                'category_key': category_key,
                'cert_date': cert_date,
                'cert_time': cert_time,
                'tag_used': tag_used,
                'base_exp': base_exp,
                'final_exp': final_exp,
                'is_over_limit': is_over_limit,
                'daily_cert_num': daily_count + 1,
            }

            self.supabase.table('certifications').insert(cert_data).execute()

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

    def process_clipboard(self, text: str) -> int:
        """클립보드 텍스트 처리"""
        if not text or text == self.last_clipboard:
            return 0

        self.last_clipboard = text
        lines = text.strip().split('\n')

        if len(lines) < 2:
            return 0

        # 날짜 파싱
        cert_date = datetime.now().strftime('%Y-%m-%d')
        for line in lines[:5]:  # 처음 몇 줄에서 날짜 찾기
            date_match = DATE_PATTERN.search(line)
            if date_match:
                y, m, d = date_match.groups()
                cert_date = f"{y}-{int(m):02d}-{int(d):02d}"
                break

        # 메시지 처리
        saved_count = 0
        for line in lines:
            if self.process_line(line, cert_date):
                saved_count += 1

        return saved_count

    def watch_clipboard(self):
        """클립보드 변경 감시"""
        while self.running:
            try:
                current = pyperclip.paste()
                if current and current != self.last_clipboard:
                    # 인증 태그가 있는 경우만 처리
                    if TAG_PATTERN.search(current) and len(current) > 30:
                        log("인증 메시지 감지!")
                        count = self.process_clipboard(current)
                        if count > 0:
                            log(f"=> {count}건 저장 완료 (총 {self.stats['saved']}건)")
            except:
                pass
            time.sleep(0.5)

    def manual_collect(self):
        """수동 수집 (F8)"""
        log("수동 수집...")
        try:
            text = pyperclip.paste()
            count = self.process_clipboard(text)
            if count > 0:
                log(f"=> {count}건 저장!")
            else:
                log("새 인증 없음")
        except Exception as e:
            log(f"오류: {e}")

    def show_stats(self):
        """통계 (F10)"""
        log(f"저장: {self.stats['saved']}건, 스킵: {self.stats['skipped']}건, 오류: {self.stats['errors']}건")

    def reload_members(self):
        """멤버 새로고침 (F12)"""
        log("멤버 새로고침...")
        self.load_member_cache()

    def run(self):
        print("=" * 55)
        print("  카카오톡 → Supabase 자동 수집기 (안정 버전)")
        print("=" * 55)
        print()
        print("  이 버전은 카카오톡에 직접 접근하지 않아")
        print("  카톡이 꺼지는 문제가 없습니다.")
        print()

        # Supabase 설정
        if not self.config.get('supabase_url'):
            self.config['supabase_url'] = input("Supabase URL: ").strip()
            self.config['supabase_key'] = input("Supabase Key: ").strip()
            save_config(self.config)

        if not self.init_supabase():
            input("\nEnter로 종료...")
            return

        self.load_member_cache()

        print()
        print("=" * 55)
        print("  사용법:")
        print("    1. 카카오톡 채팅방에서 Ctrl+A (전체선택)")
        print("    2. Ctrl+C (복사)")
        print("    3. 자동으로 인증이 수집됩니다!")
        print()
        print("  단축키:")
        print("    F8  = 수동 수집 (현재 클립보드)")
        print("    F10 = 통계")
        print("    F12 = 멤버 새로고침")
        print("    Esc = 종료")
        print("=" * 55)
        print()

        # 핫키 등록
        keyboard.add_hotkey('F8', self.manual_collect)
        keyboard.add_hotkey('F10', self.show_stats)
        keyboard.add_hotkey('F12', self.reload_members)

        # 클립보드 감시 스레드
        watcher = threading.Thread(target=self.watch_clipboard, daemon=True)
        watcher.start()

        log("대기 중... 카카오톡에서 채팅을 복사하세요!")
        print()

        try:
            keyboard.wait('esc')
        except KeyboardInterrupt:
            pass

        self.running = False
        print()
        log(f"종료 - 저장 {self.stats['saved']}건")


def main():
    collector = SupabaseCollector()
    collector.run()


if __name__ == '__main__':
    main()
