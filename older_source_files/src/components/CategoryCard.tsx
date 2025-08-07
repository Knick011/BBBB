// src/components/CategoryCard.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CategoryInfo } from '../utils/categoryUtils';
import theme from '../styles/theme';

interface CategoryCardProps {
  category: CategoryInfo;
  onPress: (category: CategoryInfo) => void;
  animationValue?: Animated.Value;
  delay?: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  animationValue,
  delay = 0
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const animations = React.useRef<Animated.CompositeAnimation[]>([]);

  // Cleanup animations on unmount
  React.useEffect(() => {
    return () => {
      animations.current.forEach(anim => anim.stop());
      animations.current = [];
    };
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = () => {
    onPress(category);
  };

  const animatedStyle = animationValue ? {
    opacity: animationValue,
    transform: [
      {
        translateY: animationValue.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0]
        })
      },
      {
        scale: scaleAnim
      },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '2deg']
        })
      }
    ]
  } : {};

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 48 = padding + margin

  return (
    <Animated.View style={[styles.container, animatedStyle, { width: cardWidth }]}>
      <TouchableOpacity 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={category.gradient}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Icon 
                name={category.icon} 
                size={36} 
                color="white" 
                style={styles.icon}
              />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.categoryName} numberOfLines={2}>
                {category.displayName}
              </Text>
              <View style={styles.statsContainer}>
                <Icon name="help-circle-outline" size={14} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.questionCount}>
                  {category.questionCount} {category.questionCount === 1 ? 'question' : 'questions'}
                </Text>
              </View>
            </View>

            <View style={styles.playButton}>
              <Icon name="play-circle" size={28} color="rgba(255, 255, 255, 0.95)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 8,
    minWidth: 150,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    minHeight: 140,
    ...theme.shadows.large,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  questionCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  playButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },
});

export default CategoryCard; 