import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Platform,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MascotModalProps {
  visible: boolean;
  type: 'excited' | 'depressed' | 'happy' | 'sad';
  title?: string;
  message: string;
  reward?: number;
  streak?: number;
  onDismiss: () => void;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const MASCOT_IMAGES = {
  happy: require('../../assets/mascot/happy.png'),
  sad: require('../../assets/mascot/sad.png'),
  excited: require('../../assets/mascot/excited.png'),
  depressed: require('../../assets/mascot/depressed.png'),
};

const MascotModal: React.FC<MascotModalProps> = ({
  visible,
  type,
  title,
  message,
  reward,
  streak,
  onDismiss,
  buttons,
  autoHide = false,
  autoHideDelay = 4000,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showInteraction, setShowInteraction] = useState(false);
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(0.3)).current;
  const mascotTranslateY = useRef(new Animated.Value(300)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      animateIn();
    } else {
      animateOut();
    }
    
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
    };
  }, [visible]);

  const animateIn = () => {
    // Staggered entrance animation
    Animated.sequence([
      // First: Overlay fades in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Second: Mascot bounces in
      Animated.parallel([
        Animated.spring(mascotScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(mascotTranslateY, {
          toValue: 0,
          friction: 6,
          tension: 35,
          useNativeDriver: true,
        }),
      ]),
      // Third: Content fades in
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Trigger particle animations for celebrations
      if (type === 'excited' && reward) {
        animateParticles();
      }
      
      // Show interaction prompt after 2 seconds
      interactionTimer.current = setTimeout(() => {
        setShowInteraction(true);
      }, 2000);
      
      // Auto-hide if enabled
      if (autoHide) {
        hideTimer.current = setTimeout(() => {
          onDismiss();
        }, autoHideDelay);
      }
    });
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mascotScale, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mascotTranslateY, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
      setShowInteraction(false);
    });
  };

  const animateParticles = () => {
    particleAnims.forEach((anim, index) => {
      const angle = (index / 12) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      
      Animated.sequence([
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(anim.translateX, {
            toValue: Math.cos(angle) * distance,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: Math.sin(angle) * distance,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const handleScreenTap = () => {
    if (!buttons || buttons.length === 0) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      onDismiss();
    }
  };

  if (!showModal) return null;

  return (
    <TouchableWithoutFeedback onPress={handleScreenTap}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Blur background for premium feel */}
        {Platform.OS === 'ios' && (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.7)"
          />
        )}
        
        {/* Particle effects for celebrations */}
        {type === 'excited' && reward && (
          <View style={styles.particleContainer}>
            {particleAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    transform: [
                      { translateX: anim.translateX },
                      { translateY: anim.translateY },
                      { scale: anim.scale },
                    ],
                    opacity: anim.opacity,
                  },
                ]}
              >
                <Icon
                  name={['star', 'sparkles', 'trophy'][index % 3]}
                  size={24}
                  color={['#FFD700', '#FF69B4', '#00CED1'][index % 3]}
                />
              </Animated.View>
            ))}
          </View>
        )}
        
        {/* Main content container */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          {/* Title with gradient background */}
          {title && (
            <LinearGradient
              colors={
                type === 'excited'
                  ? ['#FFD700', '#FFA500']
                  : type === 'depressed'
                  ? ['#6C757D', '#495057']
                  : ['#87CEEB', '#4682B4']
              }
              style={styles.titleContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.title}>{title}</Text>
            </LinearGradient>
          )}
          
          {/* Mascot image */}
          <Animated.View
            style={[
              styles.mascotContainer,
              {
                transform: [
                  { scale: mascotScale },
                  { translateY: mascotTranslateY },
                ],
              },
            ]}
          >
            <Image
              source={MASCOT_IMAGES[type]}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
            
            {/* Reward display */}
            {reward && (
              <View style={styles.rewardContainer}>
                <Icon name="clock-outline" size={20} color="#FF9F1C" />
                <Text style={styles.rewardText}>+{reward} minutes earned!</Text>
              </View>
            )}
            
            {/* Streak display */}
            {streak !== undefined && (
              <View style={styles.streakContainer}>
                <Icon name="fire" size={20} color="#FF6B6B" />
                <Text style={styles.streakText}>Streak: {streak}</Text>
              </View>
            )}
          </View>
          
          {/* Action buttons */}
          {buttons && buttons.length > 0 && (
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <TouchableWithoutFeedback key={index} onPress={button.onPress}>
                  <LinearGradient
                    colors={
                      button.style === 'danger'
                        ? ['#DC3545', '#C82333']
                        : button.style === 'secondary'
                        ? ['#6C757D', '#5A6268']
                        : ['#28A745', '#218838']
                    }
                    style={[
                      styles.button,
                      index > 0 && styles.buttonMargin,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.buttonText}>{button.text}</Text>
                  </LinearGradient>
                </TouchableWithoutFeedback>
              ))}
            </View>
          )}
          
          {/* Interaction prompt */}
          {showInteraction && !buttons && (
            <Animated.View style={styles.interactionPrompt}>
              <Text style={styles.interactionText}>Press anywhere to continue</Text>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Platform.OS === 'android' ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    backgroundColor: '#FFF8E7',
    borderRadius: 30,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  titleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  mascotContainer: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  messageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(255, 159, 28, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
  },
  rewardText: {
    fontSize: 16,
    color: '#FF9F1C',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 20,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonMargin: {
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  interactionPrompt: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  interactionText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  particleContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
});

export default MascotModal;