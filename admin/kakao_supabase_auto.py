"""
카카오톡 자동 수집 + Supabase 직접 연동 (완전 자동화 버전)
- pyautokakao.read()만 사용 (카톡 충돌 없음)
- 완전 자동: 실행만 하면 자동으로 수집
- Supabase DB에 직접 저장

설치:
    pip install pyautokakao supabase
"""

import time
import re
import os
import sys
import json
from datetime import datetime
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

# 경로
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'supabase_auto_config.json')

# 설정
CHATROOM_TITLE = "ADHD 집중력 구조대 🚨 | ADHD 친목·루틴·인증·고민방"
SCRAP_INTERVAL = 10  # 스크립트 실행 주기 (초)

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
    """날짜 문자열을 YYYY-MM-DD 형식으로 변환"""
    try:
        parts = msg_date.split(' ')
        year = parts[0].replace('년', '')
        month = parts[1].replace('월', '')
        day = parts[2].replace('일', '')
        return f"{year}-{int(month):02d}-{int(day):02d}"
    except:
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


class SupabaseAutoCollector:
    def __init__(self):
        self.config = load_config()
        self.supabase: Optional[Client] = None
        self.processed_messages: set = set()
        self.member_cache: Dict[str, str] = {}
        self.alias_cache: Dict[str, str] = {}
        self.stats = {'saved': 0, 'skipped': 0, 'errors': 0}
        self.running = True

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

        log("자동 수집 시작...")

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
