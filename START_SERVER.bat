@echo off
echo 研修ナレーションスタジオ - 開発サーバー起動中...
echo.
echo ブラウザで http://localhost:8080 が自動的に開きます
echo サーバーを停止するには Ctrl+C を押してください
echo.
cd src
start http://localhost:8080
python -m http.server 8080
