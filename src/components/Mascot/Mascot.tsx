import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MascotProps {
  type?: 'happy' | 'sad' | 'excited' | 'gamemode' | 'depressed' | 'below';
  position?: 'bottom-right' | 'bottom-left' | 'center' | 'peeking';
  size?: number;
  onPress?: () => void;
  animateIn?: boolean;
}

const mascotImages = {
  happy: require('../../assets/mascot/happy.png'),
  sad: require('../../assets/mascot/sad.png'),
  excited: require('../../assets/mascot/excited.png'),
  gamemode: require('../../assets/mascot/gamemode.png'),
  depressed: require('../../assets/mascot/depressed.png'),
  below: require('../../assets/mascot/below.png'), // Peeking state
};

const Mascot: React.FC<MascotProps> = ({
  type = 'happy',
  position = 'bottom-right',
  size = 100,
  onPress,
  animateIn = true,
}) => {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const translateYAnim = useRef(new Animated.Value(animateIn ? 100 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animateIn) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 35,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start idle bounce animation
        startBounce();
      });
    } else {
      startBounce();
    }
  }, []);

  const startBounce = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getPositionStyle = () => {
    const baseMargin = 20;
    
    switch (position) {
      case 'bottom-right':
        return {
          bottom: insets.bottom + baseMargin,
          right: baseMargin,
        };
      case 'bottom-left':
        return {
          bottom: insets.bottom + baseMargin,
          left: baseMargin,
        };
      case 'center':
        return {
          bottom: SCREEN_HEIGHT / 2 - size / 2,
          left: SCREEN_WIDTH / 2 - size / 2,
        };
      case 'peeking':
        return {
          bottom: -size * 0.6, // Show only top 40% of mascot
          right: baseMargin,
        };
      default:
        return {
          bottom: insets.bottom + baseMargin,
          right: baseMargin,
        };
    }
  };

  const handlePress = () => {
    if (onPress) {
      // Add a little bounce on press
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
      
      onPress();
    }
  };

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { translateY: Animated.add(translateYAnim, bounceAnim) },
    ],
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress} disabled={!onPress}>
      <Animated.View
        style={[
          styles.container,
          getPositionStyle(),
          { width: size, height: size },
          animatedStyle,
        ]}
      >
        <Image
          source={mascotImages[type] || mascotImages.happy}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default Mascot;