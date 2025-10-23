@echo off
title Monitor Web - Server + Ngrok
color 0a

echo ==========================================
echo     🌐 Pornire server Node.js + Ngrok
echo ==========================================
echo.

:: 1️⃣ Pornește serverul Node.js în fundal
echo 🚀 Pornesc serverul Node.js...
start "Node Server" cmd /k "node server.js"

:: 2️⃣ Pauză scurtă ca să pornească serverul
timeout /t 3 >nul

:: 3️⃣ Pornește Ngrok pentru portul 3000
echo 🔗 Pornesc tunelul Ngrok...
start "Ngrok" cmd /k "ngrok http 3000"

echo.
echo ==========================================
echo ✅ Totul este pornit!
echo 👉 Server local: http://localhost:3000
echo 👉 Tunel public (Ngrok): se va afișa în fereastra Ngrok
echo ==========================================
echo.

pause
exit
