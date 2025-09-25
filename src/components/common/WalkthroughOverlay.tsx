// src/components/common/WalkthroughOverlay.tsx
// Interactive walkthrough component for new users with mascot integration

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../styles/theme';
import EnhancedMascotDisplay from '../Mascot/EnhancedMascotDisplay';

const { width, height } = Dimensions.get('window');

// Map mascot types to image paths
const MASCOT_IMAGES = {
  happy: require('../../assets/mascot/happy.png'),
  excited: require('../../assets/mascot/excited.png'),
  gamemode: require('../../assets/mascot/gamemode.png'),
  below: require('../../assets/mascot/below.png'),
};

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS-like selector for the target element
  targetPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: string;
  mascotType?: 'happy' | 'excited' | 'gamemode' | 'below';
  mascotMessage?: string;
  action?: 'tap' | 'swipe' | 'wait' | 'none';
  actionDescription?: string;
}

interface WalkthroughOverlayProps {
  visible: boolean;
  steps: WalkthroughStep[];
  currentStepIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  showSkipButton?: boolean;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
  visible,
  steps,
  currentStepIndex,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  showSkipButton = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Start pulsing animation for highlight
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, currentStepIndex]);

  if (!visible || !currentStep) {
    return null;
  }

  const renderHighlight = () => {
    if (!currentStep.targetPosition) {
      return null;
    }

    const { x, y, width: targetWidth, height: targetHeight } = currentStep.targetPosition;

    return (
      <Animated.View
        style={[
          styles.highlight,
          {
            left: x - 8,
            top: y - 8,
            width: targetWidth + 16,
            height: targetHeight + 16,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    );
  };

  const renderTooltip = () => {
    const tooltipStyle = [styles.tooltip];
    const arrowStyle = [styles.arrow];
    
    if (currentStep.targetPosition) {
      const { x, y, width: targetWidth, height: targetHeight } = currentStep.targetPosition;
      
      switch (currentStep.tooltipPosition) {
        case 'top':
          tooltipStyle.push({
            bottom: height - y + 20,
            left: Math.max(20, Math.min(width - 280, x + targetWidth / 2 - 140)),
          });
          arrowStyle.push(styles.arrowDown);
          break;
        case 'bottom':
          tooltipStyle.push({
            top: y + targetHeight + 20,
            left: Math.max(20, Math.min(width - 280, x + targetWidth / 2 - 140)),
          });
          arrowStyle.push(styles.arrowUp);
          break;
        case 'left':
          tooltipStyle.push({
            top: Math.max(100, Math.min(height - 200, y + targetHeight / 2 - 100)),
            right: width - x + 20,
          });
          arrowStyle.push(styles.arrowRight);
          break;
        case 'right':
          tooltipStyle.push({
            top: Math.max(100, Math.min(height - 200, y + targetHeight / 2 - 100)),
            left: x + targetWidth + 20,
          });
          arrowStyle.push(styles.arrowLeft);
          break;
        case 'center':
        default:
          tooltipStyle.push({
            top: height / 2 - 100,
            left: width / 2 - 140,
          });
          break;
      }
    } else {
      // Center tooltip when no target position
      tooltipStyle.push({
        top: height / 2 - 100,
        left: width / 2 - 140,
      });
    }

    return (
      <Animated.View
        style={[
          tooltipStyle,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#4A90E2', '#67B8FF', '#2E86AB']}
          style={styles.tooltipGradient}
        >
          {currentStep.tooltipPosition !== 'center' && (
            <View style={arrowStyle} />
          )}
          
          {/* Mascot using existing implementation */}
          {currentStep.mascotMessage && (
            <View style={styles.mascotContainer}>
              <Text style={styles.mascotMessage}>
                {currentStep.mascotMessage}
              </Text>
            </View>
          )}
          
          {/* Header */}
          <View style={styles.tooltipHeader}>
            {currentStep.icon && (
              <Icon name={currentStep.icon} size={24} color="#FFFFFF" style={styles.tooltipIcon} />
            )}
            <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
          </View>

          {/* Content */}
          <Text style={styles.tooltipDescription}>{currentStep.description}</Text>

          {/* Action hint */}
          {currentStep.action && currentStep.action !== 'none' && (
            <View style={styles.actionHint}>
              <Icon 
                name={
                  currentStep.action === 'tap' ? 'gesture-tap' :
                  currentStep.action === 'swipe' ? 'gesture-swipe' :
                  'clock-outline'
                } 
                size={16} 
                color="#FFE5D9" 
              />
              <Text style={styles.actionText}>
                {currentStep.actionDescription || `${currentStep.action} to continue`}
              </Text>
            </View>
          )}

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, isFirstStep && styles.disabledButton]}
              onPress={onPrevious}
              disabled={isFirstStep}
            >
              <Icon name="chevron-left" size={20} color={isFirstStep ? "#999" : "#FFFFFF"} />
              <Text style={[styles.buttonText, styles.secondaryButtonText, isFirstStep && styles.disabledButtonText]}>
                Back
              </Text>
            </TouchableOpacity>

            {showSkipButton && !isLastStep && (
              <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={onSkip}>
                <Text style={[styles.buttonText, styles.skipButtonText]}>Skip Tour</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={isLastStep ? onComplete : onNext}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                {isLastStep ? 'Get Started! 🎉' : 'Next'}
              </Text>
              {!isLastStep && <Icon name="chevron-right" size={20} color={theme.colors.primary} />}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.overlay}>
      {/* Dark backdrop */}
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) }
        ]} 
      />
      
      {/* Highlight target element */}
      {renderHighlight()}
      
      {/* Tooltip */}
      {renderTooltip()}
      
      {/* Enhanced Mascot Display for walkthrough */}
      {currentStep?.mascotType && (
        <EnhancedMascotDisplay
          type={currentStep.mascotType}
          position="left"
          showMascot={true}
          message={currentStep.mascotMessage}
          autoHide={false}
          fullScreen={false}
          onDismiss={() => {}}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  highlight: {
    position: 'absolute',
    borderRadius: theme.borderRadius.base,
    borderWidth: 3,
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E220',
    // Removed shadow to avoid overlay glow/shadow on elements
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    maxHeight: 300,
  },
  tooltipGradient: {
    borderRadius: 16,
    padding: 20,
    // Removed shadow to keep walkthrough box flat
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  arrowUp: {
    top: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4A90E2',
  },
  arrowDown: {
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2E86AB',
  },
  arrowLeft: {
    top: '50%',
    left: -8,
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#4A90E2',
  },
  arrowRight: {
    top: '50%',
    right: -8,
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#4A90E2',
  },
  // Simple mascot message container
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mascotMessage: {
    fontSize: 14,
    color: '#FFE5D9',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipIcon: {
    marginRight: 8,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#E8F4FD',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  actionText: {
    fontSize: 12,
    color: '#FFE5D9',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#FFE5D9',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    flex: 1,
    maxWidth: 100,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  primaryButtonText: {
    color: '#2E86AB',
    marginRight: 4,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    marginLeft: 4,
  },
  skipButtonText: {
    color: '#FFE5D9',
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default WalkthroughOverlay;