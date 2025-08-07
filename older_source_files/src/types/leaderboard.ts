// src/types/leaderboard.ts
export interface LeaderboardPlayer {
    id: string;
    rank: number;
    displayName: string;
    score: number;
    highestStreak: number;
    isCurrentUser: boolean;
    lastActive: string;
    avatar?: string;
    badge?: BadgeType;
    percentile?: number;
    isSeparator?: boolean;
    isRising?: boolean;
    rankChange?: number;
    achievements?: Achievement[];
    level?: number;
    totalQuestions?: number;
    accuracy?: number;
  }
  
  export interface UserStats {
    rank: number;
    score: number;
    percentile: number;
    totalPlayers: number;
    rankChange: number;
    achievements: string[];
    weeklyRank?: number;
    monthlyRank?: number;
    tier?: UserTier;
  }
  
  export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    unlockedAt?: Date;
    progress?: number;
    maxProgress?: number;
  }
  
  export type BadgeType = 'crown' | 'fire' | 'star' | 'diamond' | 'lightning' | 'brain' | 'rocket';
  
  export type UserTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  
  export interface RankingPeriod {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }
  
  // src/components/Leaderboard/AchievementBadge.tsx
  import React from 'react';
  import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
  // Additional type interfaces for leaderboard functionality
  export interface AchievementBadgeProps {
    achievement: Achievement;
    size?: 'small' | 'medium' | 'large';
    onPress?: () => void;
  }
  
  export interface UserTierBadgeProps {
    tier: UserTier;
    size?: 'small' | 'medium' | 'large';
  }
  
  export interface RankingAnimationProps {
    children: React.ReactNode;
    delay?: number;
    style?: any;
    animationType?: 'slideUp' | 'slideIn' | 'fadeIn' | 'scale';
  }