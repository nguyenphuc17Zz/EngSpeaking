@echo off
title EngSpeak - English Speaking Coach
cd /d "e:\EnglishSpeaking"

echo Starting EngSpeak server...
start "" http://localhost:3000
pnpm dev
