import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdMobService from '../../services/AdMobService';
import TimerIntegrationService from '../../services/TimerIntegrationService';

interface RewardedAdButtonProps {
  onRewardEarned?: (rewardMinutes: number) => void;
  style?: any;
}

const REWARD_MINUTES = 30; // 30 minutes reward
const COOLDOWN_HOURS = 3; // 3 hour cooldown between rewards
const STORAGE_KEY = '@BrainBites:lastRewardedAdTime';

const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({ onRewardEarned, style }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAvailability();
    // Check every minute
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkAvailability = async () => {
    try {
      const lastRewardTime = await AsyncStorage.getItem(STORAGE_KEY);
      const now = Date.now();
      
      if (!lastRewardTime) {
        setIsAvailable(true);
        setTimeRemaining('');
        return;
      }

      const lastTime = parseInt(lastRewardTime, 10);
      const timeSinceLastReward = now - lastTime;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000; // Convert hours to ms
      
      if (timeSinceLastReward >= cooldownMs) {
        setIsAvailable(true);
        setTimeRemaining('');
      } else {
        setIsAvailable(false);
        const remainingMs = cooldownMs - timeSinceLastReward;
        setTimeRemaining(formatTimeRemaining(remainingMs));
      }
    } catch (error) {
      console.error('Error checking rewarded ad availability:', error);
      setIsAvailable(true); // Default to available on error
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleWatchAd = async () => {
    try {
      setIsLoading(true);

      // Check if AdMob is ready and rewarded ad is available
      if (!AdMobService.isInitialized()) {
        Alert.alert(
          'Ads Not Ready',
          'Please wait a moment for ads to load and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (!AdMobService.isRewardedReady()) {
        Alert.alert(
          'Ad Not Available',
          'No rewarded ad is currently available. Please try again later.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        '🎁 Watch Ad for Time?',
        `Watch a short video ad to earn ${REWARD_MINUTES} minutes of screen time!\n\nThis reward is available every ${COOLDOWN_HOURS} hours.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Watch Ad',
            onPress: async () => {
              console.log('🎁 [RewardedAd] User chose to watch ad');
              
              const success = await AdMobService.showRewardedAd((reward: any) => {
                handleRewardEarned(reward);
              });
              
              if (!success) {
                Alert.alert(
                  'Ad Failed',
                  'Failed to show the rewarded ad. Please try again later.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      Alert.alert(
        'Error',
        'Something went wrong. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRewardEarned = async (reward: any) => {
    try {
      console.log('🎁 [RewardedAd] User earned reward:', reward);
      
      // Record the time when reward was earned
      await AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
      
      // Add time to timer service
      try {
        await TimerIntegrationService.addTimeFromReward(REWARD_MINUTES);
        console.log(`✅ [RewardedAd] Added ${REWARD_MINUTES} minutes to timer`);
      } catch (timerError) {
        console.error('❌ [RewardedAd] Failed to add time to timer:', timerError);
      }
      
      // Update availability
      setIsAvailable(false);
      checkAvailability();
      
      // Call callback if provided
      if (onRewardEarned) {
        onRewardEarned(REWARD_MINUTES);
      }
      
      // Show success message
      Alert.alert(
        '🎉 Reward Earned!',
        `Congratulations! You've earned ${REWARD_MINUTES} minutes of screen time.\n\nNext reward available in ${COOLDOWN_HOURS} hours.`,
        [{ text: 'Awesome!' }]
      );
      
    } catch (error) {
      console.error('Error handling reward:', error);
      Alert.alert(
        'Error',
        'There was an issue processing your reward. Please contact support if this persists.',
        [{ text: 'OK' }]
      );
    }
  };

  if (!isAvailable) {
    return (
      <View style={[styles.container, styles.unavailableContainer, style]}>
        <View style={styles.iconContainer}>
          <Icon name="clock-outline" size={24} color="#999" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.unavailableTitle}>Next Ad Reward</Text>
          <Text style={styles.unavailableSubtitle}>Available in {timeRemaining}</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, styles.availableContainer, style]}
      onPress={handleWatchAd}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Icon name="play-circle" size={24} color="#4CAF50" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.availableTitle}>Watch Ad</Text>
        <Text style={styles.availableSubtitle}>Earn {REWARD_MINUTES}min time</Text>
      </View>
      <Icon name="gift" size={20} color="#FF9F1C" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  availableContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  unavailableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  availableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  availableSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  unavailableSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
});

export default RewardedAdButton;