package com.brainbites.timer

import android.content.Context
import android.os.SystemClock
import android.util.Log
import com.brainbites.timer.storage.ScreenTimeStorage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

enum class TimerState {
    INACTIVE,
    RUNNING,
    PAUSED,
    FOREGROUND,
    DEBT_MODE
}

data class TimerStatus(
    val state: TimerState = TimerState.INACTIVE,
    val remainingTime: Long = 0,
    val debtTime: Long = 0,
    val isInDebtMode: Boolean = false,
    val isPaused: Boolean = false,
    val todayScreenTime: Long = 0,
    val weeklyScreenTime: Long = 0
)

class ScreenTimeManager private constructor(context: Context) {
    companion object {
        @Volatile
        private var instance: ScreenTimeManager? = null

        fun getInstance(context: Context): ScreenTimeManager {
            return instance ?: synchronized(this) {
                instance ?: ScreenTimeManager(context).also { instance = it }
            }
        }
    }

    private val storage = ScreenTimeStorage(context)
    private val scope = CoroutineScope(Dispatchers.Default)
    private val _timerState = MutableStateFlow(TimerStatus())
    val timerState: StateFlow<TimerStatus> = _timerState

    private var lastUpdateTime: Long = SystemClock.elapsedRealtime()
    private var screenOnStartTime: Long = 0

    init {
        scope.launch {
            loadState()
        }
    }

    private suspend fun loadState() {
        val savedState = storage.loadTimerState()
        _timerState.value = savedState
    }

    private suspend fun saveState() {
        storage.saveTimerState(_timerState.value)
    }

    fun startTimer() {
        if (_timerState.value.state != TimerState.RUNNING) {
            _timerState.value = _timerState.value.copy(
                state = TimerState.RUNNING,
                isPaused = false
            )
            lastUpdateTime = SystemClock.elapsedRealtime()
            scope.launch { saveState() }
        }
    }

    fun pauseTimer() {
        if (_timerState.value.state == TimerState.RUNNING) {
            updateElapsedTime()
            _timerState.value = _timerState.value.copy(
                state = TimerState.PAUSED,
                isPaused = true
            )
            scope.launch { saveState() }
        }
    }

    fun stopTimer() {
        updateElapsedTime()
        _timerState.value = _timerState.value.copy(
            state = TimerState.INACTIVE
        )
        scope.launch { saveState() }
    }

    fun onAppForeground() {
        updateElapsedTime()
        _timerState.value = _timerState.value.copy(
            state = TimerState.FOREGROUND
        )
        scope.launch { saveState() }
    }

    fun onAppBackground() {
        if (_timerState.value.state == TimerState.FOREGROUND) {
            _timerState.value = _timerState.value.copy(
                state = TimerState.RUNNING
            )
            lastUpdateTime = SystemClock.elapsedRealtime()
            scope.launch { saveState() }
        }
    }

    fun onScreenOn() {
        screenOnStartTime = SystemClock.elapsedRealtime()
        if (_timerState.value.state == TimerState.PAUSED) {
            startTimer()
        }
    }

    fun onScreenOff() {
        updateScreenTime()
        pauseTimer()
    }

    private fun updateScreenTime() {
        if (screenOnStartTime > 0) {
            val screenTime = (SystemClock.elapsedRealtime() - screenOnStartTime) / 1000
            scope.launch {
                storage.addScreenTime(screenTime)
                updateStats()
            }
        }
    }

    private fun updateElapsedTime() {
        val now = SystemClock.elapsedRealtime()
        val elapsedSeconds = ((now - lastUpdateTime) / 1000).toLong()
        
        if (elapsedSeconds > 0) {
            val currentState = _timerState.value
            
            if (currentState.state == TimerState.RUNNING) {
                if (currentState.remainingTime > 0) {
                    val newRemainingTime = maxOf(0, currentState.remainingTime - elapsedSeconds)
                    val debtIncrease = if (newRemainingTime == 0L) {
                        elapsedSeconds - currentState.remainingTime
                    } else 0

                    _timerState.value = currentState.copy(
                        remainingTime = newRemainingTime,
                        debtTime = currentState.debtTime + debtIncrease,
                        isInDebtMode = newRemainingTime == 0L
                    )
                } else {
                    _timerState.value = currentState.copy(
                        debtTime = currentState.debtTime + elapsedSeconds,
                        isInDebtMode = true
                    )
                }
            }
        }
        
        lastUpdateTime = now
    }

    private suspend fun updateStats() {
        val stats = storage.getScreenTimeStats()
        _timerState.value = _timerState.value.copy(
            todayScreenTime = stats.todayScreenTime,
            weeklyScreenTime = stats.weeklyScreenTime
        )
    }

    fun addTimeFromQuiz(minutes: Int) {
        Log.d("ScreenTimeManager", "✅ Adding $minutes minutes from quiz")
        val seconds = minutes * 60L
        val oldRemainingTime = _timerState.value.remainingTime
        
        _timerState.value = _timerState.value.copy(
            remainingTime = _timerState.value.remainingTime + seconds,
            isInDebtMode = false
        )
        
        val newRemainingTime = _timerState.value.remainingTime
        Log.d("ScreenTimeManager", "✅ Quiz time added: ${oldRemainingTime}s -> ${newRemainingTime}s (+${seconds}s)")
        
        scope.launch { saveState() }
    }

    fun addTimeFromGoal(hours: Int) {
        Log.d("ScreenTimeManager", "✅ Adding $hours hours from goal")
        val seconds = hours * 3600L
        val oldRemainingTime = _timerState.value.remainingTime
        
        _timerState.value = _timerState.value.copy(
            remainingTime = _timerState.value.remainingTime + seconds,
            isInDebtMode = false
        )
        
        val newRemainingTime = _timerState.value.remainingTime
        Log.d("ScreenTimeManager", "✅ Goal time added: ${oldRemainingTime}s -> ${newRemainingTime}s (+${seconds}s)")
        
        scope.launch { saveState() }
    }

    fun getTimerState(): TimerStatus = _timerState.value
} 