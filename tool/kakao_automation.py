import pyautokakao
import datetime 
import requests
import time
import json
import re

# CHATROOM_TITLE = "ADHD 집중력 구조대 🚨 ADHD 친목·루틴·인증"
CHATROOM_TITLE = "관리자방"    #방제
SCRAP_INTERVAL = 1            #스크립트 실행 주기

API_ENDPOINT = "https://script.google.com/macros/s/AKfycbzZhAgOpYY9hoaArj4hvXBl6_3GKqHhJxDl-joKzc57qNgLy3dEjl5_MZzjKGA_Uo755w/exec"
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
    data_json = {}
    data_json["password"] = ADMIN_PASSWORD
    data_json["chat_logs"] = chat_logs

    data_json = json.dumps(data_json)
    response = requests.post(
        url=API_ENDPOINT,
        json=data_json
    )

    if response.status_code == 200:
        print(response.text)
        return True 
    return False

while True:
    current_log = pyautokakao.read(CHATROOM_TITLE)
    chat_logs = parse_log(current_log)
    success = send_kakao_file(chat_logs)

    if not success:
        print("카톡 데이터 전송 실패")
    else:
        print("카톡 데이터 전송 성공")

    time.sleep(SCRAP_INTERVAL)