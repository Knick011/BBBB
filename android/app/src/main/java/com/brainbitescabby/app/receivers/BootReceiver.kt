package com.brainbitescabby.app.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.brainbitescabby.app.timer.ScreenTimeService

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                Log.d(TAG, "🔄 Device booted or app updated - restarting timer service")

                try {
                    // Check if timer was previously running by checking SharedPrefs
                    val prefs = context.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
                    val hasRemainingTime = prefs.getInt("remaining_time", 0) > 0
                    val hasTodayScreenTime = prefs.getInt("today_screen_time", 0) > 0

                    // Restart service if there was active timer data
                    if (hasRemainingTime || hasTodayScreenTime) {
                        val serviceIntent = Intent(context, ScreenTimeService::class.java).apply {
                            action = ScreenTimeService.ACTION_START
                        }

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent)
                        } else {
                            context.startService(serviceIntent)
                        }

                        Log.d(TAG, "✅ Timer service restarted after boot/update")
                    } else {
                        Log.d(TAG, "ℹ️ No active timer data found - skipping service start")
                    }

                } catch (e: Exception) {
                    Log.e(TAG, "❌ Failed to restart timer service after boot", e)
                }
            }
        }
    }
}