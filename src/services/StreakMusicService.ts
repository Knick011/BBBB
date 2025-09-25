// src/services/StreakMusicService.ts
// Service to monitor streak changes and update music speed accordingly

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import AudioManager from './AudioManager';

class StreakMusicService {
  private static instance: StreakMusicService;
  private isMonitoring = false;
  private currentStreak = 0;
  private lastKnownStreak = 0;

  private constructor() {
    console.log('🎵 [StreakMusicService] Initializing streak-music integration...');
  }

  static getInstance(): StreakMusicService {
    if (!StreakMusicService.instance) {
      StreakMusicService.instance = new StreakMusicService();
    }
    return StreakMusicService.instance;
  }

  /**
   * Start monitoring streak changes and updating music speed
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      console.log('🎵 [StreakMusicService] Starting streak monitoring...');
      
      // Load current streak
      await this.loadCurrentStreak();
      
      // Listen for streak change events
      this.setupEventListeners();
      
      // Set initial music speed
      await AudioManager.updateMusicSpeedForStreak(this.currentStreak);
      
      this.isMonitoring = true;
      console.log(`✅ [StreakMusicService] Monitoring started - current streak: ${this.currentStreak}`);
      
    } catch (error) {
      console.error('❌ [StreakMusicService] Failed to start monitoring:', error);
    }
  }

  /**
   * Stop monitoring streak changes
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    try {
      console.log('🎵 [StreakMusicService] Stopping streak monitoring...');
      
      // Remove event listeners
      DeviceEventEmitter.removeAllListeners('dailyGoalDayCompleted');
      DeviceEventEmitter.removeAllListeners('dailyGoalClaimed');
      DeviceEventEmitter.removeAllListeners('streakUpdated');
      
      this.isMonitoring = false;
      console.log('✅ [StreakMusicService] Monitoring stopped');
      
    } catch (error) {
      console.error('❌ [StreakMusicService] Error stopping monitoring:', error);
    }
  }

  /**
   * Manually update streak and music speed
   */
  async updateStreak(newStreak: number): Promise<void> {
    const previousStreak = this.currentStreak;
    this.currentStreak = Math.max(0, newStreak);
    
    if (previousStreak !== this.currentStreak) {
      console.log(`🎵 [StreakMusicService] Streak changed: ${previousStreak} → ${this.currentStreak}`);
      
      // Update music speed
      await AudioManager.updateMusicSpeedForStreak(this.currentStreak);
      
      // Log speed change
      const speed = AudioManager.getCurrentMusicSpeed();
      console.log(`🎵 [StreakMusicService] Music speed: ${speed}x`);
    }
  }

  /**
   * Load current streak from storage
   */
  private async loadCurrentStreak(): Promise<void> {
    try {
      const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
      this.currentStreak = streakData ? parseInt(streakData, 10) : 0;
      this.lastKnownStreak = this.currentStreak;
      
      console.log(`🎵 [StreakMusicService] Current streak loaded: ${this.currentStreak}`);
    } catch (error) {
      console.error('❌ [StreakMusicService] Failed to load current streak:', error);
      this.currentStreak = 0;
    }
  }

  /**
   * Setup event listeners for streak changes
   */
  private setupEventListeners(): void {
    // Listen for daily goal completion
    DeviceEventEmitter.addListener('dailyGoalDayCompleted', async () => {
      console.log('🎯 [StreakMusicService] Daily goal completed event received');
      await this.handleStreakChange();
    });

    // Listen for daily goal claimed
    DeviceEventEmitter.addListener('dailyGoalClaimed', async () => {
      console.log('🎯 [StreakMusicService] Daily goal claimed event received');
      await this.handleStreakChange();
    });

    // Listen for direct streak updates
    DeviceEventEmitter.addListener('streakUpdated', async (streak: number) => {
      console.log(`🎯 [StreakMusicService] Direct streak update: ${streak}`);
      await this.updateStreak(streak);
    });
  }

