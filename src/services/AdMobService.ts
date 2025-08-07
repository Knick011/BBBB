// src/services/AdMobService.ts
// Google AdMob integration service for BrainBites

import { 
  BannerAd, 
  BannerAdSize, 
  TestIds,
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  AdsConsent,
  AdsConsentStatus,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// AdMob App IDs and Ad Unit IDs
const ADMOB_CONFIG = {
  // Test IDs for development - Replace with your actual Ad Unit IDs for production
  ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713', // Test App ID
  IOS_APP_ID: 'ca-app-pub-3940256099942544~1458002511', // Test App ID
  
  // Always use test IDs for safety during development
  BANNER_AD_UNIT_ID: TestIds.BANNER,
  INTERSTITIAL_AD_UNIT_ID: TestIds.INTERSTITIAL, 
  REWARDED_AD_UNIT_ID: TestIds.REWARDED,
};

interface AdMobServiceState {
  initialized: boolean;
  consentStatus: AdsConsentStatus | null;
  interstitialLoaded: boolean;
  rewardedLoaded: boolean;
  showPersonalizedAds: boolean;
}

class AdMobService {
  private static instance: AdMobService;
  private state: AdMobServiceState = {
    initialized: false,
    consentStatus: null,
    interstitialLoaded: false,
    rewardedLoaded: false,
    showPersonalizedAds: true,
  };

  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🎯 [AdMob] Initializing AdMob service...');

      // Check consent status
      const consentInfo = await AdsConsent.requestInfoUpdate({
        debugGeography: __DEV__ ? AdsConsentDebugGeography.EEA : AdsConsentDebugGeography.DISABLED,
        testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
      });

      this.state.consentStatus = consentInfo.status;
      console.log('📋 [AdMob] Consent status:', consentInfo.status);

      // Show consent form if needed
      if (
        consentInfo.status === AdsConsentStatus.REQUIRED ||
        consentInfo.status === AdsConsentStatus.UNKNOWN
      ) {
        const formResult = await AdsConsent.showForm();
        console.log('📝 [AdMob] Consent form result:', formResult);
        this.state.consentStatus = formResult.status;
      }

      // Initialize ads
      await this.loadInterstitialAd();
      await this.loadRewardedAd();

      this.state.initialized = true;
      console.log('✅ [AdMob] AdMob service initialized successfully');
      return true;
    } catch (error) {
      console.log('❌ [AdMob] Failed to initialize AdMob service:', error);
      return false;
    }
  }

  // Banner Ad Component
  getBannerAdComponent() {
    return BannerAd;
  }

  getBannerAdProps() {
    return {
      unitId: ADMOB_CONFIG.BANNER_AD_UNIT_ID,
      size: BannerAdSize.ADAPTIVE_BANNER,
      requestOptions: {
        requestNonPersonalizedAdsOnly: !this.state.showPersonalizedAds,
      },
    };
  }

  // Interstitial Ad Methods
  private async loadInterstitialAd(): Promise<void> {
    try {
      this.interstitialAd = InterstitialAd.createForAdUnitId(
        ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID
      );

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('📱 [AdMob] Interstitial ad loaded');
        this.state.interstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('❌ [AdMob] Interstitial ad error:', error);
        this.state.interstitialLoaded = false;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('📱 [AdMob] Interstitial ad closed');
        this.state.interstitialLoaded = false;
        // Reload the ad for next time
        this.loadInterstitialAd();
      });

      await this.interstitialAd.load();
    } catch (error) {
      console.log('❌ [AdMob] Failed to load interstitial ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    try {
      if (this.interstitialAd && this.state.interstitialLoaded) {
        console.log('📱 [AdMob] Showing interstitial ad');
        this.interstitialAd.show();
        return true;
      } else {
        console.log('⚠️ [AdMob] Interstitial ad not ready');
        return false;
      }
    } catch (error) {
      console.log('❌ [AdMob] Failed to show interstitial ad:', error);
      return false;
    }
  }

  // Rewarded Ad Methods
  private async loadRewardedAd(): Promise<void> {
    try {
      this.rewardedAd = RewardedAd.createForAdUnitId(
        ADMOB_CONFIG.REWARDED_AD_UNIT_ID
      );

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('🎁 [AdMob] Rewarded ad loaded');
        this.state.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
        console.log('❌ [AdMob] Rewarded ad error:', error);
        this.state.rewardedLoaded = false;
      });

      this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('🎁 [AdMob] User earned reward:', reward);
        }
      );

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        console.log('🎁 [AdMob] Rewarded ad closed');
        this.state.rewardedLoaded = false;
        // Reload the ad for next time
        this.loadRewardedAd();
      });

      await this.rewardedAd.load();
    } catch (error) {
      console.log('❌ [AdMob] Failed to load rewarded ad:', error);
    }
  }

  async showRewardedAd(onReward?: (reward: any) => void): Promise<boolean> {
    try {
      if (this.rewardedAd && this.state.rewardedLoaded) {
        console.log('🎁 [AdMob] Showing rewarded ad');
        
        // Add one-time reward listener if callback provided
        if (onReward) {
          const unsubscribe = this.rewardedAd.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            (reward) => {
              onReward(reward);
              unsubscribe();
            }
          );
        }

        this.rewardedAd.show();
        return true;
      } else {
        console.log('⚠️ [AdMob] Rewarded ad not ready');
        return false;
      }
    } catch (error) {
      console.log('❌ [AdMob] Failed to show rewarded ad:', error);
      return false;
    }
  }

  // Utility Methods
  isInterstitialReady(): boolean {
    return this.state.interstitialLoaded;
  }

  isRewardedReady(): boolean {
    return this.state.rewardedLoaded;
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }

  getConsentStatus(): AdsConsentStatus | null {
    return this.state.consentStatus;
  }

  // Ad frequency management
  shouldShowInterstitialAd(gamesSinceLastAd: number = 0): boolean {
    // Show interstitial every 3 quiz completions
    return gamesSinceLastAd >= 3 && this.isInterstitialReady();
  }

  shouldShowRewardedAd(): boolean {
    return this.isRewardedReady();
  }

  // Privacy settings
  setPersonalizedAds(enabled: boolean): void {
    this.state.showPersonalizedAds = enabled;
    console.log('🔒 [AdMob] Personalized ads:', enabled ? 'enabled' : 'disabled');
  }
}

export default AdMobService.getInstance();