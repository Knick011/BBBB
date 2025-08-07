// src/services/HybridTimerService.ts
// ✅ HYBRID TIMER SERVICE - Combines persistent notifications with widget support
import { NativeEventEmitter, NativeModules } from 'react-native';

interface TimerData {
  remainingTime: number;
  todayScreenTime: number;
  isAppForeground: boolean;
  isTracking: boolean;
}

class HybridTimerService {
  private static instance: HybridTimerService;
  private listeners: Array<(data: TimerData) => void> = [];
  private currentData: TimerData | null = null;
  private eventEmitter: any = null;
  private subscriptions: any[] = [];

  static getInstance(): HybridTimerService {
    if (!HybridTimerService.instance) {
      HybridTimerService.instance = new HybridTimerService();
    }
    return HybridTimerService.instance;
  }

  async initialize(): Promise<void> {
    console.log('🔄 [HybridTimer] Initializing hybrid timer service...');
    
    try {
      // Set up event listeners for both timer systems
      this.setupBrainBitesTimerListener();
      this.setupScreenTimeModuleListener();
      
      // Load initial state
      await this.loadInitialState();
      
      console.log('✅ [HybridTimer] Hybrid timer service initialized');
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to initialize:', error);
    }
  }

  private setupBrainBitesTimerListener(): void {
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer) {
        const emitter = new NativeEventEmitter(BrainBitesTimer);
        
        const subscription = emitter.addListener('timerUpdate', (data: any) => {
          console.log('🔄 [HybridTimer] BrainBitesTimer update:', data);
          
          // Preserve existing todayScreenTime if available
          const existingScreenTime = this.currentData?.todayScreenTime || 0;
          
          this.currentData = {
            remainingTime: data.remainingTime || 0,
            todayScreenTime: existingScreenTime, // Preserve existing screen time data
            isAppForeground: data.isAppForeground || false,
            isTracking: data.isTracking || false
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

  private setupScreenTimeModuleListener(): void {
    try {
      const emitter = new NativeEventEmitter(NativeModules.ScreenTimeModule);
      
      const subscription = emitter.addListener('timerUpdate', (data: TimerData) => {
        console.log('🔄 [HybridTimer] ScreenTimeModule update:', data);
        
        // Merge data from ScreenTimeModule (has today's screen time)
        if (this.currentData) {
          this.currentData = {
            ...this.currentData,
            todayScreenTime: data.todayScreenTime || 0
          };
        } else {
          this.currentData = data;
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

  /**
   * Add time from quiz completion - uses both systems for reliability
   */
  async addTimeFromQuiz(minutes: number): Promise<boolean> {
    console.log(`🧠 [HybridTimer] Adding ${minutes} minutes from quiz`);
    
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

    const success = brainBitesSuccess || screenTimeSuccess;
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Quiz time addition result: ${success}`);
    
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
    
    return success;
  }

  /**
   * Add time from goal completion - uses both systems for reliability
   */
  async addTimeFromGoal(minutes: number): Promise<boolean> {
    console.log(`🎯 [HybridTimer] Adding ${minutes} minutes from goal`);
    
    let brainBitesSuccess = false;
    let screenTimeSuccess = false;

    // Add to BrainBitesTimer (persistent notifications)
    try {
      const { BrainBitesTimer } = NativeModules;
      if (BrainBitesTimer && BrainBitesTimer.addTime) {
        await BrainBitesTimer.addTime(minutes * 60); // Convert to seconds
        brainBitesSuccess = true;
        console.log('✅ [HybridTimer] Added goal time to BrainBitesTimer');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add goal time to BrainBitesTimer:', error);
    }

    // Add to ScreenTimeModule (widget support)
    try {
      if (NativeModules.ScreenTimeModule.addTimeFromGoal) {
        screenTimeSuccess = await NativeModules.ScreenTimeModule.addTimeFromGoal(minutes);
        console.log('✅ [HybridTimer] Added goal time to ScreenTimeModule');
      }
    } catch (error) {
      console.error('❌ [HybridTimer] Failed to add goal time to ScreenTimeModule:', error);
    }

    const success = brainBitesSuccess || screenTimeSuccess;
    console.log(`${success ? '✅' : '❌'} [HybridTimer] Goal time addition result: ${success}`);
    
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