  /**
   * Handle streak change by reloading from storage
   */
  private async handleStreakChange(): Promise<void> {
    try {
      // Small delay to ensure storage is updated
      setTimeout(async () => {
        await this.loadCurrentStreak();
        await this.updateStreak(this.currentStreak);
      }, 100);
    } catch (error) {
      console.error('❌ [StreakMusicService] Error handling streak change:', error);
    }
  }

  /**
   * Get current streak
   */
  getCurrentStreak(): number {
    return this.currentStreak;
  }

  /**
   * Get current music speed
   */
  getCurrentMusicSpeed(): number {
    return AudioManager.getCurrentMusicSpeed();
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get detailed speed info for debugging and display
   */
  getSpeedInfo(): { 
    streak: number; 
    speed: number; 
    speedPercentage: string;
    speedDescription: string;
    nextMilestone?: { streak: number; speed: number; description: string };
  } {
    const speed = this.getCurrentMusicSpeed();
    const speedPercentage = speed === 1.0 ? 'Normal' : `+${Math.round((speed - 1) * 100)}%`;
    const speedDescription = this.getSpeedDescription(speed);
    const nextMilestone = this.getNextMilestone(this.currentStreak);
    
    return {
      streak: this.currentStreak,
      speed: speed,
      speedPercentage: speedPercentage,
      speedDescription: speedDescription,
      nextMilestone: nextMilestone
    };
  }
  
  /**
   * Get descriptive text for current speed level
   */
  private getSpeedDescription(speed: number): string {
    if (speed >= 2.2) return 'Very Fast';
    if (speed >= 1.9) return 'Fast';
    if (speed >= 1.7) return 'Energetic';
    if (speed >= 1.5) return 'Upbeat';
    if (speed >= 1.4) return 'Quick';
    if (speed >= 1.3) return 'Lively';
    if (speed >= 1.25) return 'Peppy';
    if (speed >= 1.15) return 'Faster';
    if (speed >= 1.1) return 'Slightly Faster';
    return 'Normal';
  }
  
  /**
   * Get next milestone information
   */
  private getNextMilestone(currentStreak: number): { streak: number; speed: number; description: string } | undefined {
    const milestones = [
      { streak: 1, speed: 1.1, description: 'Slightly Faster' },
      { streak: 3, speed: 1.15, description: 'Faster' },
      { streak: 5, speed: 1.25, description: 'Peppy' },
      { streak: 6, speed: 1.3, description: 'Lively' },
      { streak: 8, speed: 1.4, description: 'Quick' },
      { streak: 10, speed: 1.5, description: 'Upbeat' },
      { streak: 12, speed: 1.7, description: 'Energetic' },
      { streak: 15, speed: 1.9, description: 'Fast' },
      { streak: 20, speed: 2.2, description: 'Very Fast' }
    ];
    
    return milestones.find(m => m.streak > currentStreak);
  }
  
  /**
   * Get current speed milestone achieved
   */
  getCurrentMilestone(): { streak: number; speed: number; description: string } | undefined {
    const milestones = [
      { streak: 20, speed: 2.2, description: 'Very Fast' },
      { streak: 15, speed: 1.9, description: 'Fast' },
      { streak: 12, speed: 1.7, description: 'Energetic' },
      { streak: 10, speed: 1.5, description: 'Upbeat' },
      { streak: 8, speed: 1.4, description: 'Quick' },
      { streak: 6, speed: 1.3, description: 'Lively' },
      { streak: 5, speed: 1.25, description: 'Peppy' },
      { streak: 3, speed: 1.15, description: 'Faster' },
      { streak: 1, speed: 1.1, description: 'Slightly Faster' },
      { streak: 0, speed: 1.0, description: 'Normal' }
    ];
    
    return milestones.find(m => this.currentStreak >= m.streak);
  }
}

// Export singleton instance
export default StreakMusicService.getInstance();