import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

export const useLeaderboardAnimations = () => {
  const rankChangeAnim = useRef(new Animated.Value(0)).current;
  const scoreUpdateAnim = useRef(new Animated.Value(1)).current;
  const newEntryAnim = useRef(new Animated.Value(0)).current;

  const animateRankChange = useCallback((direction: 'up' | 'down') => {
    rankChangeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(rankChangeAnim, {
        toValue: direction === 'up' ? -20 : 20,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(rankChangeAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [rankChangeAnim]);

  const animateScoreUpdate = useCallback(() => {
    scoreUpdateAnim.setValue(1);
    Animated.sequence([
      Animated.timing(scoreUpdateAnim, {
        toValue: 1.1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scoreUpdateAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scoreUpdateAnim]);

  const animateNewEntry = useCallback(() => {
    newEntryAnim.setValue(0);
    Animated.timing(newEntryAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [newEntryAnim]);

  return {
    rankChangeAnim,
    scoreUpdateAnim,
    newEntryAnim,
    animateRankChange,
    animateScoreUpdate,
    animateNewEntry,
  };
}; 