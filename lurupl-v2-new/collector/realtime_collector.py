"""
루루플 V2 - 카카오톡 실시간 인증 수집기

카카오톡 PC 창에서 인증 메시지를 자동 감지하고
Supabase에 실시간으로 저장합니다.

사용법:
1. pip install pywin32 uiautomation supabase python-dotenv
2. .env 파일에 Supabase 정보 설정
3. 카카오톡 PC에서 대상 채팅방 열기
4. python realtime_collector.py
"""

import time
import re
import os
from datetime import datetime
from collections import deque
from dotenv import load_dotenv

try:
    import win32gui
    import uiautomation as auto
    from supabase import create_client, Client
except ImportError as e:
    print("필수 라이브러리 설치 필요:")
    print("pip install pywin32 uiautomation supabase python-dotenv")
    print(f"오류: {e}")
    exit(1)

# .env 파일 로드 (collector 폴더 또는 상위 폴더)
load_dotenv()  # 현재 폴더
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))  # 상위 폴더

# Supabase 설정
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Supabase 환경변수가 설정되지 않았습니다.")
    print("SUPABASE_URL 과 SUPABASE_SERVICE_KEY 또는 SUPABASE_ANON_KEY를 설정하세요.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 설정
CONFIG = {
    'check_interval': 2,        # 체크 주기 (초)
    'batch_interval': 10,       # 배치 저장 주기 (초)
}

# 카테고리별 해시태그
CATEGORIES = {
    'cleaning': {
        'tags': ['#청소', '#방청소', '#정리', '#설거지', '#빨래', '#집안일'],
        'base_exp': 2,
        'daily_limit': 3,
    },
    'exercise': {
        'tags': ['#운동', '#헬스', '#러닝', '#산책', '#식단'],
        'base_exp': 3,
        'daily_limit': 2,
    },
    'morning': {
        'tags': ['#기상', '#굿모닝', '#아침'],
        'base_exp': 2,
        'daily_limit': 1,
    },
    'planning': {
        'tags': ['#계획', '#계획표', '#투두', '#todo', '#할일'],
        'base_exp': 3,
        'daily_limit': 1,
    },
    'study': {
        'tags': ['#공부', '#스터디', '#독서', '#학습'],
        'base_exp': 3,
        'daily_limit': 3,
    },
    'medicine': {
        'tags': ['#약', '#복약', '#약먹기', '#영양제'],
        'base_exp': 1,
        'daily_limit': 1,
    },
    'diary': {
        'tags': ['#일기', '#감사일기', '#회고', '#하루기록'],
        'base_exp': 2,
        'daily_limit': 1,
    },
    'meditation': {
        'tags': ['#명상', '#마음챙김', '#호흡'],
        'base_exp': 2,
        'daily_limit': 2,
    },
    'comeback': {
        'tags': ['#복귀', '#컴백', '#돌아왔어'],
        'base_exp': 3,
        'daily_limit': 999,
    },
}

# 모든 해시태그
ALL_TAGS = []
for cat_data in CATEGORIES.values():
    ALL_TAGS.extend(cat_data['tags'])
TAG_PATTERN = re.compile('|'.join(re.escape(tag) for tag in ALL_TAGS), re.IGNORECASE)


def find_category(message: str) -> tuple:
    """메시지에서 카테고리와 태그 찾기"""
    lower_msg = message.lower()
    for cat_key, cat_data in CATEGORIES.items():
        for tag in cat_data['tags']:
            if tag.lower() in lower_msg:
                return cat_key, tag
    return None, None


class RealtimeCollector:
    def __init__(self):
        self.seen_messages = deque(maxlen=1000)
        self.pending_certs = []
        self.last_batch_time = time.time()
        self.member_cache = {}  # nickname -> member_id
        self.daily_counts = {}  # "member_id|date|category" -> count

    def find_kakao_window(self):
        """카카오톡 채팅창 찾기"""
        windows = []

        def enum_callback(hwnd, results):
            if win32gui.IsWindowVisible(hwnd):
                title = win32gui.GetWindowText(hwnd)
                class_name = win32gui.GetClassName(hwnd)
                if 'EVA_Window' in class_name or '카카오톡' in title:
                    results.append((hwnd, title, class_name))
            return True

        win32gui.EnumWindows(enum_callback, windows)
        return windows

    def get_chat_text(self, hwnd):
        """UI Automation으로 채팅 텍스트 추출"""
        try:
            control = auto.ControlFromHandle(hwnd)
            if not control:
                return []

            texts = []

            def search_texts(ctrl, depth=0):
                if depth > 10:
                    return
                try:
                    name = ctrl.Name
                    if name and len(name) > 3:
                        texts.append(name)
                    for child in ctrl.GetChildren():
                        search_texts(child, depth + 1)
                except:
                    pass

            search_texts(control)
            return texts
        except Exception as e:
            return []

    def parse_message(self, text: str) -> dict:
        """카카오톡 메시지 파싱"""
        # 패턴: [닉네임] [오전/오후 HH:MM] 메시지
        pattern = r'\[([^\]]+)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.*)'
        match = re.search(pattern, text)

        if not match:
            return None

        nickname = match.group(1).strip()
        ampm = match.group(2)
        hour = int(match.group(3))
        minute = match.group(4)
        content = match.group(5).strip()

        # 12시간 -> 24시간 변환
        if ampm == '오후' and hour != 12:
            hour += 12
        elif ampm == '오전' and hour == 12:
            hour = 0

        time_str = f"{hour:02d}:{minute}"
        date_str = datetime.now().strftime('%Y-%m-%d')

        # 카테고리 찾기
        category, tag = find_category(content)
        if not category:
            return None

        return {
            'nickname': nickname,
            'date': date_str,
            'time': time_str,
            'message': content,
            'category': category,
            'tag': tag,
        }

    def get_or_create_member(self, nickname: str) -> str:
        """멤버 ID 가져오기 (없으면 생성)"""
        if nickname in self.member_cache:
            return self.member_cache[nickname]

        # DB에서 찾기
        result = supabase.table('members').select('id').eq('display_name', nickname).execute()

        if result.data:
            member_id = result.data[0]['id']
        else:
            # 새 멤버 생성
            insert_result = supabase.table('members').insert({
                'display_name': nickname,
                'is_active': True,
            }).execute()
            member_id = insert_result.data[0]['id']
            print(f"[새 멤버] {nickname}")

        self.member_cache[nickname] = member_id
        return member_id

    def check_daily_limit(self, member_id: str, date: str, category: str) -> tuple:
        """일일 한도 체크"""
        key = f"{member_id}|{date}|{category}"
        current_count = self.daily_counts.get(key, 0)
        limit = CATEGORIES[category]['daily_limit']

        self.daily_counts[key] = current_count + 1

        is_over = current_count >= limit
        return is_over, current_count + 1

    def save_certification(self, cert: dict):
        """인증을 Supabase에 저장"""
        try:
            member_id = self.get_or_create_member(cert['nickname'])
            is_over, daily_num = self.check_daily_limit(
                member_id, cert['date'], cert['category']
            )

            base_exp = CATEGORIES[cert['category']]['base_exp']
            final_exp = 0 if is_over else base_exp

            # 인증 저장
            data = {
                'member_id': member_id,
                'category_key': cert['category'],
                'cert_date': cert['date'],
                'cert_time': cert['time'],
                'tag_used': cert['tag'],
                'raw_message': cert['message'],
                'base_exp': base_exp,
                'multiplier': 1.0,
                'final_exp': final_exp,
                'is_over_limit': is_over,
                'daily_cert_num': daily_num,
            }

            result = supabase.table('certifications').upsert(
                data,
                on_conflict='member_id,cert_date,cert_time,category_key'
            ).execute()

            status = "한도초과" if is_over else f"+{final_exp}EXP"
            print(f"[저장] {cert['nickname']} - {cert['category']} {status}")

            # 누적 EXP 업데이트
            if not is_over:
                self.update_accumulated_exp(member_id)

        except Exception as e:
            print(f"[오류] 저장 실패: {e}")

    def update_accumulated_exp(self, member_id: str):
        """멤버의 누적 EXP 업데이트"""
        try:
            result = supabase.table('certifications').select('final_exp').eq('member_id', member_id).execute()
            total_exp = sum(c['final_exp'] or 0 for c in result.data)

            supabase.table('members').update({
                'accumulated_exp': total_exp
            }).eq('id', member_id).execute()
        except Exception as e:
            print(f"[오류] EXP 업데이트 실패: {e}")

    def process_texts(self, texts: list):
        """텍스트 목록 처리"""
        for text in texts:
            if not text or not TAG_PATTERN.search(text):
                continue

            # 중복 체크
            msg_hash = hash(text[:100])
            if msg_hash in self.seen_messages:
                continue
            self.seen_messages.append(msg_hash)

            # 메시지 파싱
            cert = self.parse_message(text)
            if cert:
                self.pending_certs.append(cert)

    def flush_pending(self):
        """대기 중인 인증 저장"""
        for cert in self.pending_certs:
            self.save_certification(cert)
        self.pending_certs = []

    def run(self):
        """메인 실행 루프"""
        print("=" * 50)
        print("루루플 V2 - 실시간 인증 수집기")
        print("=" * 50)
        print(f"Supabase: {SUPABASE_URL[:30]}...")
        print(f"체크 주기: {CONFIG['check_interval']}초")
        print("종료하려면 Ctrl+C를 누르세요")
        print("=" * 50)

        while True:
            try:
                windows = self.find_kakao_window()

                if not windows:
                    print("\r카카오톡 창을 찾는 중...", end='', flush=True)
                    time.sleep(CONFIG['check_interval'])
                    continue

                # 각 창에서 텍스트 수집
                for hwnd, title, _ in windows:
                    texts = self.get_chat_text(hwnd)
                    if texts:
                        self.process_texts(texts)

                # 배치 저장
                if time.time() - self.last_batch_time > CONFIG['batch_interval']:
                    if self.pending_certs:
                        self.flush_pending()
                    self.last_batch_time = time.time()

                time.sleep(CONFIG['check_interval'])

            except KeyboardInterrupt:
                print("\n\n종료 중...")
                self.flush_pending()
                break
            except Exception as e:
                print(f"\n오류: {e}")
                time.sleep(5)


if __name__ == '__main__':
    collector = RealtimeCollector()
    collector.run()
