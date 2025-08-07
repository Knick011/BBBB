// src/services/InterstitialAdManager.ts
// Manages showing interstitial ads sparingly and strategically

import AsyncStorage from '@react-native-async-storage/async-storage';
import AdMobService from './AdMobService';

interface InterstitialAdState {
  quizCompletions: number;
  lastAdTime: number;
  totalAdsShown: number;
}

class InterstitialAdManager {
  private static instance: InterstitialAdManager;
  private readonly STORAGE_KEY = '@BrainBites:interstitialAdState';
  private readonly ADS_FREQUENCY = 5; // Show ad every 5 quiz completions
  private readonly MIN_TIME_BETWEEN_ADS = 10 * 60 * 1000; // 10 minutes minimum between ads
  private readonly MAX_ADS_PER_SESSION = 3; // Maximum 3 ads per session

  private sessionAdsShown = 0;
  private initialized = false;

  static getInstance(): InterstitialAdManager {
    if (!InterstitialAdManager.instance) {
      InterstitialAdManager.instance = new InterstitialAdManager();
    }
    return InterstitialAdManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('📱 [InterstitialAds] Initializing interstitial ad manager');
      this.sessionAdsShown = 0;
      this.initialized = true;
      console.log('✅ [InterstitialAds] Interstitial ad manager initialized');
    } catch (error) {
      console.error('❌ [InterstitialAds] Failed to initialize:', error);
    }
  }

  private async getAdState(): Promise<InterstitialAdState> {
    try {
      const savedState = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error('❌ [InterstitialAds] Error loading ad state:', error);
    }

    // Default state
    return {
      quizCompletions: 0,
      lastAdTime: 0,
      totalAdsShown: 0,
    };
  }

  private async saveAdState(state: InterstitialAdState): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ [InterstitialAds] Error saving ad state:', error);
    }
  }

  /**
   * Check if we should show an interstitial ad
   */
  private async shouldShowAd(): Promise<boolean> {
    try {
      // Check if AdMob is ready
      if (!AdMobService.isInitialized() || !AdMobService.isInterstitialReady()) {
        console.log('📱 [InterstitialAds] AdMob not ready, skipping ad');
        return false;
      }

      // Check session limit
      if (this.sessionAdsShown >= this.MAX_ADS_PER_SESSION) {
        console.log('📱 [InterstitialAds] Session ad limit reached, skipping ad');
        return false;
      }

      const state = await this.getAdState();
      const now = Date.now();

      // Check time since last ad
      if (now - state.lastAdTime < this.MIN_TIME_BETWEEN_ADS) {
        console.log('📱 [InterstitialAds] Too soon since last ad, skipping');
        return false;
      }

      // Check if we've reached the frequency threshold
      if (state.quizCompletions < this.ADS_FREQUENCY) {
        console.log(`📱 [InterstitialAds] Need ${this.ADS_FREQUENCY - state.quizCompletions} more completions for ad`);
        return false;
      }

      console.log('📱 [InterstitialAds] Conditions met for showing ad');
      return true;
    } catch (error) {
      console.error('❌ [InterstitialAds] Error checking ad conditions:', error);
      return false;
    }
  }

  /**
   * Called when user completes a quiz
   */
  async onQuizCompleted(): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log('🎯 [InterstitialAds] Quiz completed, checking ad conditions');

      const state = await this.getAdState();
      state.quizCompletions += 1;
      
      console.log(`📊 [InterstitialAds] Quiz completions: ${state.quizCompletions}/${this.ADS_FREQUENCY}`);

      // Check if we should show an ad
      if (await this.shouldShowAd()) {
        console.log('📱 [InterstitialAds] Showing interstitial ad');
        
        const success = await AdMobService.showInterstitialAd();
        
        if (success) {
          // Reset completions counter and update stats
          state.quizCompletions = 0;
          state.lastAdTime = Date.now();
          state.totalAdsShown += 1;
          this.sessionAdsShown += 1;
          
          console.log(`✅ [InterstitialAds] Ad shown successfully (session: ${this.sessionAdsShown}/${this.MAX_ADS_PER_SESSION})`);
        } else {
          console.log('⚠️ [InterstitialAds] Failed to show ad');
        }
      }

      // Save state regardless of whether ad was shown
      await this.saveAdState(state);
      
    } catch (error) {
      console.error('❌ [InterstitialAds] Error handling quiz completion:', error);
    }
  }

  /**
   * Called when user navigates away from quiz screen
   * Show ad occasionally on navigation
   */
  async onScreenTransition(fromScreen: string, toScreen: string): Promise<void> {
    try {
      if (!this.initialized) return;

      // Only show ads on specific transitions to avoid being annoying
      const allowedTransitions = [
        'Quiz -> Home',
        'Categories -> Home',
      ];

      const transition = `${fromScreen} -> ${toScreen}`;
      
      if (!allowedTransitions.includes(transition)) {
        return;
      }

      // Random chance (20%) to show ad on allowed transitions
      // But only if other conditions are met
      if (Math.random() > 0.2) {
        return;
      }

      if (await this.shouldShowAd()) {
        console.log(`📱 [InterstitialAds] Showing transition ad: ${transition}`);
        
        const state = await this.getAdState();
        const success = await AdMobService.showInterstitialAd();
        
        if (success) {
          state.quizCompletions = Math.max(0, state.quizCompletions - 2); // Reduce requirement slightly
          state.lastAdTime = Date.now();
          state.totalAdsShown += 1;
          this.sessionAdsShown += 1;
          
          await this.saveAdState(state);
          console.log(`✅ [InterstitialAds] Transition ad shown: ${transition}`);
        }
      }
    } catch (error) {
      console.error('❌ [InterstitialAds] Error handling screen transition:', error);
    }
  }

  /**
   * Get current ad statistics
   */
  async getAdStats(): Promise<{
    quizCompletions: number;
    nextAdIn: number;
    totalAdsShown: number;
    sessionAdsShown: number;
    timeSinceLastAd: number;
  }> {
    const state = await this.getAdState();
    const now = Date.now();
    
    return {
      quizCompletions: state.quizCompletions,
      nextAdIn: Math.max(0, this.ADS_FREQUENCY - state.quizCompletions),
      totalAdsShown: state.totalAdsShown,
      sessionAdsShown: this.sessionAdsShown,
      timeSinceLastAd: now - state.lastAdTime,
    };
  }

  /**
   * Reset session counters (call when app becomes active)
   */
  resetSession(): void {
    console.log('🔄 [InterstitialAds] Resetting session counters');
    this.sessionAdsShown = 0;
  }

  /**
   * Force show an ad (for testing)
   */
  async forceShowAd(): Promise<boolean> {
    if (AdMobService.isInterstitialReady()) {
      const success = await AdMobService.showInterstitialAd();
      if (success) {
        this.sessionAdsShown += 1;
        
        const state = await this.getAdState();
        state.lastAdTime = Date.now();
        state.totalAdsShown += 1;
        await this.saveAdState(state);
      }
      return success;
    }
    return false;
  }
}

export default InterstitialAdManager.getInstance();