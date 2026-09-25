import pyautokakao
import datetime 
import requests
import time
import json
import re

# CHATROOM_TITLE = "ADHD 집중력 구조대 🚨 ADHD 친목·루틴·인증"
CHATROOM_TITLE = "ADHD 집중력 구조대 🚨 | ADHD 친목·루틴·인증·고민방"    #방제
SCRAP_INTERVAL = 10            #스크립트 실행 주기 (초)

API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUYWKfcNu8nQ1J4ENyuyd5NCnwgd1aBcajhuWd3-ZIOrcT9SA7Zy5uAseABFVhlL8C/exec"
ADMIN_PASSWORD = 'lurupl2024'

def parse_msg_date(msg_date):
    msg_date = msg_date.split(' ')

    year = msg_date[0][:-1]
    month = msg_date[1][:-1]
    day = msg_date[2][:-1]

    return {
        "year": year,
        "month": month,
        "day": day
    }

def get_chat_logs(log):
    chat_logs = []

    if len(log) == 1:
        return None

    for line in log[1:]:
        chat_log = {}
        matched = re.match(r'\[(.+?)\]\s*\[.+?\]\s*(.*)', line)

        if matched:
            username, chat = matched.group(1), matched.group(2)
            chat_log["username"] = username
            chat_log["chat"] = chat.strip()
            chat_logs.append(chat_log)

    return chat_logs
    
def parse_log(log):
    log = log.split('\n')

    msg_date = log[0]
    msg_date = parse_msg_date(msg_date)

    chat_logs = get_chat_logs(log)
    return chat_logs

def send_kakao_file(chat_logs):
    if not chat_logs:
        return True  # 빈 로그는 성공으로 처리

    data = {
        "password": ADMIN_PASSWORD,
        "chat_logs": chat_logs
    }

    response = requests.post(
        url=API_ENDPOINT,
        json=data,  # requests가 자동으로 JSON 직렬화
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 200:
        print(response.text)
        return True
    print(f"HTTP Error: {response.status_code}")
    return False

# 이미 처리된 메시지 추적
processed_messages = set()

while True:
    try:
        current_log = pyautokakao.read(CHATROOM_TITLE)
        chat_logs = parse_log(current_log)

        if chat_logs:
            # 새로운 메시지만 필터링
            new_logs = []
            for log in chat_logs:
                msg_key = f"{log['username']}:{log['chat']}"
                if msg_key not in processed_messages:
                    new_logs.append(log)
                    processed_messages.add(msg_key)

            if new_logs:
                success = send_kakao_file(new_logs)
                if success:
                    print(f"새 메시지 {len(new_logs)}건 전송 완료")
                else:
                    print("카톡 데이터 전송 실패")
                    # 실패 시 다시 시도할 수 있도록 제거
                    for log in new_logs:
                        msg_key = f"{log['username']}:{log['chat']}"
                        processed_messages.discard(msg_key)

    except Exception as e:
        print(f"오류 발생: {e}")

    time.sleep(SCRAP_INTERVAL)