// src/services/HybridTimerService.ts
// ✅ HYBRID TIMER SERVICE - Combines persistent notifications with widget support
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerData {
  remainingTime: number;
  todayScreenTime: number;
  overtime: number;
  isAppForeground: boolean;
  isTracking: boolean;
  notificationTitle?: string;
  notificationText?: string;
}

class HybridTimerService {
  private static instance: HybridTimerService;
  private listeners: Array<(data: TimerData) => void> = [];
  private currentData: TimerData | null = null;
  private eventEmitter: any = null;
  private subscriptions: any[] = [];
  private timeLeft: number = 0;
  private screenTime: number = 0;
  // Add these properties for comprehensive overtime persistence
  private overtimeSeconds: number = 0;
  private overtimePaused: boolean = false;
  private overtimePausedAt: number = 0;
  private overtime: number = 0;
  private pausedOvertimeValue: number = 0;
  private isPaused: boolean = false;

  static getInstance(): HybridTimerService {
    if (!HybridTimerService.instance) {
      HybridTimerService.instance = new HybridTimerService();
    }
    return HybridTimerService.instance;
  }

  // Update initialize to load overtime
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 [HybridTimer] Initializing hybrid timer service...');
      
      // Set up event listeners for both timer systems
      this.setupBrainBitesTimerListener();
      this.setupScreenTimeModuleListener();
      
      // Load initial state
      await this.loadInitialState();
      
      // Load overtime from storage
      const savedOvertime = await AsyncStorage.getItem('@BrainBites:overtime');
      const savedOvertimePaused = await AsyncStorage.getItem('@BrainBites:overtimePaused');
      
      if (savedOvertime) {
        this.overtimeSeconds = parseInt(savedOvertime, 10);
      }
      if (savedOvertimePaused === 'true') {
        this.overtimePaused = true;
        const pausedAt = await AsyncStorage.getItem('@BrainBites:overtimePausedAt');
        this.overtimePausedAt = pausedAt ? parseInt(pausedAt, 10) : 0;
      }
      
      console.log(`⏰ Loaded overtime: ${this.overtimeSeconds}s (paused: ${this.overtimePaused})`);
      
      // Reset daily overtime if it's a new day
      await this.resetDailyOvertime();
      
