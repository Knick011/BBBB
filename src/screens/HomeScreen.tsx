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
import AudioManager from '../services/AudioManager';
import StreakMusicService from '../services/StreakMusicService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import TestUpdates from '../utils/TestUpdates';
import DebugLogger from '../utils/DebugLogger';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import ScoreDisplay from '../components/common/ScoreDisplay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerWidget } from '../components/Timer/TimerWidget';
import { ScoreInsightsCard } from '../components/ScoreInsightsCard';
import BannerAdComponent from '../components/common/BannerAdComponent';
import WalkthroughOverlay from '../components/common/WalkthroughOverlay';
import { useWalkthrough } from '../hooks/useWalkthrough';
import analytics from '@react-native-firebase/analytics';

// ✅ LIVE STATE INTEGRATION
import { useHomeIntegration } from '../hooks/useGameIntegration';
import { useLiveScore } from '../store/useLiveGameStore';
import { useQuizStore } from '../store/useQuizStore';
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
  const scrollViewRef = useRef<ScrollView>(null);
  
  // ✅ WALKTHROUGH INTEGRATION
  const walkthrough = useWalkthrough({
    screen: 'home',
    enabled: true,
    scrollViewRef: scrollViewRef,
    onComplete: () => {
      console.log('🎉 [HomeScreen] Walkthrough completed!');
      // Could trigger a celebration or show a completion message
    },
    onSkip: () => {
      console.log('⏭️ [HomeScreen] Walkthrough skipped');
    },
  });
  
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
    highestStreak: highestStreakLive, 
    accuracy, 
    questionsToday,
    animatingScore, 
    animatingStreak 
  } = useLiveScore();
  
  // Get the daily highest streak from quiz store
  const { dailyHighestStreak } = useQuizStore();
  
  // Keep existing local state for UI
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastPlayedDate, setLastPlayedDate] = useState<string | null>(null);
  
  // State to track if today is completed for streak flow
  const [todayCompleted, setTodayCompleted] = useState(false);
  
  // State to track streak history for the week (last 7 days) - true = completed, false = missed
  const [weekHistory, setWeekHistory] = useState<boolean[]>([false, false, false, false, false, false, false]);
  // In the HomeScreen component, update the useEffect that loads stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load the daily highest streak from the store
        await useQuizStore.getState().loadDailyHighest();
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    
    loadStats();
  }, []);

  // New state for consecutive daily flow tracking
  const [consecutiveFlowDays, setConsecutiveFlowDays] = useState(0);
  const [showFlowCelebration, setShowFlowCelebration] = useState(false);

  // Load Daily Flow data using DailyGoalsService streak
  useEffect(() => {
    const loadDailyFlowData = async () => {
      try {
        console.log('🌊 [HomeScreen] Loading Daily Flow data...');
        
        // Log screen view for Firebase Analytics
        await analytics().logScreenView({
          screen_name: 'HomeScreen',
          screen_class: 'HomeScreen',
        });
        
        // Log user engagement
        await DebugLogger.logCustomEvent('home_screen_opened', {
          timestamp: new Date().toISOString(),
          session_start: true,
        });
        
        // Reconcile streak before reading to avoid showing stale value after missed days
        try { (await import('../services/DailyGoalsService')).default.reconcileDayStreak(); } catch {}
        const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
        const currentStreak = streakData ? parseInt(streakData, 10) : 0;
        
        setConsecutiveFlowDays(currentStreak);
        setDailyStreak(currentStreak); // Keep legacy state in sync
        
        // Update music speed based on streak
        await StreakMusicService.updateStreak(currentStreak);
        
        // Log user activity with streak data
        await analytics().logEvent('home_screen_engagement', {
          engagement_time_msec: 5000,
          screen: 'home',
          current_streak: currentStreak,
          user_active: true,
        });
        
        console.log(`✅ [HomeScreen] Daily Flow streak loaded: ${currentStreak} days`);
        DebugLogger.log('HOME_SCREEN', 'Screen loaded with analytics tracking', { currentStreak });
        
      } catch (error) {
        console.error('❌ [HomeScreen] Error loading Daily Flow data:', error);
        DebugLogger.log('HOME_ERROR', 'Failed to load Daily Flow data', error);
      }
    };
    
    loadDailyFlowData();
    
    // Start streak-music monitoring
    StreakMusicService.startMonitoring().then(() => {
      console.log('✅ [HomeScreen] StreakMusicService started successfully');
      
      // Log system status for debugging
      TestUpdates.logSystemStatus();
      
      // Test the system after a short delay
      setTimeout(() => {
        TestUpdates.testStreakService();
      }, 3000);
      
    }).catch((error) => {
      console.error('❌ [HomeScreen] Failed to start StreakMusicService:', error);
    });
    
    // Listen for daily goal completion events
    const handleGoalCompletion = async () => {
      try {
        console.log('🎯 [HomeScreen] Goal completion event received');
        
        // Reconcile and reload streak data
        try { (await import('../services/DailyGoalsService')).default.reconcileDayStreak(); } catch {}
        const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
        const currentStreak = streakData ? parseInt(streakData, 10) : 0;
        
        setConsecutiveFlowDays(currentStreak);
        setDailyStreak(currentStreak);
        
        // Update music speed for new streak
        await StreakMusicService.updateStreak(currentStreak);
        
        // Show celebration if new streak
        if (currentStreak > 0) {
          setShowFlowCelebration(true);
          setTimeout(() => setShowFlowCelebration(false), 3000);
        }
        
        console.log(`✅ [HomeScreen] Flow data updated: ${currentStreak} days`);
      } catch (error) {
        console.error('❌ [HomeScreen] Error handling goal completion:', error);
      }
    };
    
    const { DeviceEventEmitter } = require('react-native');
    const dailyGoalListener = DeviceEventEmitter.addListener('dailyGoalDayCompleted', handleGoalCompletion);
    const claimListener = DeviceEventEmitter.addListener('dailyGoalClaimed', handleGoalCompletion);
    
    return () => {
      dailyGoalListener?.remove?.();
      claimListener?.remove?.();
      // Don't stop monitoring here as other screens may need it
    };
  }, []);
  
  const [mascotType, setMascotType] = useState<MascotType>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnims = useRef(DIFFICULTY_BUTTONS.map(() => new Animated.Value(0))).current;
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        // Load the daily highest streak
        await useQuizStore.getState().loadDailyHighest();
        
        // Rest of your refresh logic
        handleRefresh();
      };
      
      // Initialize and start menu music when returning to home
      const resumeMusic = async () => {
        try {
          console.log('🏠 [HomeScreen] Initializing AudioManager and starting menu music');
          await AudioManager.initialize();
          await AudioManager.playMenuMusic();
        } catch (error) {
          console.warn('⚠️ [HomeScreen] Failed to start menu music:', error);
        }
      };
      
      resumeMusic();
      loadData();
      
      return () => {
        // Don't stop music when leaving (let next screen handle it)
        console.log('🏠 [HomeScreen] Leaving home screen');
      };
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

  // Listen for regular daily goal day completion (from DailyGoalsService)
  useEffect(() => {
    const eventEmitter = new (require('react-native').NativeEventEmitter)();
    const subscription = eventEmitter.addListener('dailyGoalDayCompleted', async (data: any) => {
      try {
        console.log('📅 [HomeScreen] dailyGoalDayCompleted received:', data);
        await updateDailyStreak();
      } catch (e) {
        console.error('Failed to update daily streak from dailyGoalDayCompleted:', e);
      }
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

  // Load week history based on streak data
  useEffect(() => {
    const buildWeekHistory = async () => {
      try {
        console.log('📅 [HomeScreen] Building week history...');
        
        // Get current streak and completion data
        const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
        const lastCompletedDate = await AsyncStorage.getItem('@BrainBites:lastDailyGoalDay');
        
        const currentStreak = streakData ? parseInt(streakData, 10) : 0;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentDayOfWeek = (today.getDay() + 6) % 7; // Monday = 0
        
        // Initialize week history array
        const history = [false, false, false, false, false, false, false];
        
        // Check if today is completed
        const todayCompleted = lastCompletedDate === todayStr;
        if (todayCompleted) {
          history[currentDayOfWeek] = true;
        }
        
        // Fill in streak days working backwards from today
        if (currentStreak > 0) {
          let streakDaysRemaining = todayCompleted ? currentStreak - 1 : currentStreak;
          let dayIndex = todayCompleted ? currentDayOfWeek - 1 : currentDayOfWeek - 1;
          
          // Mark consecutive days in current week
          while (streakDaysRemaining > 0 && dayIndex >= 0) {
            history[dayIndex] = true;
            streakDaysRemaining--;
            dayIndex--;
          }
        }
        
        setWeekHistory(history);
        setTodayCompleted(todayCompleted);
        
        console.log('✅ [HomeScreen] Week history built:', { currentStreak, todayCompleted, history });
      } catch (error) {
        console.error('❌ [HomeScreen] Error building week history:', error);
      }
    };
    
    buildWeekHistory();
    
    // Rebuild when screen gains focus
    const unsubscribe = navigation.addListener('focus', buildWeekHistory);
    return unsubscribe;
  }, [navigation]);

  // Simplified event listener for week history updates
  useEffect(() => {
    const eventEmitter = new (require('react-native').NativeEventEmitter)();
    
    const handleStreakUpdate = async () => {
      try {
        console.log('🔄 [HomeScreen] Streak update event received');
        
        // Reload all data when a goal is completed/claimed
        const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
        const lastCompletedDate = await AsyncStorage.getItem('@BrainBites:lastDailyGoalDay');
        
        const currentStreak = streakData ? parseInt(streakData, 10) : 0;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const currentDayOfWeek = (today.getDay() + 6) % 7;
        
        // Update streak
        setConsecutiveFlowDays(currentStreak);
        setDailyStreak(currentStreak);
        
        // Update today's completion
        const todayCompleted = lastCompletedDate === todayStr;
        setTodayCompleted(todayCompleted);
        
        // Rebuild week history
        const history = [false, false, false, false, false, false, false];
        if (todayCompleted) {
          history[currentDayOfWeek] = true;
        }
        
        if (currentStreak > 0) {
          let streakDaysRemaining = todayCompleted ? currentStreak - 1 : currentStreak;
          let dayIndex = todayCompleted ? currentDayOfWeek - 1 : currentDayOfWeek - 1;
          
          while (streakDaysRemaining > 0 && dayIndex >= 0) {
            history[dayIndex] = true;
            streakDaysRemaining--;
            dayIndex--;
          }
        }
        
        setWeekHistory(history);
        console.log('✅ [HomeScreen] Streak and week history updated');
        
      } catch (error) {
        console.error('❌ [HomeScreen] Error updating streak data:', error);
      }
    };
    
    const dailyGoalListener = eventEmitter.addListener('dailyGoalDayCompleted', handleStreakUpdate);
    const claimListener = eventEmitter.addListener('dailyGoalClaimed', handleStreakUpdate);
    
    return () => {
      dailyGoalListener?.remove?.();
      claimListener?.remove?.();
    };
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
    
    // Check for daily reset at midnight
    const checkDailyReset = async () => {
      try {
        // Import and check for midnight reset
        const { default: DailyGoalsService } = await import('../services/DailyGoalsService');
        await DailyGoalsService.checkAndResetAtMidnight();
        console.log('✅ [HomeScreen] Daily reset check completed');
      } catch (error) {
        console.error('❌ [HomeScreen] Failed to check daily reset:', error);
      }
    };
    
    initializeTimer();
    checkDailyReset();
    
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
      
      // Menu music is started via AudioManager on focus; avoid duplicate starts
      
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
        
        // Deprecated local keys removed; rely on DailyGoalsService streak only
        try { (await import('../services/DailyGoalsService')).default.reconcileDayStreak(); } catch {}
        const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
        const currentStreak = streakData ? parseInt(streakData, 10) : 0;
        setDailyStreak(currentStreak);
        console.log(`🔥 Daily flow streak updated from service: ${currentStreak} days`);
      }
    } catch (error) {
      console.error('Error updating daily streak:', error);
    }
  };

  // Add this helper function
  const updateDailyStreakFromGoal = async () => {
    // Use the unified flow data update
    try {
      const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
      const currentStreak = streakData ? parseInt(streakData, 10) : 0;
      setConsecutiveFlowDays(currentStreak);
      setDailyStreak(currentStreak);
    } catch (error) {
      console.error('❌ [HomeScreen] Error updating streak from goal:', error);
    }
  };
  
  const loadDailyStreak = async () => {
    try {
      try { (await import('../services/DailyGoalsService')).default.reconcileDayStreak(); } catch {}
      const streakData = await AsyncStorage.getItem('@BrainBites:dailyGoalDayStreak');
      const currentStreak = streakData ? parseInt(streakData, 10) : 0;
      return { streak: currentStreak, lastDate: null };
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
    
    if (dailyHighestStreak >= 5) {
      message = `🔥 Amazing Streak! 🔥\n\nYour best streak today: ${dailyHighestStreak} questions!\nKeep it up, you're unstoppable!`;
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
    
    // Use EnhancedMascotDisplay for peeking mascot interactions
    setMascotMessage(message);
    setShowMascot(true);
  };
  
  const renderStreakFlow = () => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date().getDay();
    const mondayFirst = (today + 6) % 7; // Convert to Monday-first
    
    return (
      <LinearGradient
        colors={["#FFF1E0", "#FFE6C6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakContainer}
      >
        <View style={styles.flowHeader}>
          <View style={styles.flowTitleRow}>
            <Icon name="calendar-check-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.streakTitle}>Daily Flow</Text>
          </View>
          <View style={styles.flowBadge}>
            <Icon name="water" size={14} color="#FFFFFF" />
            <Text style={styles.flowBadgeText}>{consecutiveFlowDays}d</Text>
          </View>
        </View>
        <Text style={styles.flowSubtitle}>Finish a goal daily to keep your flow alive</Text>
        
        {/* Flow Celebration Message */}
        {showFlowCelebration && (
          <View style={styles.flowCelebration}>
            <Text style={styles.flowCelebrationText}>
              🌊 {consecutiveFlowDays === 1 ? '1 day flow!' : `${consecutiveFlowDays} day flow!`}
            </Text>
          </View>
        )}
        
        <View style={styles.weekFlow}>
          {days.map((day, index) => {
            const isToday = index === mondayFirst;
            const dayCompleted = weekHistory[index];
            const isPast = index < mondayFirst;
            const isMissed = isPast && !dayCompleted;
            
            return (
              <View key={index} style={styles.dayItem}>
                <View style={[
                  styles.dayCircle,
                  isToday && styles.todayCircle,
                  dayCompleted && styles.completedCircle,
                  isMissed && styles.missedCircle,
                ]}>
                  {dayCompleted ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : isMissed ? (
                    <Icon name="close" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={[
                      styles.dayText,
                      isToday && styles.todayText,
                    ]}>
                      {day}
                    </Text>
                  )}
                </View>
                {isToday && dayCompleted && (
                  <Text style={styles.todayCompletedText}>✨ Done!</Text>
                )}
              </View>
            );
          })}
        </View>
        {consecutiveFlowDays > 0 && !showFlowCelebration && (
          <Text style={styles.streakCount}>
            🌊 {consecutiveFlowDays} day{consecutiveFlowDays > 1 ? 's' : ''} in a row
          </Text>
        )}
      </LinearGradient>
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" hidden={true} translucent={true} />
      <ScrollView 
        ref={scrollViewRef}
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
            <ScoreDisplay score={dailyScore} showStreak={false} />
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
        
        {/* Enhanced Score Insights Card */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <ScoreInsightsCard />
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
              <Icon name="fire" size={24} color="#FF9F1C" />
              <Text style={styles.statValue}>{dailyHighestStreak || 0}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Banner Ad - hide when overlays could obscure it */}
      {!walkthrough.isVisible && !showMascot && (
        <BannerAdComponent placement="home_screen" style={styles.bannerAd} />
      )}
      
      {/* EnhancedMascotDisplay handles both peeking mascot and goal completion celebrations */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="left"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={() => setShowMascot(false)}
        autoHide={true}
        fullScreen={true}
        onPeekingPress={handlePeekingMascotPress}
        bottomOffset={80}
      />
      
      {/* Dynamic Walkthrough for New Users */}
      <WalkthroughOverlay
        visible={walkthrough.isVisible}
        steps={walkthrough.steps}
        currentStepIndex={walkthrough.currentStepIndex}
        onNext={walkthrough.onNext}
        onPrevious={walkthrough.onPrevious}
        onSkip={walkthrough.onSkip}
        onComplete={walkthrough.onComplete}
        showSkipButton={true}
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
    backgroundColor: '#FFF8E7',
    marginTop: 15,  // ADD THIS
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
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  flowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  flowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A085',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  flowBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  flowSubtitle: {
    color: '#2C3E50',
    opacity: 0.7,
    marginBottom: 12,
    fontSize: 12,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 0,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    lineHeight: 24,
    includeFontPadding: false,
  },
  streakCount: {
    fontSize: 18,
    color: '#3498DB',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.3,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
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
  weekFlow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayItem: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  todayCircle: {
    borderColor: '#3498DB',
    borderWidth: 3,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  completedCircle: {
    backgroundColor: '#16A085',
    borderColor: '#16A085',
    shadowColor: '#16A085',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  missedCircle: {
    backgroundColor: '#FF5252',
    borderColor: '#FF5252',
  },
  dayText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  todayText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
  },
  todayCompletedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 2,
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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
  bannerAd: {
    backgroundColor: 'rgba(255, 248, 231, 0.9)',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  flowCelebration: {
    backgroundColor: 'rgba(22, 160, 133, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 160, 133, 0.3)',
  },
  flowCelebrationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A085',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});

export default HomeScreen;