@echo off
echo Starting Metro with increased memory limit...
set NODE_OPTIONS=--max-old-space-size=8192
npx react-native start --reset-cache