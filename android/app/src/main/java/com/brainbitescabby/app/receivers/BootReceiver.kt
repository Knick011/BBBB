package com.brainbitescabby.app.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Device booted - morning notifications would need to be rescheduled")
            // Note: Due to Android restrictions, we cannot directly reschedule alarms here
            // The app would need to be opened by the user to reschedule morning notifications
        }
    }
}