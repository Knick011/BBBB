// src/services/HybridTimerService.ts
// ✅ HYBRID TIMER SERVICE - Combines persistent notifications with widget support
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './NotificationService';

interface TimerData {
  remainingTime: number;
  todayScreenTime: number;
  overtime: number;
  isAppForeground: boolean;
  isTracking: boolean;
  notificationTitle?: string;
  notificationText?: string;
}

interface TimerState {
  timeLeft: number;
  screenTime: number;
  overtime: number;
  overtimePaused: boolean;
  isTracking: boolean;
  isAppForeground: boolean;
  lastUpdate: number;
  todayHours: number;
  todayMinutes: number;
  lastHourNotified: number;
}

class HybridTimerService {
  private static instance: HybridTimerService;
  private listeners: Array<(data: TimerData) => void> = [];
  private currentData: TimerData | null = null;
  private eventEmitter: any = null;
  private subscriptions: any[] = [];
  private timeLeft: number = 0;
  private screenTime: number = 0;
  private overtime: number = 0;
  
  private lastHourNotified: number = 0;
  private readonly HOURLY_NOTIFICATION_KEY = '@BrainBites:lastHourNotified';

  static getInstance(): HybridTimerService {
    if (!HybridTimerService.instance) {
      HybridTimerService.instance = new HybridTimerService();
    }
    return HybridTimerService.instance;
  }

