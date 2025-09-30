# PowerShell Persistent Timer Monitor
# Monitors if the persistent timer is killed before 16 hours

$LogFile = "timer_monitoring_log.txt"
$CheckIntervalSeconds = 60
$ExpectedDurationHours = 16

$StartTime = $null
$LastSeenTime = $null
$IsMonitoring = $false

function Write-LogEntry {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

function Test-NotificationExists {
    try {
        $Result = adb shell "dumpsys notification | grep -c 'pkg=com.brainbitescabby.app.*id=1001'"
        return [int]$Result -gt 0
    } catch {
        Write-LogEntry "❌ Error checking notification: $_"
        return $false
    }
}

function Test-AppProcessExists {
    try {
        $Result = adb shell "ps | grep com.brainbitescabby.app | wc -l"
        return [int]$Result -gt 0
    } catch {
        Write-LogEntry "❌ Error checking app process: $_"
        return $false
    }
}

function Get-SystemStats {
    try {
        $MemInfo = adb shell "dumpsys meminfo com.brainbitescabby.app | head -5"
        $BatteryInfo = adb shell "dumpsys battery | grep level"
        return @{
            Memory = $MemInfo
            Battery = $BatteryInfo
        }
    } catch {
        return @{
            Memory = "N/A"
            Battery = "N/A"
        }
    }
}

function Invoke-TimerCheck {
    $CurrentTime = Get-Date
    $NotificationExists = Test-NotificationExists
    $AppProcessExists = Test-AppProcessExists
    $Stats = Get-SystemStats

    if (-not $script:StartTime -and $NotificationExists) {
        $script:StartTime = $CurrentTime
        Write-LogEntry "🚀 Timer monitoring started - Persistent notification detected"
        Write-LogEntry "📊 App Process: $(if($AppProcessExists) {'Running'} else {'Not Running'})"
        $script:IsMonitoring = $true
    }

    if ($script:IsMonitoring) {
        $ElapsedTime = $CurrentTime - $script:StartTime
        $ElapsedHours = [math]::Round($ElapsedTime.TotalHours, 2)
        $RemainingHours = [math]::Round($ExpectedDurationHours - $ElapsedHours, 2)

        if ($NotificationExists) {
            $script:LastSeenTime = $CurrentTime
            Write-LogEntry "✅ Timer Active - Elapsed: ${ElapsedHours}h | Remaining: ${RemainingHours}h | Process: $(if($AppProcessExists) {'OK'} else {'DEAD'})"

            # Log detailed stats every 30 minutes
            if ($ElapsedTime.TotalMinutes % 30 -lt 1) {
                Write-LogEntry "📊 System Stats - Battery: $($Stats.Battery)"
            }
        } else {
            $KilledAfterHours = [math]::Round(($script:LastSeenTime - $script:StartTime).TotalHours, 2)
            Write-LogEntry "❌ TIMER KILLED! Was active for ${KilledAfterHours} hours (expected $ExpectedDurationHours hours)"
            Write-LogEntry "🔍 App Process: $(if($AppProcessExists) {'Still Running'} else {'Also Killed'})"

            if ($KilledAfterHours -lt $ExpectedDurationHours) {
                $EarlyByHours = [math]::Round($ExpectedDurationHours - $KilledAfterHours, 2)
                Write-LogEntry "🚨 EARLY TERMINATION DETECTED! Timer killed ${EarlyByHours} hours early"

                # Try to get recent ActivityManager logs
                try {
                    $RecentLogs = adb shell "logcat -d -s ActivityManager:I | tail -10"
                    Write-LogEntry "📱 Recent ActivityManager logs:`n$RecentLogs"
                } catch {
                    Write-LogEntry "❌ Could not retrieve ActivityManager logs: $_"
                }
            }

            # Reset for next cycle
            $script:StartTime = $null
            $script:LastSeenTime = $null
            $script:IsMonitoring = $false
            Write-LogEntry "🔄 Monitoring reset - waiting for timer to restart"
        }

        # Check if we've reached expected duration
        if ($ElapsedTime.TotalHours -ge $ExpectedDurationHours -and $NotificationExists) {
            Write-LogEntry "🎉 SUCCESS! Timer has been running for ${ElapsedHours} hours (reached expected $ExpectedDurationHours hours)"
            $script:IsMonitoring = $false
            $script:StartTime = $null
        }
    }
}

# Start monitoring
Write-LogEntry "🔍 Starting Persistent Timer Monitoring"
Write-LogEntry "⏱️  Expected Duration: $ExpectedDurationHours hours"
Write-LogEntry "🔄 Check Interval: $CheckIntervalSeconds seconds"
Write-LogEntry "📝 Log File: $LogFile"

Write-Host "`n✅ Monitoring active - Press Ctrl+C to stop`n"

while ($true) {
    try {
        Invoke-TimerCheck
        Start-Sleep -Seconds $CheckIntervalSeconds
    } catch {
        Write-LogEntry "❌ Error in monitoring loop: $_"
        Start-Sleep -Seconds $CheckIntervalSeconds
    }
}