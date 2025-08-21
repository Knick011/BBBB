import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface BannerAdComponentProps {
  placement: string;
  style?: any;
}

const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ placement, style }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Show banner ads immediately without delay for production
    console.log(`📱 [BannerAd] Initializing banner ad for ${placement}`);
    setShouldShow(true);
    
    return () => {};
  }, [placement]);

  // Production banner ad ID for Play Store
  const adUnitId = 'ca-app-pub-7353957756801275/3370462815';

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => {
          console.log(`📱 [BannerAd] Banner ad loaded for ${placement}`);
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.log(`❌ [BannerAd] Banner ad failed to load for ${placement}:`, error);
          setAdLoaded(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 5,
  },
});

export default BannerAdComponent;