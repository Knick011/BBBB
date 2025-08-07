package com.brainbites.timer

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar
import kotlin.math.abs

class DailyScoreCarryoverService private constructor(private val context: Context) {
    companion object {
        private const val TAG = "DailyScoreCarryover"
        private const val PREFS_NAME = "BrainBitesScoreCarryover"
        private const val KEY_CARRYOVER_SCORE = "carryover_score"
        private const val KEY_LAST_PROCESSED_DATE = "last_processed_date"
        private const val KEY_DAILY_START_SCORE = "daily_start_score"
        
        // Score calculation constants
        private const val MINUTES_TO_POINTS_POSITIVE = 10 // 10 points per minute of unused time
        private const val MINUTES_TO_POINTS_NEGATIVE = 5  // 5 points per minute of overtime (penalty)
        
        @Volatile
        private var instance: DailyScoreCarryoverService? = null

        fun getInstance(context: Context): DailyScoreCarryoverService {
            return instance ?: synchronized(this) {
                instance ?: DailyScoreCarryoverService(context.applicationContext).also { instance = it }
            }
        }
    }
    
    private val sharedPrefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val timerPrefs: SharedPreferences = context.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(Dispatchers.IO)
    
    init {
        Log.d(TAG, "✅ DailyScoreCarryoverService initialized")
    }
    
    /**
     * Process end-of-day score carryover
     * Called at midnight or when a new day is detected
     */
    fun processEndOfDay() {
        scope.launch {
            try {
                val today = getCurrentDateString()
                val lastProcessed = sharedPrefs.getString(KEY_LAST_PROCESSED_DATE, "")
                
                if (lastProcessed == today) {
                    Log.d(TAG, "📅 Already processed for today: $today")
                    return@launch
                }
                
                Log.d(TAG, "🌙 Processing end-of-day carryover for: $today")
                
                // Get current timer state
                val remainingSeconds = timerPrefs.getInt("remaining_time", 0)
                val overtimeSeconds = timerPrefs.getInt("overtime_seconds", 0)
                
                // Calculate carryover score
                val carryoverScore = calculateCarryoverScore(remainingSeconds, overtimeSeconds)
                
                // Save carryover score
                sharedPrefs.edit().apply {
                    putInt(KEY_CARRYOVER_SCORE, carryoverScore)
                    putString(KEY_LAST_PROCESSED_DATE, today)
                    apply()
                }
                
                Log.d(TAG, "✅ End-of-day processing complete:")
                Log.d(TAG, "   - Remaining time: ${remainingSeconds}s (${remainingSeconds / 60}m)")
                Log.d(TAG, "   - Overtime: ${overtimeSeconds}s (${overtimeSeconds / 60}m)")
                Log.d(TAG, "   - Carryover score: $carryoverScore points")
                
                // Reset timer data for new day
                resetDailyTimerData()
                
            } catch (e: Exception) {
                Log.e(TAG, "❌ Failed to process end-of-day", e)
            }
        }
    }
    
    /**
     * Calculate carryover score based on remaining time or overtime
     */
    private fun calculateCarryoverScore(remainingSeconds: Int, overtimeSeconds: Int): Int {
        return when {
            // If there's overtime, apply negative score
            overtimeSeconds > 0 -> {
                val overtimeMinutes = overtimeSeconds / 60
                val penalty = overtimeMinutes * MINUTES_TO_POINTS_NEGATIVE
                -penalty // Negative score
            }
            // If there's remaining time, apply positive score
            remainingSeconds > 0 -> {
                val remainingMinutes = remainingSeconds / 60
                val bonus = remainingMinutes * MINUTES_TO_POINTS_POSITIVE
                bonus // Positive score
            }
            // No remaining time or overtime
            else -> 0
        }
    }
    
    /**
     * Get the carryover score for the current day
     * This should be called when initializing the daily score
     */
    fun getTodayStartScore(): Int {
        val today = getCurrentDateString()
        val lastProcessed = sharedPrefs.getString(KEY_LAST_PROCESSED_DATE, "")
        
        // If we haven't processed yesterday's data yet, do it now
        if (lastProcessed != today) {
            processEndOfDay()
        }
        
        val carryoverScore = sharedPrefs.getInt(KEY_CARRYOVER_SCORE, 0)
        val dailyStartScore = sharedPrefs.getInt(KEY_DAILY_START_SCORE, 0)
        
        // Check if we've already applied carryover for today
        val todayStartApplied = sharedPrefs.getString("${KEY_DAILY_START_SCORE}_date", "") == today
        
        if (!todayStartApplied) {
            // Apply carryover score as starting score for today
            sharedPrefs.edit().apply {
                putInt(KEY_DAILY_START_SCORE, carryoverScore)
                putString("${KEY_DAILY_START_SCORE}_date", today)
                // Clear carryover after applying
                putInt(KEY_CARRYOVER_SCORE, 0)
                apply()
            }
            
            Log.d(TAG, "🌅 Applied carryover score for new day: $carryoverScore points")
            return carryoverScore
        }
        
        return dailyStartScore
    }
    
    /**
     * Reset daily timer data (called at midnight)
     */
    private fun resetDailyTimerData() {
        timerPrefs.edit().apply {
            // Keep remaining time but reset daily tracking
            putInt("today_screen_time", 0)
            putInt("overtime_seconds", 0)
            putString("last_save_date", getCurrentDateString())
            apply()
        }
        
        Log.d(TAG, "🔄 Reset daily timer data for new day")
    }
    
    /**
     * Check if it's a new day and process if needed
     */
    fun checkAndProcessNewDay() {
        scope.launch {
            val today = getCurrentDateString()
            val lastProcessed = sharedPrefs.getString(KEY_LAST_PROCESSED_DATE, "")
            
            if (lastProcessed != today) {
                Log.d(TAG, "🌅 New day detected, processing carryover...")
                processEndOfDay()
            }
        }
    }
    
    /**
     * Get current date as string
     */
    private fun getCurrentDateString(): String {
        return android.text.format.DateFormat.format("yyyy-MM-dd", java.util.Date()).toString()
    }
    
    /**
     * Get detailed carryover info for display
     */
    fun getCarryoverInfo(): CarryoverInfo {
        val remainingSeconds = timerPrefs.getInt("remaining_time", 0)
        val overtimeSeconds = timerPrefs.getInt("overtime_seconds", 0)
        val potentialScore = calculateCarryoverScore(remainingSeconds, overtimeSeconds)
        val currentCarryover = sharedPrefs.getInt(KEY_CARRYOVER_SCORE, 0)
        
        return CarryoverInfo(
            remainingTimeMinutes = remainingSeconds / 60,
            overtimeMinutes = overtimeSeconds / 60,
            potentialCarryoverScore = potentialScore,
            appliedCarryoverScore = currentCarryover,
            isPositive = potentialScore >= 0
        )
    }
    
    data class CarryoverInfo(
        val remainingTimeMinutes: Int,
        val overtimeMinutes: Int,
        val potentialCarryoverScore: Int,
        val appliedCarryoverScore: Int,
        val isPositive: Boolean
    )
} 