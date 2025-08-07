// src/screens/HomeScreen.tsx - Updated with timer integration and daily goals
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Easing,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import ScoreDisplay from '../components/common/ScoreDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerWidget } from '../components/Timer/TimerWidget';
import { CarryoverInfoCard } from '../components/CarryoverInfoCard';

// ✅ LIVE STATE INTEGRATION
import { useHomeIntegration } from '../hooks/useGameIntegration';
import { useLiveScore } from '../store/useLiveGameStore';
import TimerIntegrationService from '../services/TimerIntegrationService';

const { width } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type MascotType = 'happy' | 'sad' | 'excited' | 'depressed' | 'gamemode' | 'below';

interface DifficultyButton {
  level: 'easy' | 'medium' | 'hard';
  title: string;
  color: string[];
  icon: string;
  points: number;
  time: number;
}

const DIFFICULTY_BUTTONS: DifficultyButton[] = [
  {
    level: 'easy',
    title: 'Easy',
    color: ['#81C784', '#66BB6A', '#4CAF50'],
    icon: 'emoticon-happy-outline',
    points: 10,
    time: 1
  },
  {
    level: 'medium',
    title: 'Medium',
    color: ['#64B5F6', '#42A5F5', '#2196F3'],
    icon: 'emoticon-neutral-outline',
    points: 20,
    time: 2
  },
  {
    level: 'hard',
    title: 'Hard',
    color: ['#E57373', '#EF5350', '#F44336'],
    icon: 'emoticon-sad-outline',
    points: 30,
    time: 3
  }
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // ✅ LIVE STATE INTEGRATION - Replaces old state management
  const { 
    scoreData, 
    dailyGoals, 
    refreshData, 
    completedGoalsCount, 
    totalGoals,
    isInitialized 
  } = useHomeIntegration({
    onDailyGoalCompleted: async (data) => {
      console.log(`Goal completed: ${data.title} (+${data.timeBonus}s)`);
      SoundService.playStreak();
      // Update daily streak when any goal is completed
      await updateDailyStreak();
    }
  });
  
  // ✅ LIVE SCORE DATA - Real-time updates
  const { 
    dailyScore, 
    currentStreak, 
    highestStreak, 
    accuracy, 
    questionsToday,
    animatingScore, 
    animatingStreak 
  } = useLiveScore();
  
  // Keep existing local state for UI
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastPlayedDate, setLastPlayedDate] = useState<string | null>(null);
  
  const [mascotType, setMascotType] = useState<MascotType>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnims = useRef(DIFFICULTY_BUTTONS.map(() => new Animated.Value(0))).current;
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      handleRefresh();
    }, [])
  );

  // Listen for daily goal claims (non-honor goals)
  useEffect(() => {
    const eventEmitter = new (require('react-native').NativeEventEmitter)();
    const subscription = eventEmitter.addListener('dailyGoalClaimed', async (data) => {
      console.log('🎯 [HomeScreen] Daily goal claimed:', data);
      
      // Update the daily streak immediately
      await updateDailyStreakFromGoal();
      
      // Show celebration mascot
      setMascotType('excited');
      setMascotMessage(`🎉 Goal Completed! 🎉\n\n${data.goalTitle}\nYou earned ${Math.floor(data.reward / 60)} minutes!\n\nYour daily streak continues!`);
      setShowMascot(true);
      
      setTimeout(() => {
        setShowMascot(false);
      }, 5000);
    });
    
    return () => subscription.remove();
  }, []);

  // Listen for honor goal claims (no streak update)
  useEffect(() => {
    const eventEmitter = new (require('react-native').NativeEventEmitter)();
    const subscription = eventEmitter.addListener('honorGoalClaimed', async (data) => {
      console.log('🏆 [HomeScreen] Honor goal claimed:', data);
      
      // Show celebration mascot (no streak message)
      setMascotType('excited');
      setMascotMessage(`🏆 Honor Award! 🏆\n\n${data.goalTitle}\nYou earned ${Math.floor(data.reward / 60)} minutes!\n\nGreat job!`);
      setShowMascot(true);
      
      setTimeout(() => {
        setShowMascot(false);
      }, 5000);
    });
    
    return () => subscription.remove();
  }, []);

  // Listen for goal completion mascot events
  useEffect(() => {
    const eventEmitter = new (require('react-native').NativeEventEmitter)();
    const subscription = eventEmitter.addListener('showGoalCompletedMascot', (data) => {
      setMascotType('excited');
      setMascotMessage(`🎉 Goal Completed! 🎉\n\n${data.goalTitle}\nYou earned ${Math.floor(data.reward / 60)} minutes!\n\nCheck your Daily Goals for more rewards!`);
      setShowMascot(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowMascot(false);
      }, 5000);
    });
    
    return () => subscription.remove();
  }, []);
  
  useEffect(() => {
    initializeHome();
    
    // Start timer service when app loads
    const initializeTimer = async () => {
      try {
        console.log('🕐 [HomeScreen] Initializing hybrid timer system');
        await TimerIntegrationService.initialize();
        
        // Start tracking if there's time available
        await TimerIntegrationService.startTimer();
        
        console.log('✅ [HomeScreen] Hybrid timer system initialized');
      } catch (error) {
        console.error('❌ [HomeScreen] Failed to initialize hybrid timer system:', error);
      }
    };
    
    initializeTimer();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Animate difficulty buttons
    buttonAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: 100 + index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }).start();
    });
  }, []);
  
  const initializeHome = async () => {
    try {
      // Load daily streak data (keep existing logic)
      const streak = await loadDailyStreak();
      setDailyStreak(streak.streak);
      setLastPlayedDate(streak.lastDate);
      
      SoundService.startMenuMusic();
      
      // ✅ Live state automatically initializes and loads
      
    } catch (error) {
      console.error('Failed to initialize home:', error);
    }
  };
  
  // ✅ UPDATED REFRESH FUNCTION - Uses live state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(); // Live state refresh
      const streak = await loadDailyStreak();
      setDailyStreak(streak.streak);
      setLastPlayedDate(streak.lastDate);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
    setIsRefreshing(false);
  };

  const updateDailyStreak = async () => {
    try {
      const today = new Date().toDateString();
      
      // Check if any non-honor daily goal has been claimed today
      const goalsData = await AsyncStorage.getItem('@BrainBites:liveGameStore:claimedRewards');
      const claimedRewards = goalsData ? JSON.parse(goalsData) : {};
      
      // Get current goals to check which ones are honor-based
      const currentGoalsData = await AsyncStorage.getItem('@BrainBites:dailyGoals');
      const currentGoals = currentGoalsData ? JSON.parse(currentGoalsData) : [];
      
      // Filter out honor-based goals from claimed rewards
      const honorGoalIds = currentGoals
        .filter((goal: any) => goal.honorBased)
        .map((goal: any) => goal.id);
      
      const nonHonorClaimedToday = Object.entries(claimedRewards).some(([goalId, date]: [string, any]) => {
        const isHonorGoal = honorGoalIds.includes(goalId);
        const isToday = new Date(date).toDateString() === today;
        return !isHonorGoal && isToday;
      });
      
      // Also check if user played quiz today
      const hasPlayedQuiz = lastPlayedDate === today;
      
      // Get the last activity date (either quiz or non-honor goal claim)
      // We need to check if the lastGoalClaimedDate was from a non-honor goal
      const lastGoalClaimedDate = await AsyncStorage.getItem('@BrainBites:lastGoalClaimedDate');
      const lastClaimedRewardsData = await AsyncStorage.getItem('@BrainBites:liveGameStore:claimedRewards') || '{}';
      const lastClaimedRewards = JSON.parse(lastClaimedRewardsData);
      
      // Find the most recent non-honor goal claim date
      let lastNonHonorClaimDate = null;
      if (lastClaimedRewards && Object.keys(lastClaimedRewards).length > 0) {
        const nonHonorClaims = Object.entries(lastClaimedRewards)
          .filter(([goalId]) => !honorGoalIds.includes(goalId))
          .map(([, date]) => new Date(date).toDateString());
        
        if (nonHonorClaims.length > 0) {
          lastNonHonorClaimDate = nonHonorClaims.sort().reverse()[0];
        }
      }
      
      const lastActivityDate = lastNonHonorClaimDate || lastPlayedDate;
      
      if (nonHonorClaimedToday || hasPlayedQuiz) {
        let newStreak = 1;
        
        if (lastActivityDate) {
          const lastDate = new Date(lastActivityDate);
          const todayDate = new Date(today);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            // Same day - keep current streak
            newStreak = dailyStreak || 1;
          } else if (diffDays === 1) {
            // Consecutive day - increment streak
            newStreak = (dailyStreak || 0) + 1;
          }
          // If diffDays > 1, streak resets to 1
        }
        
        await AsyncStorage.setItem('@BrainBites:dailyStreak', newStreak.toString());
        await AsyncStorage.setItem('@BrainBites:lastStreakUpdateDate', today);
        
        setDailyStreak(newStreak);
        
        console.log(`🔥 Daily streak updated: ${newStreak} days (nonHonorClaimedToday: ${nonHonorClaimedToday}, hasPlayedQuiz: ${hasPlayedQuiz})`);
      }
    } catch (error) {
      console.error('Error updating daily streak:', error);
    }
  };

  // Add this helper function
  const updateDailyStreakFromGoal = async () => {
    await updateDailyStreak();
  };
  
  const loadDailyStreak = async () => {
    try {
      const savedStreak = await AsyncStorage.getItem('@BrainBites:dailyStreak');
      const lastStreakUpdate = await AsyncStorage.getItem('@BrainBites:lastStreakUpdateDate');
      
      const today = new Date().toDateString();
      const currentStreak = parseInt(savedStreak || '0', 10);
      
      if (!lastStreakUpdate) {
        return { streak: 0, lastDate: null };
      }
      
      const lastDate = new Date(lastStreakUpdate);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day - keep streak
        return { streak: currentStreak, lastDate: lastStreakUpdate };
      } else if (diffDays === 1) {
        // Yesterday - streak continues if they complete something today
        return { streak: currentStreak, lastDate: lastStreakUpdate };
      } else {
        // More than 1 day - streak broken
        return { streak: 0, lastDate: null };
      }
    } catch (error) {
      console.error('Error loading daily streak:', error);
      return { streak: 0, lastDate: null };
    }
  };
  
  const handleDifficultyPress = (difficulty: 'easy' | 'medium' | 'hard') => {
    SoundService.playButtonPress();
    navigation.navigate('Quiz', { difficulty });
  };
  
  const handleCategoriesPress = () => {
    SoundService.playButtonPress();
    navigation.navigate('Categories');
  };
  
  const handleLeaderboardPress = () => {
    SoundService.playButtonPress();
    navigation.navigate('Leaderboard');
  };
  
  const handleDailyGoalsPress = () => {
    SoundService.playButtonPress();
    navigation.navigate('DailyGoals');
  };
  
  const handlePeekingMascotPress = () => {
    let message = '';
    
    if (highestStreak >= 5) {
      message = `🔥 Amazing Streak! 🔥\n\nYour best streak today: ${highestStreak} questions!\nKeep it up, you're unstoppable!`;
      setMascotType('excited');
    } else if (questionsToday >= 10) {
      message = `🎯 Great Progress! 🎯\n\nYou've answered ${questionsToday} questions today!\nAccuracy: ${accuracy}%`;
      setMascotType('happy');
    } else if (dailyScore > 0) {
      message = `💪 Keep Going! 💪\n\nDaily Score: ${dailyScore.toLocaleString()}\nQuestions: ${questionsToday}\n\nYou're doing great!`;
      setMascotType('gamemode');
    } else {
      message = `🧠 Ready to Start? 🧠\n\nLet's boost your brain power!\nChoose a difficulty and begin!`;
      setMascotType('happy');
    }
    
    setMascotMessage(message);
    setShowMascot(true);
  };
  
  const renderStreakFlow = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date().getDay();
    const mondayFirst = [(today + 6) % 7]; // Convert to Monday-first
    
    // Check if any daily goal has been completed (claimed) today
    const checkTodayCompletion = async () => {
      const todayString = new Date().toDateString();
      
      // Check claimed goals (excluding honor goals)
      const goalsData = await AsyncStorage.getItem('@BrainBites:liveGameStore:claimedRewards');
      const claimedRewards = goalsData ? JSON.parse(goalsData) : {};
      
      // Get current goals to check which ones are honor-based
      const currentGoalsData = await AsyncStorage.getItem('@BrainBites:dailyGoals');
      const currentGoals = currentGoalsData ? JSON.parse(currentGoalsData) : [];
      
      // Filter out honor-based goals
      const honorGoalIds = currentGoals
        .filter((goal: any) => goal.honorBased)
        .map((goal: any) => goal.id);
      
      const hasNonHonorClaimToday = Object.entries(claimedRewards).some(([goalId, date]: [string, any]) => {
        const isHonorGoal = honorGoalIds.includes(goalId);
        const isToday = new Date(date).toDateString() === todayString;
        return !isHonorGoal && isToday;
      });
      
      // Check quiz play
      const hasPlayedToday = lastPlayedDate === todayString;
      
      return hasNonHonorClaimToday || hasPlayedToday;
    };
    
    const [hasCompletedToday, setHasCompletedToday] = useState(false);
    
    useEffect(() => {
      checkTodayCompletion().then(setHasCompletedToday);
    }, [dailyGoals, lastPlayedDate]);
    
    return (
      <View style={styles.streakContainer}>
        <View style={styles.streakHeader}>
          <Icon name="fire" size={24} color="#FF9F1C" />
          <Text style={styles.streakTitle}>Daily Streak</Text>
          <Text style={styles.streakCount}>{dailyStreak} days</Text>
        </View>
        <View style={styles.streakDays}>
          {days.map((day, index) => {
            const isToday = index === mondayFirst[0];
            const isCompleted = hasCompletedToday && isToday;
            const isPast = index < mondayFirst[0] && dailyStreak > (mondayFirst[0] - index);
            
            return (
              <View key={index} style={styles.streakDayContainer}>
                <Text style={styles.streakDayLabel}>{day}</Text>
                <View style={[
                  styles.streakDay,
                  isCompleted && styles.streakDayCompleted,
                  isToday && styles.streakDayToday,
                  isPast && styles.streakDayPast
                ]}>
                  {isCompleted && <Icon name="check" size={16} color="white" />}
                </View>
              </View>
            );
          })}
        </View>
        {hasCompletedToday && (
          <Text style={styles.streakMessage}>🎉 You did it today!</Text>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>Brain Bites</Text>
          <View style={styles.headerRight}>
            <ScoreDisplay score={dailyScore} />
            <TouchableOpacity 
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
            >
              <Icon name="cog-outline" size={28} color="#666" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Timer Widget */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <TimerWidget onEarnMorePress={handleDifficultyPress.bind(null, 'easy')} />
        </Animated.View>
        
        {/* Carryover Info Card */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <CarryoverInfoCard />
        </Animated.View>
        
        {/* Streak Flow */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {renderStreakFlow()}
        </Animated.View>
        
        {/* Difficulty Buttons */}
        <View style={styles.difficultySection}>
          <Text style={styles.sectionTitle}>Choose Difficulty</Text>
          <View style={styles.difficultyButtons}>
            {DIFFICULTY_BUTTONS.map((difficulty, index) => (
              <Animated.View
                key={difficulty.level}
                style={{
                  transform: [
                    {
                      translateY: buttonAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0]
                      })
                    },
                    {
                      scale: buttonAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ],
                  opacity: buttonAnims[index]
                }}
              >
                <TouchableOpacity
                  onPress={() => handleDifficultyPress(difficulty.level)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={difficulty.color}
                    style={styles.difficultyButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name={difficulty.icon} size={40} color="white" />
                    <Text style={styles.difficultyTitle}>{difficulty.title}</Text>
                    <View style={styles.difficultyInfo}>
                      <View style={styles.infoItem}>
                        <Icon name="star" size={14} color="white" />
                        <Text style={styles.infoText}>+{difficulty.points}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Icon name="clock-outline" size={14} color="white" />
                        <Text style={styles.infoText}>+{difficulty.time}m</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
        
        {/* Categories Button */}
        <TouchableOpacity 
          style={styles.categoriesButton}
          onPress={handleCategoriesPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD54F', '#FFB300', '#FF6F00']}
            style={styles.categoriesGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="folder-multiple-outline" size={24} color="white" />
            <Text style={styles.categoriesText}>Browse Categories</Text>
            <Icon name="chevron-right" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDailyGoalsPress}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
              <Icon name="target" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Daily Goals</Text>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLeaderboardPress}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FF9F1C' }]}>
              <Icon name="trophy-outline" size={24} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Leaderboard</Text>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        {/* Today's Stats */}
        <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
          <Text style={styles.statsTitle}>Today's Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="help-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{questionsToday || 0}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="percent" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{Math.round(accuracy || 0)}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="star" size={24} color="#FF9F1C" />
              <Text style={styles.statValue}>{dailyScore || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      
      <EnhancedMascotDisplay
        type={mascotType}
        position="left"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={() => setShowMascot(false)}
        autoHide={true}
        fullScreen={true}
        onPeekingPress={handlePeekingMascotPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  streakContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...theme.shadows.medium,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  streakCount: {
    fontSize: 16,
    color: '#FF9F1C',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  streakDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakDayContainer: {
    alignItems: 'center',
  },
  streakDayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  streakDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  streakDayCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  streakDayToday: {
    borderColor: '#FF9F1C',
    borderWidth: 2,
  },
  streakDayPast: {
    backgroundColor: '#81C784',
    borderColor: '#81C784',
  },
  streakMessage: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  difficultySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    width: (width - 48) / 3,
    height: 140,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.medium,
  },
  difficultyTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  difficultyInfo: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  infoText: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  categoriesButton: {
    marginBottom: 24,
  },
  categoriesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    ...theme.shadows.medium,
  },
  categoriesText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  quickActions: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...theme.shadows.small,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...theme.shadows.medium,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
});

export default HomeScreen;