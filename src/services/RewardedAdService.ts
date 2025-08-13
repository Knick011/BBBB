// src/services/RewardedAdService.ts
// AdMob rewarded ad integration

import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

class RewardedAdService {
  private static instance: RewardedAdService;
  private currentAd: RewardedAd | null = null;
  private isAdLoaded = false;
  private adUnitId: string;

  constructor() {
    // Use test ads in development, real ad unit IDs in production
    this.adUnitId = __DEV__ 
      ? TestIds.REWARDED
      : Platform.select({
          ios: 'ca-app-pub-3940256099942544/1712485313', // Test ad unit for now
          android: 'ca-app-pub-3940256099942544/5224354917', // Test ad unit for now
        }) || TestIds.REWARDED;
        
    console.log(`📺 [RewardedAdService] Using ad unit ID: ${this.adUnitId}`);
  }

  static getInstance(): RewardedAdService {
    if (!RewardedAdService.instance) {
      RewardedAdService.instance = new RewardedAdService();
    }
    return RewardedAdService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('📺 [RewardedAdService] Initializing rewarded ads...');
      
      // Load the first ad
      await this.loadAd();
      
      console.log('✅ [RewardedAdService] Rewarded ads initialized');
    } catch (error) {
      console.error('❌ [RewardedAdService] Failed to initialize:', error);
    }
  }

  private async loadAd(): Promise<void> {
    try {
      console.log('📺 [RewardedAdService] Loading rewarded ad...');
      
      // Clean up previous ad if exists
      if (this.currentAd) {
        this.currentAd = null;
      }
      
      // Create new rewarded ad
      this.currentAd = RewardedAd.createForAdRequest(this.adUnitId, {
        requestNonPersonalizedAdsOnly: false,
        keywords: ['games', 'education', 'quiz'],
      });
      
      await this.currentAd.load();
      
      this.isAdLoaded = true;
      console.log('✅ [RewardedAdService] Rewarded ad loaded successfully');
    } catch (error) {
      console.error('❌ [RewardedAdService] Failed to load ad:', error);
      this.isAdLoaded = false;
      this.currentAd = null;
    }
  }

  async showRewardedAd(): Promise<boolean> {
    try {
      if (!this.isAdLoaded || !this.currentAd) {
        console.log('⏳ [RewardedAdService] Ad not loaded, loading now...');
        await this.loadAd();
      }

      if (!this.isAdLoaded || !this.currentAd) {
        console.warn('⚠️ [RewardedAdService] No ad available after loading attempt');
        return false;
      }

      console.log('📺 [RewardedAdService] Showing rewarded ad...');
      
      return new Promise((resolve) => {
        let resolved = false;
        
        // Set up event listeners
        const unsubscribeEarned = this.currentAd!.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            if (!resolved) {
              resolved = true;
              console.log('✅ [RewardedAdService] User earned reward:', reward);
              unsubscribeEarned();
              unsubscribeClosed();
              resolve(true);
            }
          }
        );
        
        const unsubscribeClosed = this.currentAd!.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            if (!resolved) {
              resolved = true;
              console.log('❌ [RewardedAdService] Ad closed without reward');
              unsubscribeEarned();
              unsubscribeClosed();
              resolve(false);
            }
          }
        );
        
        // Show the ad
        this.currentAd!.show().catch((error) => {
          if (!resolved) {
            resolved = true;
            console.error('❌ [RewardedAdService] Error showing ad:', error);
            unsubscribeEarned();
            unsubscribeClosed();
            resolve(false);
          }
        });
        
        // Mark ad as used
        this.isAdLoaded = false;
        this.currentAd = null;
      });

    } catch (error) {
      console.error('❌ [RewardedAdService] Error in showRewardedAd:', error);
      return false;
    } finally {
      // Pre-load next ad
      setTimeout(() => {
        this.loadAd().catch(console.error);
      }, 1000);
    }
  }

  isAdAvailable(): boolean {
    return this.isAdLoaded && this.currentAd !== null;
  }

  // Preload an ad for faster showing
  async preloadAd(): Promise<void> {
    if (!this.isAdLoaded) {
      await this.loadAd();
    }
  }

  // Get reward information (for UI display)
  getRewardInfo(): { type: string; amount: number } {
    return {
      type: 'coins', // or whatever reward type you use
      amount: 1 // or whatever amount
    };
  }
}

export default RewardedAdService.getInstance();

/*
SETUP INSTRUCTIONS:

1. ✅ AdMob SDK is already installed (react-native-google-mobile-ads)

2. Configure AdMob in your app:
   - Add your AdMob App ID to android/app/src/main/AndroidManifest.xml:
     <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyyyy"/>
   
   - Add to ios/BrainBites/Info.plist:
     <key>GADApplicationIdentifier</key>
     <string>ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyyyy</string>

3. Update ad unit IDs in constructor above with your real production IDs

4. Test thoroughly:
   - Test ads are currently configured for development
   - Verify reward flow works correctly in DailyGoalsScreen
   - Test network error handling

5. Initialize the service in your app:
   - Call RewardedAdService.initialize() in App.tsx or main component
*/