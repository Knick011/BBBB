package com.brainbitescabby.app.receivers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.brainbitescabby.app.MainActivity
import com.brainbitescabby.app.R
import org.json.JSONObject

class ScheduledNotificationReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "ScheduledNotification"
        private const val CHANNEL_ID = "brainbites_scheduled"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getStringExtra("notification_id") ?: "default"
        val title = intent.getStringExtra("title") ?: "BrainBites"
        val body = intent.getStringExtra("body") ?: ""
        val dataString = intent.getStringExtra("data")

        Log.d(TAG, "Received scheduled notification: $notificationId")

        showNotification(context, notificationId, title, body, dataString)
    }

    private fun showNotification(
        context: Context,
        notificationId: String,
        title: String,
        body: String,
        dataString: String?
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Scheduled Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Daily reminders and leaderboard nudges"
                enableVibration(true)
                enableLights(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Create intent to open app
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            dataString?.let {
                putExtra("notification_data", it)
            }
        }

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

        notificationManager.notify(notificationId.hashCode(), notification)
        Log.d(TAG, "✅ Notification displayed: $title")
    }
}