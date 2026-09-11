@echo off
title EngSpeak - English Speaking Coach [Dev Server Active]
cd /d "%~dp0"

cls
echo ====================================================================
echo   ENGSPEAK DEV SERVER - TU DONG CAP NHAT CODE (HOT RELOAD)
echo ====================================================================
echo.
echo   [!] HUONG DAN DE CHI CAN BAM F5:
echo   - Giu nguyen cua so nay chay an (Thu nho xuong Taskbar, KHONG dong).
echo   - Server se tu dong phat hien moi thay doi cua AI trong vai giay.
echo   - Ban chi can quay lai trinh duyet va bam F5 (hoac Ctrl + F5).
echo.
echo ====================================================================
echo.

start "" http://localhost:3000
pnpm dev
