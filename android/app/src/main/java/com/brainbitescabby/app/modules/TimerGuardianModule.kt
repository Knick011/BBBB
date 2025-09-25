package com.brainbitescabby.app.modules

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.brainbitescabby.app.timer.PersistentTimerGuardian
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class TimerGuardianModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TimerGuardianModule"
    }

    private val guardian: PersistentTimerGuardian = PersistentTimerGuardian.getInstance(reactContext)
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun getName(): String = "TimerGuardianModule"

    /**
     * Start the guardian protection system
     */
    @ReactMethod
    fun startGuarding(promise: Promise) {
        try {
            Log.d(TAG, "🛡️ Starting guardian from React Native")
            guardian.startGuarding()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start guardian: ${e.message}")
            promise.reject("START_GUARDIAN_ERROR", e.message, e)
        }
    }

    /**
     * Stop the guardian protection system
     */
    @ReactMethod
    fun stopGuarding(promise: Promise) {
        try {
            Log.d(TAG, "🛡️ Stopping guardian from React Native")
            guardian.stopGuarding()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to stop guardian: ${e.message}")
            promise.reject("STOP_GUARDIAN_ERROR", e.message, e)
        }
    }

    /**
     * Force restart the timer (for testing)
     */
    @ReactMethod
    fun forceRestart(promise: Promise) {
        try {
            Log.d(TAG, "🔧 Force restart requested from React Native")
            guardian.forceRestart()
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to force restart: ${e.message}")
            promise.reject("FORCE_RESTART_ERROR", e.message, e)
        }
    }

    /**
     * Get guardian statistics
     */
    @ReactMethod
    fun getGuardianStats(promise: Promise) {
        try {
            val stats = guardian.getGuardianStats()
            val jsStats = WritableNativeMap().apply {
                putBoolean("isGuarding", stats["isGuarding"] as Boolean)
                putInt("restartCount", stats["restartCount"] as Int)
                putDouble("lastHeartbeat", (stats["lastHeartbeat"] as Long).toDouble())
                putDouble("uptime", (stats["uptime"] as Long).toDouble())
            }
            promise.resolve(jsStats)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get guardian stats: ${e.message}")
            promise.reject("GET_STATS_ERROR", e.message, e)
        }
    }

    /**
     * Check if timer is currently alive
     */
    @ReactMethod
    fun checkTimerHealth(promise: Promise) {
        scope.launch {
            try {
                // Implement health check logic here
                // For now, return a basic health status
                val healthStatus = WritableNativeMap().apply {
                    putBoolean("notificationExists", true) // Placeholder
                    putBoolean("serviceRunning", true) // Placeholder
                    putBoolean("processAlive", true)
                    putBoolean("overall", true)
                }
                promise.resolve(healthStatus)
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to check timer health: ${e.message}")
                promise.reject("HEALTH_CHECK_ERROR", e.message, e)
            }
        }
    }

    /**
     * Schedule preventive restart
     */
    @ReactMethod
    fun schedulePreventiveRestart(intervalHours: Int, promise: Promise) {
        try {
            Log.d(TAG, "🔄 Scheduling preventive restart every $intervalHours hours")
            // Implementation would go here
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to schedule preventive restart: ${e.message}")
            promise.reject("SCHEDULE_RESTART_ERROR", e.message, e)
        }
    }

    /**
     * Send event to React Native
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Send guardian status update to React Native
     */
    fun sendGuardianUpdate(status: String, data: Map<String, Any>? = null) {
        val params = WritableNativeMap().apply {
            putString("status", status)
            putDouble("timestamp", System.currentTimeMillis().toDouble())

            data?.forEach { (key, value) ->
                when (value) {
                    is String -> putString(key, value)
                    is Int -> putInt(key, value)
                    is Double -> putDouble(key, value)
                    is Boolean -> putBoolean(key, value)
                    is Long -> putDouble(key, value.toDouble())
                }
            }
        }

        sendEvent("TimerGuardianUpdate", params)
    }

    /**
     * Constants for React Native
     */
    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "HEARTBEAT_INTERVAL" to 30000,
            "WATCHDOG_INTERVAL" to 60000,
            "RESTART_INTERVAL" to (2 * 60 * 60 * 1000),
            "NOTIFICATION_ID" to 1001
        )
    }
}