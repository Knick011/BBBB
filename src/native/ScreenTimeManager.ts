import { NativeModules, NativeEventEmitter, DeviceEventEmitter, Platform } from 'react-native';

const { ScreenTimeModule, DailyScoreCarryoverModule } = NativeModules;

export interface TimerStatus {
  remainingTime: number;
  todayScreenTime: number;
  overtime: number;
  isAppForeground: boolean;
  isTracking: boolean;
}

class ScreenTimeManagerBridge {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: { [key: string]: any } = {};

  constructor() {
    if (Platform.OS === 'android') {
      // Android uses DeviceEventEmitter for broadcasts
      this.setupAndroidListeners();
    }
  }

  private setupAndroidListeners() {
    // Listen for timer updates from Android service
    this.listeners.timerUpdate = DeviceEventEmitter.addListener(
      'TIMER_UPDATE',
      (data: TimerStatus) => {
        console.log('📱 [ScreenTimeManager] Timer update received:', data);
        // Emit to React Native components
        DeviceEventEmitter.emit('timerStatusChanged', data);
      }
    );
  }

  // Timer controls
  async startTimer(): Promise<void> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.startTimer();
    }
  }

  async pauseTimer(): Promise<void> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.pauseTimer();
    }
  }

  async stopTimer(): Promise<void> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.stopTimer();
    }
  }

  // Time management
  async addTime(seconds: number): Promise<void> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.addTime(seconds);
    }
  }

  async updateTime(seconds: number): Promise<void> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.updateTime(seconds);
    }
  }

  // Get current status
  async getTimerStatus(): Promise<TimerStatus | null> {
    if (Platform.OS === 'android' && ScreenTimeModule) {
      return ScreenTimeModule.getTimerStatus();
    }
    return null;
  }

  // Daily score carryover
  async checkDailyCarryover(): Promise<any> {
    if (Platform.OS === 'android' && DailyScoreCarryoverModule) {
      return DailyScoreCarryoverModule.checkDailyCarryover();
    }
    return null;
  }

  async processDailyCarryover(scoreData: any): Promise<void> {
    if (Platform.OS === 'android' && DailyScoreCarryoverModule) {
      return DailyScoreCarryoverModule.processDailyCarryover(scoreData);
    }
  }

  // Event listeners
  addTimerStatusListener(callback: (status: TimerStatus) => void): () => void {
    const subscription = DeviceEventEmitter.addListener('timerStatusChanged', callback);
    return () => subscription.remove();
  }

  // Cleanup
  destroy() {
    Object.values(this.listeners).forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.listeners = {};
  }
}

export default new ScreenTimeManagerBridge();