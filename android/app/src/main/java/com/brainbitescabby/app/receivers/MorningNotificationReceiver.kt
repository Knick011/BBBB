package com.brainbitescabby.app.receivers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.brainbitescabby.app.MainActivity
import com.brainbitescabby.app.R

class MorningNotificationReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        android.util.Log.d("MorningNotificationReceiver", "Morning alarm triggered!")
        
        val title = intent.getStringExtra("title") ?: "Good Morning!"
        val body = intent.getStringExtra("body") ?: "Time to start your day with BrainBites!"
        
        android.util.Log.d("MorningNotificationReceiver", "Showing notification: $title")
        showNotification(context, title, body)
    }
    
    private fun showNotification(context: Context, title: String, body: String) {
        try {
            android.util.Log.d("MorningNotificationReceiver", "Creating notification...")
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create notification channel for Android O and above
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Morning Reminders",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Daily morning reminders to complete goals"
                    enableVibration(true)
                    enableLights(true)
                }
                notificationManager.createNotificationChannel(channel)
                android.util.Log.d("MorningNotificationReceiver", "Notification channel created")
            }
            
            // Create intent to open app
            val mainIntent = Intent(context, MainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Build notification
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent)
                .build()
            
            android.util.Log.d("MorningNotificationReceiver", "Showing notification with ID: $NOTIFICATION_ID")
            notificationManager.notify(NOTIFICATION_ID, notification)
            android.util.Log.d("MorningNotificationReceiver", "Notification shown successfully")
        } catch (e: Exception) {
            android.util.Log.e("MorningNotificationReceiver", "Error showing notification", e)
        }
    }
    
    companion object {
        private const val CHANNEL_ID = "morning_reminder_channel"
        private const val NOTIFICATION_ID = 9001
    }
}