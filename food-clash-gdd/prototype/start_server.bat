@echo off
cd /d "%~dp0"
echo Food Clash prototype: http://localhost:8080
start "" http://localhost:8080
python -m http.server 8080
