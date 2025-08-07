package com.brainbites.timer.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.brainbites.MainActivity
import com.brainbites.R
import com.brainbites.timer.TimerState
import com.brainbites.timer.TimerStatus

class BrainBitesNotificationManager private constructor(private val context: Context) {
    companion object {
        const val NOTIFICATION_TIMER = 1
        const val CHANNEL_ID = "BrainBites_Timer"
        private const val CHANNEL_NAME = "Screen Time"
        private var instance: BrainBitesNotificationManager? = null

        fun getInstance(context: Context): BrainBitesNotificationManager {
            return instance ?: synchronized(this) {
                instance ?: BrainBitesNotificationManager(context.applicationContext).also { instance = it }
            }
        }
    }

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Screen time tracking notifications"
                setShowBadge(false)
            }

            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun createTimerNotification(timerState: TimerStatus): Notification {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val formattedTimeLeft = formatDuration(timerState.remainingTime)
        val formattedScreenTime = formatDuration(timerState.todayScreenTime)
        val statusText = getStatusText(timerState)

        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Screen Time: $formattedTimeLeft left")
            .setContentText("Usage today: $formattedScreenTime")
            .setSubText(statusText)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun formatDuration(seconds: Long): String {
        if (seconds <= 0) return "0m"

        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60

        return if (hours > 0) {
            "${hours}h ${minutes}m"
        } else {
            "${minutes}m"
        }
    }

    private fun getStatusText(timerState: TimerStatus): String {
        return when (timerState.state) {
            TimerState.RUNNING -> "Running"
            TimerState.PAUSED -> "Paused"
            TimerState.FOREGROUND -> "In App"
            TimerState.DEBT_MODE -> "Time Up!"
            else -> "Inactive"
        }
    }

    fun checkAndShowWarnings(timerState: TimerStatus) {
        // Show warning notifications when time is running low
        if (timerState.state == TimerState.RUNNING && timerState.remainingTime in 1..900) { // 15 minutes
            showTimeWarning(timerState.remainingTime)
        }
    }

    private fun showTimeWarning(remainingSeconds: Long) {
        val formattedTime = formatDuration(remainingSeconds)
        val warningNotification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Time Running Low!")
            .setContentText("Only $formattedTime remaining")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(2, warningNotification)
    }
} 