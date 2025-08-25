import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../styles/theme';
import { useLiveScore } from '../store/useLiveGameStore';
import { useQuizStore } from '../store/useQuizStore';
import HybridTimerService from '../services/HybridTimerService';

export const ScoreInsightsCard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [timerData, setTimerData] = useState<{
    remainingTime: number;
    overtime: number;
    todayScreenTime: number;
  } | null>(null);

  // Get live score data
  const { 
    dailyScore, 
    currentStreak, 
    highestStreak, 
    accuracy, 
    questionsToday,
    totalScore 
  } = useLiveScore();
  
  // Get daily highest streak
  const { dailyHighestStreak } = useQuizStore();

  // Load timer data - same approach as TimerWidget
  useEffect(() => {
    console.log('🕐 [ScoreInsightsCard] Initializing timer data connection...');
    
    let updateInterval: NodeJS.Timeout;
    let isMounted = true;
    
    const initializeTimer = async () => {
      try {
        // Use HybridTimerService for initial setup
        await HybridTimerService.initialize();
        
        // Listen for timer updates from HybridTimerService
        const unsubscribe = HybridTimerService.addListener((data: any) => {
          if (isMounted) {
            console.log('🕐 [ScoreInsightsCard] HybridTimer update received:', data);
            setTimerData({
              remainingTime: data.remainingTime || 0,
              overtime: data.overtime || 0,
              todayScreenTime: data.todayScreenTime || 0
            });
          }
        });
        
        // Also set up direct polling as backup - same as TimerWidget
        const { ScreenTimeModule } = NativeModules;
        
        if (ScreenTimeModule) {
          const pollTimerStatus = async () => {
            if (!isMounted) return;
            
            try {
              // Get remaining time, overtime, and today's screen time separately
              const [remainingTime, todayScreenTime, currentState] = await Promise.all([
                ScreenTimeModule.getRemainingTime?.() || Promise.resolve(0),
                ScreenTimeModule.getTodayScreenTime?.() || Promise.resolve(0),
                HybridTimerService.getCurrentState?.() || Promise.resolve({ overtime: 0 })
              ]);
              
              if (isMounted) {
                const timerState = HybridTimerService.getCurrentState();
                const newTimerData = {
                  remainingTime: remainingTime || 0,
                  overtime: timerState?.overtime || 0,
                  todayScreenTime: todayScreenTime || 0
                };
                
                console.log('📊 [ScoreInsightsCard] Direct polling update:', newTimerData);
                setTimerData(newTimerData);
              }
            } catch (err) {
              console.warn('⚠️ [ScoreInsightsCard] Polling fallback failed:', err);
              // Don't set error if HybridTimerService is working
            }
          };
          
          // Initial poll
          await pollTimerStatus();
          
          // Set up polling every 5 seconds - same as TimerWidget
          updateInterval = setInterval(pollTimerStatus, 5000);
        } else {
          // If no native module, just rely on HybridTimerService
          console.log('ℹ️ [ScoreInsightsCard] No ScreenTimeModule, using HybridTimerService only');
        }
        
        // Return cleanup function
        return () => {
          isMounted = false;
          unsubscribe();
          if (updateInterval) {
            clearInterval(updateInterval);
          }
        };
        
      } catch (error) {
        console.error('❌ [ScoreInsightsCard] Failed to initialize timer:', error);
        // Fallback for testing
        if (isMounted) {
          setTimerData({
            remainingTime: 0,
            overtime: 0,
            todayScreenTime: 0
          });
        }
      }
    };
    
    initializeTimer();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  // Calculate time impact on tomorrow's score
  const getScoreImpactData = () => {
    console.log('🧮 [ScoreInsightsCard] Calculating score impact with timer data:', timerData);
    
    if (!timerData) return { netScore: 0, netTimeMinutes: 0, isPositive: false, message: '🤖 CaBBy is loading your time data...' };
    
    const remainingMinutes = Math.floor(timerData.remainingTime / 60);
    const overtimeMinutes = Math.floor(timerData.overtime / 60);
    
    console.log('⏰ [ScoreInsightsCard] Time breakdown:', { remainingMinutes, overtimeMinutes });
    
    // Score calculation: +10 points per remaining minute, -5 points per overtime minute
    const remainingScore = remainingMinutes * 10;
    const overtimePenalty = overtimeMinutes * 5;
    const netScore = remainingScore - overtimePenalty;
    const netTimeMinutes = remainingMinutes - overtimeMinutes;
    const isPositive = netScore >= 0;
    
    let message = '';
    if (remainingMinutes > 0 && overtimeMinutes > 0) {
      message = isPositive 
        ? `🎉 Nice balance! You're getting bonus points tomorrow!`
        : `⚖️ You went a bit over time, but that's okay - every minute counts!`;
    } else if (overtimeMinutes > 0) {
      message = `⏳ You've been using overtime - let's earn some time back with quizzes!`;
    } else if (remainingMinutes > 0) {
      message = `🌟 Awesome! Your time savings are earning you bonus points!`;
    } else {
      message = '🕐 Start your timer journey - every minute counts toward tomorrow!';
    }
    
    return { 
      netScore, 
      netTimeMinutes, 
      isPositive, 
      message, 
      remainingMinutes, 
      overtimeMinutes, 
      remainingScore, 
      overtimePenalty 
    };
  };

  const scoreImpact = getScoreImpactData();

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 300],
  });

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.wrapper, { height: heightInterpolate }]}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.8}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={[styles.iconContainer, { backgroundColor: scoreImpact.isPositive ? colors.success : colors.error }]}>
                <Icon name={scoreImpact.isPositive ? 'trending-up' : 'trending-down'} size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>Tomorrow's Bonus</Text>
                <Text style={styles.subtitle}>
                  {scoreImpact.netScore > 0 ? `+${scoreImpact.netScore}` : scoreImpact.netScore === 0 ? 'Ready to start!' : `${scoreImpact.netScore}`} points
                </Text>
              </View>
            </View>
            <View style={styles.summaryContainer}>
              <Text style={[styles.quickStat, { color: scoreImpact.isPositive ? colors.success : colors.error }]}>
                {scoreImpact.netTimeMinutes > 0 ? '+' : ''}{scoreImpact.netTimeMinutes}m
              </Text>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Icon name="chevron-down" size={24} color={colors.textPrimary} />
              </Animated.View>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Show breakdown when both time saved and overtime exist */}
            {scoreImpact.remainingMinutes > 0 && scoreImpact.overtimeMinutes > 0 ? (
              <>
                <View style={styles.row}>
                  <Icon name="clock-check" size={20} color={colors.success} />
                  <Text style={styles.label}>Time in the bank:</Text>
                  <Text style={[styles.value, styles.positive]}>+{scoreImpact.remainingMinutes} min</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.label}>Overtime adventures:</Text>
                  <Text style={[styles.value, styles.negative]}>{scoreImpact.overtimeMinutes} min</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="plus-circle" size={20} color={colors.success} />
                  <Text style={styles.label}>Savings reward:</Text>
                  <Text style={[styles.value, styles.positive]}>+{scoreImpact.remainingScore} pts</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="minus-circle" size={20} color={colors.error} />
                  <Text style={styles.label}>Overtime cost:</Text>
                  <Text style={[styles.value, styles.negative]}>-{scoreImpact.overtimePenalty} pts</Text>
                </View>
                <View style={[styles.row, styles.totalRow]}>
                  <Icon name="calculator" size={20} color={scoreImpact.isPositive ? colors.success : colors.error} />
                  <Text style={[styles.label, styles.totalLabel]}>Tomorrow you get:</Text>
                  <Text style={[styles.value, styles.totalValue, scoreImpact.isPositive ? styles.positive : styles.negative]}>
                    {scoreImpact.isPositive ? '+' : ''}{scoreImpact.netScore} pts
                  </Text>
                </View>
                <Text style={styles.explanation}>
                  {scoreImpact.isPositive ? 
                    '🎉 You\'re winning the time game! Those savings really add up!' :
                    '🤗 You went over a bit, but hey - every minute of learning counts!'
                  }
                </Text>
              </>
            ) : scoreImpact.overtimeMinutes > 0 ? (
              <>
                <View style={styles.row}>
                  <Icon name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.label}>Overtime used:</Text>
                  <Text style={[styles.value, styles.negative]}>{scoreImpact.overtimeMinutes} minutes</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="minus-circle" size={20} color={colors.error} />
                  <Text style={styles.label}>Tomorrow's adjustment:</Text>
                  <Text style={[styles.value, styles.negative]}>-{scoreImpact.overtimePenalty} points</Text>
                </View>
                <Text style={styles.explanation}>
                  ⏳ No worries! Play some quizzes to earn time back and flip this around!
                </Text>
              </>
            ) : scoreImpact.remainingMinutes > 0 ? (
              <>
                <View style={styles.row}>
                  <Icon name="clock-check" size={20} color={colors.success} />
                  <Text style={styles.label}>Time you've saved:</Text>
                  <Text style={[styles.value, styles.positive]}>{scoreImpact.remainingMinutes} minutes</Text>
                </View>
                <View style={styles.row}>
                  <Icon name="plus-circle" size={20} color={colors.success} />
                  <Text style={styles.label}>Tomorrow's bonus:</Text>
                  <Text style={[styles.value, styles.positive]}>+{scoreImpact.remainingScore} points</Text>
                </View>
                <Text style={styles.explanation}>
                  🌟 Amazing time management! Tomorrow starts with a head start!
                </Text>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <Icon name="rocket-launch" size={20} color={colors.primary} />
                  <Text style={styles.label}>Ready to begin:</Text>
                  <Text style={styles.value}>Your time journey!</Text>
                </View>
                <Text style={styles.explanation}>
                  🚀 Start your timer and play quizzes! Save time = bonus points, overtime = small penalty. You've got this!
                </Text>
              </>
            )}

            {/* Additional Tips */}
            <View style={styles.tipSection}>
              <Icon name="lightbulb" size={16} color="#FFB300" />
              <Text style={styles.tipText}>
                💡 Pro tip: Save time = +10 points per minute tomorrow! Use overtime = -5 points per minute. Balance is key! 🎯
              </Text>
            </View>
          </ScrollView>
        )}
      </LinearGradient>
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
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStat: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollContainer: {
    flex: 1,
    maxHeight: 200,
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
  tipSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});