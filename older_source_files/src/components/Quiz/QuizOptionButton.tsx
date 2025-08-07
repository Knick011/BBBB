// src/components/Quiz/QuizOptionButton.tsx
import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
  HapticFeedback,
  Platform,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface QuizOptionButtonProps {
  /** The option key (A, B, C, D) */
  optionKey: string;
  /** The option text content */
  text: string;
  /** Current button state */
  state: 'default' | 'selected' | 'correct' | 'incorrect' | 'disabled';
  /** Loading state for delayed feedback */
  isLoading?: boolean;
  /** Whether the button is pressable */
  disabled?: boolean;
  /** Callback when button is pressed */
  onPress: (optionKey: string) => void;
  /** Custom style overrides */
  style?: ViewStyle;
  /** Animation delay for staggered entrance */
  animationDelay?: number;
  /** Show result icons */
  showResultIcon?: boolean;
}

const QuizOptionButton: React.FC<QuizOptionButtonProps> = ({
  optionKey,
  text,
  state,
  isLoading = false,
  disabled = false,
  onPress,
  style,
  animationDelay = 0,
  showResultIcon = true,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const resultIconAnim = useRef(new Animated.Value(0)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;

  // Initialize entrance animation
  useEffect(() => {
    const entranceAnimation = Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: animationDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start();

    // Start shimmer effect
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();

    return () => {
      entranceAnimation.stop();
      shimmerLoop.stop();
    };
  }, [animationDelay]);

  // Handle state changes
  useEffect(() => {
    switch (state) {
      case 'selected':
        startSelectedAnimation();
        break;
      case 'correct':
        startCorrectAnimation();
        break;
      case 'incorrect':
        startIncorrectAnimation();
        break;
      case 'disabled':
        startDisabledAnimation();
        break;
      default:
        resetAnimations();
    }
  }, [state]);

  // Loading animation
  useEffect(() => {
    if (isLoading) {
      const loadingLoop = Animated.loop(
        Animated.timing(loadingRotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loadingLoop.start();
      return () => loadingLoop.stop();
    } else {
      loadingRotation.setValue(0);
    }
  }, [isLoading]);

  const startSelectedAnimation = () => {
    Animated.parallel([
      Animated.spring(pressAnim, {
        toValue: 0.98,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const startCorrectAnimation = () => {
    Animated.parallel([
      Animated.spring(pressAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(resultIconAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startIncorrectAnimation = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pressAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(pressAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(resultIconAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startDisabledAnimation = () => {
    Animated.timing(opacityAnim, {
      toValue: 0.4,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const resetAnimations = () => {
    Animated.parallel([
      Animated.spring(pressAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(resultIconAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled || state === 'disabled') return;

    // Haptic feedback
    if (Platform.OS === 'android') {
      HapticFeedback.trigger('impactLight');
    }

    // Press animation
    Animated.sequence([
      Animated.timing(pressAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress(optionKey);
  };

  const getGradientColors = (): string[] => {
    switch (state) {
      case 'selected':
        return ['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.1)', 'rgba(255, 255, 255, 0.9)'];
      case 'correct':
        return ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)', 'rgba(255, 255, 255, 0.95)'];
      case 'incorrect':
        return ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)', 'rgba(255, 255, 255, 0.95)'];
      default:
        return ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.9)'];
    }
  };

  const getBorderColor = (): string => {
    switch (state) {
      case 'selected':
        return 'rgba(255, 107, 53, 0.6)';
      case 'correct':
        return 'rgba(34, 197, 94, 0.8)';
      case 'incorrect':
        return 'rgba(239, 68, 68, 0.8)';
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const getGlowColor = (): string => {
    switch (state) {
      case 'selected':
        return 'rgba(255, 107, 53, 0.4)';
      case 'correct':
        return 'rgba(34, 197, 94, 0.5)';
      case 'incorrect':
        return 'rgba(239, 68, 68, 0.5)';
      default:
        return 'rgba(255, 107, 53, 0.2)';
    }
  };

  const getResultIcon = () => {
    if (!showResultIcon) return null;
    
    switch (state) {
      case 'correct':
        return 'check-circle';
      case 'incorrect':
        return 'close-circle';
      default:
        return null;
    }
  };

  const getResultIconColor = () => {
    switch (state) {
      case 'correct':
        return '#22c55e';
      case 'incorrect':
        return '#ef4444';
      default:
        return '#333';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pressAnim },
          ],
        },
        style,
      ]}
    >
      {/* Glow Effect */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            opacity: glowAnim,
            shadowColor: getGlowColor(),
          },
        ]}
      />

      {/* Main Button */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || state === 'disabled'}
        activeOpacity={0.9}
        style={styles.touchableArea}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              borderColor: getBorderColor(),
            },
          ]}
        >
          {/* Shimmer Effect */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Option Key */}
            <View style={[styles.optionKeyContainer, getKeyContainerStyle()]}>
              {isLoading ? (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: loadingRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Icon name="loading" size={16} color={getKeyTextColor()} />
                </Animated.View>
              ) : (
                <Text style={[styles.optionKeyText, { color: getKeyTextColor() }]}>
                  {optionKey}
                </Text>
              )}
            </View>

            {/* Option Text */}
            <Text style={[styles.optionText, getTextStyle()]} numberOfLines={3}>
              {text}
            </Text>

            {/* Result Icon */}
            {getResultIcon() && (
              <Animated.View
                style={[
                  styles.resultIconContainer,
                  {
                    opacity: resultIconAnim,
                    transform: [
                      {
                        scale: resultIconAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Icon
                  name={getResultIcon()!}
                  size={24}
                  color={getResultIconColor()}
                />
              </Animated.View>
            )}
          </View>

          {/* Selection Indicator */}
          {state === 'selected' && (
            <View style={styles.selectionIndicator} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  function getKeyContainerStyle(): ViewStyle {
    switch (state) {
      case 'selected':
        return { backgroundColor: '#FF6B35', shadowColor: '#FF6B35' };
      case 'correct':
        return { backgroundColor: '#22c55e', shadowColor: '#22c55e' };
      case 'incorrect':
        return { backgroundColor: '#ef4444', shadowColor: '#ef4444' };
      default:
        return { backgroundColor: 'rgba(51, 51, 51, 0.1)', shadowColor: '#333' };
    }
  }

  function getKeyTextColor(): string {
    switch (state) {
      case 'selected':
      case 'correct':
      case 'incorrect':
        return '#ffffff';
      default:
        return '#333333';
    }
  }

  function getTextStyle(): TextStyle {
    switch (state) {
      case 'disabled':
        return { color: 'rgba(51, 51, 51, 0.5)' };
      case 'correct':
        return { color: '#1a5a2e' };
      case 'incorrect':
        return { color: '#7f1d1d' };
      default:
        return { color: '#333333' };
    }
  }
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  glowContainer: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  touchableArea: {
    borderRadius: 16,
  },
  gradient: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 72,
  },
  optionKeyContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  optionKeyText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    lineHeight: 22,
    marginRight: 12,
  },
  resultIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FF6B35',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
});

export default QuizOptionButton;