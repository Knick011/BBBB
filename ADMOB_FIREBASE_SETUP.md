# AdMob & Firebase Analytics Setup Guide

This guide will help you set up AdMob and Firebase Analytics in your BrainBites React Native app.

## 📦 Installed Dependencies

The following packages have been installed:

```json
{
  "react-native-google-mobile-ads": "^15.4.0",
  "@react-native-firebase/analytics": "^22.4.0",
  "@react-native-firebase/app": "^22.4.0"
}
```

## 🔧 Setup Instructions

### 1. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable Analytics in the project settings

#### Download Configuration Files
1. **Android**: Download `google-services.json` and place it in `android/app/`
2. **iOS**: Download `GoogleService-Info.plist` and place it in `ios/brainbites/`

### 2. AdMob Setup

#### Create AdMob Account
1. Go to [AdMob Console](https://admob.google.com/)
2. Create a new app
3. Get your AdMob App ID

#### Create Ad Units
1. Create Banner Ad Unit
2. Create Interstitial Ad Unit  
3. Create Rewarded Ad Unit
4. Note down all Ad Unit IDs

### 3. Update Configuration Files

#### Update AdMobConfig.ts
Replace the test ad unit IDs in `src/config/AdMobConfig.ts`:

```typescript
export const AdMobConfig = {
  adUnitIds: {
    android: {
      banner: 'ca-app-pub-YOUR_ANDROID_BANNER_ID',
      interstitial: 'ca-app-pub-YOUR_ANDROID_INTERSTITIAL_ID',
      rewarded: 'ca-app-pub-YOUR_ANDROID_REWARDED_ID',
    },
    ios: {
      banner: 'ca-app-pub-YOUR_IOS_BANNER_ID',
      interstitial: 'ca-app-pub-YOUR_IOS_INTERSTITIAL_ID',
      rewarded: 'ca-app-pub-YOUR_IOS_REWARDED_ID',
    },
  },
  appId: {
    android: 'ca-app-pub-YOUR_ANDROID_APP_ID',
    ios: 'ca-app-pub-YOUR_IOS_APP_ID',
  },
  // ... rest of config
};
```

### 4. Android Setup

#### Update android/app/build.gradle
Add the following to the dependencies section:

```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
}
```

#### Update android/app/src/main/AndroidManifest.xml
Add the AdMob app ID:

```xml
<application>
    <!-- ... existing content -->
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-YOUR_ANDROID_APP_ID"/>
</application>
```

### 5. iOS Setup

#### Update ios/Podfile
Add the following:

```ruby
target 'brainbites' do
  # ... existing content
  
  # Add this line
  pod 'Google-Mobile-Ads-SDK'
end
```

#### Update ios/brainbites/Info.plist
Add the AdMob app ID:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-YOUR_IOS_APP_ID</string>
```

### 6. Initialize Services

#### In your App.tsx or main component:

```typescript
import AdMobService from './src/services/AdMobService';
import AnalyticsService from './src/config/FirebaseConfig';

// Initialize services
useEffect(() => {
  const initializeServices = async () => {
    await AnalyticsService.getInstance().initialize();
    await AdMobService.getInstance().initialize();
  };
  
  initializeServices();
}, []);
```

## 🎯 Usage Examples

### Analytics Tracking

```typescript
import AnalyticsService from './src/config/FirebaseConfig';

// Track quiz completion
await AnalyticsService.getInstance().trackQuizCompleted(
  'science',
  8,
  10,
  120000 // time in milliseconds
);

// Track screen view
await AnalyticsService.getInstance().logScreenView('Home');

// Set user properties
await AnalyticsService.getInstance().setUserProperty('user_level', '5');
```

### Ad Display

```typescript
import AdMobService from './src/services/AdMobService';

// Show interstitial ad
await AdMobService.getInstance().showInterstitialAd('quiz_complete');

// Show rewarded ad
await AdMobService.getInstance().showRewardedAd('level_up');

// Get banner ad component
const bannerAd = AdMobService.getInstance().getBannerAd();
```

### In React Components

```typescript
import React from 'react';
import { View } from 'react-native';
import AdMobService from '../services/AdMobService';

const HomeScreen = () => {
  return (
    <View>
      {/* Your content */}
      {AdMobService.getInstance().getBannerAd()}
    </View>
  );
};
```

## 🔍 Testing

### Test Ad Unit IDs
The configuration currently uses Google's test ad unit IDs:
- Banner: `ca-app-pub-3940256099942544/6300978111` (Android)
- Interstitial: `ca-app-pub-3940256099942544/1033173712` (Android)
- Rewarded: `ca-app-pub-3940256099942544/5224354917` (Android)

### Test Mode
- Firebase Analytics will work in debug mode
- AdMob test ads will show test content
- Replace with real ad unit IDs for production

## 📊 Analytics Events

The following events are automatically tracked:

### Quiz Events
- `quiz_started` - When a quiz begins
- `quiz_completed` - When a quiz is finished
- `quiz_question_correct` - When a question is answered correctly
- `quiz_question_incorrect` - When a question is answered incorrectly
- `quiz_streak_achieved` - When a streak is achieved

### Ad Events
- `ad_shown` - When an ad is displayed
- `ad_clicked` - When an ad is clicked
- `ad_closed` - When an ad is closed
- `rewarded_ad_completed` - When a rewarded ad is completed

### User Engagement
- `app_opened` - When the app is opened
- `screen_viewed` - When a screen is viewed
- `button_clicked` - When a button is clicked
- `settings_changed` - When settings are modified

## 🚀 Production Checklist

- [ ] Replace test ad unit IDs with real ones
- [ ] Replace test app IDs with real ones
- [ ] Add Firebase configuration files
- [ ] Test ads on real devices
- [ ] Verify analytics events in Firebase console
- [ ] Set up ad frequency limits
- [ ] Configure user consent for GDPR compliance
- [ ] Test on both Android and iOS

## 📱 Platform-Specific Notes

### Android
- Requires Google Play Services
- Minimum SDK version: 21
- Permissions are automatically handled

### iOS
- Requires iOS 11.0+
- Add required permissions to Info.plist
- Test on physical device for best results

## 🆘 Troubleshooting

### Common Issues

1. **Ads not showing**: Check ad unit IDs and network connectivity
2. **Analytics not working**: Verify Firebase configuration files
3. **Build errors**: Ensure all dependencies are properly linked
4. **Test ads not loading**: Check internet connection and ad unit IDs

### Debug Commands

```bash
# Check if services are initialized
console.log(AdMobService.getInstance().getStatus());
console.log(AnalyticsService.getInstance());

# Force reload ads
await AdMobService.getInstance().initialize();
```

## 📞 Support

For issues with:
- **AdMob**: Check [AdMob Documentation](https://developers.google.com/admob)
- **Firebase**: Check [Firebase Documentation](https://firebase.google.com/docs)
- **React Native**: Check [React Native Documentation](https://reactnative.dev/docs) 