import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

interface BannerAdComponentProps {
  placement: string; // For analytics tracking
  style?: any;
}

const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ placement, style }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Force show banner ads immediately with short delay for better UX
    const showTimer = setTimeout(() => {
      console.log(`📱 [BannerAd] Showing test banner ad for ${placement}`);
      setShouldShow(true);
    }, 1000); // 1 second delay
    
    return () => clearTimeout(showTimer);
  }, [placement]);

  // Always use test IDs for safety
  const adUnitId = TestIds.BANNER;

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
        onAdOpened={() => {
          console.log(`📱 [BannerAd] Banner ad opened for ${placement}`);
        }}
        onAdClosed={() => {
          console.log(`📱 [BannerAd] Banner ad closed for ${placement}`);
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