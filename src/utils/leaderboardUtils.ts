import { LeaderboardPlayer, UserTier } from '../types/leaderboard';

export const generateCapybaraName = (): string => {
  const prefixes = [
    'Capy', 'Bara', 'Hydro', 'Aqua', 'Zen', 'Chill', 'Swift', 'Mega', 
    'Ultra', 'Quantum', 'Neo', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega'
  ];
  
  const suffixes = [
    'Genius', 'Master', 'Lord', 'King', 'Queen', 'Champion', 'Legend', 
    'Pro', 'Elite', 'Supreme', 'Ultimate', 'Prime', 'Max', 'X', 'Z'
  ];
  
  const middles = [
    'Brain', 'Quiz', 'Smart', 'Wise', 'Swift', 'Flash', 'Bolt', 'Storm',
    'Fire', 'Ice', 'Thunder', 'Lightning', 'Cosmic', 'Stellar', 'Nova'
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const middle = middles[Math.floor(Math.random() * middles.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  // Sometimes skip middle word
  if (Math.random() > 0.6) {
    return `${prefix}${suffix}`;
  }
  
  return `${prefix}${middle}${suffix}`;
};

export const calculateUserTier = (rank: number, totalPlayers: number): UserTier => {
  const percentile = ((totalPlayers - rank) / totalPlayers) * 100;
  
  if (percentile >= 99) return 'legendary';
  if (percentile >= 90) return 'diamond';
  if (percentile >= 75) return 'platinum';
  if (percentile >= 50) return 'gold';
  if (percentile >= 25) return 'silver';
  return 'bronze';
};

export const formatRankChange = (change: number): string => {
  if (change === 0) return '';
  if (change > 0) return `+${change}`;
  return `${change}`;
};

export const getLastActiveColor = (lastActive: string): string => {
  if (lastActive.includes('Online now')) return '#4CAF50';
  if (lastActive.includes('m')) return '#FF9800';
  if (lastActive.includes('h')) return '#FF5722';
  return '#999';
};

export const generateAchievements = (player: LeaderboardPlayer) => {
  const achievements = [];
  
  if (player.highestStreak >= 20) {
    achievements.push({
      id: 'streak_master',
      name: 'Streak Master',
      description: '20+ question streak',
      icon: 'fire',
      color: '#FF6B35',
    });
  }
  
  if (player.rank <= 10) {
    achievements.push({
      id: 'top_performer',
      name: 'Top Performer',
      description: 'Top 10 global rank',
      icon: 'crown',
      color: '#FFD700',
    });
  }
  
  if (player.score >= 100000) {
    achievements.push({
      id: 'score_legend',
      name: 'Score Legend',
      description: '100K+ points',
      icon: 'star',
      color: '#2196F3',
    });
  }
  
  return achievements;
}; 