      console.log('✅ [HybridTimer] Hybrid timer service initialized');
      return true;
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to initialize:', error);
      return false;
    }
  }

  private setupBrainBitesTimerListener(): void {
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer) {
        const emitter = new NativeEventEmitter(BrainBitesTimer);
        
        const subscription = emitter.addListener('timerUpdate', async (data: any) => {
          console.log('🔄 [HybridTimer] BrainBitesTimer update:', data);
          
          // Preserve existing todayScreenTime if available
          const existingScreenTime = this.currentData?.todayScreenTime || 0;
          
          // Update local state
          this.timeLeft = data.remainingTime || 0;
          
          this.currentData = {
            remainingTime: this.timeLeft,
            todayScreenTime: existingScreenTime, // Preserve existing screen time data
            overtime: this.overtimeSeconds, // Use our persistent overtime
            isAppForeground: data.isAppForeground || false,
            isTracking: data.isTracking || false,
            notificationTitle: data.notificationTitle,
            notificationText: data.notificationText
          };
          
          // Handle timer tick for overtime logic
          await this.handleTimerTick();
          
          this.notifyListeners();
        });
        
        this.subscriptions.push(subscription);
        
        // Start listening to the persistent timer
        BrainBitesTimer.startListening();
        console.log('✅ [HybridTimer] BrainBitesTimer listener setup complete');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to setup BrainBitesTimer listener:', error);
    }
  }

  private setupScreenTimeModuleListener(): void {
    try {
      const emitter = new NativeEventEmitter(NativeModules.ScreenTimeModule);
      
      const subscription = emitter.addListener('timerUpdate', async (data: TimerData) => {
        console.log('🔄 [HybridTimer] ScreenTimeModule update:', data);
        
        // Update local state from ScreenTimeModule
        this.timeLeft = data.remainingTime || this.timeLeft;
        
        // Merge data from ScreenTimeModule (has today's screen time)
        if (this.currentData) {
          this.currentData = {
            ...this.currentData,
            remainingTime: this.timeLeft,
            todayScreenTime: data.todayScreenTime || 0,
            overtime: this.overtimeSeconds, // Use our persistent overtime
            notificationTitle: data.notificationTitle,
            notificationText: data.notificationText
          };
        } else {
          this.currentData = {
            ...data,
            overtime: this.overtimeSeconds // Use our persistent overtime
          };
        }
        
        // Handle timer tick for overtime logic
        await this.handleTimerTick();
        
        this.notifyListeners();
      });
      
      this.subscriptions.push(subscription);
      console.log('✅ [HybridTimer] ScreenTimeModule listener setup complete');
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to setup ScreenTimeModule listener:', error);
    }
  }

  private async loadInitialState(): Promise<void> {
    try {
      // Try to get initial state from both systems
      const [remainingTime, todayScreenTime] = await Promise.allSettled([
        this.getBrainBitesRemainingTime(),
        this.getScreenTimeModuleData()
      ]);

      const remaining = remainingTime.status === 'fulfilled' ? remainingTime.value : 0;
      const screenTime = todayScreenTime.status === 'fulfilled' ? todayScreenTime.value : 0;

      this.currentData = {
        remainingTime: remaining,
        todayScreenTime: screenTime,
        overtime: this.overtimeSeconds, // Use persistent overtime
        isAppForeground: false,
        isTracking: false
      };

      console.log('✅ [HybridTimer] Initial state loaded:', this.currentData);
      this.notifyListeners();
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to load initial state:', error);
    }
  }

  private async getBrainBitesRemainingTime(): Promise<number> {
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.getRemainingTime) {
        return await BrainBitesTimer.getRemainingTime();
      }
      return 0;
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to get BrainBitesTimer remaining time:', error);
      return 0;
    }
  }

  private async getScreenTimeModuleData(): Promise<number> {
    try {
      if (NativeModules.ScreenTimeModule.getTodayScreenTime) {
        return await NativeModules.ScreenTimeModule.getTodayScreenTime();
      }
      return 0;
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to get ScreenTimeModule data:', error);
      return 0;
    }
  }

  // Update addTimeFromQuiz to pause but not reset overtime
  async addTimeFromQuiz(minutes: number): Promise<boolean> {
    try {
      const secondsToAdd = minutes * 60;
      
      // If we have overtime and it's not paused, pause it
      if (this.overtimeSeconds > 0 && !this.overtimePaused) {
        this.overtimePaused = true;
        this.overtimePausedAt = this.overtimeSeconds;
        await AsyncStorage.setItem('@BrainBites:overtimePaused', 'true');
        await AsyncStorage.setItem('@BrainBites:overtimePausedAt', this.overtimeSeconds.toString());
        console.log(`⏸️ Pausing overtime at ${this.overtimeSeconds}s`);
      }
      
      // Add time to remaining
      const currentRemaining = this.currentData?.remainingTime || 0;
      const newRemaining = currentRemaining + secondsToAdd;
      
      // Call native module
      const success = await this.callNativeAddTime(minutes);
      
      if (success && this.currentData) {
        this.currentData = {
          ...this.currentData,
          remainingTime: newRemaining,
          overtime: this.overtimeSeconds // Keep overtime value
        };
        this.notifyListeners();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to add time:', error);
      return false;
    }
  }

  // Add method to handle timer updates
  private async handleTimerTick(): Promise<void> {
    if (!this.currentData) return;
    
    const { remainingTime } = this.currentData;
    
    // If time runs out and overtime was paused, resume it
    if (remainingTime <= 0 && this.overtimePaused && this.overtimePausedAt > 0) {
      this.overtimeSeconds = this.overtimePausedAt;
      this.overtimePaused = false;
      this.overtimePausedAt = 0;
      await AsyncStorage.setItem('@BrainBites:overtimePaused', 'false');
      await AsyncStorage.removeItem('@BrainBites:overtimePausedAt');
      console.log(`▶️ Resuming overtime at ${this.overtimeSeconds}s`);
    }
    
    // If in overtime mode (not paused), increment overtime
    if (remainingTime <= 0 && !this.overtimePaused) {
      this.overtimeSeconds++;
      await AsyncStorage.setItem('@BrainBites:overtime', this.overtimeSeconds.toString());
    }
    
    // Update current data with overtime
    this.currentData = {
      ...this.currentData,
      overtime: this.overtimeSeconds
    };
  }
  
  // Add method to reset overtime (only on new day)
  async resetDailyOvertime(): Promise<void> {
    const today = new Date().toDateString();
    const lastReset = await AsyncStorage.getItem('@BrainBites:lastOvertimeReset');
    
    if (lastReset !== today) {
      this.overtimeSeconds = 0;
      this.overtimePaused = false;
      this.overtimePausedAt = 0;
      await AsyncStorage.setItem('@BrainBites:overtime', '0');
      await AsyncStorage.setItem('@BrainBites:overtimePaused', 'false');
      await AsyncStorage.removeItem('@BrainBites:overtimePausedAt');
      await AsyncStorage.setItem('@BrainBites:lastOvertimeReset', today);
      console.log('🌅 New day - overtime reset');
    }
  }
  
  private async callNativeAddTime(minutes: number): Promise<boolean> {
    let brainBitesSuccess = false;
    let screenTimeSuccess = false;

    // Add to BrainBitesTimer (persistent notifications)
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.addTime) {
        await BrainBitesTimer.addTime(minutes * 60); // Convert to seconds
        brainBitesSuccess = true;
        console.log('✅ [HybridTimer] Added time to BrainBitesTimer');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add time to BrainBitesTimer:', error);
    }

    // Add to ScreenTimeModule (widget support)
    try {
      if (NativeModules.ScreenTimeModule.addTimeFromQuiz) {
        screenTimeSuccess = await NativeModules.ScreenTimeModule.addTimeFromQuiz(minutes);
        console.log('✅ [HybridTimer] Added time to ScreenTimeModule');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add time to ScreenTimeModule:', error);
    }

    return brainBitesSuccess || screenTimeSuccess;
  }

  /**
   * Add time from goal completion - updated with overtime handling
   */
async addTimeFromGoal(minutes: number): Promise<boolean> {
  try {
    const secondsToAdd = minutes * 60;
    console.log(`🎯 [HybridTimer] Adding ${minutes} minutes (${secondsToAdd}s) from goal completion`);
    
    // Pause overtime if active but don't reset it
    if (this.overtime > 0 && !this.overtimePaused) {
      this.pausedOvertimeValue = this.overtime;
      this.overtimePaused = true;
      console.log(`⏸️ [Timer] Pausing overtime at ${this.overtime}s`);
    }
    
    // Add to time left
    const previousTime = this.timeLeft;
    this.timeLeft += secondsToAdd;
    console.log(`🎯 [HybridTimer] Updated timeLeft: ${previousTime}s -> ${this.timeLeft}s`);
    
    // Update native modules - crucial for persistent notification updates
    let brainBitesSuccess = false;
    let screenTimeSuccess = false;

    // Add to BrainBitesTimer (persistent notifications)
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.addTime) {
        brainBitesSuccess = await BrainBitesTimer.addTime(secondsToAdd);
        console.log(`🎯 [HybridTimer] BrainBitesTimer addTime result: ${brainBitesSuccess}`);
      } else {
        console.log('⚠️ [HybridTimer] BrainBitesTimer module not available for goal time');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add goal time to BrainBitesTimer:', error);
    }

    // Add to ScreenTimeModule
    try {
      const { ScreenTimeModule } = NativeModules;
      if (ScreenTimeModule && ScreenTimeModule.addTime) {
        screenTimeSuccess = await ScreenTimeModule.addTime(secondsToAdd);
        console.log(`🎯 [HybridTimer] ScreenTimeModule addTime result: ${screenTimeSuccess}`);
      } else {
        console.log('⚠️ [HybridTimer] ScreenTimeModule not available for goal time');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add goal time to ScreenTimeModule:', error);
    }
    
    // Save state regardless of native module results
    await this.saveTimerState();
    
    // Update current data
    if (this.currentData) {
      this.currentData = {
        ...this.currentData,
        remainingTime: this.timeLeft,
        overtime: this.overtimePaused ? this.pausedOvertimeValue : this.overtime
      };
      this.notifyListeners();
    }
    
    // Update notification display
    this.updateNotification();
    
    const anySuccess = brainBitesSuccess || screenTimeSuccess || true; // Always consider local state update a success
    console.log(`🎯 [HybridTimer] Goal time addition result: ${anySuccess} (BrainBites: ${brainBitesSuccess}, ScreenTime: ${screenTimeSuccess})`);
    
    return anySuccess;
  } catch (error) {
    console.error('❌ [HybridTimer] Failed to add goal time:', error);
    return false;
  }
}

// Add method to resume overtime when timer reaches 0 again
private checkOvertimeResume(): void {
  if (this.timeLeft <= 0 && this.overtimePaused && this.pausedOvertimeValue > 0) {
    this.overtime = this.pausedOvertimeValue;
    this.overtimePaused = false;
    this.pausedOvertimeValue = 0;
    console.log(`▶️ [Timer] Resuming overtime at ${this.overtime}s`);
  }
}

  /**
   * Set initial screen time - uses both systems
   */
  async setScreenTime(hours: number): Promise<boolean> {
    console.log(`⏰ [HybridTimer] Setting screen time to ${hours} hours`);
    
    const seconds = hours * 3600;
    let brainBitesSuccess = false;
    let screenTimeSuccess = false;

    // Set in BrainBitesTimer
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.setScreenTime) {
        await BrainBitesTimer.setScreenTime(seconds);
        brainBitesSuccess = true;
        console.log('✅ [HybridTimer] Set time in BrainBitesTimer');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to set time in BrainBitesTimer:', error);
    }

    // Set in ScreenTimeModule
    try {
      if (NativeModules.ScreenTimeModule.setScreenTime) {
        screenTimeSuccess = await NativeModules.ScreenTimeModule.setScreenTime(seconds);
        console.log('✅ [HybridTimer] Set time in ScreenTimeModule');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to set time in ScreenTimeModule:', error);
    }

    const success = brainBitesSuccess || screenTimeSuccess;
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Set screen time result: ${success}`);
    
    return success;
  }

  /**
   * Start tracking - uses both systems
   */
  async startTracking(): Promise<boolean> {
    console.log('▶️ [HybridTimer] Starting tracking');
    
    let brainBitesSuccess = false;
    let screenTimeSuccess = false;

    // Start BrainBitesTimer
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.startTracking) {
        await BrainBitesTimer.startTracking();
        brainBitesSuccess = true;
        console.log('✅ [HybridTimer] Started BrainBitesTimer tracking');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to start BrainBitesTimer tracking:', error);
    }

    // Start ScreenTimeModule
    try {
      if (NativeModules.ScreenTimeModule.startTimer) {
        screenTimeSuccess = await NativeModules.ScreenTimeModule.startTimer();
        console.log('✅ [HybridTimer] Started ScreenTimeModule tracking');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to start ScreenTimeModule tracking:', error);
    }

    const success = brainBitesSuccess || screenTimeSuccess;
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Start tracking result: ${success}`);
    
    return success;
  }

  /**
   * Get current timer data
   */
  getCurrentData(): TimerData | null {
    return this.currentData;
  }

  /**
   * Add listener for timer updates
   */
  addListener(callback: (data: TimerData) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately notify with current data if available
    if (this.currentData) {
      callback(this.currentData);
    }
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    if (this.currentData) {
      this.listeners.forEach(listener => {
        try {
          listener(this.currentData!);
        } catch (error) {
          console.error('❌ [HybridTimer] Error in listener:', error);
        }
      });
    }
  }

  /**
   * Update timer tick logic
   */
  private tick = () => {
    if (this.isPaused) return;
    
    // Always increment screen time when device is used
    this.screenTime++;
    
    if (this.timeLeft > 0) {
      // Count down time left
      this.timeLeft--;
      
      // Overtime remains paused if we have time left
      this.overtimePaused = true;
    } else {
      // No time left - check overtime status
      if (!this.overtimePaused) {
        // Only increment overtime if not paused
        this.overtime++;
      }
    }
    
    // Resume overtime counting when time left reaches 0
    if (this.timeLeft === 0 && this.overtimePaused) {
      console.log('📊 [Timer] Time left exhausted, resuming overtime counting');
      this.overtimePaused = false;
    }
    
    this.updateNotification();
    this.updateCurrentData();
  };

  /**
   * End of day settlement
   */
  async processEndOfDay(): Promise<number> {
    const net = this.timeLeft - this.overtime;
    
    console.log(`🌙 [Timer] End of day settlement:`);
    console.log(`  TimeLeft: ${this.timeLeft}s`);
    console.log(`  Overtime: ${this.overtime}s`);
    console.log(`  Net: ${net}s (${net > 0 ? 'positive' : 'negative'})`);
    
    // Save score delta
    await AsyncStorage.setItem('@BrainBites:scoreDelta', net.toString());
    
    // Reset for next day but keep the net balance
    this.timeLeft = Math.max(0, net); // Start next day with positive balance or 0
    this.overtime = Math.max(0, -net); // Start with debt if negative
    this.screenTime = 0;
    this.overtimePaused = false;
    
    await this.saveTimerState();
    
    return net;
  }

  /**
   * Save timer state to AsyncStorage
   */
  private async saveTimerState(): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ['@BrainBites:timeLeft', this.timeLeft.toString()],
        ['@BrainBites:screenTime', this.screenTime.toString()],
        ['@BrainBites:overtime', this.overtime.toString()],
        ['@BrainBites:overtimePaused', this.overtimePaused.toString()],
      ]);
    } catch (error) {
      console.error('❌ [Timer] Failed to save timer state:', error);
    }
  }

  /**
   * Update current data object
   */
  private updateCurrentData(): void {
    this.currentData = {
      remainingTime: this.timeLeft,
      todayScreenTime: this.screenTime,
      overtime: this.overtime,
      isAppForeground: this.currentData?.isAppForeground || false,
      isTracking: this.currentData?.isTracking || false,
      notificationTitle: this.currentData?.notificationTitle,
      notificationText: this.currentData?.notificationText
    };
    this.notifyListeners();
  }

  /**
   * Update notification display
   */
  private updateNotification(): void {
    // This would typically update the persistent notification
    // Implementation depends on your notification system
    if (this.currentData) {
      const hours = Math.floor(this.timeLeft / 3600);
      const minutes = Math.floor((this.timeLeft % 3600) / 60);
      const overtimeHours = Math.floor(this.overtime / 3600);
      const overtimeMinutes = Math.floor((this.overtime % 3600) / 60);
      
      this.currentData.notificationTitle = this.timeLeft > 0 ? 
        `${hours}h ${minutes}m remaining` : 
        `${overtimeHours}h ${overtimeMinutes}m overtime`;
      
      this.currentData.notificationText = `Screen time: ${Math.floor(this.screenTime / 3600)}h ${Math.floor((this.screenTime % 3600) / 60)}m`;
    }
  }

  /**
   * Cleanup - stop all listeners
   */
  destroy(): void {
    console.log('🔄 [HybridTimer] Destroying hybrid timer service');
    
    // Stop BrainBitesTimer listening
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.stopListening) {
        BrainBitesTimer.stopListening();
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to stop BrainBitesTimer listening:', error);
    }

    // Remove all subscriptions
    this.subscriptions.forEach(subscription => {
      try {
        subscription.remove();
      } catch (error) {
        console.error('❌ [HybridTimer] Failed to remove subscription:', error);
      }
    });
    
    this.subscriptions = [];
    this.listeners = [];
    this.currentData = null;
    
    console.log('✅ [HybridTimer] Hybrid timer service destroyed');
  }
}

export default HybridTimerService.getInstance();