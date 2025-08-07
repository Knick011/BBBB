// src/components/Live/AnimatedScore.tsx
// ✅ ANIMATED SCORE COMPONENTS - Live number animations
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { useLiveScore } from '../../store/useLiveGameStore';

interface AnimatedNumberProps {
  value: number;
  style?: any;
  prefix?: string;
  suffix?: string;
  animationDuration?: number;
  formatNumber?: (num: number) => string;
}

// ==================== ANIMATED NUMBER COMPONENT ====================

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  style,
  prefix = '',
  suffix = '',
  animationDuration = 800,
  formatNumber = (num) => num.toLocaleString()
}) => {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const displayValue = useRef(value);
  const textRef = useRef<Text>(null);
  
  useEffect(() => {
    const listener = animatedValue.addListener(({ value: animValue }) => {
      displayValue.current = Math.round(animValue);
      if (textRef.current) {
        textRef.current.setNativeProps({
          text: prefix + formatNumber(displayValue.current) + suffix
        });
      }
    });
    
    Animated.timing(animatedValue, {
      toValue: value,
      duration: animationDuration,
      useNativeDriver: false,
    }).start();
    
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, animationDuration, prefix, suffix, formatNumber]);
  
  return (
    <Text ref={textRef} style={style}>
      {prefix + formatNumber(value) + suffix}
    </Text>
  );
};

// ==================== LIVE SCORE DISPLAY ====================

interface LiveScoreDisplayProps {
  showStreak?: boolean;
  showAccuracy?: boolean;
  layout?: 'horizontal' | 'vertical' | 'compact';
  style?: any;
  scoreStyle?: any;
  streakStyle?: any;
  accuracyStyle?: any;
}

export const LiveScoreDisplay: React.FC<LiveScoreDisplayProps> = ({
  showStreak = true,
  showAccuracy = false,
  layout = 'horizontal',
  style,
  scoreStyle,
  streakStyle,
  accuracyStyle
}) => {
  const { dailyScore, currentStreak, highestStreak, accuracy, animatingScore, animatingStreak } = useLiveScore();
  
  const scoreGlowAnim = useRef(new Animated.Value(0)).current;
  const streakGlowAnim = useRef(new Animated.Value(0)).current;
  const scoreScaleAnim = useRef(new Animated.Value(1)).current;
  const streakScaleAnim = useRef(new Animated.Value(1)).current;
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      activeAnimations.current.forEach(anim => anim.stop());
      activeAnimations.current = [];
    };
  }, []);
  
  // Score animation effects
  useEffect(() => {
    if (animatingScore) {
      // Glow effect
      const glowAnimation = Animated.sequence([
        Animated.timing(scoreGlowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(scoreGlowAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        })
      ]);
      
      // Scale effect
      const scaleAnimation = Animated.sequence([
        Animated.timing(scoreScaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scoreScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]);

      // Track and start animations
      activeAnimations.current.push(glowAnimation, scaleAnimation);
      glowAnimation.start();
      scaleAnimation.start();
    }
  }, [animatingScore, scoreGlowAnim, scoreScaleAnim]);
  
  // Streak animation effects
  useEffect(() => {
    if (animatingStreak) {
      // Glow effect
      const glowAnimation = Animated.sequence([
        Animated.timing(streakGlowAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(streakGlowAnim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: false,
        })
      ]);
      
      // Scale effect
      const scaleAnimation = Animated.sequence([
        Animated.timing(streakScaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(streakScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]);

      // Track and start animations
      activeAnimations.current.push(glowAnimation, scaleAnimation);
      glowAnimation.start();
      scaleAnimation.start();
    }
  }, [animatingStreak, streakGlowAnim, streakScaleAnim]);
  
  const scoreGlowColor = scoreGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(76, 175, 80, 0)', 'rgba(76, 175, 80, 0.3)']
  });
  
  const streakGlowColor = streakGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 159, 28, 0)', 'rgba(255, 159, 28, 0.4)']
  });
  
  const containerStyle = [
    styles.container,
    layout === 'vertical' && styles.vertical,
    layout === 'compact' && styles.compact,
    style
  ];
  
  return (
    <View style={containerStyle}>
      {/* Score */}
      <Animated.View style={[
        styles.scoreContainer,
        { 
          backgroundColor: scoreGlowColor,
          transform: [{ scale: scoreScaleAnim }]
        }
      ]}>
        <View style={styles.scoreContent}>
          <Text style={styles.scoreIcon}>🎯</Text>
          <AnimatedNumber
            value={dailyScore}
            style={[styles.scoreText, scoreStyle]}
            animationDuration={600}
          />
        </View>
        <Text style={styles.scoreLabel}>Score</Text>
      </Animated.View>
      
      {/* Streak */}
      {showStreak && (
        <Animated.View style={[
          styles.streakContainer,
          {
            backgroundColor: streakGlowColor,
            transform: [{ scale: streakScaleAnim }]
          }
        ]}>
          <View style={styles.streakContent}>
            <Text style={styles.streakIcon}>🔥</Text>
            <AnimatedNumber
              value={highestStreak}
              style={[styles.streakText, streakStyle]}
              animationDuration={400}
            />
          </View>
          <Text style={styles.streakLabel}>Best Streak</Text>
        </Animated.View>
      )}
      
      {/* Accuracy */}
      {showAccuracy && (
        <View style={styles.accuracyContainer}>
          <AnimatedNumber
            value={accuracy}
            style={[styles.accuracyText, accuracyStyle]}
            suffix="%"
            animationDuration={500}
          />
          <Text style={styles.accuracyLabel}>Accuracy</Text>
        </View>
      )}
    </View>
  );
};

