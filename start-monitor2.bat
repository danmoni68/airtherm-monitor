@echo off
cd C:\Users\sigb1\monitor-web
start cmd /k "node server.js"
timeout /t 3 >nul
start cmd /k "ngrok http 3000"
timeout /t 5 >nul
start http://localhost:3000/monitor.html
