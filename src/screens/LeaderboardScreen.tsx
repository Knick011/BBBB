// src/screens/LeaderboardScreen.tsx - Modern implementation based on reference with Firebase removed
// ✅ FIXES: Complete redesign using reference implementation without Firebase
// ✅ FIXES: Capybara theming and fake data generation maintained
// console.log: "Modern LeaderboardScreen with Firebase removed and enhanced UI"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  RefreshControl,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import theme from '../styles/theme';
import BannerAdComponent from '../components/common/BannerAdComponent';

// ✅ LIVE STATE INTEGRATION
import { useLeaderboardIntegration } from '../hooks/useGameIntegration';
import { useQuizStore } from '../store/useQuizStore';

// Funny capybara-themed player names - expanded for more variety!
const FAKE_NAMES = [
  'CapyBOSSa', 'CapyBALLER', 'HappyBara', 'CapyGOATa', 'CapyBrainiac',
  'CapyCrusher', 'BaraKing', 'CapyChampion', 'RodentRoyalty', 'CapyGenius',
  'AquaticAce', 'CapyMaster', 'SwimmingScholar', 'CapyPro2024', 'BaraBoss',
  'CapyBaller', 'ChillBara', 'CapyDominant', 'SplashyBara', 'CapyElite',
  'BaraGOD', 'CapyLegend', 'WaterPigWins', 'CapyStrong', 'BaraBeats',
  'CapyClever', 'SmartBara', 'CapyQuizKing', 'BaraBrains', 'CapySharp',
  'RodentRuler', 'CapySwift', 'BaraBlitz', 'CapyQuick', 'FastBara',
  'CapyNinja', 'StealthyBara', 'CapyWarrior', 'BaraBattle', 'CapyVictor',
  'WinningBara', 'CapyChamp', 'BaraBest', 'CapySupreme', 'EliteBara',
  'CapyWizard', 'MagicBara', 'CapySage', 'WiseBara', 'CapyOracle',
  'BaraBarista', 'CoffeeCapy', 'SleepyBara', 'NightCapy', 'CapyDreamer',
  'ZenBara', 'ChillCapybara', 'RelaxedRodent', 'CalmCapy', 'PeacefulBara',
  'StudyBara', 'BookishCapy', 'NerdyBara', 'CapyScholar', 'AcademicBara',
  // More fun characters!
  'CapySnacksAlot', 'LazyBara', 'CapyMunchies', 'SunbathingBara', 'CapyFloaty',
  'WetBara', 'CapyBubbles', 'MudBathBara', 'CapySnoozer', 'TranquilBara',
  'CapyVibes', 'ChonkyBara', 'CapyThicc', 'RoundBara', 'CapyBouncy',
  'GentleBara', 'CapyKindness', 'SweetBara', 'CapyHugs', 'CozyBara',
  'CapyNaps', 'DreamyBara', 'CapyCloud9', 'FluffyBara', 'CapySoft',
  'WisdomBara', 'CapyMentor', 'SeniorBara', 'CapyElder', 'VeteranBara',
  'CapyNewbie', 'FreshBara', 'YoungCapy', 'BabyBara', 'TinyCapy',
  'GigaBara', 'MegaCapy', 'UltraBara', 'SuperCapy', 'HyperBara',
  'CapySpeed', 'TurboBara', 'RocketCapy', 'JetBara', 'CapyZoom',
  'QuietBara', 'CapyWhisper', 'SilentBara', 'CapyMute', 'StealthBara'
];

// Calculate score for achievable daily play
// Targeting more realistic scoring for user engagement
// Top players achieve 50k-60k through consistent play and good streaks
const TOP_PLAYER_DAILY_SCORE = 55000; // More achievable top score

