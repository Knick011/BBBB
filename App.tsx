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
import FirebaseAnalyticsService from './src/services/FirebaseAnalyticsService';
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
      
      // Log analytics event
      FirebaseAnalyticsService.logSessionEnd();
    } else if (nextAppState === 'active') {
      console.log('📱 [BrainBites] App became active');
      
      // Hide status bar and navigation bar when app becomes active
      StatusBar.setHidden(true);
      if (Platform.OS === 'android') {
        SystemNavigationBar.navigationHide();
      }
      
      // Log analytics event
      FirebaseAnalyticsService.logSessionStart();
    }
  }, []);

  // Check if this is the first launch
  const checkFirstLaunch = useCallback(async () => {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem('@BrainBites:hasLaunchedBefore');
      const isFirst = !hasLaunchedBefore;
      
      if (isFirst) {
        console.log('👋 [BrainBites] First launch detected');
      } else {
        console.log('🔄 [BrainBites] Returning user detected');
      }
      
      return isFirst;
    } catch (error) {
      console.error('❌ [BrainBites] Error checking first launch:', error);
      return false; // Default to not first launch if error
    }
  }, []);

  // Initialize app services
  const initializeApp = useCallback(async () => {
    console.log('🚀 [BrainBites] Starting app initialization...');
    
    try {
      setAppState(prev => ({ ...prev, isInitializing: true }));

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
          
          // Log app open event automatically as per research recommendations
          await analytics().logAppOpen();
          console.log('📊 [BrainBites] App open event logged to Firebase');
          
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, firebase: 'success' } 
          }));
        } else {
          throw new Error('Firebase Analytics initialization failed');
        }
      } catch (firebaseError: any) {
        console.log('⚠️ [BrainBites] Firebase Analytics initialization failed:', firebaseError?.message || firebaseError);
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
          setAppState(prev => ({ 
            ...prev, 
            services: { ...prev.services, admob: 'success' } 
          }));
        } else {
          throw new Error('AdMob initialization failed');
        }
      } catch (admobError: any) {
        console.log('⚠️ [BrainBites] AdMob initialization failed:', admobError?.message || admobError);
        setAppState(prev => ({ 
          ...prev, 
          services: { ...prev.services, admob: 'failed' } 
        }));
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

      // Complete initialization
      const criticalServicesFailed = appState.services.questions === 'failed';
      
      if (criticalServicesFailed) {
        console.log('🚨 [BrainBites] Critical services failed, showing error state');
        setAppState(prev => ({ 
          ...prev,
          isInitializing: false,
          initializationComplete: false,
          criticalError: 'Failed to initialize critical app services. Please restart the app.'
        }));
      } else {
        console.log('🎉 [BrainBites] App initialization completed successfully');
        setAppState(prev => ({ 
          ...prev,
          isInitializing: false,
          initializationComplete: true,
          criticalError: null
        }));
        
        // Log successful app initialization
        await FirebaseAnalyticsService.logSessionStart();
      }

    } catch (error: any) {
      console.log('❌ [BrainBites] App initialization failed:', error?.message || error);
      setAppState(prev => ({ 
        ...prev,
        isInitializing: false,
        initializationComplete: false,
        criticalError: `App initialization failed: ${error?.message || 'Unknown error'}`
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
          error={appState.criticalError}
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
