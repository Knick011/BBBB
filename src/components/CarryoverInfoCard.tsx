import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
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
      } else {
        // Provide fallback mock data when native module is not available
        console.log('CarryoverInfoCard: Native module not available, using mock data');
        const mockInfo: CarryoverInfo = {
          remainingTimeMinutes: 15,
          overtimeMinutes: 0,
          potentialCarryoverScore: 150,
          appliedCarryoverScore: 0,
          isPositive: true,
        };
        setCarryoverInfo(mockInfo);
        console.log('CarryoverInfoCard: Mock data set:', mockInfo);
      }
    } catch (error) {
      console.error('Failed to load carryover info:', error);
      // Provide fallback data on error
      const fallbackInfo: CarryoverInfo = {
        remainingTimeMinutes: 0,
        overtimeMinutes: 5,
        potentialCarryoverScore: -25,
        appliedCarryoverScore: 0,
        isPositive: false,
      };
      setCarryoverInfo(fallbackInfo);
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

  if (!carryoverInfo) {
    console.log('CarryoverInfoCard: No carryover info available');
    return null;
  }

  const { remainingTimeMinutes, overtimeMinutes, potentialCarryoverScore, isPositive } = carryoverInfo;
  
  // Calculate net time difference and score impact
  const netTimeMinutes = remainingTimeMinutes - overtimeMinutes;
  const netScoreImpact = (remainingTimeMinutes * 10) - (overtimeMinutes * 5); // +10 per remaining, -5 per overtime
  const isNetPositive = netTimeMinutes > 0;
  
  // Show card if there's any timer data or just to show the UI
  // Remove return null to always show the card for testing
  // if (remainingTimeMinutes === 0 && overtimeMinutes === 0 && netTimeMinutes === 0) return null;

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 280], // Increased max height to accommodate scrolling
  });

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Summary chips removed as requested for a cleaner header

  return (
    <Animated.View style={[styles.wrapper, { height: heightInterpolate }]}>      
      <View style={[styles.container, styles.containerWhite]}>
        <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Icon
                name={isNetPositive ? 'trending-up' : 'trending-down'}
                size={24}
                color={isNetPositive ? colors.success : colors.error}
              />
              <Text style={styles.title}>Tomorrow's Score Impact</Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Icon name="chevron-down" size={24} color={colors.textPrimary} />
            </Animated.View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Show breakdown when both exist */}
            {remainingTimeMinutes > 0 && overtimeMinutes > 0 ? (
              <>
                <View style={styles.row}>
                  <Icon name="clock-check" size={20} color={colors.success} />
                  <Text style={styles.label}>Time Saved:</Text>
                  <Text style={[styles.value, styles.positive]}>+{remainingTimeMinutes} min</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.label}>Overtime Used:</Text>
                  <Text style={[styles.value, styles.negative]}>-{overtimeMinutes} min</Text>
                </View>
                <View style={[styles.row, styles.totalRow]}>
                  <Icon name="calculator" size={20} color={isNetPositive ? colors.success : colors.error} />
                  <Text style={[styles.label, styles.totalLabel]}>Net Impact:</Text>
                  <Text style={[styles.value, styles.totalValue, isNetPositive ? styles.positive : styles.negative]}>
                    {isNetPositive ? '+' : ''}{netTimeMinutes} min {isNetPositive ? '+' : ''}{netScoreImpact} pts
                  </Text>
                </View>
                <Text style={styles.explanation}>
                  {isNetPositive ? 
                    '🎉 Great! You saved more time than you used in overtime!' :
                    '⚠️ You used more overtime than saved time. Try to answer quizzes faster!'
                  }
                </Text>
              </>
            ) : overtimeMinutes > 0 ? (
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
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  container: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  containerWhite: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  chipPositive: {
    backgroundColor: colors.success,
  },
  chipNegative: {
    backgroundColor: colors.error,
  },
  chipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContainer: {
    flex: 1,
    maxHeight: 180, // Max height for scrollable content
  },
  content: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 8,
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
  totalLabel: {
    fontWeight: '700',
    fontSize: 15,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
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