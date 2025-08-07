package com.brainbites.timer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect

class ScreenTimeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(Dispatchers.Default + Job())
    private var screenTimeManager: ScreenTimeManager? = null
    private var stateCollectionJob: Job? = null
    private var timerReceiver: BroadcastReceiver? = null
    private val TAG = "ScreenTimeModule"

    init {
        screenTimeManager = ScreenTimeManager.getInstance(reactContext.applicationContext)
        startStateCollection()
        startBroadcastListener()
    }

    override fun getName() = "ScreenTimeModule"

    private fun startStateCollection() {
        stateCollectionJob = scope.launch {
            screenTimeManager?.timerState?.collect { state ->
                sendEvent("onTimerStateChanged", createTimerStateMap(state))
            }
        }
    }
    
    private fun startBroadcastListener() {
        if (timerReceiver != null) return
        
        timerReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                try {
                    intent?.let {
                        val remainingTime = it.getIntExtra("remaining_time", 0)
                        val todayScreenTime = it.getIntExtra("today_screen_time", 0)
                        val overtime = it.getIntExtra("overtime", 0)
                        val isAppForeground = it.getBooleanExtra("is_app_foreground", false)
                        val isTracking = it.getBooleanExtra("is_tracking", false)
                        
                        sendEvent("timerUpdate", Arguments.createMap().apply {
                            putInt("remainingTime", remainingTime)
                            putInt("todayScreenTime", todayScreenTime)
                            putInt("overtime", overtime)
                            putBoolean("isAppForeground", isAppForeground)
                            putBoolean("isTracking", isTracking)
                        })
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Error in broadcast receiver", e)
                }
            }
        }
        
        try {
            val filter = IntentFilter("com.brainbites.TIMER_UPDATE")
            ContextCompat.registerReceiver(
                reactApplicationContext, 
                timerReceiver, 
                filter, 
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            
            Log.d(TAG, "✅ Broadcast listener started")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to register broadcast receiver", e)
        }
    }

    private fun createTimerStateMap(state: TimerStatus): WritableMap {
        return Arguments.createMap().apply {
            putString("state", state.state.name)
            putDouble("remainingTime", state.remainingTime.toDouble())
            putDouble("debtTime", state.debtTime.toDouble())
            putBoolean("isInDebtMode", state.isInDebtMode)
            putBoolean("isPaused", state.isPaused)
            putDouble("todayScreenTime", state.todayScreenTime.toDouble())
            putDouble("weeklyScreenTime", state.weeklyScreenTime.toDouble())
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to send event: $eventName", e)
        }
    }

    @ReactMethod
    fun addTimeFromQuiz(minutes: Int, promise: Promise) {
        try {
            Log.d(TAG, "🧠 Adding $minutes minutes from quiz")
            
            // Add to ScreenTimeManager
            screenTimeManager?.addTimeFromQuiz(minutes)
            
            // Also add to the service directly
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_ADD_TIME
                putExtra(ScreenTimeService.EXTRA_TIME_SECONDS, minutes * 60)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
            Log.d(TAG, "✅ Successfully added $minutes minutes from quiz")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to add quiz time", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun addTimeFromGoal(minutes: Int, promise: Promise) {
        try {
            Log.d(TAG, "🎯 Adding $minutes minutes from goal")
            
            // Add to ScreenTimeManager (convert to hours for compatibility)
            val hours = Math.max(1, minutes / 60)
            screenTimeManager?.addTimeFromGoal(hours)
            
            // Also add to the service directly (use exact minutes)
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_ADD_TIME
                putExtra(ScreenTimeService.EXTRA_TIME_SECONDS, minutes * 60)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
            Log.d(TAG, "✅ Successfully added $minutes minutes from goal")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to add goal time", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setScreenTime(seconds: Int, promise: Promise) {
        try {
            Log.d(TAG, "⏰ Setting screen time to $seconds seconds")
            
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_UPDATE_TIME
                putExtra(ScreenTimeService.EXTRA_TIME_SECONDS, seconds)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to set screen time", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startTimer(promise: Promise) {
        try {
            Log.d(TAG, "▶️ Starting timer")
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_START
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to start timer", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun pauseTimer(promise: Promise) {
        try {
            Log.d(TAG, "⏸️ Pausing timer")
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_PAUSE
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to pause timer", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopTimer(promise: Promise) {
        try {
            Log.d(TAG, "⏹️ Stopping timer")
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = ScreenTimeService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to stop timer", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getTimerState(promise: Promise) {
        try {
            val state = screenTimeManager?.getTimerState()
            if (state != null) {
                promise.resolve(createTimerStateMap(state))
            } else {
                promise.reject("ERROR", "Timer state not available")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get timer state", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getRemainingTime(promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
            val remainingTime = sharedPrefs.getInt("remaining_time", 0)
            promise.resolve(remainingTime)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get remaining time", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getTodayScreenTime(promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
            val todayScreenTime = sharedPrefs.getInt("today_screen_time", 0)
            promise.resolve(todayScreenTime)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get today screen time", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun notifyAppState(state: String, promise: Promise) {
        try {
            Log.d(TAG, "📱 App state notification: $state")
            
            val intent = Intent(reactApplicationContext, ScreenTimeService::class.java).apply {
                action = when(state) {
                    "app_foreground" -> ScreenTimeService.ACTION_APP_FOREGROUND
                    "app_background" -> ScreenTimeService.ACTION_APP_BACKGROUND
                    else -> return
                }
            }
            
            reactApplicationContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to notify app state", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        
        timerReceiver?.let { 
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering receiver", e)
            }
            timerReceiver = null
        }
        
        stateCollectionJob?.cancel()
        scope.cancel()
        
        Log.d(TAG, "✅ ScreenTimeModule destroyed")
    }
}