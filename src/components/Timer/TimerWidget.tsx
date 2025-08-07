// src/components/Timer/TimerWidget.tsx
// ✅ ENHANCED TIMER WIDGET WITH SCREEN TIME DISPLAY
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, NativeModules } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import HybridTimerService from '../../services/HybridTimerService';
import theme from '../../styles/theme';

interface TimerWidgetProps {
  style?: any;
  onPress?: () => void;
}

interface TimerData {
  remainingTime: number;
  todayScreenTime: number;
  isAppForeground: boolean;
  isTracking: boolean;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({ style, onPress }) => {
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('🕐 [TimerWidget] Initializing timer widget...');
    
    let updateInterval: NodeJS.Timeout;
    let isMounted = true;
    
    const initializeTimer = async () => {
      try {
        // Use HybridTimerService for initial setup
        await HybridTimerService.initialize();
        
        // Listen for timer updates from HybridTimerService
        const unsubscribe = HybridTimerService.addListener((data: TimerData) => {
          if (isMounted) {
            console.log('🕐 [TimerWidget] Timer update received:', data);
            setTimerData(data);
            setError(null);
            setIsLoading(false);
          }
        });
        
        // Also set up direct polling as backup
        const { ScreenTimeModule } = NativeModules;
        
        if (ScreenTimeModule) {
          const pollTimerStatus = async () => {
            if (!isMounted) return;
            
            try {
              // Get remaining time and today's screen time separately
              const [remainingTime, todayScreenTime] = await Promise.all([
                ScreenTimeModule.getRemainingTime(),
                ScreenTimeModule.getTodayScreenTime()
              ]);
              
              if (isMounted) {
                setTimerData({
                  remainingTime: remainingTime || 0,
                  todayScreenTime: todayScreenTime || 0,
                  isAppForeground: false,
                  isTracking: remainingTime > 0
                });
                setError(null);
                setIsLoading(false);
              }
            } catch (err) {
              console.warn('⚠️ [TimerWidget] Polling fallback failed:', err);
              // Don't set error if HybridTimerService is working
            }
          };
          
          // Initial poll
          await pollTimerStatus();
          
          // Set up polling every 5 seconds as backup
          updateInterval = setInterval(pollTimerStatus, 5000);
        } else {
          // If no native module, just rely on HybridTimerService
          console.log('ℹ️ [TimerWidget] No ScreenTimeModule, using HybridTimerService only');
          setIsLoading(false);
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
        console.error('❌ [TimerWidget] Failed to initialize:', error);
        if (isMounted) {
          setError('Timer not available');
          setIsLoading(false);
        }
      }
    };
    
    let cleanup: (() => void) | undefined;
    
    initializeTimer().then(cleanupFn => {
      cleanup = cleanupFn;
    });
    
    // Animate in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Cleanup
    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  // Pulse animation for active timer
  useEffect(() => {
    if (timerData?.isTracking) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [timerData?.isTracking]);

  const loadInitialState = async () => {
    try {
      setIsLoading(true);
      
      // Try to get current data from hybrid service
      const currentData = HybridTimerService.getCurrentData();
      if (currentData) {
        console.log('🕐 [TimerWidget] Using cached data from hybrid service');
        setTimerData(currentData);
        setError(null);
      } else {
        console.log('🕐 [TimerWidget] No cached data, initializing...');
        await HybridTimerService.initialize();
      }
    } catch (err: any) {
      console.error('❌ [TimerWidget] Failed to load initial state:', err);
      setError('Timer unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (): string => {
    if (!timerData) return theme.colors.textSecondary;
    
    if (timerData.remainingTime <= 0) return '#F44336'; // Red - no time
    if (timerData.isAppForeground) return '#FF9800'; // Orange - paused
    if (timerData.isTracking) return '#4CAF50'; // Green - running
    return theme.colors.textSecondary; // Gray - paused
  };

  const getStatusIcon = (): string => {
    if (!timerData) return 'timer-off';
    
    if (timerData.remainingTime <= 0) return 'alert';
    if (timerData.isAppForeground) return 'cellphone';
    if (timerData.isTracking) return 'play';
    return 'pause';
  };

  const getStatusText = (): string => {
    if (!timerData) return 'Timer unavailable';
    
    if (timerData.remainingTime <= 0) return 'No time remaining';
    if (timerData.isAppForeground) return 'BrainBites open';
    if (timerData.isTracking) return 'Timer running';
    return 'Timer paused';
  };

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return '0m left';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const formatScreenTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m used today`;
    }
    return `${minutes}m used today`;
  };

  if (isLoading) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
        <TouchableOpacity
          style={styles.touchable}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#E0E0E0', '#CCCCCC']}
            style={styles.timerWidget}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.loadingContainer}>
              <Icon name="timer-sand" size={32} color="white" />
              <Text style={styles.loadingText}>Initializing...</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (error || !timerData) {
    // Show a placeholder widget that can still be tapped
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
        <TouchableOpacity
          style={styles.touchable}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF9F1C', '#FF7F00']}
            style={styles.timerWidget}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.widgetHeader}>
              <Icon name="timer-outline" size={24} color="white" />
              <Text style={styles.headerText}>Screen Time</Text>
            </View>
            <View style={styles.timeDisplay}>
              <Text style={styles.timeLeft}>Tap to Setup</Text>
              <Text style={styles.statusText}>Timer not started</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        style, 
        { 
          opacity: fadeAnim,
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <LinearGradient
          colors={timerData.remainingTime > 0 ? ['#4CAF50', '#45A049'] : ['#FF5722', '#F4511E']}
          style={styles.timerWidget}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.widgetHeader}>
            <Icon 
              name="timer-outline" 
              size={24} 
              color="white" 
            />
            <Text style={styles.headerText}>Screen Time</Text>
          </View>
          
          <View style={styles.timeDisplay}>
            <Text style={styles.timeLeft}>
              {formatTimeLeft(timerData.remainingTime)}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Icon 
                  name={getStatusIcon()} 
                  size={16} 
                  color="rgba(255,255,255,0.8)" 
                />
                <Text style={styles.statusText}>
                  {getStatusText()}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.screenTimeRow}>
            <Icon name="clock-outline" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.screenTimeText}>
              {formatScreenTime(timerData.todayScreenTime)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  timerWidget: {
    padding: 20,
    borderRadius: 20,
    minHeight: 120,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timeDisplay: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeLeft: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statusRow: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
  },
  screenTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTimeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  statusIndicator: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statusIcon: {
    opacity: 0.8,
  },
  loadingState: {
    justifyContent: 'center',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  errorState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
});