package com.brainbitescabby.app.modules

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.net.Uri
import android.provider.Settings
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.brainbitescabby.app.MainActivity
import com.brainbitescabby.app.R
import com.brainbitescabby.app.receivers.MorningNotificationReceiver
import org.json.JSONObject
import java.util.Calendar

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val CHANNEL_ID = "brainbites_general"
        private const val CHANNEL_NAME = "BrainBites Notifications"
        private const val CHANNEL_DESC = "General notifications from BrainBites"
        private const val MORNING_NOTIFICATION_ID = 9001
    }
    
    override fun getName(): String = "NotificationModule"
    
    init {
        createNotificationChannel()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                enableVibration(true)
                enableLights(true)
            }
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    @ReactMethod
    fun showNotification(params: ReadableMap, promise: Promise) {
        try {
            val title = params.getString("title") ?: "BrainBites"
            val message = params.getString("message") ?: ""
            val playSound = if (params.hasKey("playSound")) params.getBoolean("playSound") else true
            val vibrate = if (params.hasKey("vibrate")) params.getBoolean("vibrate") else true
            val data = if (params.hasKey("data")) params.getMap("data") else null
            
            // Create intent for notification tap
            val intent = Intent(reactApplicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                
                // Add data to intent
                data?.let { map ->
                    val iterator = map.keySetIterator()
                    while (iterator.hasNextKey()) {
                        val key = iterator.nextKey()
                        when (val value = map.getDynamic(key)) {
                            is ReadableType -> {
                                when (value.type) {
                                    ReadableType.String -> putExtra(key, map.getString(key))
                                    ReadableType.Number -> putExtra(key, map.getDouble(key))
                                    ReadableType.Boolean -> putExtra(key, map.getBoolean(key))
                                    else -> {}
                                }
                            }
                        }
                    }
                }
            }
            
            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext,
                System.currentTimeMillis().toInt(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Build notification
            val notificationBuilder = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
            
            // Set sound and vibration
            if (playSound || vibrate) {
                var defaults = 0
                if (playSound) defaults = defaults or NotificationCompat.DEFAULT_SOUND
                if (vibrate) defaults = defaults or NotificationCompat.DEFAULT_VIBRATE
                notificationBuilder.setDefaults(defaults)
            }
            
            // Show notification
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val notificationId = System.currentTimeMillis().toInt()
            notificationManager.notify(notificationId, notificationBuilder.build())
            
            promise.resolve(notificationId)
        } catch (e: Exception) {
            promise.reject("NOTIFICATION_ERROR", "Failed to show notification: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun clearNotification(notificationId: Int, promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ERROR", "Failed to clear notification: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun clearAllNotifications(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancelAll()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_ALL_ERROR", "Failed to clear all notifications: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun scheduleMorningReminder(hour: Int, minute: Int, title: String?, message: String?, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            android.util.Log.d("NotificationModule", "Scheduling morning reminder for $hour:$minute")
            
            // Check if we can schedule exact alarms (Android 12+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    android.util.Log.w("NotificationModule", "Cannot schedule exact alarms, using inexact alarm")
                }
            }
            
            // Create intent for the notification
            val intent = Intent(context, MorningNotificationReceiver::class.java).apply {
                putExtra("title", title ?: "🌅 Time to Start Your Day Right!")
                putExtra("body", message ?: "Let's begin with some brain-boosting questions! Complete a daily goal to keep your streak alive.")
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                MORNING_NOTIFICATION_ID,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Set up the time
            val calendar = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                
                // If the time has already passed today, schedule for tomorrow
                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_MONTH, 1)
                    android.util.Log.d("NotificationModule", "Time already passed, scheduling for tomorrow")
                }
            }
            
            android.util.Log.d("NotificationModule", "Alarm scheduled for: ${calendar.time}")
            
            // Cancel any existing alarm
            alarmManager.cancel(pendingIntent)
            
            // Use only one alarm method to avoid conflicts
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarmManager.canScheduleExactAlarms()) {
                    // Use exact alarm for Android 12+ if permission is granted
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                    android.util.Log.d("NotificationModule", "Used setExactAndAllowWhileIdle")
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    // Use inexact alarm with tolerance for battery optimization
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                    android.util.Log.d("NotificationModule", "Used setAndAllowWhileIdle")
                } else {
                    // Fallback for older Android versions
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        calendar.timeInMillis,
                        pendingIntent
                    )
                    android.util.Log.d("NotificationModule", "Used basic set")
                }
                
                android.util.Log.d("NotificationModule", "Morning reminder scheduled successfully")
                promise.resolve(true)
            } catch (securityException: SecurityException) {
                android.util.Log.e("NotificationModule", "Security exception scheduling alarm", securityException)
                promise.reject("PERMISSION_ERROR", "Need exact alarm permission for Android 12+", securityException)
            }
            
        } catch (e: Exception) {
            android.util.Log.e("NotificationModule", "Error scheduling morning reminder", e)
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun cancelMorningReminder(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, MorningNotificationReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                MORNING_NOTIFICATION_ID,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            alarmManager.cancel(pendingIntent)
            android.util.Log.d("NotificationModule", "Morning reminder cancelled")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }
    
    @ReactMethod
    fun testMorningNotification(promise: Promise) {
        try {
            android.util.Log.d("NotificationModule", "Testing morning notification immediately")
            val context = reactApplicationContext
            val intent = Intent(context, MorningNotificationReceiver::class.java).apply {
                putExtra("title", "🧪 Test Notification")
                putExtra("body", "This is a test of the morning notification system!")
            }
            
            // Send broadcast immediately for testing
            context.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("NotificationModule", "Error testing notification", e)
            promise.reject("TEST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
            val pkg = ctx.packageName
            if (!pm.isIgnoringBatteryOptimizations(pkg)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$pkg")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
            val pkg = ctx.packageName
            val ignoring = pm.isIgnoringBatteryOptimizations(pkg)
            promise.resolve(ignoring)
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_QUERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openBatteryOptimizationSettings(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            ctx.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BATTERY_OPT_SETTINGS_ERROR", e.message, e)
        }
    }
}