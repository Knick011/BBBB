package com.brainbites

import android.app.Application
import android.app.Activity
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.brainbites.timer.ScreenTimePackage
import com.brainbites.timer.ScreenTimeReceiver
import com.brainbites.timer.ScreenTimeService
import com.brainbites.timer.DailyScoreCarryoverPackage

class MainApplication : Application(), ReactApplication {

  private var screenReceiver: ScreenTimeReceiver? = null
  private var isAppInForeground = false

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Add the timer package
              add(ScreenTimePackage())
              // Add the score carryover package
              add(DailyScoreCarryoverPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // Register screen state receiver for timer
    screenReceiver = ScreenTimeReceiver()
    val filter = ScreenTimeReceiver.getIntentFilter()
    registerReceiver(screenReceiver, filter)
    
    // Register lifecycle listener for app foreground/background
    registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
      override fun onActivityResumed(activity: Activity) {
        if (!isAppInForeground) {
          isAppInForeground = true
          notifyAppState("app_foreground")
        }
      }

      override fun onActivityPaused(activity: Activity) {
        if (isAppInForeground) {
          isAppInForeground = false
          notifyAppState("app_background")
        }
      }

      override fun onActivityCreated(activity: Activity, savedInstanceState: android.os.Bundle?) {}
      override fun onActivityStarted(activity: Activity) {}
      override fun onActivityStopped(activity: Activity) {}
      override fun onActivitySaveInstanceState(activity: Activity, outState: android.os.Bundle) {}
      override fun onActivityDestroyed(activity: Activity) {}
    })
    
    // Start the timer service if there's saved time
    initializeTimer()
  }

  private fun notifyAppState(state: String) {
    val serviceIntent = Intent(this, ScreenTimeService::class.java).apply {
      action = when(state) {
        "app_foreground" -> ScreenTimeService.ACTION_APP_FOREGROUND
        "app_background" -> ScreenTimeService.ACTION_APP_BACKGROUND
        else -> return
      }
    }
    startService(serviceIntent)
  }

  private fun initializeTimer() {
    val sharedPrefs = getSharedPreferences("BrainBitesTimerPrefs", MODE_PRIVATE)
    val remainingTime = sharedPrefs.getInt("remaining_time", 0)
    
    if (remainingTime > 0) {
      val serviceIntent = Intent(this, ScreenTimeService::class.java).apply {
        action = ScreenTimeService.ACTION_START
      }
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(serviceIntent)
      } else {
        startService(serviceIntent)
      }
    }
  }

  override fun onTerminate() {
    super.onTerminate()
    screenReceiver?.let { unregisterReceiver(it) }
  }
}