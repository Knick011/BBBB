#!/usr/bin/env node

/**
 * Persistent Timer Monitoring Script
 * Monitors if the persistent timer notification is being killed before 16 hours
 */

const { execSync } = require('child_process');
const fs = require('fs');

const LOG_FILE = 'timer_monitoring_log.txt';
const CHECK_INTERVAL = 60000; // Check every minute
const EXPECTED_DURATION_HOURS = 16;
const EXPECTED_DURATION_MS = EXPECTED_DURATION_HOURS * 60 * 60 * 1000;

let startTime = null;
let lastSeenTime = null;
let isMonitoring = false;

function log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(LOG_FILE, logEntry);
}

function checkNotificationExists() {
    try {
        const result = execSync('adb shell "dumpsys notification | grep -c \'pkg=com.brainbitescabby.app.*id=1001\'"', { encoding: 'utf8' });
        return parseInt(result.trim()) > 0;
    } catch (error) {
        log(`❌ Error checking notification: ${error.message}`);
        return false;
    }
}

function checkAppProcessExists() {
    try {
        const result = execSync('adb shell "ps | grep -c com.brainbitescabby.app"', { encoding: 'utf8' });
        return parseInt(result.trim()) > 0;
    } catch (error) {
        log(`❌ Error checking app process: ${error.message}`);
        return false;
    }
}

function checkForegroundService() {
    try {
        const result = execSync('adb shell "dumpsys activity services | grep -A5 -B5 ScreenTimeService"', { encoding: 'utf8' });
        return result.includes('ScreenTimeService');
    } catch (error) {
        return false;
    }
}

function getSystemStats() {
    try {
        const memInfo = execSync('adb shell "dumpsys meminfo com.brainbitescabby.app | head -10"', { encoding: 'utf8' });
        const batteryInfo = execSync('adb shell "dumpsys battery | grep level"', { encoding: 'utf8' });
        return { memInfo, batteryInfo };
    } catch (error) {
        return { memInfo: 'N/A', batteryInfo: 'N/A' };
    }
}

function performCheck() {
    const currentTime = Date.now();
    const notificationExists = checkNotificationExists();
    const appProcessExists = checkAppProcessExists();
    const foregroundServiceExists = checkForegroundService();
    const stats = getSystemStats();

    if (!startTime && notificationExists) {
        startTime = currentTime;
        log(`🚀 Timer monitoring started - Persistent notification detected`);
        log(`📊 App Process: ${appProcessExists ? 'Running' : 'Not Running'}`);
        log(`🔧 Foreground Service: ${foregroundServiceExists ? 'Active' : 'Inactive'}`);
        isMonitoring = true;
    }

    if (isMonitoring) {
        const elapsedTime = currentTime - startTime;
        const elapsedHours = (elapsedTime / (1000 * 60 * 60)).toFixed(2);
        const remainingHours = (EXPECTED_DURATION_HOURS - elapsedHours).toFixed(2);

        if (notificationExists) {
            lastSeenTime = currentTime;
            log(`✅ Timer Active - Elapsed: ${elapsedHours}h | Remaining: ${remainingHours}h | Process: ${appProcessExists ? 'OK' : 'DEAD'}`);

            // Log detailed stats every 30 minutes
            if (elapsedTime % (30 * 60 * 1000) < CHECK_INTERVAL) {
                log(`📊 System Stats:\n${stats.memInfo}`);
                log(`🔋 Battery: ${stats.batteryInfo.trim()}`);
            }
        } else {
            const killedAfterHours = ((lastSeenTime - startTime) / (1000 * 60 * 60)).toFixed(2);
            log(`❌ TIMER KILLED! Was active for ${killedAfterHours} hours (expected ${EXPECTED_DURATION_HOURS} hours)`);
            log(`🔍 App Process: ${appProcessExists ? 'Still Running' : 'Also Killed'}`);
            log(`🔧 Foreground Service: ${foregroundServiceExists ? 'Still Active' : 'Also Killed'}`);

            if (parseFloat(killedAfterHours) < EXPECTED_DURATION_HOURS) {
                log(`🚨 EARLY TERMINATION DETECTED! Timer killed ${(EXPECTED_DURATION_HOURS - killedAfterHours).toFixed(2)} hours early`);

                // Try to determine why it was killed
                try {
                    const logcat = execSync('adb shell "logcat -d -s ActivityManager:I | tail -20"', { encoding: 'utf8' });
                    log(`📱 Recent ActivityManager logs:\n${logcat}`);
                } catch (e) {
                    log(`❌ Could not retrieve ActivityManager logs: ${e.message}`);
                }
            }

            // Reset for next monitoring cycle
            startTime = null;
            lastSeenTime = null;
            isMonitoring = false;
            log(`🔄 Monitoring reset - waiting for timer to restart`);
        }

        // Check if we've reached the expected duration
        if (elapsedTime >= EXPECTED_DURATION_MS && notificationExists) {
            log(`🎉 SUCCESS! Timer has been running for ${elapsedHours} hours (reached expected ${EXPECTED_DURATION_HOURS} hours)`);
            isMonitoring = false;
            startTime = null;
        }
    }
}

function startMonitoring() {
    log(`🔍 Starting Persistent Timer Monitoring`);
    log(`⏱️  Expected Duration: ${EXPECTED_DURATION_HOURS} hours`);
    log(`🔄 Check Interval: ${CHECK_INTERVAL/1000} seconds`);
    log(`📝 Log File: ${LOG_FILE}`);

    // Initial check
    performCheck();

    // Set up periodic checks
    setInterval(performCheck, CHECK_INTERVAL);

    log(`✅ Monitoring active - Press Ctrl+C to stop`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    log(`🛑 Monitoring stopped by user`);
    process.exit(0);
});

// Start monitoring
startMonitoring();