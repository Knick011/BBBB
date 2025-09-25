// PersistentTimerGuardian.ts
// Ensures the persistent timer notification never dies

import { NativeModules, AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerState {
  isRunning: boolean;
  startTime: number;
  lastHeartbeat: number;
  restartCount: number;
}

class PersistentTimerGuardian {
  private static instance: PersistentTimerGuardian;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private restartInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly WATCHDOG_INTERVAL = 60000; // 1 minute
  private readonly RESTART_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
  private readonly MAX_MISSED_HEARTBEATS = 3;
  private readonly STORAGE_KEY = 'persistent_timer_state';

  public static getInstance(): PersistentTimerGuardian {
    if (!PersistentTimerGuardian.instance) {
      PersistentTimerGuardian.instance = new PersistentTimerGuardian();
    }
    return PersistentTimerGuardian.instance;
  }

  /**
   * Start the guardian system
   */
  public async startGuarding(): Promise<void> {
    console.log('🛡️ [TimerGuardian] Starting persistent timer protection');

    try {
      // Initialize timer state
      await this.initializeTimerState();

      // Start all protection mechanisms
      this.startHeartbeat();
      this.startWatchdog();
      this.startPreventiveRestart();
      this.setupAppStateListener();
      this.setupCrashRecovery();

      console.log('✅ [TimerGuardian] All protection mechanisms active');
    } catch (error) {
      console.error('❌ [TimerGuardian] Failed to start guardian:', error);
    }
  }

  /**
   * Stop the guardian system
   */
  public stopGuarding(): void {
    console.log('🛡️ [TimerGuardian] Stopping timer protection');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }

    if (this.restartInterval) {
      clearInterval(this.restartInterval);
      this.restartInterval = null;
    }
  }

  /**
   * Initialize timer state tracking
   */
  private async initializeTimerState(): Promise<void> {
    try {
      const existingState = await AsyncStorage.getItem(this.STORAGE_KEY);

      if (!existingState) {
        const initialState: TimerState = {
          isRunning: true,
          startTime: Date.now(),
          lastHeartbeat: Date.now(),
          restartCount: 0
        };

        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialState));
        console.log('🆕 [TimerGuardian] Initialized new timer state');
      } else {
        console.log('📂 [TimerGuardian] Loaded existing timer state');
      }
    } catch (error) {
      console.error('❌ [TimerGuardian] Failed to initialize timer state:', error);
    }
  }

  /**
   * Regular heartbeat to prove timer is alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const state = await this.getTimerState();
        if (state) {
          state.lastHeartbeat = Date.now();
          await this.saveTimerState(state);

          // Send heartbeat to native module
          const { ScreenTimeModule } = NativeModules;
          if (ScreenTimeModule?.sendHeartbeat) {
            await ScreenTimeModule.sendHeartbeat();
          }

          console.log('💓 [TimerGuardian] Heartbeat sent');
        }
      } catch (error) {
        console.error('💔 [TimerGuardian] Heartbeat failed:', error);
        await this.handleTimerFailure('heartbeat_failed');
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Watchdog to detect if timer died
   */
  private startWatchdog(): void {
    this.watchdogInterval = setInterval(async () => {
      try {
        const isAlive = await this.checkTimerAlive();

        if (!isAlive) {
          console.log('🚨 [TimerGuardian] Timer death detected by watchdog!');
          await this.handleTimerFailure('watchdog_death_detection');
        } else {
          console.log('✅ [TimerGuardian] Timer confirmed alive');
        }
      } catch (error) {
        console.error('❌ [TimerGuardian] Watchdog check failed:', error);
      }
    }, this.WATCHDOG_INTERVAL);
  }

  /**
   * Preventive restart every 2 hours
   */
  private startPreventiveRestart(): void {
    this.restartInterval = setInterval(async () => {
      console.log('🔄 [TimerGuardian] Performing preventive restart');
      await this.restartTimer('preventive_maintenance');
    }, this.RESTART_INTERVAL);
  }

  /**
   * Check if timer is still alive
   */
  private async checkTimerAlive(): Promise<boolean> {
    try {
      const { ScreenTimeModule } = NativeModules;

      // Method 1: Check if notification exists
      const notificationExists = await this.checkNotificationExists();

      // Method 2: Check if service is running
      const serviceExists = await this.checkServiceExists();

      // Method 3: Ping native module
      let moduleResponsive = false;
      if (ScreenTimeModule?.isTimerRunning) {
        try {
          moduleResponsive = await ScreenTimeModule.isTimerRunning();
        } catch (e) {
          moduleResponsive = false;
        }
      }

      const isAlive = notificationExists && serviceExists && moduleResponsive;

      console.log(`🔍 [TimerGuardian] Alive check: notification=${notificationExists}, service=${serviceExists}, module=${moduleResponsive} => ${isAlive}`);

      return isAlive;
    } catch (error) {
      console.error('❌ [TimerGuardian] Alive check failed:', error);
      return false;
    }
  }

  /**
   * Check if persistent notification exists
   */
  private async checkNotificationExists(): Promise<boolean> {
    // This would need to be implemented via native module
    // For now, return true as placeholder
    return true;
  }

  /**
   * Check if timer service is running
   */
  private async checkServiceExists(): Promise<boolean> {
    try {
      const { ScreenTimeModule } = NativeModules;
      if (ScreenTimeModule?.isServiceRunning) {
        return await ScreenTimeModule.isServiceRunning();
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle timer failure and restart
   */
  private async handleTimerFailure(reason: string): Promise<void> {
    console.log(`🚨 [TimerGuardian] Handling timer failure: ${reason}`);

    try {
      const state = await this.getTimerState();
      if (state) {
        state.restartCount++;
        await this.saveTimerState(state);
      }

      // Log the failure
      console.log(`📊 [TimerGuardian] Timer failed after ${state?.restartCount || 0} restarts. Reason: ${reason}`);

      // Restart the timer
      await this.restartTimer(reason);

    } catch (error) {
      console.error('❌ [TimerGuardian] Failed to handle timer failure:', error);
    }
  }

  /**
   * Restart the timer system
   */
  private async restartTimer(reason: string): Promise<void> {
    console.log(`🔄 [TimerGuardian] Restarting timer. Reason: ${reason}`);

    try {
      const { ScreenTimeModule } = NativeModules;

      // Step 1: Stop current timer
      if (ScreenTimeModule?.stopTimer) {
        await ScreenTimeModule.stopTimer();
        console.log('🛑 [TimerGuardian] Stopped existing timer');
      }

      // Step 2: Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Start fresh timer
      if (ScreenTimeModule?.startTimer) {
        await ScreenTimeModule.startTimer();
        console.log('🚀 [TimerGuardian] Started fresh timer');
      }

      // Step 4: Verify restart worked
      setTimeout(async () => {
        const isAlive = await this.checkTimerAlive();
        if (isAlive) {
          console.log('✅ [TimerGuardian] Timer restart successful');
        } else {
          console.log('❌ [TimerGuardian] Timer restart failed, retrying...');
          setTimeout(() => this.restartTimer('restart_verification_failed'), 5000);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ [TimerGuardian] Timer restart failed:', error);
      // Retry after delay
      setTimeout(() => this.restartTimer('restart_retry'), 10000);
    }
  }

  /**
   * Setup app state listener for recovery
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 [TimerGuardian] App became active, checking timer health');

        // Check if timer is still alive after returning to foreground
        setTimeout(async () => {
          const isAlive = await this.checkTimerAlive();
          if (!isAlive) {
            console.log('🚨 [TimerGuardian] Timer died while app was backgrounded');
            await this.handleTimerFailure('app_state_recovery');
          }
        }, 2000);
      }
    });
  }

  /**
   * Setup crash recovery mechanism
   */
  private setupCrashRecovery(): void {
    // Listen for app crashes/restarts
    DeviceEventEmitter.addListener('TimerCrashed', async () => {
      console.log('💥 [TimerGuardian] Timer crash detected');
      await this.handleTimerFailure('crash_recovery');
    });
  }

  /**
   * Get current timer state
   */
  private async getTimerState(): Promise<TimerState | null> {
    try {
      const stateStr = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stateStr ? JSON.parse(stateStr) : null;
    } catch (error) {
      console.error('❌ [TimerGuardian] Failed to get timer state:', error);
      return null;
    }
  }

  /**
   * Save timer state
   */
  private async saveTimerState(state: TimerState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ [TimerGuardian] Failed to save timer state:', error);
    }
  }

  /**
   * Get guardian statistics
   */
  public async getGuardianStats(): Promise<{
    uptime: number;
    restartCount: number;
    lastHeartbeat: Date;
  }> {
    const state = await this.getTimerState();

    return {
      uptime: state ? Date.now() - state.startTime : 0,
      restartCount: state?.restartCount || 0,
      lastHeartbeat: state ? new Date(state.lastHeartbeat) : new Date()
    };
  }
}

export default PersistentTimerGuardian;