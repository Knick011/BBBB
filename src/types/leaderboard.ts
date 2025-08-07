// src/types/leaderboard.ts
// Additional leaderboard types for enhanced functionality

export interface LeaderboardUser {
  id: string;
  name: string;
  displayName: string;
  score: number;
  streak: number;
  highestStreak: number;
  questionsPerDay: number;
  accuracy: number;
  avatar: string;
  lastActive: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  isCurrentUser?: boolean;
  rank?: number;
}

export interface LeaderboardStats {
  totalUsers: number;
  userRank: number;
  topPercentile: number;
  averageScore: number;
  userScore: number;
  scoreImprovement: number;
}

export interface RankingTier {
  name: string;
  minScore: number;
  color: string;
  icon: string;
  benefits: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'streak' | 'score' | 'accuracy' | 'consistency' | 'special';
}

export interface UserProfile {
  id: string;
  displayName: string;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
  questionsAnswered: number;
  accuracy: number;
  rank: number;
  tier: RankingTier;
  achievements: Achievement[];
  dailyGoalsCompleted: number;
  joinedDate: string;
  lastActiveDate: string;
  favoriteCategory: string;
  averageSessionTime: number;
}