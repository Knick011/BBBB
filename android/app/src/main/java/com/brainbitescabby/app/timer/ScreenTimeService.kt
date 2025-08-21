package com.brainbitescabby.app.timer

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import android.app.PendingIntent
import com.brainbitescabby.app.MainActivity
import com.brainbitescabby.app.R
import com.brainbitescabby.app.timer.notifications.BrainBitesNotificationManager
import com.brainbitescabby.app.permissions.NotificationPermissionHandler

class ScreenTimeService : Service() {
    
    private lateinit var powerManager: PowerManager
    private lateinit var keyguardManager: KeyguardManager
    private lateinit var sharedPrefs: SharedPreferences
    private lateinit var notificationManagerCompat: NotificationManager
    private lateinit var notificationManager: BrainBitesNotificationManager
    
    private val handler = Handler(Looper.getMainLooper())
    private var timerRunnable: Runnable? = null
    private var wakeLock: PowerManager.WakeLock? = null
    
    private var remainingTimeSeconds = 0
    private var todayScreenTimeSeconds = 0
    private var overtimeSeconds = 0 // Track overtime
    private var overtimePaused = false // Track if overtime is paused
    private var overtimePausedAt = 0 // Track overtime value when paused
    private var sessionStartTime = 0L
    private var isAppInForeground = false
    private var lastTickTime = 0L
    private var screenTimeManager: ScreenTimeManager? = null
    private var lastHourNotified = 0
    
    companion object {
        private const val TAG = "ScreenTimeService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "brainbites_timer_channel"
        private const val ALERT_CHANNEL_ID = "brainbites_alerts"
        private const val PREFS_NAME = "BrainBitesTimerPrefs"
        private const val KEY_REMAINING_TIME = "remaining_time"
        private const val KEY_TODAY_SCREEN_TIME = "today_screen_time"
        private const val KEY_OVERTIME = "overtime_seconds"
        private const val KEY_LAST_SAVE_DATE = "last_save_date"
        private const val KEY_LAST_HOUR_NOTIFIED = "last_hour_notified"
        private const val UPDATE_INTERVAL = 1000L // 1 second for smooth updates
        
        // Actions
        const val ACTION_START = "com.brainbitescabby.app.timer.START"
        const val ACTION_PAUSE = "com.brainbitescabby.app.timer.PAUSE" 
        const val ACTION_STOP = "com.brainbitescabby.app.timer.STOP"
        const val ACTION_UPDATE_TIME = "update_time"
        const val ACTION_ADD_TIME = "add_time"
        const val ACTION_APP_FOREGROUND = "app_foreground"
        const val ACTION_APP_BACKGROUND = "app_background"
        const val EXTRA_TIME_SECONDS = "time_seconds"
    }
    
    private val binder = LocalBinder()
    
    inner class LocalBinder : android.os.Binder() {
        fun getService(): ScreenTimeService = this@ScreenTimeService
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "✅ ScreenTimeService created")
        
        powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        sharedPrefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        notificationManagerCompat = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager = BrainBitesNotificationManager.getInstance(applicationContext)
        screenTimeManager = ScreenTimeManager.getInstance(applicationContext)
        
        createNotificationChannel()
        loadSavedData()
        acquireWakeLock()
        
        // In onCreate, load overtime and hourly notification state
        overtimeSeconds = sharedPrefs.getInt(KEY_OVERTIME, 0)
        overtimePaused = sharedPrefs.getBoolean("overtime_paused", false)
        overtimePausedAt = sharedPrefs.getInt("overtime_paused_at", 0)
        lastHourNotified = sharedPrefs.getInt(KEY_LAST_HOUR_NOTIFIED, 0)
        
        Log.d(TAG, "Loaded overtime: ${overtimeSeconds}s (paused: $overtimePaused)")
        
