package com.brainbites.timer.storage

import android.content.Context
import android.content.SharedPreferences
import com.brainbites.timer.TimerState
import com.brainbites.timer.TimerStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.*
import kotlin.math.max

data class ScreenTimeStats(
    val todayScreenTime: Long = 0,
    val weeklyScreenTime: Long = 0
)

class ScreenTimeStorage(context: Context) {
    companion object {
        private const val PREFS_NAME = "BrainBites_Timer_Prefs"
        private const val KEY_TIMER_STATE = "timer_state"
        private const val KEY_REMAINING_TIME = "remaining_time"
        private const val KEY_DEBT_TIME = "debt_time"
        private const val KEY_IS_DEBT_MODE = "is_debt_mode"
        private const val KEY_IS_PAUSED = "is_paused"
        private const val KEY_TODAY_DATE = "today_date"
        private const val KEY_TODAY_SCREEN_TIME = "today_screen_time"
        private const val KEY_WEEKLY_SCREEN_TIME = "weekly_screen_time"
        private const val KEY_LAST_RESET_WEEK = "last_reset_week"
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    suspend fun saveTimerState(state: TimerStatus) = withContext(Dispatchers.IO) {
        prefs.edit().apply {
            putString(KEY_TIMER_STATE, state.state.name)
            putLong(KEY_REMAINING_TIME, state.remainingTime)
            putLong(KEY_DEBT_TIME, state.debtTime)
            putBoolean(KEY_IS_DEBT_MODE, state.isInDebtMode)
            putBoolean(KEY_IS_PAUSED, state.isPaused)
        }.apply()
    }

    suspend fun loadTimerState(): TimerStatus = withContext(Dispatchers.IO) {
        checkAndResetDailyStats()
        checkAndResetWeeklyStats()

        TimerStatus(
            state = TimerState.valueOf(prefs.getString(KEY_TIMER_STATE, TimerState.INACTIVE.name)!!),
            remainingTime = prefs.getLong(KEY_REMAINING_TIME, 0),
            debtTime = prefs.getLong(KEY_DEBT_TIME, 0),
            isInDebtMode = prefs.getBoolean(KEY_IS_DEBT_MODE, false),
            isPaused = prefs.getBoolean(KEY_IS_PAUSED, false),
            todayScreenTime = prefs.getLong(KEY_TODAY_SCREEN_TIME, 0),
            weeklyScreenTime = prefs.getLong(KEY_WEEKLY_SCREEN_TIME, 0)
        )
    }

    suspend fun addScreenTime(seconds: Long) = withContext(Dispatchers.IO) {
        checkAndResetDailyStats()
        checkAndResetWeeklyStats()

        val todayScreenTime = prefs.getLong(KEY_TODAY_SCREEN_TIME, 0)
        val weeklyScreenTime = prefs.getLong(KEY_WEEKLY_SCREEN_TIME, 0)

        prefs.edit().apply {
            putLong(KEY_TODAY_SCREEN_TIME, todayScreenTime + seconds)
            putLong(KEY_WEEKLY_SCREEN_TIME, weeklyScreenTime + seconds)
        }.apply()
    }

    suspend fun getScreenTimeStats(): ScreenTimeStats = withContext(Dispatchers.IO) {
        checkAndResetDailyStats()
        checkAndResetWeeklyStats()

        ScreenTimeStats(
            todayScreenTime = prefs.getLong(KEY_TODAY_SCREEN_TIME, 0),
            weeklyScreenTime = prefs.getLong(KEY_WEEKLY_SCREEN_TIME, 0)
        )
    }

    private fun checkAndResetDailyStats() {
        val today = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        val savedDate = prefs.getLong(KEY_TODAY_DATE, today)

        if (savedDate < today) {
            prefs.edit().apply {
                putLong(KEY_TODAY_DATE, today)
                putLong(KEY_TODAY_SCREEN_TIME, 0)
            }.apply()
        }
    }

    private fun checkAndResetWeeklyStats() {
        val calendar = Calendar.getInstance()
        val currentWeek = calendar.get(Calendar.WEEK_OF_YEAR)
        val lastResetWeek = prefs.getInt(KEY_LAST_RESET_WEEK, currentWeek)

        if (currentWeek != lastResetWeek) {
            prefs.edit().apply {
                putInt(KEY_LAST_RESET_WEEK, currentWeek)
                putLong(KEY_WEEKLY_SCREEN_TIME, 0)
            }.apply()
        }
    }

    suspend fun clearAllData() = withContext(Dispatchers.IO) {
        prefs.edit().clear().apply()
    }
} 