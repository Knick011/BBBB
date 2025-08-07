import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Bubble {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  size: number;
  duration: number;
}

const AnimatedBackground: React.FC = () => {
  const bubbles = useRef<Bubble[]>([]);

  useEffect(() => {
    // Create initial bubbles
    for (let i = 0; i < 15; i++) {
      createBubble(i);
    }

    // Continuously create new bubbles
    const interval = setInterval(() => {
      const randomId = Math.random();
      createBubble(randomId);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const createBubble = (id: number) => {
    const size = Math.random() * 60 + 20;
    const startX = Math.random() * SCREEN_WIDTH;
    const duration = Math.random() * 10000 + 15000;

    const bubble: Bubble = {
      id,
      x: new Animated.Value(startX),
      y: new Animated.Value(SCREEN_HEIGHT + size),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0.3),
      size,
      duration,
    };

    bubbles.current.push(bubble);

    // Animate bubble
    Animated.parallel([
      Animated.timing(bubble.y, {
        toValue: -size - 100,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bubble.scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.scale, {
          toValue: 0.8,
          duration: duration - 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.scale, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(bubble.opacity, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.opacity, {
          toValue: 0.3,
          duration: duration - 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Remove bubble after animation
      bubbles.current = bubbles.current.filter(b => b.id !== id);
    });

    // Add slight horizontal movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(bubble.x, {
          toValue: startX + 30,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.x, {
          toValue: startX - 30,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {bubbles.current.map((bubble) => (
        <Animated.View
          key={bubble.id}
          style={[
            styles.bubble,
            {
              width: bubble.size,
              height: bubble.size,
              transform: [
                { translateX: bubble.x },
                { translateY: bubble.y },
                { scale: bubble.scale },
              ],
              opacity: bubble.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default AnimatedBackground;