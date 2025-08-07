import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Achievement } from '../../types/leaderboard';
import theme from '../../styles/theme';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  onPress,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32, iconSize: 16, fontSize: 10 };
      case 'large':
        return { width: 60, height: 60, iconSize: 30, fontSize: 14 };
      default:
        return { width: 44, height: 44, iconSize: 22, fontSize: 12 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: sizeStyles.width,
          height: sizeStyles.height,
          backgroundColor: achievement.color,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Icon
        name={achievement.icon}
        size={sizeStyles.iconSize}
        color="white"
      />
      {achievement.progress !== undefined && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { fontSize: sizeStyles.fontSize }]}>
            {achievement.progress}/{achievement.maxProgress}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  progressContainer: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  progressText: {
    color: 'white',
    fontFamily: 'Nunito-Bold',
  },
});

export default AchievementBadge; 