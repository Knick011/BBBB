package com.brainbitescabby.app.timer

import android.app.job.JobParameters
import android.app.job.JobService
import android.content.Intent
import android.os.Build
import android.util.Log

class TimerRestartJobService : JobService() {

    companion object {
        private const val TAG = "TimerRestartJobService"
    }

    override fun onStartJob(params: JobParameters?): Boolean {
        Log.d(TAG, "⚡ Job started - checking timer service health")

        // Check if ScreenTimeService is running
        if (!ScreenTimeService.isServiceRunning()) {
            Log.w(TAG, "❌ Timer service is NOT running - restarting it")

            try {
                val serviceIntent = Intent(this, ScreenTimeService::class.java).apply {
                    action = ScreenTimeService.ACTION_START
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }

                Log.d(TAG, "✅ Timer service restarted successfully")
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to restart timer service", e)
            }
        } else {
            Log.d(TAG, "✅ Timer service is running normally")
        }

        // Job completed
        jobFinished(params, false)
        return false
    }

    override fun onStopJob(params: JobParameters?): Boolean {
        Log.d(TAG, "⏹️ Job stopped")
        return false
    }
}