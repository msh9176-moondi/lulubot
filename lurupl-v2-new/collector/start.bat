@echo off
echo 루루플 V2 - 실시간 인증 수집기
echo ================================
cd /d "%~dp0"

if not exist ".env" (
    echo .env 파일이 없습니다. .env.example을 복사하여 설정하세요.
    pause
    exit
)

python realtime_collector.py
pause