// Shuffle array to get random capybara names
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate top 10 competitive but achievable scores
const generateTop10DailyScores = () => {
  const scores = [];
  
  // Shuffle names to get variety each time
  const shuffledNames = shuffleArray(FAKE_NAMES);
  
  // Create a more varied top 10 with bigger gaps for motivation
  const topScores = [
    55000, // #1 - Top player
    48500, // #2 - Strong second place
    42000, // #3 - Solid third
    37500, // #4
    33000, // #5
    29500, // #6
    26000, // #7
    23500, // #8
    21000, // #9
    18500  // #10
  ];
  
  for (let i = 0; i < 10; i++) {
    // Add some small random variation to scores for realism
    const baseScore = topScores[i];
    const variation = Math.floor(Math.random() * 1000) - 500; // ±500 points
    const finalScore = Math.max(baseScore + variation, 1000);
    
    scores.push({
      id: `top_${i}`,
      rank: i + 1,
      displayName: shuffledNames[i],
      score: finalScore,
      highestStreak: Math.floor(Math.random() * 25) + 5, // 5-30 streak
      isCurrentUser: false,
      lastActive: i < 3 ? 'Online now' : `${Math.floor(Math.random() * 59) + 1}m ago`,
    });
  }
  
  return scores;
};

// Calculate user's dynamic rank based on score - more achievable progression
const calculateUserRank = (userScore: number) => {
  // Handle case where user has very low/no score
  if (userScore < 100) {
    return Math.floor(Math.random() * 500) + 2000; // Random rank between 2000-2500
  }
  
  // More dynamic ranking system based on score brackets
  if (userScore >= 50000) return Math.floor(Math.random() * 5) + 1;    // Top 5
  if (userScore >= 40000) return Math.floor(Math.random() * 10) + 6;   // 6-15
  if (userScore >= 30000) return Math.floor(Math.random() * 20) + 16;  // 16-35
  if (userScore >= 20000) return Math.floor(Math.random() * 30) + 36;  // 36-65
  if (userScore >= 15000) return Math.floor(Math.random() * 40) + 66;  // 66-105
  if (userScore >= 10000) return Math.floor(Math.random() * 60) + 106; // 106-165
  if (userScore >= 5000) return Math.floor(Math.random() * 100) + 166; // 166-265
  if (userScore >= 2500) return Math.floor(Math.random() * 200) + 266; // 266-465
  if (userScore >= 1000) return Math.floor(Math.random() * 300) + 466; // 466-765
  
  // Lower scores get higher ranks
  const baseRank = 766;
  const scoreRatio = userScore / 1000; // 0-1 ratio
  const rankRange = 1234; // Range of possible ranks
  return Math.floor(baseRank + (rankRange * (1 - scoreRatio)));
};

// Generate players around user's rank with dynamic scoring
const generateAroundUserScores = (userScore: number, userRank: number) => {
  const scores = [];
  const shuffledNames = shuffleArray(FAKE_NAMES);
  
  // Generate 3-4 players above and 3-4 below the user
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue; // Skip user's position
    
    let rank = userRank + i;
    if (isNaN(rank)) rank = 1000 + i;
    
    // Dynamic score calculation based on rank and user score
    let score;
    if (rank < userRank) {
      // Players above user should have higher scores
      const rankDiff = userRank - rank;
      const scoreIncrease = rankDiff * (50 + Math.random() * 100); // 50-150 points per rank
      score = Math.floor(userScore + scoreIncrease);
    } else {
      // Players below user should have lower scores
      const rankDiff = rank - userRank;
      const scoreDecrease = rankDiff * (30 + Math.random() * 80); // 30-110 points per rank
      score = Math.max(50, Math.floor(userScore - scoreDecrease));
    }
    
    // Use different names from the shuffled array
    const nameIndex = Math.abs(rank + i * 7) % FAKE_NAMES.length;
    
    scores.push({
      id: `around_${rank}_${i}`,
      rank: rank,
      displayName: shuffledNames[nameIndex],
      score: score,
      highestStreak: Math.floor(Math.random() * 35) + 3, // 3-38 streak
      isCurrentUser: false,
      lastActive: Math.random() > 0.3 ? `${Math.floor(Math.random() * 23) + 1}h ago` : 
                  Math.random() > 0.5 ? `${Math.floor(Math.random() * 59) + 1}m ago` : 'Online now',
    });
  }
  
  return scores.sort((a, b) => a.rank - b.rank);
};

interface LeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  score: number;
  highestStreak: number;
  isCurrentUser: boolean;
  lastActive: string;
  isSeparator?: boolean;
}

