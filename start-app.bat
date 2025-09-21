@echo off
echo 🚀 Starting Event Discovery Calendar App...
echo.

REM Copy node.exe to the expected location for expo
if not exist "node_modules\.bin\node.exe" (
    echo 📋 Setting up Node.js for Expo...
    copy "C:\Program Files\nodejs\node.exe" "node_modules\.bin\node.exe"
)

echo ✅ Setup complete!
echo.

REM Start the app
echo 📱 Opening app in browser...
node_modules\.bin\expo.cmd start --web --host localhost --port 19006

pause
