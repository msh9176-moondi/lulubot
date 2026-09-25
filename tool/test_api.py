import requests
import json

API_ENDPOINT = "https://script.google.com/macros/s/AKfycbyUYWKfcNu8nQ1J4ENyuyd5NCnwgd1aBcajhuWd3-ZIOrcT9SA7Zy5uAseABFVhlL8C/exec"
ADMIN_PASSWORD = 'lurupl2024'

# 테스트 데이터
test_data = {
    "password": ADMIN_PASSWORD,
    "chat_logs": [
        {"username": "테스트유저", "chat": "#기상 좋은 아침!"},
        {"username": "테스트유저2", "chat": "#운동 오늘 헬스장 다녀왔어요"},
        {"username": "테스트유저", "chat": "#공부 열심히 공부중"}
    ]
}

print("테스트 데이터 전송 중...")
print(f"전송 데이터: {json.dumps(test_data, ensure_ascii=False, indent=2)}")

response = requests.post(
    url=API_ENDPOINT,
    json=test_data,
    headers={"Content-Type": "application/json"}
)

print(f"\n응답 코드: {response.status_code}")
print(f"응답 내용: {response.text}")
