// App.tsx - BrainBites Quiz App with Firebase Analytics, AdMob and TrackPlayer integration
import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Platform, AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import { enableScreens } from 'react-native-screens';
import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundService from './src/services/SoundService';
import QuestionService from './src/services/QuestionService';
import AdMobService from './src/services/AdMobService';
import RewardedAdService from './src/services/RewardedAdService';
import FirebaseAnalyticsService from './src/services/FirebaseAnalyticsService';
import DailyGoalsService from './src/services/DailyGoalsService';
import { NotificationService } from './src/services/NotificationService';
import DebugLogger from './src/utils/DebugLogger';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import LoadingScreen from './src/components/common/LoadingScreen';
import ErrorScreen from './src/components/common/ErrorScreen';
import { RootStackParamList } from './src/types';

// Import screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import QuizScreen from './src/screens/QuizScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import DailyGoalsScreen from './src/screens/DailyGoalsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Enable native screens for better performance
enableScreens();

const Stack = createStackNavigator<RootStackParamList>();

interface AppInitializationState {
  isInitializing: boolean;
  initializationComplete: boolean;
  isFirstLaunch: boolean | null; // null = checking, true = first time, false = returning user
  services: {
    sound: 'success' | 'failed' | 'pending';
    questions: 'success' | 'failed' | 'pending';
    firebase: 'success' | 'failed' | 'pending';
    admob: 'success' | 'failed' | 'pending';
  };
  criticalError: string | null;
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppInitializationState>({
    isInitializing: true,
    initializationComplete: false,
    isFirstLaunch: null,
    services: {
      sound: 'pending',
      questions: 'pending',
      firebase: 'pending',
      admob: 'pending',
    },
    criticalError: null,
  });

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: string) => {
    console.log('📱 [BrainBites] App state changed to:', nextAppState);
    
    if (nextAppState === 'background') {
      // Pause music when app goes to background
      SoundService.pauseMusic().catch(error => {
        console.log('⚠️ [BrainBites] Failed to pause music on background:', error);
      });
      
      // Show status bar and navigation bar when app goes to background
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        SystemNavigationBar.navigationShow();
      }
      
      // Set last inactive time for responsibility check-ins and schedule comeback reminder in 6h
      DailyGoalsService.setBackgroundTime().catch(error => {
        console.log('⚠️ [BrainBites] Failed to set background time:', error);
      });
      // Persist background timestamp for hybrid 6h comeback detection
      AsyncStorage.setItem('@BrainBites:lastBackgroundTs', String(Date.now())).catch(() => {});
      try {
        const when = new Date(Date.now() + 6 * 60 * 60 * 1000);
        NotificationService.scheduleOneTimeNotification(
          'responsibility_comeback',
          when,
          '🎯 Responsibility Check-in Ready',
          'Come back to claim your +40 minutes (or reduce 40 minutes of overtime)!',
          { type: 'responsibility_comeback' }
        );
      } catch (e) {
        console.log('⚠️ [BrainBites] Failed to schedule 6h comeback notification:', e);
      }
      
      // Log analytics event
      FirebaseAnalyticsService.logSessionEnd();
    } else if (nextAppState === 'active') {
      console.log('📱 [BrainBites] App became active');
      
      // Hide status bar and navigation bar when app becomes active
      StatusBar.setHidden(true);
      if (Platform.OS === 'android') {
        SystemNavigationBar.navigationHide();
      }
      
      // Check background time and potentially unlock responsibility goal
      DailyGoalsService.checkBackgroundTime().catch(error => {
        console.log('⚠️ [BrainBites] Failed to check background time:', error);
      });

      // Reconcile daily flow day streak immediately so Home shows correct value
      DailyGoalsService.reconcileDayStreak().catch(error => {
        console.log('⚠️ [BrainBites] Failed to reconcile day streak:', error);
      });

      // Deliver any due fallback scheduled notifications
      NotificationService.deliverPendingIfDue?.();
      // Record last active timestamp for re-engagement logic
      AsyncStorage.setItem('@BrainBites:lastActiveTs', String(Date.now())).catch(() => {});
      // Ensure daily schedules (morning daily goal + leaderboard nudges) are set for today
      NotificationService.ensureDailySchedules?.().catch(() => {});
      
      // If we are back before 6h, cancel the scheduled comeback notification (native + fallback)
      try {
        NotificationService.cancelScheduledNotification('responsibility_comeback');
      } catch {}

      // Hybrid 6h comeback check: if >=6h elapsed since last background, unlock and nudge
      (async () => {
        try {
          const ts = await AsyncStorage.getItem('@BrainBites:lastBackgroundTs');
          if (ts) {
            const last = parseInt(ts, 10);
            if (!isNaN(last)) {
              const elapsedMs = Date.now() - last;
              const sixHoursMs = 6 * 60 * 60 * 1000;
              if (elapsedMs >= sixHoursMs) {
                // Clear timestamp so this does not repeat
                await AsyncStorage.removeItem('@BrainBites:lastBackgroundTs');
                // Proactively complete responsibility check-in if unlocked by time gap
                try { await DailyGoalsService.completeResponsibilityCheckin(); } catch {}
                // Nudge user with a local notification (fallback path)
                try {
                  await NotificationService.showLocalNotification({
                    title: '🎯 Responsibility Check-in Ready',
                    body: 'Come back to claim your +40 minutes (or reduce 40 minutes of overtime)!',
                    data: { type: 'responsibility_comeback_resume' },
                    playSound: true,
                    vibrate: true,
                  });
                } catch (e) {
                  console.log('⚠️ [BrainBites] Failed to show 6h comeback fallback notification:', e);
                }
              }
            }
          }
        } catch (e) {
          console.log('⚠️ [BrainBites] Hybrid 6h comeback check failed:', e);
        }
      })();

      // Complete responsibility check-in if unlocked
      DailyGoalsService.completeResponsibilityCheckin().catch(error => {
        console.log('⚠️ [BrainBites] Failed to complete responsibility check-in:', error);
      });
      
      // Ensure daily goals reset at local midnight even if Home isn't opened first
      DailyGoalsService.checkAndResetAtMidnight().catch(error => {
        console.log('⚠️ [BrainBites] Failed to check/reset daily goals at midnight:', error);
      });

      // Clear background time tracking
      DailyGoalsService.clearBackgroundTime().catch(error => {
        console.log('⚠️ [BrainBites] Failed to clear background time:', error);
      });
      
      // Log analytics event
      FirebaseAnalyticsService.logSessionStart();
    }
  }, []);

  // Check if this is the first launch
  const checkFirstLaunch = useCallback(async () => {
    try {
      // Check both the new key and the old key for backwards compatibility
      const hasCompletedOnboarding = await AsyncStorage.getItem('brainbites_onboarding_complete');
      const hasLaunchedBefore = await AsyncStorage.getItem('@BrainBites:hasLaunchedBefore');
      
      // If onboarding was completed OR user has launched before, it's not first time
      const isFirst = !hasCompletedOnboarding && !hasLaunchedBefore;
      
      if (isFirst) {
        console.log('👋 [BrainBites] First launch detected - showing welcome screen');
        // Set the old key for backwards compatibility
        await AsyncStorage.setItem('@BrainBites:hasLaunchedBefore', 'true');
      } else {
        console.log('🔄 [BrainBites] Returning user detected - onboarding previously completed');
      }
      
      return isFirst;
    } catch (error) {
      console.error('❌ [BrainBites] Error checking first launch:', error);
      return false; // Default to not first launch if error
    }
  }, []);

  // Initialize app services
  const initializeApp = useCallback(async (retryCount: number = 0) => {
    console.log(`🚀 [BrainBites] Starting app initialization... (attempt ${retryCount + 1})`);
    
    try {
      setAppState(prev => ({ ...prev, isInitializing: true, criticalError: null }));

      // Check if this is first launch
      const isFirstLaunch = await checkFirstLaunch();
      setAppState(prev => ({ ...prev, isFirstLaunch }));

      // Initialize Firebase Analytics
      console.log('📊 [BrainBites] Initializing Firebase Analytics...');
      setAppState(prev => ({ 
        ...prev, 
        services: { ...prev.services, firebase: 'pending' } 
      }));
      
      try {
        const firebaseReady = await FirebaseAnalyticsService.initialize();
        if (firebaseReady) {
          console.log('✅ [BrainBites] Firebase Analytics initialized successfully');
          
          // Enable debug mode and comprehensive logging
          await DebugLogger.enableDebugMode();
          await DebugLogger.logFirebaseStatus();
          
          // Log app open event automatically as per research recommendations
          await analytics().logAppOpen();
          console.log('📊 [BrainBites] App open event logged to Firebase');
          
          // Log user activity to ensure active user tracking
          await DebugLogger.logUserActivity();
          
          // Set user properties for better tracking
          const userId = await AsyncStorage.getItem('@BrainBites:userId') || `user_${Date.now()}`;
          await analytics().setUserId(userId);
          await analytics().setUserProperties({
            platform: Platform.OS,
            app_version: '1.2',
            first_open_time: new Date().toISOString(),
          });
          
          console.log('👤 [BrainBites] User properties set for analytics');
          
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, firebase: 'success' } 
          }));

          // Request battery optimization exemption once right after notifications prompt on first launch
          try {
            const askedKey = '@BrainBites:askedBatteryExemption';
            const alreadyAsked = await AsyncStorage.getItem(askedKey);
            if (!alreadyAsked && Platform.OS === 'android') {
              const { NativeModules } = require('react-native');
              if (NativeModules.NotificationModule?.requestIgnoreBatteryOptimizations) {
                await NativeModules.NotificationModule.requestIgnoreBatteryOptimizations();
                await AsyncStorage.setItem(askedKey, 'true');
              }
            }
          } catch (e) {
            console.log('⚠️ [BrainBites] Battery optimization request failed (non-fatal):', e?.message || e);
          }
        } else {
          throw new Error('Firebase Analytics initialization failed');
        }
      } catch (firebaseError: any) {
        console.log('⚠️ [BrainBites] Firebase Analytics initialization failed:', firebaseError?.message || firebaseError);
        DebugLogger.log('FIREBASE_ERROR', 'Initialization failed', firebaseError);
        setAppState(prev => ({ 
          ...prev, 
          services: { ...prev.services, firebase: 'failed' } 
        }));
      }

      // Initialize AdMob
      console.log('📱 [BrainBites] Initializing Google AdMob...');
      setAppState(prev => ({ 
        ...prev, 
        services: { ...prev.services, admob: 'pending' } 
      }));
      
      try {
        const admobReady = await AdMobService.initialize();
        if (admobReady) {
          console.log('✅ [BrainBites] Google AdMob initialized successfully (banner ads only)');
          
          // Initialize RewardedAdService after AdMob is ready
          try {
            await RewardedAdService.initialize();
            console.log('✅ [BrainBites] RewardedAdService initialized successfully');
          } catch (rewardedAdError: any) {
            console.log('⚠️ [BrainBites] RewardedAdService initialization failed:', rewardedAdError?.message || rewardedAdError);
            // Don't fail the whole app if rewarded ads fail
          }
          
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, admob: 'success' } 
          }));
        } else {
          throw new Error('AdMob initialization failed');
        }
      } catch (admobError: any) {
        console.log('⚠️ [BrainBites] AdMob initialization failed:', admobError?.message || admobError);
        console.log('⚠️ [BrainBites] AdMob stack trace:', admobError?.stack);
        setAppState(prev => ({ 
          ...prev, 
          services: { ...prev.services, admob: 'failed' } 
        }));
        // AdMob failure should not block app startup
      }

      // Initialize Sound Service
      console.log('🔊 [BrainBites] Initializing SoundService...');
      setAppState(prev => ({ 
        ...prev, 
        services: { ...prev.services, sound: 'pending' } 
      }));
      
      try {
        const soundReady = await SoundService.initialize();
        if (soundReady) {
          console.log('✅ [BrainBites] SoundService initialized successfully');
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, sound: 'success' } 
          }));
        } else {
          console.log('⚠️ [BrainBites] SoundService failed to initialize, continuing without audio');
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, sound: 'failed' } 
          }));
        }
      } catch (soundError: any) {
        console.log('❌ [BrainBites] SoundService initialization error:', soundError?.message || soundError);
        setAppState(prev => ({ 
          ...prev, 
          services: { ...prev.services, sound: 'failed' } 
        }));
      }

      // Initialize Question Service
      console.log('📚 [BrainBites] Initializing QuestionService...');
      setAppState(prev => ({ 
        ...prev, 
        services: { ...prev.services, questions: 'pending' } 
      }));
      
      try {
        await QuestionService.initialize();
        const serviceStatus = QuestionService.getServiceStatus();
        
        if (serviceStatus.initialized && serviceStatus.totalQuestions > 0) {
          console.log('✅ [BrainBites] QuestionService initialized successfully with', serviceStatus.totalQuestions, 'questions');
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, questions: 'success' } 
          }));
          
          // Log analytics event for successful initialization
          await FirebaseAnalyticsService.logQuizStarted('system', 'initialization');
        } else {
          throw new Error(`QuestionService initialization incomplete: ${JSON.stringify(serviceStatus)}`);
        }
      } catch (questionsError: any) {
        console.log('❌ [BrainBites] QuestionService initialization error:', questionsError?.message || questionsError);
        setAppState(prev => ({ 
          ...prev, 
          services: { ...prev.services, questions: 'failed' },
          criticalError: 'Failed to load questions. The app may not function properly.'
        }));
      }

      // Complete initialization - check final status
      setAppState(prev => {
        const criticalServicesFailed = prev.services.questions === 'failed';
        
        if (criticalServicesFailed) {
          console.log('🚨 [BrainBites] Critical services failed, showing error state');
          return {
            ...prev,
            isInitializing: false,
            initializationComplete: false,
            criticalError: 'Failed to initialize critical app services. Please restart the app.'
          };
        } else {
          console.log('🎉 [BrainBites] App initialization completed successfully');
          // Log successful app initialization
          FirebaseAnalyticsService.logSessionStart().catch(error => {
            console.log('⚠️ [BrainBites] Failed to log session start:', error);
          });
          
          return {
            ...prev,
            isInitializing: false,
            initializationComplete: true,
            criticalError: null
          };
        }
      });

    } catch (error: any) {
      console.log('❌ [BrainBites] App initialization failed:', error?.message || error);
      console.log('❌ [BrainBites] Stack trace:', error?.stack);
      
      // Provide more user-friendly error messages
      let userFriendlyMessage = 'Something went wrong during app startup.';
      
      if (error?.message?.includes('Network')) {
        userFriendlyMessage = 'Network connection issue. Please check your internet connection and try again.';
      } else if (error?.message?.includes('Firebase')) {
        userFriendlyMessage = 'Unable to connect to our services. Please try again in a moment.';
      } else if (error?.message?.includes('Question')) {
        userFriendlyMessage = 'Problem loading quiz content. The app will use backup questions.';
      } else if (error?.message?.includes('Permission')) {
        userFriendlyMessage = 'App permissions need to be set up. Please restart the app.';
      }
      
      setAppState(prev => ({ 
        ...prev,
        isInitializing: false,
        initializationComplete: false,
        criticalError: userFriendlyMessage
      }));
    }
  }, [checkFirstLaunch]);

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Initialize full-screen mode
  useEffect(() => {
    // Hide status bar
    StatusBar.setHidden(true);
    
    // Hide navigation bar on Android
    if (Platform.OS === 'android') {
      try {
        SystemNavigationBar.navigationHide();
        
        // Enable immersive mode
        if (SystemNavigationBar.setNavigationBarColor) {
          SystemNavigationBar.setNavigationBarColor('transparent');
        }
        SystemNavigationBar.stickyImmersive();
      } catch (error) {
        console.warn('SystemNavigationBar error:', error);
      }
    }
  }, []);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Show loading screen during initialization or while checking first launch
  if (appState.isInitializing || appState.isFirstLaunch === null) {
    return (
      <ErrorBoundary>
        <LoadingScreen 
          services={appState.services}
          onRetry={initializeApp}
        />
      </ErrorBoundary>
    );
  }

  // Show error screen if critical services failed
  if (appState.criticalError) {
    return (
      <ErrorBoundary>
        <ErrorScreen 
          message={appState.criticalError}
          onRetry={initializeApp}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#FFF8E7' }}>
          {/* Hide status bar but don't add padding */}
          <StatusBar 
            translucent={true}
            backgroundColor="transparent"
            barStyle="dark-content"
            hidden={true}
          />
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={appState.isFirstLaunch ? "Welcome" : "Home"}
              screenOptions={{
                headerShown: false,
                cardStyle: { 
                  backgroundColor: '#FFF8E7',
                  // Remove padding - let screens handle their own safe areas
                },
                // Ensure full screen coverage
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }}
            >
              <Stack.Screen 
                name="Welcome" 
                component={WelcomeScreen}
              />
              <Stack.Screen 
                name="Home" 
                component={HomeScreen}
              />
              <Stack.Screen 
                name="Categories" 
                component={CategoriesScreen}
              />
              <Stack.Screen 
                name="Quiz" 
                component={QuizScreen}
              />
              <Stack.Screen 
                name="Leaderboard" 
                component={LeaderboardScreen}
              />
              <Stack.Screen 
                name="DailyGoals" 
                component={DailyGoalsScreen}
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

export default App;
