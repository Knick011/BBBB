package com.brainbitescabby.app.timer

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
        private const val MINUTES_TO_POINTS_POSITIVE = 100 // 100 points per minute of unused time (10x impact)
        private const val MINUTES_TO_POINTS_NEGATIVE = 50  // 50 points per minute of overtime (5x penalty)
        
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
                
                // Get current timer state - including paused overtime
                val remainingSeconds = timerPrefs.getInt("remaining_time", 0)
                val overtimeSeconds = timerPrefs.getInt("overtime_seconds", 0)
                val overtimePaused = timerPrefs.getBoolean("overtime_paused", false)
                val overtimePausedAt = timerPrefs.getInt("overtime_paused_at", 0)
                
                // Total overtime = active overtime + paused overtime
                val totalOvertimeSeconds = if (overtimePaused && overtimePausedAt > 0) {
                    overtimeSeconds + overtimePausedAt
                } else {
                    overtimeSeconds
                }
                
                Log.d(TAG, "📊 End-of-day timer state:")
                Log.d(TAG, "   - Remaining: ${remainingSeconds}s")
                Log.d(TAG, "   - Active overtime: ${overtimeSeconds}s") 
                Log.d(TAG, "   - Paused overtime: ${if (overtimePaused) overtimePausedAt else 0}s")
                Log.d(TAG, "   - Total overtime: ${totalOvertimeSeconds}s")
                
                // Calculate carryover score using total overtime
                val carryoverScore = calculateCarryoverScore(remainingSeconds, totalOvertimeSeconds)
                
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
     * Calculate carryover score based on remaining time AND overtime (net calculation)
     * Both can be non-zero simultaneously when user earns time while in overtime
     */
    private fun calculateCarryoverScore(remainingSeconds: Int, overtimeSeconds: Int): Int {
        val remainingMinutes = remainingSeconds / 60
        val overtimeMinutes = overtimeSeconds / 60
        
        // Calculate positive and negative scores separately
        val bonusPoints = remainingMinutes * MINUTES_TO_POINTS_POSITIVE
        val penaltyPoints = overtimeMinutes * MINUTES_TO_POINTS_NEGATIVE
        
        // Net score = bonus - penalty
        val netScore = bonusPoints - penaltyPoints
        
        Log.d(TAG, "💰 Carryover calculation:")
        Log.d(TAG, "   - Remaining: ${remainingMinutes}m = +${bonusPoints} points")
        Log.d(TAG, "   - Overtime: ${overtimeMinutes}m = -${penaltyPoints} points") 
        Log.d(TAG, "   - Net score: ${bonusPoints} - ${penaltyPoints} = ${netScore} points")
        
        return netScore
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
     * IMPORTANT: This resets remaining time to 0 after converting to score
     */
    private fun resetDailyTimerData() {
        val remainingSeconds = timerPrefs.getInt("remaining_time", 0)
        val overtimeSeconds = timerPrefs.getInt("overtime_seconds", 0)
        val overtimePausedAt = timerPrefs.getInt("overtime_paused_at", 0)
        
        timerPrefs.edit().apply {
            // Reset ALL timer data for new day - everything gets converted to score
            putInt("remaining_time", 0)  // RESET remaining time to 0
            putInt("today_screen_time", 0)
            putInt("overtime_seconds", 0)
            putBoolean("overtime_paused", false)  // Reset overtime pause state
            remove("overtime_paused_at")  // Clear paused overtime
            putString("last_save_date", getCurrentDateString())
            apply()
        }
        
        Log.d(TAG, "🔄 Reset daily timer data for new day")
        Log.d(TAG, "   - Remaining time was: ${remainingSeconds}s (${remainingSeconds / 60}m)")
        Log.d(TAG, "   - Overtime was: ${overtimeSeconds}s (${overtimeSeconds / 60}m)")
        Log.d(TAG, "   - Paused overtime was: ${overtimePausedAt}s (${overtimePausedAt / 60}m)")
        Log.d(TAG, "   - All timers now: 0s (converted to carryover score)")
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
        val overtimePaused = timerPrefs.getBoolean("overtime_paused", false)
        val overtimePausedAt = timerPrefs.getInt("overtime_paused_at", 0)
        
        // Calculate total overtime (active + paused)
        val totalOvertimeSeconds = if (overtimePaused && overtimePausedAt > 0) {
            overtimeSeconds + overtimePausedAt
        } else {
            overtimeSeconds
        }
        
        val potentialScore = calculateCarryoverScore(remainingSeconds, totalOvertimeSeconds)
        val currentCarryover = sharedPrefs.getInt(KEY_CARRYOVER_SCORE, 0)
        
        return CarryoverInfo(
            remainingTimeMinutes = remainingSeconds / 60,
            overtimeMinutes = totalOvertimeSeconds / 60,  // Show total overtime
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