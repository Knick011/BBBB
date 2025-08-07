import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { UserTier } from '../../types/leaderboard';

interface UserTierBadgeProps {
  tier: UserTier;
  size?: 'small' | 'medium' | 'large';
}

const UserTierBadge: React.FC<UserTierBadgeProps> = ({
  tier,
  size = 'medium',
}) => {
  const getTierConfig = (tier: UserTier) => {
    const configs = {
      bronze: {
        colors: ['#CD7F32', '#A0522D'],
        icon: 'medal',
        name: 'Bronze',
      },
      silver: {
        colors: ['#C0C0C0', '#A8A8A8'],
        icon: 'medal',
        name: 'Silver',
      },
      gold: {
        colors: ['#FFD700', '#DAA520'],
        icon: 'crown',
        name: 'Gold',
      },
      platinum: {
        colors: ['#E5E4E2', '#C0C0C0'],
        icon: 'diamond',
        name: 'Platinum',
      },
      diamond: {
        colors: ['#B9F2FF', '#4FC3F7'],
        icon: 'diamond',
        name: 'Diamond',
      },
      legendary: {
        colors: ['#FF6B35', '#FF9F1C'],
        icon: 'crown',
        name: 'Legendary',
      },
    };
    return configs[tier];
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { 
          containerPadding: 6, 
          iconSize: 12, 
          fontSize: 8,
          borderRadius: 8,
        };
      case 'large':
        return { 
          containerPadding: 12, 
          iconSize: 20, 
          fontSize: 12,
          borderRadius: 16,
        };
      default:
        return { 
          containerPadding: 8, 
          iconSize: 16, 
          fontSize: 10,
          borderRadius: 12,
        };
    }
  };

  const tierConfig = getTierConfig(tier);
  const sizeStyles = getSizeStyles();

  return (
    <LinearGradient
      colors={tierConfig.colors}
      style={[
        styles.container,
        {
          padding: sizeStyles.containerPadding,
          borderRadius: sizeStyles.borderRadius,
        },
      ]}
    >
      <Icon
        name={tierConfig.icon}
        size={sizeStyles.iconSize}
        color="white"
      />
      <Text style={[styles.tierText, { fontSize: sizeStyles.fontSize }]}>
        {tierConfig.name}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  tierText: {
    color: 'white',
    fontFamily: 'Nunito-Bold',
    marginLeft: 4,
  },
});

export default UserTierBadge; 