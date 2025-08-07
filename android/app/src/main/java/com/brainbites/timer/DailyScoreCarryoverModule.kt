package com.brainbites.timer

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class DailyScoreCarryoverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val carryoverService = DailyScoreCarryoverService.getInstance(reactContext)
    
    override fun getName(): String = "DailyScoreCarryover"
    
    @ReactMethod
    fun getTodayStartScore(promise: Promise) {
        try {
            val startScore = carryoverService.getTodayStartScore()
            promise.resolve(startScore)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get today's start score", e)
        }
    }
    
    @ReactMethod
    fun getCarryoverInfo(promise: Promise) {
        try {
            val info = carryoverService.getCarryoverInfo()
            
            val map = Arguments.createMap().apply {
                putInt("remainingTimeMinutes", info.remainingTimeMinutes)
                putInt("overtimeMinutes", info.overtimeMinutes)
                putInt("potentialCarryoverScore", info.potentialCarryoverScore)
                putInt("appliedCarryoverScore", info.appliedCarryoverScore)
                putBoolean("isPositive", info.isPositive)
            }
            
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get carryover info", e)
        }
    }
    
    @ReactMethod
    fun checkAndProcessNewDay(promise: Promise) {
        try {
            carryoverService.checkAndProcessNewDay()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to process new day", e)
        }
    }
    
    @ReactMethod
    fun processEndOfDay(promise: Promise) {
        try {
            carryoverService.processEndOfDay()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to process end of day", e)
        }
    }
} 