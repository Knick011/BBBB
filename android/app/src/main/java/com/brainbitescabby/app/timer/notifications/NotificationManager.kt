package com.brainbitescabby.app.timer.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.brainbitescabby.app.MainActivity
import com.brainbitescabby.app.R
import com.brainbitescabby.app.timer.TimerState
import com.brainbitescabby.app.timer.TimerStatus

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

        val timeLeftStr = formatTime(timerState.remainingTime.toInt())
        val screenTimeStr = formatTime(timerState.todayScreenTime.toInt())
        val overtime = if (timerState.remainingTime < 0) Math.abs(timerState.remainingTime.toInt()) else 0

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
        
        // IMPORTANT: Only show 2 lines in collapsed view
        builder.setContentTitle("Time left: $timeLeftStr")
        builder.setContentText("Screen time: $screenTimeStr")
        
        // Don't show overtime in collapsed view
        // Expanded view can show more details
        val bigStyle = NotificationCompat.BigTextStyle()
        bigStyle.setBigContentTitle("BrainBites Timer")
        val expandedText = "Time left: $timeLeftStr\nScreen time: $screenTimeStr" +
                if (overtime > 0) "\nOvertime: ${formatTime(overtime)}" else ""
        bigStyle.bigText(expandedText)
        builder.setStyle(bigStyle)
        
        return builder.build()
    }

    private fun formatTime(seconds: Int): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        
        return if (hours > 0) {
            String.format("%02d:%02d:%02d", hours, minutes, secs)
        } else {
            String.format("%02d:%02d", minutes, secs)
        }
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