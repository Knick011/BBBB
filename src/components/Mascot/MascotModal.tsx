import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SoundService from '../../services/SoundService';

const { width, height } = Dimensions.get('window');

// Mascot images
const MASCOT_IMAGES = {
  excited: require('../../assets/mascot/excited.png'),
  depressed: require('../../assets/mascot/depressed.png'),
  sad: require('../../assets/mascot/sad.png'),
  happy: require('../../assets/mascot/happy.png'),
};

interface MascotModalProps {
  visible: boolean;
  type?: 'excited' | 'depressed' | 'sad' | 'happy';
  title?: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style: 'primary' | 'secondary' | 'danger';
  }>;
  onDismiss?: () => void;
  // Back-compat optional props used elsewhere
  reward?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
  streak?: number;
}

const MascotModal: React.FC<MascotModalProps> = ({
  visible,
  type = 'happy',
  title,
  message,
  buttons = [],
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      if (type === 'excited') {
        SoundService.playSuccess?.();
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getButtonStyle = (style: string) => {
    switch (style) {
      case 'primary':
        return styles.primaryButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.secondaryButton;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1}
          onPress={onDismiss}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          {/* Mascot Image - Top 40% */}
          <View style={styles.mascotContainer}>
            <Image
              source={MASCOT_IMAGES[type]}
              style={styles.mascotImage}
              resizeMode="contain"
            />
            {/* Gradient overlay to fade bottom of mascot */}
            <LinearGradient
              colors={['transparent', 'rgba(26, 31, 46, 0.95)', '#1A1F2E']}
              style={styles.mascotGradient}
            />
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            {title && (
              <Text style={styles.title}>{title}</Text>
            )}
            <Text style={styles.message}>{message}</Text>
            
            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.button, getButtonStyle(button.style)]}
                  onPress={() => {
                    SoundService.playButtonPress?.();
                    button.onPress();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>{button.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#1A1F2E',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  mascotContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  mascotImage: {
    width: '100%',
    height: '133%', // Show ~top 75% by making image ~1.33x larger
    position: 'absolute',
    top: 0,
  },
  mascotGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#B8BED0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2C3548',
    borderWidth: 1,
    borderColor: '#3A4358',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MascotModal;