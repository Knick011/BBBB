import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

interface DifficultyOption {
  level: 'easy' | 'medium' | 'hard';
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  points: string;
  timeReward: number;
}

interface DifficultyCardProps {
  difficulty: DifficultyOption;
  onPress: () => void;
  style?: ViewStyle;
}

const DifficultyCard: React.FC<DifficultyCardProps> = ({ difficulty, onPress, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getGradientColors = () => {
    switch (difficulty.level) {
      case 'easy':
        return ['#66BB6A', '#4CAF50'];
      case 'medium':
        return ['#FFB74D', '#FFA500'];
      case 'hard':
        return ['#EF5350', '#F44336'];
      default:
        return ['#FFD700', '#FFA500'];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.6],
                }),
              },
            ]}
          />
          
          <View style={styles.iconContainer}>
            <Icon name={difficulty.icon} size={40} color="#FFF" />
          </View>
          
          <View style={styles.content}>
            <Text style={styles.title}>{difficulty.title}</Text>
            <Text style={styles.subtitle}>{difficulty.subtitle}</Text>
            
            <View style={styles.rewards}>
              <View style={styles.rewardItem}>
                <Icon name="star-outline" size={16} color="#FFD700" />
                <Text style={styles.rewardText}>{difficulty.points}</Text>
              </View>
              <View style={styles.rewardItem}>
                <Icon name="time" size={16} color="#4CAF50" />
                <Text style={styles.rewardText}>+{difficulty.timeReward}min</Text>
              </View>
            </View>
          </View>
          
                          <Icon name="chevron-forward-circle" size={24} color="#FFF" style={styles.arrow} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: '#FFF',
    borderRadius: 75,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
    fontFamily: 'Quicksand-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    fontFamily: 'Nunito-Regular',
  },
  rewards: {
    flexDirection: 'row',
    gap: 15,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  rewardText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: 'Nunito-Bold',
  },
  arrow: {
    marginLeft: 10,
  },
});

export default DifficultyCard;