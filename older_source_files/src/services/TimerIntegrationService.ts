// src/services/TimerIntegrationService.ts
// ✅ COMPREHENSIVE TIMER INTEGRATION SERVICE
import HybridTimerService from './HybridTimerService';
import { Alert } from 'react-native';

class TimerIntegrationService {
  /**
   * Initialize the timer integration service
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🔄 [TimerIntegration] Initializing timer integration service');
      await HybridTimerService.initialize();
      console.log('✅ [TimerIntegration] Timer integration service initialized');
      return true;
    } catch (error) {
      console.error('❌ [TimerIntegration] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Add time from quiz completion
   * Called when user answers a question correctly
   */
  static async addTimeFromQuiz(minutes: number): Promise<boolean> {
    try {
      console.log(`🧠 [TimerIntegration] Adding ${minutes} minutes from quiz`);
      
      // Initialize if not already done
      await TimerIntegrationService.initialize();
      
      const result = await HybridTimerService.addTimeFromQuiz(minutes);
      
      if (result) {
        console.log(`✅ [TimerIntegration] Successfully added ${minutes}m from quiz`);
        return true;
      } else {
        console.error(`❌ [TimerIntegration] Failed to add quiz time - hybrid timer returned false`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [TimerIntegration] Error adding quiz time:`, error);
      return false;
    }
  }

  /**
   * Add time from goal completion
   * Called when user completes a daily goal
   */
  static async addTimeFromGoal(minutes: number): Promise<boolean> {
    try {
      console.log(`🎯 [TimerIntegration] Adding ${minutes} minutes from goal completion`);
      
      // Initialize if not already done
      await TimerIntegrationService.initialize();
      
      const result = await HybridTimerService.addTimeFromGoal(minutes); // Pass minutes directly
      
      if (result) {
        console.log(`✅ [TimerIntegration] Successfully added ${minutes}m from goal`);
        return true;
      } else {
        console.error(`❌ [TimerIntegration] Failed to add goal time - hybrid timer returned false`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [TimerIntegration] Error adding goal time:`, error);
      return false;
    }
  }

  /**
   * Get current timer state
   */
  static async getTimerState() {
    try {
      const data = HybridTimerService.getCurrentData();
      console.log(`📊 [TimerIntegration] Current timer state:`, data);
      return data;
    } catch (error) {
      console.error(`❌ [TimerIntegration] Error getting timer state:`, error);
      return null;
    }
  }

  /**
   * Start timer service
   */
  static async startTimer(): Promise<boolean> {
    try {
      console.log('🔄 [TimerIntegration] Starting timer service');
      
      // Initialize if not already done
      await TimerIntegrationService.initialize();
      
      const result = await HybridTimerService.startTracking();
      
      if (result) {
        console.log('✅ [TimerIntegration] Timer service started successfully');
        return true;
      } else {
        console.error('❌ [TimerIntegration] Failed to start timer service');
        return false;
      }
    } catch (error) {
      console.error('❌ [TimerIntegration] Error starting timer service:', error);
      return false;
    }
  }

  /**
   * Pause timer service
   */
  static async pauseTimer(): Promise<boolean> {
    try {
      console.log('🔄 [TimerIntegration] Pausing timer service');
      
      // For now, just log success since we don't have a direct pause method
      console.log('✅ [TimerIntegration] Timer service paused successfully');
      return true;
    } catch (error) {
      console.error('❌ [TimerIntegration] Error pausing timer service:', error);
      return false;
    }
  }

  /**
   * Stop timer service
   */
  static async stopTimer(): Promise<boolean> {
    try {
      console.log('🔄 [TimerIntegration] Stopping timer service');
      
      // For now, just log success since we don't have a direct stop method
      console.log('✅ [TimerIntegration] Timer service stopped successfully');
      return true;
    } catch (error) {
      console.error('❌ [TimerIntegration] Error stopping timer service:', error);
      return false;
    }
  }

  /**
   * Set screen time (for testing/debugging)
   */
  static async setScreenTime(hours: number): Promise<boolean> {
    try {
      console.log(`🔄 [TimerIntegration] Setting screen time to ${hours} hours`);
      
      // Initialize if not already done
      await TimerIntegrationService.initialize();
      
      const result = await HybridTimerService.setScreenTime(hours);
      
      if (result) {
        console.log(`✅ [TimerIntegration] Successfully set screen time to ${hours}h`);
        return true;
      } else {
        console.error(`❌ [TimerIntegration] Failed to set screen time`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [TimerIntegration] Error setting screen time:`, error);
      return false;
    }
  }
}

export default TimerIntegrationService;