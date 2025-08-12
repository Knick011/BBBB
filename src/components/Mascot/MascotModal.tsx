import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import SoundService from '../../services/SoundService';

const { width, height } = Dimensions.get('window');

interface MascotModalProps {
  visible: boolean;
  type?: 'excited' | 'sad' | 'warning' | 'celebration';
  title?: string;
  message: string;
  reward?: number;
  onDismiss: () => void;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const MascotModal: React.FC<MascotModalProps> = ({
  visible,
  type = 'excited',
  title,
  message,
  reward,
  onDismiss,
  buttons,
  autoHide = false,
  autoHideDelay = 5000,
}) => {
  const [showModal, setShowModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array(6).fill(null).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;
  
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      animateIn();
      
      if (autoHide) {
        hideTimer.current = setTimeout(() => {
          onDismiss();
        }, autoHideDelay);
      }
    } else {
      animateOut();
    }
    
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [visible]);

  const animateIn = () => {
    // Play sound based on type
    if (type === 'excited' || type === 'celebration') {
      SoundService.playStreak();
    }
    
    // Animate modal
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
    
    // Animate particles for celebration
    if (type === 'celebration' || (type === 'excited' && reward)) {
      animateParticles();
    }
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false);
    });
  };

  const animateParticles = () => {
    particleAnims.forEach((anim, index) => {
      const delay = index * 100;
      const angle = (index * 60) * Math.PI / 180;
      const distance = 100 + Math.random() * 50;
      
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(anim.x, {
            toValue: Math.cos(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: Math.sin(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const getMascotEmoji = () => {
    switch (type) {
      case 'excited':
      case 'celebration':
        return '🎉';
      case 'sad':
        return '😢';
      case 'warning':
        return '⚠️';
      default:
        return '😊';
    }
  };

  const getGradientColors = () => {
    switch (type) {
      case 'excited':
      case 'celebration':
        return ['#FFD700', '#FFA500'];
      case 'sad':
        return ['#87CEEB', '#4682B4'];
      case 'warning':
        return ['#FF6B6B', '#FF4444'];
      default:
        return ['#FF9F1C', '#FFD699'];
    }
  };

  const handleButtonPress = (button: any) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    button.onPress();
  };

  if (!showModal) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={onDismiss}
      animationType="none"
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch} 
          activeOpacity={1} 
          onPress={onDismiss}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: bounceAnim }
              ],
            },
          ]}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Particles */}
            {(type === 'celebration' || (type === 'excited' && reward)) &&
              particleAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.particle,
                    {
                      opacity: anim.opacity,
                      transform: [
                        { translateX: anim.x },
                        { translateY: anim.y },
                        { scale: anim.scale },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.particleEmoji}>
                    {['🌟', '✨', '💫', '⭐', '🎊', '🎈'][index]}
                  </Text>
                </Animated.View>
              ))
            }
            
            {/* Mascot */}
            <View style={styles.mascotContainer}>
              <Text style={styles.mascotEmoji}>{getMascotEmoji()}</Text>
            </View>
            
            {/* Content */}
            <View style={styles.content}>
              {title && <Text style={styles.title}>{title}</Text>}
              <Text style={styles.message}>{message}</Text>
              
              {reward && (
                <View style={styles.rewardContainer}>
                  <Icon name="clock-plus-outline" size={24} color="#FFF" />
                  <Text style={styles.rewardText}>+{reward} minutes!</Text>
                </View>
              )}
            </View>
            
            {/* Buttons */}
            {buttons && buttons.length > 0 && (
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      button.style === 'primary' && styles.primaryButton,
                      button.style === 'secondary' && styles.secondaryButton,
                      button.style === 'danger' && styles.dangerButton,
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        button.style === 'secondary' && styles.secondaryButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  mascotContainer: {
    marginBottom: 16,
  },
  mascotEmoji: {
    fontSize: 64,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  message: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  buttonContainer: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dangerButton: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9F1C',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-black',
  },
  secondaryButtonText: {
    color: '#FFF',
  },
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  particleEmoji: {
    fontSize: 24,
  },
});

export default MascotModal;