import pyautokakao
import time
import re

CHATROOM_TITLE = "ADHD 집중력 구조대 🚨 ADHD 친목·루틴·인증"

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
            chat_log["chat"] = chat
            chat_logs.append(chat_log)

    return chat_logs
    
def parse_log(log):
    log = log.split('\n')

    msg_date = log[0]
    msg_date = parse_msg_date(msg_date)

    chat_logs = get_chat_logs(log)
    return chat_logs

current_log = pyautokakao.read(CHATROOM_TITLE)
chat_logs = parse_log(current_log)
print(chat_logs)