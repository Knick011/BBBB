package com.brainbitescabby.app.timer

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Guardian system to ensure persistent timer notification never dies
 */
class PersistentTimerGuardian private constructor(private val context: Context) {

    companion object {
        private const val TAG = "TimerGuardian"
        private const val NOTIFICATION_ID = 1001
        private const val GUARDIAN_ACTION = "com.brainbitescabby.app.GUARDIAN_CHECK"
        private const val RESTART_ACTION = "com.brainbitescabby.app.TIMER_RESTART"

        // Guardian intervals
        private const val HEARTBEAT_INTERVAL = 30_000L // 30 seconds
        private const val WATCHDOG_INTERVAL = 60_000L // 1 minute
        private const val RESTART_INTERVAL = 2 * 60 * 60 * 1000L // 2 hours
        private const val ALARM_INTERVAL = 5 * 60 * 1000L // 5 minutes

        @Volatile
        private var instance: PersistentTimerGuardian? = null

        fun getInstance(context: Context): PersistentTimerGuardian {
            return instance ?: synchronized(this) {
                instance ?: PersistentTimerGuardian(context.applicationContext).also { instance = it }
            }
        }
    }

    private val executor: ScheduledExecutorService = Executors.newScheduledThreadPool(2)
    private val scope = CoroutineScope(Dispatchers.IO)
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    private val notificationManager = NotificationManagerCompat.from(context)

    private var isGuarding = false
    private var restartCount = 0
    private var lastHeartbeat = System.currentTimeMillis()