const LeaderboardScreen = () => {
  const navigation = useNavigation();
  
  // ✅ LIVE STATE INTEGRATION - Real-time user stats
  const { 
    scoreData, 
    userScore, 
    userStreak, 
    userAccuracy, 
    refreshData,
    isInitialized 
  } = useLeaderboardIntegration();
  const [userStreakOverride, setUserStreakOverride] = useState<number | null>(null);
  
  // Get the daily highest streak from quiz store
  const { dailyHighestStreak } = useQuizStore();
  
  const [activeTab, setActiveTab] = useState('global'); // 'global', 'friends'
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    console.log('🏆 [Modern LeaderboardScreen] Component mounted');
    
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for user's entry
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  useEffect(() => {
    if (isInitialized) {
      (async () => {
        try {
          const savedHighestStreak = await (await import('@react-native-async-storage/async-storage')).default.getItem('@BrainBites:highestStreakToday');
          const highestStreakValue = savedHighestStreak ? parseInt(savedHighestStreak, 10) : 0;
          setUserStreakOverride(highestStreakValue);
        } catch {}
      })();
      loadLeaderboardData();
      setIsLoading(false);
    }
  }, [activeTab, userScore, isInitialized]);

  // Refresh leaderboard when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        console.log('🏆 [Modern LeaderboardScreen] Screen focused, refreshing data');
        
        // Load the daily highest streak
        await useQuizStore.getState().loadDailyHighest();
        
        refreshData();
      };
      
      loadData();
    }, [])
  );
  
  const loadLeaderboardData = useCallback(() => {
    console.log('🏆 [LeaderboardScreen] Loading leaderboard data for tab:', activeTab, 'with score:', userScore);
    let fakeData: LeaderboardEntry[] = [];
    let userPosition = 0;
    
    switch (activeTab) {
      case 'global': {
        const top10 = generateTop10DailyScores();
        const userRank = calculateUserRank(userScore);
        setUserRank(userRank);
        
        // Create user data object with real streak data
        const userData = {
          id: 'current_user',
          rank: userRank,
          displayName: 'CaBBybara',
          score: userScore,
          highestStreak: userStreakOverride ?? userStreak,
          dailyHighestStreak: dailyHighestStreak || (userStreakOverride ?? userStreak),
          isCurrentUser: true,
          lastActive: 'Online now',
        };
        
        if (userScore > top10[9].score) {
          // User is in top 10
          const insertIndex = top10.findIndex(p => p.score < userScore);
          userData.rank = insertIndex + 1;
          top10.splice(insertIndex, 0, userData);
          top10.pop(); // Remove the last item to keep top 10
          
          // Update ranks for all players
          top10.forEach((player, index) => {
            player.rank = index + 1;
          });
          
          fakeData = top10;
          setUserRank(userData.rank);
        } else {
          // User is not in top 10, show top 10 + separator + user area
          fakeData = [...top10];
          fakeData.push({ id: 'separator', isSeparator: true } as LeaderboardEntry);
          
          const aroundUser = generateAroundUserScores(userScore, userRank);
          fakeData = fakeData.concat(aroundUser);
          
          // Insert user in the correct position among nearby players
          const insertIndex = fakeData.findIndex(p => !p.isSeparator && p.rank > userRank);
          if (insertIndex !== -1) {
            fakeData.splice(insertIndex, 0, userData);
          } else {
            fakeData.push(userData);
          }
        }
        break;
      }
      case 'friends': {
        // Mix of friend-themed names and regular capybara names for variety
        const friendNames = [
          'BestBaraBuddy', 'StudyCapy', 'CoffeeBara', 'GymCapybara', 'RoommateBara',
          'WorkCapy', 'OldBaraFriend', 'NewCapyPal', 'CoolCapyCousin', 'SisterBara'
        ];
        
        // Add some regular capybara names to friends list for more variety
        const shuffledCapyNames = shuffleArray(FAKE_NAMES).slice(0, 8);
        const allFriendNames = [...friendNames, ...shuffledCapyNames];
        
        const friendScores = allFriendNames.map((name, i) => {
          const variance = (Math.random() - 0.5) * userScore * 0.6; // More score variation
          return {
            id: `friend_${i}`,
            rank: 0,
            displayName: name,
            score: Math.max(50, Math.floor(userScore + variance)),
            highestStreak: Math.floor(Math.random() * 30) + 2, // 2-32 streak variety
            isCurrentUser: false,
            lastActive: i < 4 ? 'Online now' : 
                       i < 8 ? `${Math.floor(Math.random() * 59) + 1}m ago` :
                       `${Math.floor(Math.random() * 23) + 1}h ago`,
          };
        });
        
        friendScores.push({
          id: 'current_user',
          rank: 0,
          displayName: 'CaBBybara',
          score: userScore,
          highestStreak: userStreak,
          dailyHighestStreak: dailyHighestStreak || userStreak,
          isCurrentUser: true,
          lastActive: 'Online now',
        });
        friendScores.sort((a, b) => b.score - a.score);
        friendScores.forEach((friend, index) => {
          friend.rank = index + 1;
        });
        fakeData = friendScores;
        const userFriendRank = friendScores.findIndex(f => f.isCurrentUser) + 1;
        setUserRank(userFriendRank);
        break;
      }
    }
    console.log('🏆 [LeaderboardScreen] Generated leaderboard data:', fakeData.length, 'items');
    setLeaderboardData(fakeData);
  }, [activeTab, userScore, userStreak]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    SoundService.playButtonPress();
    
    // Simulate network delay
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    
    // Refresh user score first to get latest data
    await refreshData();
    
    // Then reload leaderboard with fresh character variety
    loadLeaderboardData();
    setIsRefreshing(false);
  };
  
  const handleTabChange = (tab: string) => {
    SoundService.playButtonPress();
    setActiveTab(tab);
  };

  // FlatList optimization functions
  const keyExtractor = (item: LeaderboardEntry) => item.id;
  
  const getItemLayout = (_: any, index: number) => ({
    length: 74, // consistent item height (includes margin)
    offset: 74 * index,
    index,
  });

  const renderItem = useCallback(({ item, index }: { item: LeaderboardEntry; index: number }) => {
    return renderLeaderboardItem({ item, index });
  }, [fadeAnim, slideAnim, pulseAnim, activeTab]);
  
  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    if (item.isSeparator) {
      return (
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <View style={styles.separatorTextContainer}>
            <Icon name="dots-vertical" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.separatorText}>
              {activeTab === 'global' ? 'Many capybaras later...' : 'More capybaras...'}
            </Text>
            <Icon name="dots-vertical" size={20} color={theme.colors.textSecondary} />
          </View>
          <View style={styles.separatorLine} />
        </View>
      );
    }

    const isTop3 = item.rank <= 3;
    const isCurrentUser = item.isCurrentUser;

    return (
      <Animated.View 
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.currentUserItem,
          { opacity: fadeAnim }
        ]}
      >
        {/* Rank & Name */}
        <View style={styles.rankContainer}>
          <View style={[styles.rankBadge, isTop3 && styles.topRankBadge]}>
            <Text style={[styles.rankText, isTop3 && styles.topRankText]}>
              {item.rank}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.playerName}>
              {item.displayName}
            </Text>
            <Text style={styles.lastActive}>
              {item.lastActive}
            </Text>
          </View>
        </View>

        {/* Score & Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.scoreContainer}>
            <Icon name="star" size={16} color={theme.colors.warning} />
            <Text style={styles.scoreText}>
              {item.score.toLocaleString()}
            </Text>
          </View>
          <View style={styles.streakContainer}>
            <Icon name="fire" size={16} color={theme.colors.primary} />
            <Text style={styles.streakText}>
              {item.dailyHighestStreak || item.highestStreak || 0}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // User Stats Section
  const renderUserStats = () => {
    const { userScore, userStreak, userAccuracy } = useLeaderboardIntegration();
    
    return (
      <View style={styles.userStatsContainer}>
        <Text style={styles.userStatsTitle}>Your Stats</Text>
        <View style={styles.userStatsGrid}>
          {/* Daily Score */}
          <View style={styles.statCard}>
            <Icon name="star" size={24} color={theme.colors.warning} />
            <Text style={styles.statValue}>{userScore.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Daily Score</Text>
          </View>
          
          {/* Best Streak */}
          <View style={styles.statCard}>
            <Icon name="fire" size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{dailyHighestStreak || 0}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          
          {/* Accuracy */}
          <View style={styles.statCard}>
            <Icon name="target" size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{userAccuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>
      </View>
    );
  };
  
  const renderUserCard = useCallback(() => {
    if (!userRank) return null;
    
    const totalPlayers = activeTab === 'friends' ? 19 : '47.3K'; // Updated for more friends
    
    const percentile = activeTab === 'friends' ? 
      Math.round(((19 - userRank) / 18) * 100) :
      Math.round(((1 - (userRank / 47300)) * 100));
    
    return (
      <Animated.View 
        style={[
          styles.userCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <View style={styles.userCardContent}>
          <View style={styles.userCardLeft}>
            <Text style={styles.userCardLabel}>Your Rank</Text>
            <Text style={styles.userCardRank}>#{userRank}</Text>
            <Text style={styles.userCardSubtext}>of {totalPlayers} capybaras</Text>
          </View>
          <View style={styles.userCardRight}>
            <Text style={styles.userCardLabel}>Top {percentile}%</Text>
            <View style={styles.userCardStats}>
              <View style={styles.userCardStatItem}>
                <Icon name="star" size={16} color={theme.colors.warning} />
                <Text style={styles.userCardScore}>
                  {(userScore ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.userCardStatItem}>
                <Icon name="fire" size={16} color={theme.colors.primary} />
                <Text style={styles.userCardScore}>
                  {dailyHighestStreak || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }, [userRank, userScore, userStreak, activeTab, fadeAnim, pulseAnim]);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          SoundService.playButtonPress();
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('Home');
          }
        }} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Capybara Rankings</Text>
          <Text style={styles.headerSubtitle}>CaBBybara Leaderboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'global' && styles.activeTab]}
          onPress={() => handleTabChange('global')}
        >
          <Icon name="earth" size={20} color={activeTab === 'global' ? '#FF9F1C' : '#777'} />
          <Text style={[styles.tabText, activeTab === 'global' && styles.activeTabText]}>Global</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => handleTabChange('friends')}
        >
          <Icon name="account-group" size={20} color={activeTab === 'friends' ? '#FF9F1C' : '#777'} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Friends</Text>
        </TouchableOpacity>
      </View>
      
      {/* User's rank card */}
      {renderUserCard()}
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text style={styles.loadingText}>Loading scores...</Text>
        </View>
      )}
      
             {/* Leaderboard list */}
       {!isLoading && leaderboardData.length > 0 && (
       <FlatList
         data={leaderboardData}
         renderItem={renderItem}
         keyExtractor={keyExtractor}
         style={styles.scrollView}
         contentContainerStyle={styles.scrollContent}
         showsVerticalScrollIndicator={false}
         removeClippedSubviews={false}
         refreshControl={
           <RefreshControl
             refreshing={isRefreshing}
             onRefresh={handleRefresh}
             colors={['#FF9F1C']}
             tintColor={'#FF9F1C'}
           />
         }
         ListFooterComponent={() => (
           <View style={styles.footer}>
             <Icon name="rodent" size={20} color="#999" />
             <Text style={styles.footerText}>
               {'Capybara scores reset daily at midnight'}
             </Text>
           </View>
         )}
       />
       )}
       
       {/* Show message if no data */}
       {!isLoading && leaderboardData.length === 0 && (
         <View style={styles.emptyContainer}>
           <Icon name="rodent" size={48} color="#ccc" />
           <Text style={styles.emptyText}>No capybaras found!</Text>
           <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
             <Text style={styles.retryButtonText}>Try Again</Text>
           </TouchableOpacity>
         </View>
       )}
      <BannerAdComponent placement="leaderboard_screen" />
      </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF9F1C',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  activeTabText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: '#FF9F1C',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  userCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userCardLeft: {
    alignItems: 'flex-start',
  },
  userCardRight: {
    alignItems: 'flex-end',
  },
  userCardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  userCardRank: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  userCardScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  userCardSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    ...theme.shadows.small,
  },
  currentUserItem: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topRankBadge: {
    backgroundColor: theme.colors.warning,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  topRankText: {
    color: 'white',
  },
  nameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  
  // User Stats Styles
  userStatsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.small,
  },
  userStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  userStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  
  // Separator Style
  separator: {
    marginVertical: 16,
    alignItems: 'center',
  },
  separatorLine: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    flex: 1,
  },
  separatorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  separatorText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginHorizontal: 8,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#FF9F1C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  userCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
});

export default LeaderboardScreen;