  /**
   * Initialize the timer service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 [HybridTimer] Initializing hybrid timer service...');
      
      // Load saved timer state
      await this.loadTimerState();
      
      // Load last hour notified
      const savedHour = await AsyncStorage.getItem(this.HOURLY_NOTIFICATION_KEY);
      this.lastHourNotified = savedHour ? parseInt(savedHour, 10) : 0;
      
      // Check if we need to reset for new day
      const today = new Date().toDateString();
      const lastReset = await AsyncStorage.getItem('@BrainBites:lastTimerReset');
      if (lastReset !== today) {
        this.lastHourNotified = 0;
        await AsyncStorage.setItem(this.HOURLY_NOTIFICATION_KEY, '0');
        await AsyncStorage.setItem('@BrainBites:lastTimerReset', today);
      }
      
      // Set up event listeners for both timer systems
      this.setupBrainBitesTimerListener();
      this.setupScreenTimeModuleListener();
      
      // Load initial state
      await this.loadInitialState();
      
      // Simple initialization - let the native service handle overtime
      
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

  /**
   * Handle timer update from native service
   */
  private setupScreenTimeModuleListener(): void {
    try {
      const emitter = new NativeEventEmitter(NativeModules.ScreenTimeModule);
      
      const subscription = emitter.addListener('timerUpdate', async (data: TimerData) => {
        console.log('🔄 [HybridTimer] ScreenTimeModule update:', data);
        
        // Store previous values for comparison
        const previousScreenTime = this.screenTime;
        
        // Update local state from ScreenTimeModule
        this.timeLeft = data.remainingTime || this.timeLeft;
        this.screenTime = data.todayScreenTime || 0;
        this.overtime = data.overtime || 0;
        this.overtimePaused = false; // Will be updated if needed
        
        // Check for hourly milestone
        await this.checkHourlyMilestone();
        
        // Merge data from ScreenTimeModule (has today's screen time)
        if (this.currentData) {
          this.currentData = {
            ...this.currentData,
            remainingTime: this.timeLeft,
            todayScreenTime: this.screenTime,
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
        
        // Update current data and notify listeners
        this.updateCurrentData();
        
        // Save state periodically (every 30 seconds)
        if (this.screenTime % 30 === 0 && this.screenTime !== previousScreenTime) {
          await this.saveTimerState();
        }
        
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

  async addTimeFromQuiz(minutes: number): Promise<boolean> {
    console.log(`🧠 [HybridTimer] Adding ${minutes} minutes from quiz`);
    
    const success = await this.callNativeAddTime(minutes);
    
    // Update local state and notify listeners
    if (success && this.currentData) {
      const oldRemainingTime = this.currentData.remainingTime;
      this.currentData = {
        ...this.currentData,
        remainingTime: oldRemainingTime + (minutes * 60) // Add minutes in seconds
      };
      console.log(`🔄 [HybridTimer] Updated remaining time: ${oldRemainingTime}s -> ${this.currentData.remainingTime}s (+${minutes * 60}s)`);
      this.notifyListeners();
    }
    
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Quiz time addition result: ${success}`);
    return success;
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
   * Add time from goal completion - updated with overtime handling and forced native refresh
   */
  async addTimeFromGoal(minutes: number): Promise<boolean> {
    console.log(`🎯 [HybridTimer] Adding ${minutes} minutes from goal completion`);
    
    const success = await this.callNativeAddTime(minutes);
    
    // Update local state and notify listeners
    if (success && this.currentData) {
      const oldRemainingTime = this.currentData.remainingTime;
      this.currentData = {
        ...this.currentData,
        remainingTime: oldRemainingTime + (minutes * 60) // Add minutes in seconds
      };
      console.log(`🔄 [HybridTimer] Updated remaining time: ${oldRemainingTime}s -> ${this.currentData.remainingTime}s (+${minutes * 60}s)`);
      this.notifyListeners();
    }
    
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Goal time addition result: ${success}`);
    return success;
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
   * Check if we've reached an hourly milestone
   */
  private async checkHourlyMilestone(): Promise<void> {
    const currentHours = Math.floor(this.screenTime / 3600);
    
    // Check if we've crossed an hour boundary
    if (currentHours > this.lastHourNotified && currentHours > 0) {
      this.lastHourNotified = currentHours;
      await AsyncStorage.setItem(this.HOURLY_NOTIFICATION_KEY, currentHours.toString());
      
      // Show hourly notification
      await this.showHourlyNotification(currentHours);
    }
  }

  /**
   * Show hourly screentime notification
   */
  private async showHourlyNotification(hours: number): Promise<void> {
    try {
      const totalMinutes = Math.floor(this.screenTime / 60);
      const displayHours = Math.floor(totalMinutes / 60);
      const displayMinutes = totalMinutes % 60;
      
      const timeString = displayHours > 0 
        ? `${displayHours}h ${displayMinutes}m`
        : `${displayMinutes}m`;
      
      // Create varied messages based on hour
      const messages = this.getHourlyMessages(hours, timeString);
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // Add break suggestions for longer sessions
      const breakSuggestion = this.getBreakSuggestion(hours);
      
      // Use NotificationService to show the notification
      await NotificationService.showLocalNotification({
        title: '📱 Screentime Milestone!',
        body: message + breakSuggestion,
        data: { 
          type: 'hourly_screentime',
          hours: hours,
          totalTime: this.screenTime
        }
      });
      
      console.log(`📱 [HybridTimer] Hourly notification shown for hour ${hours}`);
      
      // Also emit event for UI updates
      const eventEmitter = new (require('react-native').NativeEventEmitter)();
      eventEmitter.emit('hourlyScreentime', {
        hours,
        totalSeconds: this.screenTime,
        timeString
      });
      
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to show hourly notification:', error);
    }
  }

  /**
   * Get varied messages for hourly notifications
   */
  private getHourlyMessages(hours: number, timeString: string): string[] {
    switch (hours) {
      case 1:
        return [
          `Whoa! You've spent an hour on your screen today! 📱`,
          `One hour milestone reached! Your screentime: ${timeString} ⏰`,
          `Hour mark! You've been on screen for ${timeString} today 🕐`,
          `First hour complete! Total screentime: ${timeString} 📊`
        ];
      case 2:
        return [
          `Two hours and counting! Screentime: ${timeString} 📊`,
          `Double hour alert! You're at ${timeString} today ⏰⏰`,
          `2 hour checkpoint! Total today: ${timeString} 🎯`,
          `Two hours on screen! Current total: ${timeString} 📱`
        ];
      case 3:
        return [
          `Three hours reached! Consider a break? Screentime: ${timeString} 🌟`,
          `Triple hour milestone! You're at ${timeString} ⏰⏰⏰`,
          `3 hours on screen! Maybe time for a stretch? Total: ${timeString} 🤸`,
          `Third hour complete! Your screentime: ${timeString} 📈`
        ];
      case 4:
        return [
          `Four hours of screentime! You're at ${timeString} 📈`,
          `Quad hour alert! Total screentime: ${timeString} ⏰⏰⏰⏰`,
          `4 hour mark reached! Consider some offline time? Total: ${timeString} 🌳`,
          `Four hours logged! Current total: ${timeString} 📱`
        ];
      case 5:
        return [
          `Five hours on screen! You're at ${timeString} 📊`,
          `5 hour milestone! Total today: ${timeString} ⏰`,
          `Fifth hour reached! Maybe time for a longer break? Total: ${timeString} 🌿`,
          `Five hours of screentime logged: ${timeString} 📱`
        ];
      default:
        return [
          `Screentime milestone: ${hours} hours! Total today: ${timeString} 📊`,
          `${hours} hour alert! You've spent ${timeString} on screen ⏰`,
          `Hour ${hours} reached! Your screentime is now ${timeString} 📱`,
          `${hours} hours logged! Current total: ${timeString} 📈`
        ];
    }
  }

  /**
   * Get break suggestion based on hours
   */
  private getBreakSuggestion(hours: number): string {
    if (hours >= 5) {
      return '\n\n🚶 Suggestion: Time for a proper break! How about a 15-minute walk?';
    } else if (hours >= 4) {
      return '\n\n🌳 Tip: Consider some offline time to recharge!';
    } else if (hours >= 3) {
      return '\n\n💡 Tip: How about a quick walk or stretch?';
    } else if (hours >= 2) {
      return '\n\n👀 Remember to rest your eyes!';
    }
    return '';
  }

  /**
   * Get current timer state
   */
  getCurrentState(): TimerState {
    const hoursSpent = Math.floor(this.screenTime / 3600);
    const minutesSpent = Math.floor((this.screenTime % 3600) / 60);
    
    return {
      timeLeft: this.timeLeft,
      screenTime: this.screenTime,
      overtime: this.overtime,
      overtimePaused: this.overtimePaused,
      isTracking: this.currentData?.isTracking || false,
      isAppForeground: this.currentData?.isAppForeground || false,
      lastUpdate: Date.now(),
      todayHours: hoursSpent,
      todayMinutes: minutesSpent,
      lastHourNotified: this.lastHourNotified
    };
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
   * Load timer state from AsyncStorage
   */
  private async loadTimerState(): Promise<void> {
    try {
      const [timeLeft, screenTime, overtime, overtimePaused] = await AsyncStorage.multiGet([
        '@BrainBites:timeLeft',
        '@BrainBites:screenTime', 
        '@BrainBites:overtime',
        '@BrainBites:overtimePaused'
      ]);

      this.timeLeft = parseInt(timeLeft[1] || '0', 10);
      this.screenTime = parseInt(screenTime[1] || '0', 10);
      this.overtime = parseInt(overtime[1] || '0', 10);
      this.overtimePaused = overtimePaused[1] === 'true';

      console.log('✅ [HybridTimer] Timer state loaded from storage');
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to load timer state:', error);
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