package com.brainbitescabby.app.timer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class TimerWakeupReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TimerWakeupReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "⏰ Critical wakeup alarm fired - checking timer service")

        try {
            // Check if ScreenTimeService is running
            if (!ScreenTimeService.isServiceRunning()) {
                Log.w(TAG, "❌ Timer service died - restarting from critical wakeup")

                val serviceIntent = Intent(context, ScreenTimeService::class.java).apply {
                    action = ScreenTimeService.ACTION_START
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }

                Log.d(TAG, "✅ Timer service restarted from critical wakeup")
            } else {
                Log.d(TAG, "✅ Timer service is alive - critical wakeup successful")
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to handle critical wakeup", e)
        }
    }
}