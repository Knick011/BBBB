// src/utils/TestUpdates.ts
// Quick test utilities to verify our updates are working

import AudioManager from '../services/AudioManager';
import StreakMusicService from '../services/StreakMusicService';

export class TestUpdates {
  
  /**
   * Test the enhanced music speed system
   */
  static async testMusicSpeeds(): Promise<void> {
    console.log('🧪 [TestUpdates] Testing enhanced music speed system...');
    
    try {
      // Enable music if disabled
      await AudioManager.setMusicEnabled(true);
      
      // Start game music
      console.log('🧪 [TestUpdates] Starting game music...');
      await AudioManager.playGameMusic();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test milestone streak speeds with descriptions
      const streaks = [0, 1, 3, 5, 8, 10, 12, 15, 20];
      
      for (const streak of streaks) {
        console.log(`🧪 [TestUpdates] Testing streak ${streak}...`);
        await AudioManager.updateMusicSpeedForStreak(streak);
        const speed = AudioManager.getCurrentMusicSpeed();
        const description = this.getSpeedDescription(speed);
        console.log(`🧪 [TestUpdates] Streak ${streak}: ${speed.toFixed(1)}x (${description})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('✅ [TestUpdates] Enhanced music speed test completed');
      
    } catch (error) {
      console.error('❌ [TestUpdates] Music speed test failed:', error);
    }
  }
  
  /**
   * Get speed description (helper method for testing)
   */
  private static getSpeedDescription(speed: number): string {
    if (speed >= 3.0) return 'Insane';
    if (speed >= 2.5) return 'Extreme';
    if (speed >= 2.2) return 'Very Fast';
    if (speed >= 2.0) return 'Fast';
    if (speed >= 1.8) return 'Quick';
    if (speed >= 1.6) return 'Upbeat';
    if (speed >= 1.5) return 'Energetic';
    if (speed >= 1.2) return 'Lively';
    if (speed >= 1.1) return 'Slightly Faster';
    return 'Normal';
  }
  
  /**
   * Test the enhanced streak monitoring service
   */
  static async testStreakService(): Promise<void> {
    console.log('🧪 [TestUpdates] Testing enhanced StreakMusicService...');
    
    try {
      // Check if service is running
      const isMonitoring = StreakMusicService.isMonitoringActive();
      console.log(`🧪 [TestUpdates] Service monitoring: ${isMonitoring}`);
      
      // Get current speed info
      const initialSpeedInfo = StreakMusicService.getSpeedInfo();
      console.log(`🧪 [TestUpdates] Initial speed info:`, initialSpeedInfo);
      
      // Test manual streak updates with detailed feedback
      console.log('🧪 [TestUpdates] Testing manual streak updates with milestones...');
      
      const testStreaks = [0, 1, 3, 5, 8, 10, 15, 20];
      
      for (const streak of testStreaks) {
        await StreakMusicService.updateStreak(streak);
        const speedInfo = StreakMusicService.getSpeedInfo();
        const currentMilestone = StreakMusicService.getCurrentMilestone();
        
        console.log(`🧪 [TestUpdates] Streak ${streak}:`);
        console.log(`   Speed: ${speedInfo.speed.toFixed(1)}x (${speedInfo.speedDescription})`);
        console.log(`   Milestone: ${currentMilestone?.description || 'None'}`);
        
        if (speedInfo.nextMilestone) {
          console.log(`   Next: ${speedInfo.nextMilestone.streak} streak → ${speedInfo.nextMilestone.description}`);
        } else {
          console.log(`   Next: Maximum speed reached!`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Reset to normal
      await StreakMusicService.updateStreak(0);
      const finalInfo = StreakMusicService.getSpeedInfo();
      console.log(`🧪 [TestUpdates] Reset - Speed: ${finalInfo.speed}x (${finalInfo.speedDescription})`);
      
      console.log('✅ [TestUpdates] Enhanced StreakMusicService test completed');
      
    } catch (error) {
      console.error('❌ [TestUpdates] StreakMusicService test failed:', error);
    }
  }
  
  /**
   * Log system status for debugging
   */
  static logSystemStatus(): void {
    console.log('🧪 [TestUpdates] === SYSTEM STATUS ===');
    
    // AudioManager status
    const audioStatus = AudioManager.getStatus();
    console.log('🧪 [TestUpdates] AudioManager:', {
      initialized: audioStatus.initialized,
      currentMusic: audioStatus.currentMusic,
      musicEnabled: AudioManager.isMusicEnabled(),
      currentSpeed: AudioManager.getCurrentMusicSpeed(),
      features: audioStatus.features.includes('Streak-Based Music Speed')
    });
    
    // StreakMusicService status
    console.log('🧪 [TestUpdates] StreakMusicService:', {
      monitoring: StreakMusicService.isMonitoringActive(),
      currentStreak: StreakMusicService.getCurrentStreak(),
      musicSpeed: StreakMusicService.getCurrentMusicSpeed(),
      speedInfo: StreakMusicService.getSpeedInfo()
    });
    
    console.log('🧪 [TestUpdates] === END STATUS ===');
  }
  
  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 [TestUpdates] Running all update tests...');
    
    this.logSystemStatus();
    await this.testStreakService();
    await this.testMusicSpeeds();
    
    console.log('✅ [TestUpdates] All tests completed!');
  }
}

// Global access for debugging
(global as any).TestUpdates = TestUpdates;

export default TestUpdates;