        Log.d(TAG, "✅ Service initialized with ${remainingTimeSeconds}s remaining, ${todayScreenTimeSeconds}s used today, ${overtimeSeconds}s overtime")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "✅ onStartCommand: ${intent?.action}")
        
        // Start as foreground service immediately to avoid Android killing it
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, createPersistentNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, createPersistentNotification())
        }
        
        when (intent?.action) {
            ACTION_START -> startTimer()
            ACTION_PAUSE -> pauseTimer()
            ACTION_STOP -> stopTimer()
            ACTION_UPDATE_TIME -> {
                val timeSeconds = intent.getIntExtra(EXTRA_TIME_SECONDS, 0)
                updateRemainingTime(timeSeconds)
                startTimer()
            }
            ACTION_ADD_TIME -> {
                val timeSeconds = intent.getIntExtra(EXTRA_TIME_SECONDS, 0)
                addTime(timeSeconds)
            }
            ACTION_APP_FOREGROUND -> handleAppForeground()
            ACTION_APP_BACKGROUND -> handleAppBackground()
            else -> {
                // Default - start timer regardless of remaining time
                startTimer()
            }
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent): IBinder = binder

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "✅ ScreenTimeService destroyed - cleaning up")
        releaseWakeLock()
        stopTimer()
        saveData()
    }

    // Update createNotificationChannel to have TWO channels
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Channel 1: Silent persistent notification
            val silentChannel = NotificationChannel(
                CHANNEL_ID,
                "Timer Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Silent timer tracking"
                setSound(null, null) // No sound
                enableVibration(false)
                setShowBadge(false)
            }
            
            // Channel 2: Alert notifications (with sound)
            val alertChannel = NotificationChannel(
                ALERT_CHANNEL_ID,
                "Timer Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Timer warnings and alerts"
                enableVibration(true)
                setShowBadge(true)
                // Default sound will be used
            }
            
            notificationManager.createNotificationChannel(silentChannel)
            notificationManager.createNotificationChannel(alertChannel)
        }
    }
    
    private fun acquireWakeLock() {
        try {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "BrainBites::ScreenTimeWakeLock"
            ).apply {
                acquire(24 * 60 * 60 * 1000L) // 24 hours max
            }
            Log.d(TAG, "✅ Wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to acquire wake lock", e)
        }
    }
    
    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                Log.d(TAG, "✅ Wake lock released")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to release wake lock", e)
        }
    }
    
    private fun loadSavedData() {
        val today = android.text.format.DateFormat.format("yyyy-MM-dd", java.util.Date()).toString()
        val lastSaveDate = sharedPrefs.getString(KEY_LAST_SAVE_DATE, today)
        
        if (lastSaveDate != today) {
            // Reset daily data
            todayScreenTimeSeconds = 0
            overtimeSeconds = 0
            overtimePaused = false
            overtimePausedAt = 0
            lastHourNotified = 0  // Reset hourly notification counter
            sharedPrefs.edit()
                .putInt(KEY_TODAY_SCREEN_TIME, 0)
                .putInt(KEY_OVERTIME, 0)
                .putBoolean("overtime_paused", false)
                .remove("overtime_paused_at")
                .putInt(KEY_LAST_HOUR_NOTIFIED, 0)
                .putString(KEY_LAST_SAVE_DATE, today)
                .apply()
            Log.d(TAG, "📅 New day detected - daily counters reset")
        } else {
            remainingTimeSeconds = sharedPrefs.getInt(KEY_REMAINING_TIME, 0)
            todayScreenTimeSeconds = sharedPrefs.getInt(KEY_TODAY_SCREEN_TIME, 0)
            overtimeSeconds = sharedPrefs.getInt(KEY_OVERTIME, 0)
            overtimePaused = sharedPrefs.getBoolean("overtime_paused", false)
            overtimePausedAt = sharedPrefs.getInt("overtime_paused_at", 0)
            lastHourNotified = sharedPrefs.getInt(KEY_LAST_HOUR_NOTIFIED, 0)
        }
        
        Log.d(TAG, "📊 Loaded data - Remaining: ${remainingTimeSeconds}s, Today: ${todayScreenTimeSeconds}s, Overtime: ${overtimeSeconds}s, LastHour: $lastHourNotified")
    }
    
    private fun saveData() {
        try {
            val today = android.text.format.DateFormat.format("yyyy-MM-dd", java.util.Date()).toString()
            sharedPrefs.edit().apply {
                putInt(KEY_REMAINING_TIME, remainingTimeSeconds)
                putInt(KEY_TODAY_SCREEN_TIME, todayScreenTimeSeconds)
                putInt(KEY_OVERTIME, overtimeSeconds)
                putString(KEY_LAST_SAVE_DATE, today)
                apply()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save data", e)
            // Don't let save failures crash the service
        }
    }

    private fun startTimer() {
        if (timerRunnable != null) {
            Log.d(TAG, "⚠️ Timer already running")
            return
        }
        
        Log.d(TAG, "▶️ Starting timer")
        sessionStartTime = System.currentTimeMillis()
        lastTickTime = System.currentTimeMillis()
        
        timerRunnable = object : Runnable {
            override fun run() {
                updateTimer()
                handler.postDelayed(this, UPDATE_INTERVAL)
            }
        }
        
        handler.post(timerRunnable!!)
        updatePersistentNotification()
        broadcastUpdate()
    }
    
    private fun pauseTimer() {
        Log.d(TAG, "⏸️ Pausing timer")
        stopTimerInternal()
        updatePersistentNotification()
        broadcastUpdate()
    }
    
    private fun stopTimer() {
        Log.d(TAG, "⏹️ Stopping timer")
        stopTimerInternal()
        stopForeground(STOP_FOREGROUND_REMOVE)
        broadcastUpdate()
    }
    
    private fun stopTimerInternal() {
        timerRunnable?.let {
            handler.removeCallbacks(it)
            timerRunnable = null
        }
        sessionStartTime = 0L
    }
    
    private fun updateTimer() {
        try {
            val now = System.currentTimeMillis()
            val deltaMs = now - lastTickTime
            lastTickTime = now
            
            // Detect midnight/day change and reset daily counters immediately
            try {
                val today = android.text.format.DateFormat.format("yyyy-MM-dd", java.util.Date()).toString()
                val lastSaveDate = sharedPrefs.getString(KEY_LAST_SAVE_DATE, today)
                if (lastSaveDate != today) {
                    // New day detected while service is running
                    todayScreenTimeSeconds = 0
                    overtimeSeconds = 0
                    overtimePaused = false
                    overtimePausedAt = 0
                    lastHourNotified = 0  // Reset hourly notification counter
                    sharedPrefs.edit()
                        .putInt(KEY_TODAY_SCREEN_TIME, 0)
                        .putInt(KEY_OVERTIME, 0)
                        .putBoolean("overtime_paused", false)
                        .remove("overtime_paused_at")
                        .putInt(KEY_LAST_HOUR_NOTIFIED, 0)
                        .putString(KEY_LAST_SAVE_DATE, today)
                        .apply()
                    Log.d(TAG, "📅 Midnight rollover detected - daily screen time and overtime reset")
                    // Persist notification and broadcast fresh state
                    updatePersistentNotification()
                    broadcastUpdate()
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed daily rollover check", e)
            }

            // Update timers based on conditions
            val deltaSecs = (deltaMs / 1000.0).toInt()
            if (deltaSecs > 0) {
                val isScreenLocked = keyguardManager.isKeyguardLocked
                val isScreenOn = powerManager.isInteractive
                
                // Only update when screen is on and app is NOT in foreground (like original)
                if (!isAppInForeground && !isScreenLocked && isScreenOn) {
                    Log.d(TAG, "⏰ Timer updating: deltaSecs=$deltaSecs, remaining=${remainingTimeSeconds}s, screenTime=${todayScreenTimeSeconds}s, overtime=${overtimeSeconds}s")
                    todayScreenTimeSeconds += deltaSecs
                    sharedPrefs.edit()
                        .putInt(KEY_TODAY_SCREEN_TIME, todayScreenTimeSeconds)
                        .apply()
                    
                    // Check for hourly milestone
                    checkHourlyMilestone()
                    
                    // Update remaining time or overtime (original logic)
                    if (remainingTimeSeconds > 0) {
                        val newRemaining = remainingTimeSeconds - deltaSecs
                        if (newRemaining <= 0) {
                            overtimeSeconds += Math.abs(newRemaining)
                            remainingTimeSeconds = 0
                            handleTimeExpired()
                        } else {
                            remainingTimeSeconds = newRemaining
                        }
                        sharedPrefs.edit()
                            .putInt(KEY_REMAINING_TIME, remainingTimeSeconds)
                            .apply()
                        
                        // Check warnings
                        when (remainingTimeSeconds) {
                            300 -> showLowTimeNotification(5) // 5 minutes
                            120 -> showLowTimeNotification(2) // 2 minutes (original)
                            60 -> showLowTimeNotification(1)  // 1 minute
                        }
                    } else if (remainingTimeSeconds <= 0) {
                        // Resume paused overtime if applicable
                        if (overtimePaused && overtimePausedAt > 0) {
                            overtimeSeconds = overtimePausedAt
                            overtimePaused = false
                            overtimePausedAt = 0
                            sharedPrefs.edit()
                                .putBoolean("overtime_paused", false)
                                .remove("overtime_paused_at")
                                .apply()
                            Log.d(TAG, "Resuming overtime at ${overtimeSeconds}s")
                        }
                        
                        // Increment overtime if not paused
                        if (!overtimePaused) {
                            overtimeSeconds += deltaSecs
                            sharedPrefs.edit()
                                .putInt(KEY_OVERTIME, overtimeSeconds)
                                .apply()
                        }
                    }
                } else {
                    Log.d(TAG, "⏸️ Timer NOT updating - App in foreground: $isAppInForeground, Screen locked: $isScreenLocked, Screen interactive: $isScreenOn")
                }
            }
            
            // Always update notification for smooth display (every 1 second)
            handler.post {
                updatePersistentNotification()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in updateTimer", e)
        }
    }
    
    private fun handleAppForeground() {
        Log.d(TAG, "📱 App in foreground")
        isAppInForeground = true
        updatePersistentNotification()
        broadcastUpdate()
    }
    
    private fun handleAppBackground() {
        Log.d(TAG, "📱 App in background")
        isAppInForeground = false
        updatePersistentNotification()
        broadcastUpdate()
    }
    
    private fun addTime(seconds: Int) {
        // If we have overtime and it's not paused, pause it
        if (overtimeSeconds > 0 && !overtimePaused) {
            overtimePaused = true
            overtimePausedAt = overtimeSeconds
            sharedPrefs.edit()
                .putBoolean("overtime_paused", true)
                .putInt("overtime_paused_at", overtimeSeconds)
                .apply()
            Log.d(TAG, "Pausing overtime at ${overtimeSeconds}s")
        }
        
        remainingTimeSeconds += seconds
        saveData()
        updatePersistentNotification()
        broadcastUpdate()
        Log.d(TAG, "➕ Added ${seconds}s, new remaining: ${remainingTimeSeconds}s")
    }
    
    private fun broadcastUpdate() {
        try {
            val intent = Intent("com.brainbitescabby.app.TIMER_UPDATE").apply {
                putExtra("remaining_time", remainingTimeSeconds)
                putExtra("today_screen_time", todayScreenTimeSeconds)
                putExtra("overtime", overtimeSeconds)
                putExtra("is_app_foreground", isAppInForeground)
                putExtra("is_tracking", timerRunnable != null)
            }
            sendBroadcast(intent)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to broadcast update", e)
            // Don't let broadcast failures crash the service
        }
    }
    
    private fun handleTimeExpired() {
        Log.d(TAG, "⏰ Time expired! Entering overtime mode")
        
        // Show high priority notification
        showTimeExpiredNotification()
        broadcastUpdate()
        
        // Keep persistent notification showing overtime
        updatePersistentNotification()
    }
    
    // Update warning notifications to use alert channel
    private fun showLowTimeNotification(minutes: Int) {
        try {
            val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID) // Alert channel
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("⏱️ CaBBy Says: Time Check!")
                .setContentText("Only $minutes minutes left!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound + Vibration
                .setAutoCancel(true)
                .build()
                
            notificationManagerCompat.notify(1000 + minutes, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show warning", e)
        }
    }
    
    private fun showTimeExpiredNotification() {
        try {
            val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID) // Alert channel
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("🎯 Time's Up!")
                .setContentText("Come earn more time!")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL) // Sound + Vibration
                .setAutoCancel(true)
                .build()
                
            notificationManagerCompat.notify(999, notification)
            Log.d(TAG, "🚨 Sent time expired notification")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show time expired notification", e)
        }
    }
    
    private fun createPersistentNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val timeLeftStr = formatTimeWithSeconds(remainingTimeSeconds)
        val screenTimeStr = formatTimeWithSeconds(todayScreenTimeSeconds)
        val overtime = if (remainingTimeSeconds < 0) Math.abs(remainingTimeSeconds) else overtimeSeconds

        val builder = NotificationCompat.Builder(this, CHANNEL_ID) // Use silent channel
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true) // Explicitly silent
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
        
        // Show overtime in title if active and not paused
        val title = if (overtimeSeconds > 0 && !overtimePaused) {
            "Overtime: ${formatTime(overtimeSeconds)}"
        } else {
            "Time left: $timeLeftStr"
        }
        
        val text = "Screen time: $screenTimeStr"
        
        builder.setContentTitle(title)
        builder.setContentText(text)
        
        // For expanded view
        val bigStyle = NotificationCompat.BigTextStyle()
        bigStyle.setBigContentTitle("BrainBites Timer")
        val bigText = buildString {
            append("Time left: $timeLeftStr\n")
            append("Screen time: $screenTimeStr")
            if (overtimeSeconds > 0) {
                append("\nOvertime: ${formatTime(overtimeSeconds)}")
                if (overtimePaused) append(" (paused)")
            }
        }
        bigStyle.bigText(bigText)
        builder.setStyle(bigStyle)
        
        return builder.build()
    }
    
    private fun updatePersistentNotification() {
        try {
            val notification = createPersistentNotification()
            notificationManagerCompat.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to update persistent notification", e)
            // Try to create a simple fallback notification
            try {
                val fallbackNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_menu_recent_history)
                    .setContentTitle("BrainBites")
                    .setContentText("Timer active")
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setSilent(true)
                    .build()
                notificationManagerCompat.notify(NOTIFICATION_ID, fallbackNotification)
            } catch (fallbackException: Exception) {
                Log.e(TAG, "❌ Failed to create fallback notification", fallbackException)
            }
        }
    }
    
    private fun updateRemainingTime(newTime: Int) {
        remainingTimeSeconds = newTime
        // Reset overtime when new time is set
        if (remainingTimeSeconds > 0) {
            overtimeSeconds = 0
        }
        saveData()
        Log.d(TAG, "✅ Updated remaining time to ${remainingTimeSeconds}s")
    }

    // Add this new function to check for hourly milestones:
    private fun checkHourlyMilestone() {
        val currentHours = todayScreenTimeSeconds / 3600
        
        // Check if we've crossed an hour boundary
        if (currentHours > lastHourNotified) {
            lastHourNotified = currentHours
            sharedPrefs.edit()
                .putInt(KEY_LAST_HOUR_NOTIFIED, lastHourNotified)
                .apply()
            
            // Show hourly notification
            showHourlyScreenTimeNotification(currentHours)
        }
    }

    // Add this new function to show hourly notifications:
    private fun showHourlyScreenTimeNotification(hours: Int) {
        try {
            val totalMinutes = todayScreenTimeSeconds / 60
            val displayHours = totalMinutes / 60
            val displayMinutes = totalMinutes % 60
            
            val timeString = if (displayHours > 0) {
                "${displayHours}h ${displayMinutes}m"
            } else {
                "${displayMinutes}m"
            }
            
            val messages = when (hours) {
                1 -> arrayOf(
                    "😲 Whoa! You just hit your FIRST HOUR of screentime! Maybe it's time for a quick break? 🌿",
                    "🎯 One hour already?! Time flies when you're... staring at screens! Consider a stretch? 🤸",
                    "⏰ HOUR ONE COMPLETE! Your eyes are sending you a message: \"We need a break!\" 👀"
                )
                2 -> arrayOf(
                    "😰 TWO HOURS! CaBBy is getting worried! Your screen time is at $timeString! Break time? 🥺",
                    "🔥 Double hour alert! $timeString on screen! Your body is begging for movement! 🏃",
                    "⚠️ WARNING: $timeString of screentime! Even I need breaks, and I'm digital! 💭"
                )
                3 -> arrayOf(
                    "😱 THREE HOURS?! CaBBy is seriously concerned! $timeString is A LOT! Please take a break! 🆘",
                    "🚨🚨 CRITICAL: $timeString on screen! Your eyes are crying for mercy! 😭",
                    "🔴 RED ALERT: $timeString of screentime! Even robots need maintenance breaks! 🤖"
                )
                4 -> arrayOf(
                    "😨😨 FOUR HOURS!! CaBBy is PANICKING! $timeString is too much! PLEASE REST NOW! 🛑",
                    "🚨🔥 EMERGENCY: $timeString on screens! Your health matters more than this! 💚",
                    "⛔ STOP! $timeString is excessive! Time for a REAL break, not a scroll break! 🚶"
                )
                5 -> arrayOf(
                    "😵‍💫 FIVE HOURS?!? CaBBy is LOSING IT! $timeString!! This is an intervention!! 🚑",
                    "🆘🆘🆘 MAYDAY! $timeString of screentime! Your future self will thank you for stopping! 🙏",
                    "🔴🔴🔴 CRITICAL OVERLOAD: $timeString! Even I'm getting dizzy from all this screen time! 🌀"
                )
                else -> arrayOf(
                    "😭😭😭 $hours HOURS?! CaBBy has given up hope... $timeString is digital addiction territory! 📵",
                    "💀💀💀 $timeString of screentime... CaBBy is filing a missing person report for your real life! 👮",
                    "⚰️ RIP healthy habits. Cause of death: $timeString of screentime. CaBBy will miss you... 🪦"
                )
            }
            
            val message = messages.random()
            
            // More urgent break suggestions
            val breakSuggestion = when {
                hours == 1 -> "\n\n💭 CaBBy suggests: Maybe look out the window for 30 seconds?"
                hours == 2 -> "\n\n😟 CaBBy insists: Your eyes REALLY need a 5-minute break! Please?"
                hours == 3 -> "\n\n😰 CaBBy begs: PLEASE take a 10-minute walk! Your body needs it!"
                hours == 4 -> "\n\n😱 CaBBy demands: STOP NOW! Take at least 15 minutes away from screens!"
                hours >= 5 -> "\n\n🆘 CaBBy screams: THIS IS NOT HEALTHY! Take a 30-minute break IMMEDIATELY!"
                else -> "\n\n💀 CaBBy has fainted from shock. Even virtual mascots have limits..."
            }
            
            val pendingIntent = PendingIntent.getActivity(
                this, 0, Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("⚠️ SCREENTIME ALERT from CaBBy!")
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText(message + breakSuggestion))
                .setPriority(NotificationCompat.PRIORITY_MAX) // Maximum priority for warnings
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setVibrate(longArrayOf(0, 500, 200, 500)) // Double vibration for urgency
                .setContentIntent(pendingIntent)
                .build()
            
            // Use unique ID for each hour
            val notificationId = 5000 + hours
            notificationManagerCompat.notify(notificationId, notification)
            
            Log.d(TAG, "📱 Hourly screentime notification shown for hour $hours")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show hourly notification", e)
        }
    }
    
    private fun formatTime(seconds: Int): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        
        return when {
            hours > 0 -> "${hours}h ${minutes}m"
            else -> "${minutes}m"
        }
    }
    
    private fun formatTimeWithSeconds(seconds: Int): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        
        return String.format("%02d:%02d:%02d", hours, minutes, secs)
    }
}