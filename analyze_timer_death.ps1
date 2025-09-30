# Timer Death Analysis Script
# Helps identify why the persistent timer is being killed early

Write-Host "🔍 BrainBites Timer Death Analysis" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

function Test-BatteryOptimization {
    Write-Host "`n🔋 Battery Optimization Settings:" -ForegroundColor Yellow
    try {
        # Check if app is whitelisted from battery optimization
        $WhitelistStatus = adb shell "dumpsys deviceidle whitelist | grep com.brainbitescabby.app"
        if ($WhitelistStatus) {
            Write-Host "✅ App is whitelisted from battery optimization" -ForegroundColor Green
        } else {
            Write-Host "❌ App is NOT whitelisted (HIGH RISK for early termination)" -ForegroundColor Red
            Write-Host "💡 Solution: Add app to battery optimization whitelist" -ForegroundColor Yellow
        }

        # Check doze mode
        $DozeMode = adb shell "dumpsys deviceidle | grep mState"
        Write-Host "📱 Device idle state: $DozeMode"
    } catch {
        Write-Host "❌ Could not check battery optimization: $_" -ForegroundColor Red
    }
}

function Test-MemoryPressure {
    Write-Host "`n💾 Memory Pressure Analysis:" -ForegroundColor Yellow
    try {
        $MemInfo = adb shell "dumpsys meminfo | head -20"
        $AppMem = adb shell "dumpsys meminfo com.brainbitescabby.app"

        Write-Host "📊 System Memory Info:"
        $MemInfo | Select-String -Pattern "RAM|Available|Free" | ForEach-Object { Write-Host "   $_" }

        Write-Host "`n📱 App Memory Usage:"
        $AppMem | Select-String -Pattern "TOTAL|Native|Java" | Select-Object -First 5 | ForEach-Object { Write-Host "   $_" }

        # Check for memory pressure
        $LowMemKills = adb shell "logcat -d | grep -i 'low.*memory\|oom.*kill' | tail -5"
        if ($LowMemKills) {
            Write-Host "⚠️  Recent low memory/OOM kill events found:" -ForegroundColor Red
            $LowMemKills | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        } else {
            Write-Host "✅ No recent memory pressure events detected" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Could not analyze memory pressure: $_" -ForegroundColor Red
    }
}

function Test-AppStandby {
    Write-Host "`n⏸️  App Standby Settings:" -ForegroundColor Yellow
    try {
        $StandbyBuckets = adb shell "dumpsys usagestats | grep -A5 -B5 com.brainbitescabby.app"
        if ($StandbyBuckets -match "bucket.*(\d+)") {
            $BucketValue = $matches[1]
            $BucketName = switch ($BucketValue) {
                "10" { "ACTIVE (Good)" }
                "20" { "WORKING_SET (Good)" }
                "30" { "FREQUENT (OK)" }
                "40" { "RARE (BAD - may kill services)" }
                "50" { "NEVER (VERY BAD - will kill services)" }
                default { "Unknown ($BucketValue)" }
            }

            if ($BucketValue -ge 40) {
                Write-Host "❌ App is in $BucketName standby bucket (HIGH RISK)" -ForegroundColor Red
                Write-Host "💡 Solution: Use the app more frequently or disable app standby" -ForegroundColor Yellow
            } else {
                Write-Host "✅ App is in $BucketName standby bucket" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Could not determine app standby bucket" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Could not check app standby: $_" -ForegroundColor Red
    }
}

function Test-BackgroundLimitations {
    Write-Host "`n🚫 Background App Limitations:" -ForegroundColor Yellow
    try {
        # Check background app refresh
        $AppOpsInfo = adb shell "dumpsys appops | grep -A10 -B5 com.brainbitescabby.app"

        # Look for run-in-background restrictions
        if ($AppOpsInfo -match "RUN_IN_BACKGROUND.*deny") {
            Write-Host "❌ App is denied background execution (VERY HIGH RISK)" -ForegroundColor Red
            Write-Host "💡 Solution: Enable background app refresh for this app" -ForegroundColor Yellow
        } else {
            Write-Host "✅ No explicit background restrictions found" -ForegroundColor Green
        }

        # Check for recent force-stops
        $RecentKills = adb shell "logcat -d -s ActivityManager | grep -E '(Killing|Force stopping).*brainbitescabby' | tail -10"
        if ($RecentKills) {
            Write-Host "⚠️  Recent app kills detected:" -ForegroundColor Red
            $RecentKills | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        } else {
            Write-Host "✅ No recent force-stop events found" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Could not check background limitations: $_" -ForegroundColor Red
    }
}

function Test-ForegroundServiceConfig {
    Write-Host "`n🔧 Foreground Service Configuration:" -ForegroundColor Yellow
    try {
        $ServiceInfo = adb shell "dumpsys activity services | grep -A15 -B5 ScreenTimeService"

        if ($ServiceInfo -match "foreground.*true") {
            Write-Host "✅ Service is properly configured as foreground service" -ForegroundColor Green
        } else {
            Write-Host "❌ Service may not be properly configured as foreground (HIGH RISK)" -ForegroundColor Red
            Write-Host "💡 Check that Service.startForeground() is called properly" -ForegroundColor Yellow
        }

        # Check notification channel importance
        $NotificationChannel = adb shell "dumpsys notification | grep -A10 'brainbites_timer_channel'"
        if ($NotificationChannel -match "mImportance=([0-9]+)") {
            $Importance = [int]$matches[1]
            if ($Importance -ge 2) {
                Write-Host "✅ Notification channel has adequate importance ($Importance)" -ForegroundColor Green
            } else {
                Write-Host "❌ Notification channel importance too low ($Importance) - may not protect service" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Could not check foreground service config: $_" -ForegroundColor Red
    }
}

function Show-Recommendations {
    Write-Host "`n💡 Recommendations to Prevent Early Timer Death:" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "1. 🔋 Add app to battery optimization whitelist"
    Write-Host "2. 📱 Enable background app refresh"
    Write-Host "3. 🎯 Keep app in ACTIVE or WORKING_SET standby bucket"
    Write-Host "4. 🔧 Ensure foreground service is properly configured"
    Write-Host "5. 🔔 Keep notification channel importance at MEDIUM or higher"
    Write-Host "6. 💾 Monitor memory usage and avoid memory pressure"
    Write-Host "7. ⏰ Use AlarmManager for critical timer events"
    Write-Host "8. 🔄 Implement service restart mechanisms"
    Write-Host "`n📊 Run monitoring script to track actual behavior:"
    Write-Host "   PowerShell: .\monitor_timer.ps1"
    Write-Host "   Node.js: node monitor_persistent_timer.js"
}

# Run all checks
Test-BatteryOptimization
Test-MemoryPressure
Test-AppStandby
Test-BackgroundLimitations
Test-ForegroundServiceConfig
Show-Recommendations

Write-Host "`n🏁 Analysis complete!" -ForegroundColor Green