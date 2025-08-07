import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PeekingMascotProps {
  message?: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const PeekingMascot: React.FC<PeekingMascotProps> = ({
  message = "Psst! Tap me for a hint! 💡",
  onDismiss,
  autoHide = false,
  autoHideDelay = 5000,
}) => {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const peekAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial peek animation
    Animated.spring(peekAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      // Start wiggle animation to attract attention
      startWiggle();
    });

    if (autoHide) {
      const timer = setTimeout(() => {
        hide();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, []);

  const startWiggle = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wiggleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: -1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(wiggleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000), // Wait before next wiggle
      ])
    ).start();
  };

  const expand = () => {
    setIsExpanded(true);
    Animated.parallel([
      Animated.spring(peekAnim, {
        toValue: 2,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(peekAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    if (!isExpanded) {
      expand();
    } else {
      hide();
    }
  };

  const mascotTransform = peekAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [100, 30, -20], // Peek more when expanded
  });

  const mascotRotation = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  });

  return (
    <View style={[styles.container, { bottom: insets.bottom }]}>
      {isExpanded && (
        <Animated.View
          style={[
            styles.messageContainer,
            { opacity: messageOpacity },
          ]}
        >
          <LinearGradient
            colors={['#FFE5D9', '#FFD7C9']}
            style={styles.messageBubble}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.messageText}>{message}</Text>
          </LinearGradient>
          <View style={styles.messageTail} />
        </Animated.View>
      )}
      
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Animated.Image
          source={require('../../assets/mascot/below.png')}
          style={[
            styles.mascot,
            {
              transform: [
                { translateY: mascotTransform },
                { rotate: mascotRotation },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  mascot: {
    width: 80,
    height: 120,
  },
  messageContainer: {
    marginBottom: 10,
    marginRight: 20,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 14,
    color: '#4A4A4A',
    fontFamily: 'Nunito-Regular',
    lineHeight: 20,
  },
  messageTail: {
    position: 'absolute',
    bottom: -8,
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFD7C9',
  },
});

export default PeekingMascot;