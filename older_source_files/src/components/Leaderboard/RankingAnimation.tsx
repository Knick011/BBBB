import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

interface RankingAnimationProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  animationType?: 'slideUp' | 'slideIn' | 'fadeIn' | 'scale';
}

const RankingAnimation: React.FC<RankingAnimationProps> = ({
  children,
  delay = 0,
  style,
  animationType = 'slideIn',
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animations = [];

    if (animationType === 'slideUp' || animationType === 'slideIn') {
      animations.push(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 600,
          delay,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'fadeIn') {
      animations.push(
        Animated.timing(animValue, {
          toValue: 1,
          duration: 400,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'scale') {
      animations.push(
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [delay, animationType]);

  const getTransform = () => {
    switch (animationType) {
      case 'slideUp':
        return [
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ];
      case 'slideIn':
        return [
          {
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          },
        ];
      case 'scale':
        return [{ scale: scaleValue }];
      default:
        return [];
    }
  };

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animValue,
          transform: getTransform(),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default RankingAnimation; 