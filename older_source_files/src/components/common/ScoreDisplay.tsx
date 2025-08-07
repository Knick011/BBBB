// src/components/common/ScoreDisplay.tsx
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  ViewStyle,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';
import { useLiveScore } from '../../store/useLiveGameStore';

interface ScoreDisplayProps {
  score?: number;
  showStreak?: boolean;
  showMilestoneProgress?: boolean;
  milestoneEvery?: number;
  variant?: 'horizontal' | 'vertical' | 'compact';
  onMilestoneReached?: (milestone: number) => void;
  style?: ViewStyle;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  score,
  showStreak = true,
  showMilestoneProgress = true,
  milestoneEvery = 5,
  variant = 'horizontal',
  onMilestoneReached = null,
  style
}) => {
  // Get live score data including highest streak
  const { dailyScore, highestStreak, animatingScore, animatingStreak } = useLiveScore();
  
  // Animation values
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Calculate streak milestone progress
  const streakProgress = (highestStreak % milestoneEvery) / milestoneEvery;
  const nextMilestone = Math.floor(highestStreak / milestoneEvery + 1) * milestoneEvery;
  const atMilestone = highestStreak > 0 && highestStreak % milestoneEvery === 0;
  
  // Update animations when props change
  useEffect(() => {
    if (animatingScore) {
      // Animate score counting up
      Animated.timing(scoreAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      scoreAnim.setValue(1);
    }
  }, [animatingScore, dailyScore]);
  
  // Streak animation effects
  useEffect(() => {
    if (animatingStreak) {
      // Pulse animation for streak
      Animated.sequence([
        Animated.timing(streakAnim, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(2)),
        }),
        Animated.timing(streakAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: streakProgress,
        duration: 600,
        useNativeDriver: false, // Using width interpolation
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      streakAnim.setValue(1);
      progressAnim.setValue(streakProgress);
    }
    
    // Notify when milestone reached
    if (atMilestone && onMilestoneReached) {
      onMilestoneReached(highestStreak);
    }
  }, [highestStreak, animatingStreak]);
  
  // Render based on variant
  const renderHorizontal = () => (
    <View style={[styles.container, styles.horizontal, style]}>
      {/* Score */}
      <View style={styles.scoreContainer}>
        <Icon name="star" size={20} color={colors.warning} style={styles.scoreIcon} />
        <Animated.Text 
          style={[
            styles.scoreText,
            { opacity: scoreAnim }
          ]}
        >
          {formatNumber(score ?? dailyScore)}
        </Animated.Text>
      </View>
      
      {/* Streak */}
      {showStreak && (
        <Animated.View 
          style={[
            styles.streakContainer,
            { 
              transform: [{ scale: streakAnim }],
              backgroundColor: atMilestone ? colors.warning : 'white'
            }
          ]}
        >
          <Icon 
            name="fire" 
            size={16} 
            color={atMilestone ? 'white' : colors.primary} 
          />
          <Text 
            style={[
              styles.streakText,
              atMilestone && { color: 'white' }
            ]}
          >
            {highestStreak}
          </Text>
        </Animated.View>
      )}
    </View>
  );
  
  const renderVertical = () => (
    <View style={[styles.container, styles.vertical, style]}>
      {/* Score */}
      <View style={styles.scoreContainerVertical}>
        <Icon name="star" size={24} color={colors.warning} style={styles.scoreIcon} />
        <Animated.Text 
          style={[
            styles.scoreTextLarge,
            { opacity: scoreAnim }
          ]}
        >
          {formatNumber(score ?? dailyScore)}
        </Animated.Text>
      </View>
      
      {/* Streak */}
      {showStreak && (
        <View style={styles.streakSection}>
          <Text style={styles.sectionLabel}>STREAK</Text>
          <Animated.View 
            style={[
              styles.streakContainerLarge,
              { 
                transform: [{ scale: streakAnim }],
                backgroundColor: atMilestone ? colors.warning : 'white'
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={20} 
              color={atMilestone ? 'white' : colors.primary} 
            />
            <Text 
              style={[
                styles.streakTextLarge,
                atMilestone && { color: 'white' }
              ]}
            >
              {highestStreak}
            </Text>
          </Animated.View>
          
          {/* Milestone Progress Bar */}
          {showMilestoneProgress && (
            <View style={styles.progressContainerVertical}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: highestStreak % milestoneEvery === 0 
                      ? colors.warning 
                      : colors.primary
                  }
                ]}
              />
              <Text style={styles.nextMilestoneText}>
                {highestStreak % milestoneEvery === 0 
                  ? 'Milestone!' 
                  : `Next: ${nextMilestone}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
  
  const renderCompact = () => (
    <View style={[styles.container, styles.compact, style]}>
      <View style={styles.compactRow}>
        {/* Score */}
        <View style={styles.scoreContainerCompact}>
          <Icon name="star" size={14} color={colors.warning} style={styles.scoreIcon} />
          <Animated.Text 
            style={[
              styles.scoreTextCompact,
              { opacity: scoreAnim }
            ]}
          >
            {formatNumber(score ?? dailyScore)}
          </Animated.Text>
        </View>
        
        {/* Streak */}
        {showStreak && (
          <Animated.View 
            style={[
              styles.streakContainerCompact,
              { 
                transform: [{ scale: streakAnim }],
                backgroundColor: atMilestone ? colors.warning : 'white'
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={12} 
              color={atMilestone ? 'white' : colors.primary} 
            />
            <Text 
              style={[
                styles.streakTextCompact,
                atMilestone && { color: 'white' }
              ]}
            >
              {highestStreak}
            </Text>
          </Animated.View>
        )}
      </View>
      
      {/* Compact Progress Bar */}
      {showMilestoneProgress && showStreak && (
        <View style={styles.progressContainerCompact}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: highestStreak % milestoneEvery === 0 
                  ? colors.warning 
                  : colors.primary
              }
            ]}
          />
        </View>
      )}
    </View>
  );
  
  // Return the appropriate variant
  switch(variant) {
    case 'vertical':
      return renderVertical();
    case 'compact':
      return renderCompact();
    default:
      return renderHorizontal();
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  vertical: {
    padding: spacing.md,
  },
  compact: {
    padding: spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  scoreContainerVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scoreIcon: {
    marginRight: spacing.xs,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    color: colors.textPrimary,
  },
  scoreTextLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    color: colors.textPrimary,
  },
  scoreTextCompact: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    color: colors.textPrimary,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  streakContainerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  streakContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  streakText: {
    marginLeft: 4,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  streakTextLarge: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    color: colors.textPrimary,
  },
  streakTextCompact: {
    marginLeft: 2,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    color: colors.textPrimary,
  },
  streakSection: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressContainerVertical: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressContainerCompact: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  nextMilestoneText: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 10,
    color: colors.textSecondary,
  },
});

export default ScoreDisplay;