// ==================== LIVE DAILY GOALS PROGRESS ====================

interface LiveGoalProgressProps {
  goalId: string;
  title: string;
  current: number;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: number;
  color: string;
  icon: string;
  isAnimating?: boolean;
  onClaim?: () => void;
}

export const LiveGoalProgress: React.FC<LiveGoalProgressProps> = ({
  goalId,
  title,
  current,
  target,
  progress,
  completed,
  claimed,
  reward,
  color,
  icon,
  isAnimating = false,
  onClaim
}) => {
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      activeAnimations.current.forEach(anim => anim.stop());
      activeAnimations.current = [];
    };
  }, []);
  
  // Progress bar animation
  useEffect(() => {
    const progressAnimation = Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    });
    
    activeAnimations.current.push(progressAnimation);
    progressAnimation.start();
  }, [progress, progressAnim]);
  
  // Completion animation
  useEffect(() => {
    if (isAnimating && completed && !claimed) {
      // Glow effect
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          })
        ]),
        { iterations: 3 }
      );
      
      // Scale effect
      const scaleAnimation = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]);
      
      // Shake effect for claim button
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ]),
        { iterations: 2 }
      );

      // Track and start animations
      activeAnimations.current.push(glowAnimation, scaleAnimation, shakeAnimation);
      glowAnimation.start();
      scaleAnimation.start();
      shakeAnimation.start();
    }
  }, [isAnimating, completed, claimed, glowAnim, scaleAnim, shakeAnim]);
  
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp'
  });
  
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${color}00`, `${color}40`]
  });
  
  return (
    <Animated.View style={[
      styles.goalContainer,
      {
        backgroundColor: glowColor,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalIcon}>{icon}</Text>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{title}</Text>
          <View style={styles.goalStats}>
            <AnimatedNumber
              value={current}
              style={styles.goalCurrent}
              suffix={` / ${target}`}
              animationDuration={400}
            />
            <Text style={styles.goalReward}>+{reward}s</Text>
          </View>
        </View>
        
        {completed && !claimed && (
          <Animated.View style={[
            styles.claimButton,
            { transform: [{ translateX: shakeAnim }] }
          ]}>
            <Text 
              style={styles.claimButtonText}
              onPress={onClaim}
            >
              CLAIM
            </Text>
          </Animated.View>
        )}
        
        {claimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>✓</Text>
          </View>
        )}
      </View>
      
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            { 
              width: progressWidth,
              backgroundColor: color
            }
          ]} 
        />
      </View>
    </Animated.View>
  );
};

// ==================== UPDATED HOME SCREEN INTEGRATION ====================

export const LiveHomeScoreCard: React.FC = () => {
  const { scoreData, dailyGoals, completedGoalsCount, totalGoals } = useHomeIntegration();
  
  return (
    <View style={styles.homeScoreCard}>
      <LiveScoreDisplay
        showStreak={true}
        showAccuracy={true}
        layout="horizontal"
        style={styles.homeScoreDisplay}
      />
      
      <View style={styles.goalsPreview}>
        <Text style={styles.goalsPreviewTitle}>Daily Goals</Text>
        <Text style={styles.goalsPreviewText}>
          {completedGoalsCount} / {totalGoals} completed
        </Text>
        <View style={styles.goalsPreviewBar}>
          <View 
            style={[
              styles.goalsPreviewFill,
              { width: `${(completedGoalsCount / totalGoals) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

// ==================== UPDATED DAILY GOALS SCREEN INTEGRATION ====================

export const LiveDailyGoalsList: React.FC = () => {
  const { 
    dailyGoals, 
    animatingGoals, 
    handleClaimReward, 
    completedCount, 
    totalRewards 
  } = useDailyGoalsIntegration();
  
  return (
    <View style={styles.goalsListContainer}>
      <View style={styles.goalsSummary}>
        <Text style={styles.goalsSummaryTitle}>Progress Today</Text>
        <Text style={styles.goalsSummaryText}>
          {completedCount} goals completed • {Math.round(totalRewards / 60)}m earned
        </Text>
      </View>
      
      {dailyGoals.map((goal) => (
        <LiveGoalProgress
          key={goal.id}
          goalId={goal.id}
          title={goal.title}
          current={goal.current}
          target={goal.target}
          progress={goal.progress}
          completed={goal.completed}
          claimed={goal.claimed}
          reward={goal.reward}
          color={goal.color}
          icon={goal.icon}
          isAnimating={animatingGoals.includes(goal.id)}
          onClaim={() => handleClaimReward(goal.id)}
        />
      ))}
    </View>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
  },
  vertical: {
    flexDirection: 'column',
  },
  compact: {
    padding: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  streakContainer: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  streakText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9F1C',
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  accuracyContainer: {
    alignItems: 'center',
    padding: 12,
  },
  accuracyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  accuracyLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  goalContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  goalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  goalCurrent: {
    fontSize: 14,
    color: '#666',
  },
  goalReward: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  claimedBadge: {
    backgroundColor: '#E8F5E8',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  homeScoreCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  homeScoreDisplay: {
    marginBottom: 20,
  },
  goalsPreview: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  goalsPreviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  goalsPreviewText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  goalsPreviewBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalsPreviewFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  goalsListContainer: {
    flex: 1,
  },
  goalsSummary: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goalsSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  goalsSummaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default LiveScoreDisplay;