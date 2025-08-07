import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import theme from '../../styles/theme';

interface StreakIndicatorProps {
  streak: number;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak }) => {
  return (
    <View style={styles.container}>
      <Icon name="flame" size={20} color={streak > 0 ? '#FF6B35' : theme.colors.textLight} />
      <Text style={[styles.streakText, streak > 0 && styles.activeStreak]}>
        {streak}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  streakText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.fonts.primaryBold,
    color: theme.colors.textWhite,
    marginLeft: 4,
  },
  activeStreak: {
    color: '#FFD700',
  },
});

export default StreakIndicator; 