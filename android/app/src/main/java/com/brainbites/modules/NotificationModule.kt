package com.brainbites.modules

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.brainbites.MainActivity
import com.brainbites.R
import org.json.JSONObject

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val CHANNEL_ID = "brainbites_general"
        private const val CHANNEL_NAME = "BrainBites Notifications"
        private const val CHANNEL_DESC = "General notifications from BrainBites"
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
}