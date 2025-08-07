package com.brainbites.timer

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
import com.brainbites.MainActivity
import com.brainbites.R
import com.brainbites.timer.notifications.BrainBitesNotificationManager
import com.brainbites.permissions.NotificationPermissionHandler

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
    private var sessionStartTime = 0L
    private var isAppInForeground = false
    private var lastTickTime = 0L
    private var screenTimeManager: ScreenTimeManager? = null
    
    companion object {
        private const val TAG = "ScreenTimeService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "brainbites_timer_channel"
        private const val PREFS_NAME = "BrainBitesTimerPrefs"
        private const val KEY_REMAINING_TIME = "remaining_time"
        private const val KEY_TODAY_SCREEN_TIME = "today_screen_time"
        private const val KEY_OVERTIME = "overtime_seconds"
        private const val KEY_LAST_SAVE_DATE = "last_save_date"
        private const val UPDATE_INTERVAL = 1000L // 1 second for smooth updates
        
        // Actions
        const val ACTION_START = "com.brainbites.timer.START"
        const val ACTION_PAUSE = "com.brainbites.timer.PAUSE" 
        const val ACTION_STOP = "com.brainbites.timer.STOP"
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

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "BrainBites Screen Time Timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows remaining app time and screen time used"
            setShowBadge(false)
            setSound(null, null)
            enableLights(true)
            lightColor = 0xFFFF9F1C.toInt() // Theme orange
        }
        notificationManagerCompat.createNotificationChannel(channel)
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
            // New day - reset daily data but keep remaining time
            todayScreenTimeSeconds = 0
            overtimeSeconds = 0
            Log.d(TAG, "📅 New day detected - resetting daily stats")
        } else {
            todayScreenTimeSeconds = sharedPrefs.getInt(KEY_TODAY_SCREEN_TIME, 0)
            overtimeSeconds = sharedPrefs.getInt(KEY_OVERTIME, 0)
        }
        
        remainingTimeSeconds = sharedPrefs.getInt(KEY_REMAINING_TIME, 0)
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
            
            // Only update timer logic if at least 1 second has passed (avoid micro-updates)
            if (deltaMs >= 1000) {
                val deltaSec = (deltaMs / 1000).toInt()
                
                // Always update screen time when screen is on and app is not in foreground
                if (!isAppInForeground && !keyguardManager.isKeyguardLocked && powerManager.isInteractive) {
                    Log.d(TAG, "⏰ Timer updating: deltaSec=$deltaSec, remaining=${remainingTimeSeconds}s, screenTime=${todayScreenTimeSeconds}s, overtime=${overtimeSeconds}s")
                    todayScreenTimeSeconds += deltaSec
                    
                    // Update remaining time or overtime
                    if (remainingTimeSeconds > 0) {
                        val newRemaining = remainingTimeSeconds - deltaSec
                        if (newRemaining <= 0) {
                            overtimeSeconds += Math.abs(newRemaining)
                            remainingTimeSeconds = 0
                            handleTimeExpired()
                        } else {
                            remainingTimeSeconds = newRemaining
                        }
                        
                        // Check for low time warnings
                        when (remainingTimeSeconds) {
                            300 -> showLowTimeNotification(5)
                            120 -> showLowTimeNotification(2)
                            60 -> showLowTimeNotification(1)
                        }
                    } else {
                        // Already in overtime, keep tracking
                        overtimeSeconds += deltaSec
                    }
                } else {
                    Log.d(TAG, "⏸️ Timer NOT updating - App in foreground: $isAppInForeground, Screen locked: ${keyguardManager.isKeyguardLocked}, Screen interactive: ${powerManager.isInteractive}")
                }
                
                // Save data and broadcast every 30 seconds to reduce overhead
                if (todayScreenTimeSeconds % 30 == 0) {
                    handler.post {
                        saveData()
                        broadcastUpdate()
                    }
                }
            }
            
            // Always update notification for smooth display (every 1 second)
            handler.post {
                updatePersistentNotification()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error in updateTimer", e)
            // Continue running the timer even if there's an error
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
        remainingTimeSeconds += seconds
        // Reset overtime when time is added
        if (remainingTimeSeconds > 0) {
            overtimeSeconds = 0
        }
        saveData()
        updatePersistentNotification()
        broadcastUpdate()
        Log.d(TAG, "➕ Added ${seconds}s, new remaining: ${remainingTimeSeconds}s")
    }
    
    private fun broadcastUpdate() {
        try {
            val intent = Intent("com.brainbites.TIMER_UPDATE").apply {
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
    
    private fun showLowTimeNotification(minutes: Int) {
        try {
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("⏱️ CaBBy Says: Time Check!")
                .setContentText("Whoa! Only $minutes minute${if (minutes > 1) "s" else ""} left! Time to power up! 🧠✨")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setColor(0xFFFF9F1C.toInt())
                .setLights(0xFFFF9F1C.toInt(), 1000, 1000)
                .build()
                
            notificationManagerCompat.notify(1000 + minutes, notification)
            Log.d(TAG, "⚠️ Sent ${minutes} minute warning notification")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show low time notification", e)
        }
    }
    
    private fun showTimeExpiredNotification() {
        try {
            val intent = Intent(this, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                this, 0, intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("🎯 CaBBy Needs You!")
                .setContentText("Your earned time is up! Come challenge your brain to unlock more! 🌟")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setColor(0xFFFF9F1C.toInt())
                .setLights(0xFFFF9F1C.toInt(), 1000, 1000)
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
        
        // Format times in HH:MM:SS
        val timeLeftText = if (remainingTimeSeconds > 0) {
            formatTimeWithSeconds(remainingTimeSeconds)
        } else {
            "00:00:00"
        }
        
        val screenTimeText = formatTimeWithSeconds(todayScreenTimeSeconds)
        val overtimeText = if (overtimeSeconds > 0) {
            formatTimeWithSeconds(overtimeSeconds)
        } else {
            "00:00:00"
        }
        
        val notificationColor = if (remainingTimeSeconds <= 0 && overtimeSeconds > 0) {
            0xFFF44336.toInt() // Red for overtime
        } else {
            0xFFFF9F1C.toInt() // Orange for normal
        }
        
        val bigText = "Screen Time: $screenTimeText\nOvertime: $overtimeText"
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(if (overtimeSeconds > 0) R.drawable.ic_notification else android.R.drawable.ic_menu_recent_history)
            .setContentTitle("Time Left: $timeLeftText")
            .setContentText("$screenTimeText • $overtimeText")
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .setColor(notificationColor)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .build()
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