    // Guardian receiver for alarm-based checks
    private val guardianReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                GUARDIAN_ACTION -> {
                    Log.d(TAG, "🔔 Guardian alarm triggered")
                    scope.launch { performGuardianCheck() }
                }
                RESTART_ACTION -> {
                    Log.d(TAG, "🔄 Restart alarm triggered")
                    scope.launch { performPreventiveRestart("scheduled_restart") }
                }
            }
        }
    }

    /**
     * Start the guardian protection system
     */
    fun startGuarding() {
        if (isGuarding) {
            Log.d(TAG, "🛡️ Guardian already active")
            return
        }

        Log.d(TAG, "🛡️ Starting persistent timer guardian")
        isGuarding = true
        restartCount = 0
        lastHeartbeat = System.currentTimeMillis()

        // Register broadcast receiver
        val filter = IntentFilter().apply {
            addAction(GUARDIAN_ACTION)
            addAction(RESTART_ACTION)
        }

        // Use Android 14+ compatible receiver registration
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(guardianReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(guardianReceiver, filter)
        }

        // Start all protection mechanisms
        startHeartbeat()
        startWatchdog()
        setupAlarmBasedChecks()
        setupPreventiveRestart()

        Log.d(TAG, "✅ Guardian protection active")
    }

    /**
     * Stop the guardian system
     */
    fun stopGuarding() {
        if (!isGuarding) return

        Log.d(TAG, "🛡️ Stopping timer guardian")
        isGuarding = false

        try {
            context.unregisterReceiver(guardianReceiver)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to unregister guardian receiver: ${e.message}")
        }

        executor.shutdown()
        cancelAlarms()

        Log.d(TAG, "🛑 Guardian protection stopped")
    }

    /**
     * Regular heartbeat to track timer health
     */
    private fun startHeartbeat() {
        executor.scheduleAtFixedRate({
            try {
                lastHeartbeat = System.currentTimeMillis()
                sendHeartbeat()
                Log.d(TAG, "💓 Heartbeat sent")
            } catch (e: Exception) {
                Log.e(TAG, "💔 Heartbeat failed: ${e.message}")
            }
        }, 0, HEARTBEAT_INTERVAL, TimeUnit.MILLISECONDS)
    }

    /**
     * Watchdog to detect timer failures
     */
    private fun startWatchdog() {
        executor.scheduleAtFixedRate({
            scope.launch {
                try {
                    performGuardianCheck()
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Watchdog check failed: ${e.message}")
                }
            }
        }, WATCHDOG_INTERVAL, WATCHDOG_INTERVAL, TimeUnit.MILLISECONDS)
    }

    /**
     * Setup alarm-based checks (survives app kills)
     */
    private fun setupAlarmBasedChecks() {
        val guardianIntent = Intent(context, PersistentTimerGuardian::class.java).apply {
            action = GUARDIAN_ACTION
        }

        val guardianPendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            guardianIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Set repeating alarm for guardian checks
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + ALARM_INTERVAL,
            ALARM_INTERVAL,
            guardianPendingIntent
        )

        Log.d(TAG, "⏰ Alarm-based guardian checks scheduled")
    }

    /**
     * Setup preventive restart every 2 hours
     */
    private fun setupPreventiveRestart() {
        val restartIntent = Intent(context, PersistentTimerGuardian::class.java).apply {
            action = RESTART_ACTION
        }

        val restartPendingIntent = PendingIntent.getBroadcast(
            context,
            1002,
            restartIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Schedule preventive restart
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + RESTART_INTERVAL,
            RESTART_INTERVAL,
            restartPendingIntent
        )

        Log.d(TAG, "🔄 Preventive restart scheduled every 2 hours")
    }

    /**
     * Perform comprehensive guardian check
     */
    private suspend fun performGuardianCheck() {
        Log.d(TAG, "🔍 Performing guardian check")

        val notificationExists = checkNotificationExists()
        val serviceRunning = checkServiceRunning()
        val processAlive = checkProcessAlive()

        val isHealthy = notificationExists && serviceRunning && processAlive

        Log.d(TAG, "📊 Health check: notification=$notificationExists, service=$serviceRunning, process=$processAlive => healthy=$isHealthy")

        if (!isHealthy) {
            Log.w(TAG, "🚨 Timer health issue detected!")
            handleTimerFailure("health_check_failed")
        } else {
            Log.d(TAG, "✅ Timer confirmed healthy")
        }
    }

    /**
     * Check if persistent notification exists
     */
    private fun checkNotificationExists(): Boolean {
        return try {
            val activeNotifications = notificationManager.activeNotifications
            val timerNotification = activeNotifications?.find {
                it.id == NOTIFICATION_ID && it.packageName == context.packageName
            }
            timerNotification != null
        } catch (e: Exception) {
            Log.w(TAG, "Failed to check notification existence: ${e.message}")
            false
        }
    }

    /**
     * Check if timer service is running
     */
    private fun checkServiceRunning(): Boolean {
        return try {
            // Check if ScreenTimeService is in running services
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val runningServices = activityManager.getRunningServices(Integer.MAX_VALUE)

            runningServices.any { serviceInfo ->
                serviceInfo.service.className.contains("ScreenTimeService") &&
                serviceInfo.service.packageName == context.packageName
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to check service status: ${e.message}")
            false
        }
    }

    /**
     * Check if app process is alive
     */
    private fun checkProcessAlive(): Boolean {
        return try {
            // Simple check - if we're running this code, process is alive
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Handle timer failure and restart
     */
    private suspend fun handleTimerFailure(reason: String) {
        restartCount++
        Log.w(TAG, "🚨 Handling timer failure #$restartCount. Reason: $reason")

        // Restart the timer
        restartTimer(reason)
    }

    /**
     * Restart the timer system
     */
    private suspend fun restartTimer(reason: String) {
        Log.d(TAG, "🔄 Restarting timer system. Reason: $reason")

        try {
            // Step 1: Stop current timer service
            val stopIntent = Intent(context, ScreenTimeService::class.java).apply {
                action = "STOP_TIMER"
            }
            context.stopService(stopIntent)

            // Step 2: Wait for cleanup
            Thread.sleep(2000)

            // Step 3: Start fresh timer service
            val startIntent = Intent(context, ScreenTimeService::class.java).apply {
                action = "START_TIMER"
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(startIntent)
            } else {
                context.startService(startIntent)
            }

            Log.d(TAG, "✅ Timer restart initiated")

            // Step 4: Verify restart after delay
            Handler(Looper.getMainLooper()).postDelayed({
                scope.launch {
                    val isHealthy = checkNotificationExists() && checkServiceRunning()
                    if (isHealthy) {
                        Log.d(TAG, "✅ Timer restart verified successful")
                    } else {
                        Log.w(TAG, "❌ Timer restart verification failed, retrying...")
                        // Retry after delay
                        Handler(Looper.getMainLooper()).postDelayed({
                            scope.launch { restartTimer("restart_verification_failed") }
                        }, 10000)
                    }
                }
            }, 5000)

        } catch (e: Exception) {
            Log.e(TAG, "❌ Timer restart failed: ${e.message}")
            // Retry after delay
            Handler(Looper.getMainLooper()).postDelayed({
                scope.launch { restartTimer("restart_retry") }
            }, 15000)
        }
    }

    /**
     * Perform preventive restart
     */
    private suspend fun performPreventiveRestart(reason: String) {
        Log.d(TAG, "🔄 Performing preventive restart: $reason")
        restartTimer(reason)
    }

    /**
     * Send heartbeat signal
     */
    private fun sendHeartbeat() {
        // Update last heartbeat timestamp
        lastHeartbeat = System.currentTimeMillis()

        // Could send heartbeat to analytics/monitoring service
        Log.v(TAG, "💓 Heartbeat: ${System.currentTimeMillis()}")
    }

    /**
     * Cancel all alarms
     */
    private fun cancelAlarms() {
        try {
            // Cancel guardian alarm
            val guardianIntent = Intent(context, PersistentTimerGuardian::class.java).apply {
                action = GUARDIAN_ACTION
            }
            val guardianPendingIntent = PendingIntent.getBroadcast(
                context, 1001, guardianIntent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            guardianPendingIntent?.let { alarmManager.cancel(it) }

            // Cancel restart alarm
            val restartIntent = Intent(context, PersistentTimerGuardian::class.java).apply {
                action = RESTART_ACTION
            }
            val restartPendingIntent = PendingIntent.getBroadcast(
                context, 1002, restartIntent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            restartPendingIntent?.let { alarmManager.cancel(it) }

            Log.d(TAG, "⏰ Guardian alarms cancelled")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cancel alarms: ${e.message}")
        }
    }

    /**
     * Get guardian statistics
     */
    fun getGuardianStats(): Map<String, Any> {
        return mapOf(
            "isGuarding" to isGuarding,
            "restartCount" to restartCount,
            "lastHeartbeat" to lastHeartbeat,
            "uptime" to (System.currentTimeMillis() - lastHeartbeat)
        )
    }

    /**
     * Force restart timer (for testing)
     */
    fun forceRestart() {
        scope.launch {
            Log.d(TAG, "🔧 Force restart requested")
            restartTimer("manual_force_restart")
        }
    }
}