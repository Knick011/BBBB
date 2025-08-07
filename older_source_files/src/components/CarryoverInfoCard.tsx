import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../styles/theme';

interface CarryoverInfo {
  remainingTimeMinutes: number;
  overtimeMinutes: number;
  potentialCarryoverScore: number;
  appliedCarryoverScore: number;
  isPositive: boolean;
}

export const CarryoverInfoCard: React.FC = () => {
  const [carryoverInfo, setCarryoverInfo] = useState<CarryoverInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadCarryoverInfo();
  }, []);

  const loadCarryoverInfo = async () => {
    try {
      if (NativeModules.DailyScoreCarryover) {
        const info = await NativeModules.DailyScoreCarryover.getCarryoverInfo();
        setCarryoverInfo(info);
      }
    } catch (error) {
      console.error('Failed to load carryover info:', error);
    }
  };

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  if (!carryoverInfo) return null;

  const { remainingTimeMinutes, overtimeMinutes, potentialCarryoverScore, isPositive } = carryoverInfo;
  
  // Don't show if no carryover potential
  if (remainingTimeMinutes === 0 && overtimeMinutes === 0) return null;

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 160],
  });

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.container, { height: heightInterpolate }]}>
      <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Icon 
              name={isPositive ? 'trending-up' : 'trending-down'} 
              size={24} 
              color={isPositive ? colors.success : colors.error} 
            />
            <Text style={styles.title}>Tomorrow's Score Impact</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Icon name="chevron-down" size={24} color={colors.textPrimary} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {overtimeMinutes > 0 ? (
            <>
              <View style={styles.row}>
                <Icon name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.label}>Overtime:</Text>
                <Text style={[styles.value, styles.negative]}>{overtimeMinutes} minutes</Text>
              </View>
              <View style={styles.row}>
                <Icon name="minus-circle" size={20} color={colors.error} />
                <Text style={styles.label}>Score Penalty:</Text>
                <Text style={[styles.value, styles.negative]}>-{Math.abs(potentialCarryoverScore)} points</Text>
              </View>
              <Text style={styles.explanation}>
                ⚠️ Complete quizzes to earn more time and avoid tomorrow's penalty!
              </Text>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <Icon name="clock-check" size={20} color={colors.success} />
                <Text style={styles.label}>Saved Time:</Text>
                <Text style={[styles.value, styles.positive]}>{remainingTimeMinutes} minutes</Text>
              </View>
              <View style={styles.row}>
                <Icon name="plus-circle" size={20} color={colors.success} />
                <Text style={styles.label}>Score Bonus:</Text>
                <Text style={[styles.value, styles.positive]}>+{potentialCarryoverScore} points</Text>
              </View>
              <Text style={styles.explanation}>
                🎉 Great job! Your unused time will give you bonus points tomorrow!
              </Text>
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  explanation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
}); 