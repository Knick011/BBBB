package com.brainbites.timer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build

class ScreenTimeReceiver : BroadcastReceiver() {
    companion object {
        fun getIntentFilter(): IntentFilter {
            return IntentFilter().apply {
                addAction(Intent.ACTION_SCREEN_ON)
                addAction(Intent.ACTION_SCREEN_OFF)
                addAction(Intent.ACTION_USER_PRESENT)
                addAction(Intent.ACTION_BOOT_COMPLETED)
                addAction(Intent.ACTION_PACKAGE_REPLACED)
            }
        }
    }

    private var screenTimeManager: ScreenTimeManager? = null

    override fun onReceive(context: Context, intent: Intent) {
        if (screenTimeManager == null) {
            screenTimeManager = ScreenTimeManager.getInstance(context.applicationContext)
        }

        when (intent.action) {
            Intent.ACTION_SCREEN_ON -> {
                screenTimeManager?.onScreenOn()
            }
            Intent.ACTION_SCREEN_OFF -> {
                screenTimeManager?.onScreenOff()
            }
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_PACKAGE_REPLACED -> {
                if (intent.data?.schemeSpecificPart == context.packageName) {
                    startScreenTimeService(context)
                }
            }
        }
    }

    private fun startScreenTimeService(context: Context) {
        val serviceIntent = Intent(context, ScreenTimeService::class.java).apply {
            action = ScreenTimeService.ACTION_START
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
} 