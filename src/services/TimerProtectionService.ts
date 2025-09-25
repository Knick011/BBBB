// TimerProtectionService.ts
// Simple integration service to start timer protection

import { NativeModules, DeviceEventEmitter } from 'react-native';
import PersistentTimerGuardian from './PersistentTimerGuardian';

const { TimerGuardianModule } = NativeModules;

interface TimerProtectionConfig {
  enableHeartbeat: boolean;
  enableWatchdog: boolean;
  enablePreventiveRestart: boolean;
  restartIntervalHours: number;
}

class TimerProtectionService {
  private static instance: TimerProtectionService;
  private guardian: PersistentTimerGuardian;
  private isProtecting = false;

  private constructor() {
    this.guardian = PersistentTimerGuardian.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(): TimerProtectionService {
    if (!TimerProtectionService.instance) {
      TimerProtectionService.instance = new TimerProtectionService();
    }
    return TimerProtectionService.instance;
  }

  /**
   * Start comprehensive timer protection
   */
  public async startProtection(config: Partial<TimerProtectionConfig> = {}): Promise<void> {
    if (this.isProtecting) {
      console.log('🛡️ [TimerProtection] Already protecting timer');
      return;
    }

    const defaultConfig: TimerProtectionConfig = {
      enableHeartbeat: true,
      enableWatchdog: true,
      enablePreventiveRestart: true,
      restartIntervalHours: 2
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('🛡️ [TimerProtection] Starting comprehensive timer protection');
    console.log('⚙️ [TimerProtection] Config:', finalConfig);

    try {
      // Start JavaScript-side guardian
      await this.guardian.startGuarding();

      // Start native-side guardian
      if (TimerGuardianModule) {
        await TimerGuardianModule.startGuarding();
      }

      this.isProtecting = true;
      console.log('✅ [TimerProtection] Timer protection active');

    } catch (error) {
      console.error('❌ [TimerProtection] Failed to start protection:', error);
      throw error;
    }
  }

  /**
   * Stop timer protection
   */
  public async stopProtection(): Promise<void> {
    if (!this.isProtecting) {
      console.log('🛡️ [TimerProtection] Protection not active');
      return;
    }

    console.log('🛡️ [TimerProtection] Stopping timer protection');

    try {
      // Stop JavaScript-side guardian
      this.guardian.stopGuarding();

      // Stop native-side guardian
      if (TimerGuardianModule) {
        await TimerGuardianModule.stopGuarding();
      }

      this.isProtecting = false;
      console.log('🛑 [TimerProtection] Timer protection stopped');

    } catch (error) {
      console.error('❌ [TimerProtection] Failed to stop protection:', error);
    }
  }

  /**
   * Force restart timer (for testing or emergency)
   */
  public async forceRestartTimer(): Promise<void> {
    console.log('🔧 [TimerProtection] Force restarting timer');

    try {
      if (TimerGuardianModule) {
        await TimerGuardianModule.forceRestart();
      }
      console.log('✅ [TimerProtection] Force restart initiated');
    } catch (error) {
      console.error('❌ [TimerProtection] Force restart failed:', error);
      throw error;
    }
  }

  /**
   * Get protection status and statistics
   */
  public async getProtectionStatus(): Promise<{
    isProtecting: boolean;
    jsGuardian: any;
    nativeGuardian: any;
  }> {
    try {
      const jsStats = await this.guardian.getGuardianStats();

      let nativeStats = null;
      if (TimerGuardianModule) {
        nativeStats = await TimerGuardianModule.getGuardianStats();
      }

      return {
        isProtecting: this.isProtecting,
        jsGuardian: jsStats,
        nativeGuardian: nativeStats
      };
    } catch (error) {
      console.error('❌ [TimerProtection] Failed to get status:', error);
      return {
        isProtecting: this.isProtecting,
        jsGuardian: null,
        nativeGuardian: null
      };
    }
  }

  /**
   * Check timer health
   */
  public async checkTimerHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    details: any;
  }> {
    try {
      let healthDetails = null;
      if (TimerGuardianModule) {
        healthDetails = await TimerGuardianModule.checkTimerHealth();
      }

      const issues: string[] = [];

      if (healthDetails) {
        if (!healthDetails.notificationExists) {
          issues.push('Persistent notification missing');
        }
        if (!healthDetails.serviceRunning) {
          issues.push('Timer service not running');
        }
        if (!healthDetails.processAlive) {
          issues.push('App process not responding');
        }
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        details: healthDetails
      };
    } catch (error) {
      console.error('❌ [TimerProtection] Health check failed:', error);
      return {
        isHealthy: false,
        issues: ['Health check failed'],
        details: null
      };
    }
  }

  /**
   * Setup event listeners for guardian updates
   */
  private setupEventListeners(): void {
    DeviceEventEmitter.addListener('TimerGuardianUpdate', (event) => {
      console.log(`🔔 [TimerProtection] Guardian update: ${event.status}`, event);

      // Handle specific events
      switch (event.status) {
        case 'timer_died':
          console.log('🚨 [TimerProtection] Timer death detected!');
          break;
        case 'timer_restarted':
          console.log('🔄 [TimerProtection] Timer successfully restarted');
          break;
        case 'restart_failed':
          console.log('❌ [TimerProtection] Timer restart failed');
          break;
      }
    });
  }

  /**
   * Emergency timer recovery
   */
  public async emergencyRecovery(): Promise<void> {
    console.log('🚨 [TimerProtection] Initiating emergency recovery');

    try {
      // Step 1: Check what's broken
      const health = await this.checkTimerHealth();
      console.log('🔍 [TimerProtection] Health status:', health);

      // Step 2: Stop everything
      await this.stopProtection();

      // Step 3: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 4: Force restart timer
      await this.forceRestartTimer();

      // Step 5: Restart protection
      await this.startProtection();

      console.log('✅ [TimerProtection] Emergency recovery completed');

    } catch (error) {
      console.error('❌ [TimerProtection] Emergency recovery failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default TimerProtectionService.getInstance();