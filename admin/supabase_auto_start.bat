@echo off
chcp 65001 > nul
title 카카오톡 → Supabase 완전 자동 수집기

echo ==========================================
echo   카카오톡 완전 자동 수집기
echo ==========================================
echo.
echo   pyautokakao 사용 - 카톡 충돌 없음
echo.

cd /d "%~dp0"

REM 필요한 패키지 설치
echo 패키지 확인 중...
pip install pyautokakao supabase pyautogui pygetwindow pyperclip pywin32 -q

echo.
python kakao_supabase_auto.py

pause
