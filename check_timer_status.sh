#!/bin/bash

# Quick Timer Status Check Script
# Run this anytime to check if persistent timer is alive

echo "🔍 BrainBites Persistent Timer Status Check"
echo "=========================================="

# Check notification exists
NOTIFICATION_COUNT=$(adb shell "dumpsys notification | grep -c 'pkg=com.brainbitescabby.app.*id=1001'" 2>/dev/null)
if [ "$NOTIFICATION_COUNT" -gt 0 ]; then
    echo "✅ Persistent Timer Notification: ACTIVE"

    # Get notification details
    NOTIFICATION_DETAILS=$(adb shell "dumpsys notification | grep -A15 'pkg=com.brainbitescabby.app.*id=1001'" 2>/dev/null)
    echo "📋 Notification Details:"
    echo "$NOTIFICATION_DETAILS" | grep -E "(when=|flags=|channel=)" | head -5
else
    echo "❌ Persistent Timer Notification: NOT FOUND"
fi

echo ""

# Check app process
APP_PROCESSES=$(adb shell "ps | grep com.brainbitescabby.app" 2>/dev/null)
if [ ! -z "$APP_PROCESSES" ]; then
    echo "✅ App Process: RUNNING"
    echo "📋 Process Details:"
    echo "$APP_PROCESSES" | awk '{print "   PID: "$2" | Name: "$9}'
else
    echo "❌ App Process: NOT RUNNING"
fi

echo ""

# Check foreground service
SERVICE_STATUS=$(adb shell "dumpsys activity services | grep -A10 -B5 ScreenTimeService" 2>/dev/null)
if [ ! -z "$SERVICE_STATUS" ]; then
    echo "✅ Foreground Service: ACTIVE"
    echo "$SERVICE_STATUS" | grep -E "(ServiceRecord|app=|foreground=)" | head -3
else
    echo "❌ Foreground Service: NOT FOUND"
fi

echo ""

# Check battery optimization
BATTERY_OPT=$(adb shell "dumpsys deviceidle whitelist | grep com.brainbitescabby.app" 2>/dev/null)
if [ ! -z "$BATTERY_OPT" ]; then
    echo "✅ Battery Optimization: WHITELISTED"
else
    echo "⚠️  Battery Optimization: NOT WHITELISTED (may cause early termination)"
fi

echo ""

# Check recent kills or restarts
echo "📱 Recent ActivityManager Events:"
RECENT_KILLS=$(adb shell "logcat -d -s ActivityManager:I | grep -E '(Killing|Force stopping|START).*brainbitescabby' | tail -5" 2>/dev/null)
if [ ! -z "$RECENT_KILLS" ]; then
    echo "$RECENT_KILLS"
else
    echo "   No recent kill/start events found"
fi

echo ""

# System resource usage
echo "💾 Memory Usage:"
MEMORY_INFO=$(adb shell "dumpsys meminfo com.brainbitescabby.app | head -5" 2>/dev/null)
if [ ! -z "$MEMORY_INFO" ]; then
    echo "$MEMORY_INFO"
else
    echo "   Memory info not available"
fi

echo ""
echo "🔄 Run 'node monitor_persistent_timer.js' for continuous monitoring"