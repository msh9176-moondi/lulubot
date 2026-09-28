@echo off
chcp 65001 > nul
title 카카오톡 → Supabase 자동 수집기

echo ==========================================
echo   카카오톡 자동 수집기 (안정 버전)
echo ==========================================
echo.
echo   카톡 충돌 없이 안전하게 수집합니다.
echo.

cd /d "%~dp0"

REM 필요한 패키지 설치
echo 패키지 확인 중...
pip install pyperclip keyboard supabase -q

echo.
python kakao_supabase_collector.py

pause
