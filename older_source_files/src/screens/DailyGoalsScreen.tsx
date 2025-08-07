// src/screens/DailyGoalsScreen.tsx
// ✅ FIXED DAILY GOALS SCREEN WITH WORKING GOALS
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Animated,
  Easing,
  Platform,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import DailyGoalsService, { DailyGoal } from '../services/DailyGoalsService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DailyGoals'>;
type MascotType = 'happy' | 'sad' | 'excited' | 'depressed' | 'gamemode' | 'below';

const DailyGoalsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // State
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animatingGoals, setAnimatingGoals] = useState<string[]>([]);
  
  // Mascot state
  const [mascotType, setMascotType] = useState<MascotType>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnims = useRef<Animated.Value[]>([]).current;
  const claimButtonAnims = useRef<Animated.Value[]>([]).current;

  // Initialize animations
  useEffect(() => {
    dailyGoals.forEach((_, index) => {
      if (!slideAnims[index]) {
        slideAnims[index] = new Animated.Value(0);
      }
      if (!claimButtonAnims[index]) {
        claimButtonAnims[index] = new Animated.Value(1);
      }
    });
  }, [dailyGoals]);

  // Load goals when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
      
      // Listen for goal updates
      const unsubscribe = DailyGoalsService.addListener((updatedGoals) => {
        console.log('🎯 [DailyGoalsScreen] Goals updated:', updatedGoals.length);
        setDailyGoals(updatedGoals);
      });

      return unsubscribe;
    }, [])
  );

  // Entrance animation
  useEffect(() => {
    if (dailyGoals.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Stagger goal animations
      const animations = dailyGoals.map((_, index) => 
        Animated.timing(slideAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );

      Animated.stagger(100, animations).start();
    }
  }, [dailyGoals]);

    const loadGoals = async () => {
    try {
      setIsLoading(true);
      console.log('🎯 [DailyGoalsScreen] Loading goals...');
      
      await DailyGoalsService.initialize();
      const goals = DailyGoalsService.getGoals();
      
      console.log('🎯 [DailyGoalsScreen] Loaded goals:', goals.length, goals.map(g => g.title));
      
      // Debug current goals
      DailyGoalsService.debugGoals();
      
      // Check if we have honor goals - if not, force regenerate
      const honorGoals = goals.filter(g => g.honorBased);
      if (honorGoals.length === 0) {
        console.log('🔄 [DailyGoalsScreen] No honor goals found, forcing regeneration...');
        await DailyGoalsService.forceRegenerateGoals();
        const newGoals = DailyGoalsService.getGoals();
        console.log('🔄 [DailyGoalsScreen] Regenerated goals:', newGoals.length, newGoals.map(g => g.title));
        DailyGoalsService.debugGoals();
        setDailyGoals(newGoals);
      } else {
        setDailyGoals(goals);
      }
      
      if (goals.length === 0) {
        console.warn('⚠️ [DailyGoalsScreen] No goals loaded - this should not happen');
        Alert.alert(
          'No Goals Found',
          'Unable to load daily goals. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Failed to load goals:', error);
      Alert.alert(
        'Error',
        'Failed to load daily goals. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGoals();
    setIsRefreshing(false);
  };

  const handleCompleteHonorGoal = async (goalId: string, goalIndex: number) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal || !goal.honorBased || goal.completed) {
      return;
    }

    try {
      console.log(`🎯 [DailyGoalsScreen] Completing honor goal: ${goal.title}`);
      
      const success = await DailyGoalsService.completeHonorGoal(goalId);
      
      if (success) {
        SoundService.playCorrect();
        
        // Show mascot celebration
        setMascotType('excited');
        setMascotMessage(`Great job! You completed "${goal.title}"! 🎉`);
        setShowMascot(true);
        
        console.log(`✅ [DailyGoalsScreen] Successfully completed honor goal: ${goal.title}`);
      } else {
        SoundService.playIncorrect();
        Alert.alert(
          'Error',
          'Unable to complete goal. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Error completing honor goal:', error);
      SoundService.playIncorrect();
      Alert.alert(
        'Error',
        'An error occurred while completing your goal.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClaimReward = async (goalId: string, goalIndex: number) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal || !goal.completed || goal.claimed) {
      return;
    }

    try {
      // Animation: Claim button press
      Animated.sequence([
        Animated.timing(claimButtonAnims[goalIndex], {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(claimButtonAnims[goalIndex], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        })
      ]).start();

      console.log(`🎯 [DailyGoalsScreen] Claiming reward for: ${goal.title}`);
      
      // Claim the reward
      const success = await DailyGoalsService.claimReward(goalId);
      
      if (success) {
        // Success animation and sound
        SoundService.playCorrect();
        
        // Show mascot celebration
        setMascotType('excited');
        setMascotMessage(`Awesome! You earned ${Math.floor(goal.reward / 60)} minutes! 🎉`);
        setShowMascot(true);
        
        // Add goal to animating list
        setAnimatingGoals(prev => [...prev, goalId]);
        
        // Remove from animating after delay
        setTimeout(() => {
          setAnimatingGoals(prev => prev.filter(id => id !== goalId));
        }, 2000);
        
        console.log(`✅ [DailyGoalsScreen] Successfully claimed reward for ${goal.title}`);
      } else {
        // Error feedback
        SoundService.playIncorrect();
        Alert.alert(
          'Claim Failed',
          'Unable to claim reward. Please try again.',
          [{ text: 'OK' }]
        );
        console.error(`❌ [DailyGoalsScreen] Failed to claim reward for ${goal.title}`);
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Error claiming reward:', error);
      SoundService.playIncorrect();
      Alert.alert(
        'Error',
        'An error occurred while claiming your reward.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderGoalItem = (goal: DailyGoal, index: number) => {
    const isAnimating = animatingGoals.includes(goal.id);
    
    return (
      <Animated.View
        key={goal.id}
        style={[
          styles.goalCard,
          {
            opacity: slideAnims[index] || 1,
            transform: [{
              translateY: slideAnims[index]?.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }) || 0
            }]
          }
        ]}
      >
                 <View style={styles.goalHeader}>
           <View style={[styles.goalIconContainer, { backgroundColor: goal.color }]}>
             <Icon name={goal.icon} size={24} color="white" />
           </View>
           <View style={styles.goalInfo}>
             <Text style={styles.goalTitle}>{goal.title}</Text>
             <Text style={styles.goalDescription}>{goal.description}</Text>
             {goal.honorBased && (
               <View style={styles.honorBadge}>
                 <Icon name="heart" size={12} color="#FF5722" />
                 <Text style={styles.honorText}>Honor-based</Text>
               </View>
             )}
           </View>
           <View style={styles.rewardContainer}>
             <Icon name="clock-outline" size={16} color="#FF9F1C" />
             <Text style={styles.rewardText}>+{Math.floor(goal.reward / 60)}m</Text>
           </View>
         </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: goal.color,
                  width: `${goal.progress}%`,
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {goal.type === 'accuracy' && goal.questionsRequired
              ? `${goal.current}% accuracy (${goal.questionsAnswered || 0}/${goal.questionsRequired} questions)`
              : `${goal.current} / ${goal.target}`}
          </Text>
        </View>

        {/* Honor Goal - Show Complete button if not completed */}
        {goal.honorBased && !goal.completed && (
          <Animated.View
            style={{
              opacity: claimButtonAnims[index] || 1,
              transform: [{
                scale: claimButtonAnims[index] || 1
              }]
            }}
          >
            <TouchableOpacity
              style={[
                styles.claimButton,
                { backgroundColor: '#4CAF50' }
              ]}
              onPress={() => {
                Alert.alert(
                  'Complete Honor Goal',
                  `Did you complete "${goal.description}"?`,
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, I completed it!', onPress: () => handleCompleteHonorGoal(goal.id, index) }
                  ]
                );
              }}
            >
              <Icon 
                name="check-circle-outline" 
                size={20} 
                color="white" 
              />
              <Text style={styles.claimButtonText}>
                Mark as Complete
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Regular Goal - Show Claim button if completed but not claimed */}
        {!goal.honorBased && goal.completed && !goal.claimed && (
          <Animated.View
            style={{
              opacity: claimButtonAnims[index] || 1,
              transform: [{
                scale: claimButtonAnims[index] || 1
              }]
            }}
          >
            <TouchableOpacity
              style={[
                styles.claimButton,
                goal.claimed && styles.claimedButton,
                isAnimating && styles.animatingButton
              ]}
              onPress={() => handleClaimReward(goal.id, index)}
              disabled={goal.claimed || isAnimating}
            >
              <Icon 
                name={goal.claimed ? "check-circle" : isAnimating ? "loading" : "gift-outline"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.claimButtonText}>
                {goal.claimed ? 'Claimed' : isAnimating ? 'Claiming...' : 'Claim Reward'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Honor Goal - Show Claim button if completed but not claimed */}
        {goal.honorBased && goal.completed && !goal.claimed && (
          <Animated.View
            style={{
              opacity: claimButtonAnims[index] || 1,
              transform: [{
                scale: claimButtonAnims[index] || 1
              }]
            }}
          >
            <TouchableOpacity
              style={[
                styles.claimButton,
                goal.claimed && styles.claimedButton,
                isAnimating && styles.animatingButton
              ]}
              onPress={() => {
                Alert.alert(
                  'Honor-Based Goal',
                  `Did you complete "${goal.description}"?`,
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes', onPress: () => handleClaimReward(goal.id, index) }
                  ]
                );
              }}
              disabled={goal.claimed || isAnimating}
            >
              <Icon 
                name={goal.claimed ? "check-circle" : isAnimating ? "loading" : "gift-outline"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.claimButtonText}>
                {goal.claimed ? 'Claimed' : isAnimating ? 'Claiming...' : 'Claim Reward'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

     const completedCount = dailyGoals.filter(g => g.completed).length;
   const claimedCount = dailyGoals.filter(g => g.claimed).length;
   const honorCount = dailyGoals.filter(g => g.honorBased).length;
   const totalRewards = Math.floor(DailyGoalsService.getTotalRewards() / 60);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Daily Goals</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={48} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your daily goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
                 <View style={styles.headerTitleContainer}>
           <Text style={styles.headerTitle}>Daily Goals</Text>
           <Text style={styles.headerSubtitle}>Complete to earn time!</Text>
         </View>
         <TouchableOpacity 
           onPress={async () => {
             console.log('🔄 [DailyGoalsScreen] Manual refresh triggered');
             await DailyGoalsService.forceRegenerateGoals();
             await loadGoals();
           }}
           style={styles.debugButton}
         >
           <Icon name="refresh" size={20} color="#FF5722" />
         </TouchableOpacity>
      </View>
      
      {/* Summary Card */}
      <Animated.View 
        style={[
          styles.summaryCard,
          { opacity: fadeAnim }
        ]}
      >
                 <View style={styles.summaryRow}>
           <View style={styles.summaryItem}>
             <Text style={styles.summaryValue}>{completedCount}/{dailyGoals.length}</Text>
             <Text style={styles.summaryLabel}>Completed</Text>
           </View>
           <View style={styles.summaryDivider} />
           <View style={styles.summaryItem}>
             <Text style={styles.summaryValue}>{claimedCount}/{dailyGoals.length}</Text>
             <Text style={styles.summaryLabel}>Claimed</Text>
           </View>
           <View style={styles.summaryDivider} />
           <View style={styles.summaryItem}>
             <Text style={[styles.summaryValue, honorCount > 0 && { color: '#FF5722' }]}>{honorCount}</Text>
             <Text style={[styles.summaryLabel, honorCount > 0 && { color: '#FF5722' }]}>Honor Goals</Text>
           </View>
         </View>
      </Animated.View>
      
      {/* Goals List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {dailyGoals.length > 0 ? (
          dailyGoals.map((goal, index) => renderGoalItem(goal, index))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="target" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Goals Available</Text>
            <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
          </View>
        )}
        
        <View style={styles.footer}>
          <Icon name="information-circle-outline" size={20} color="#999" />
          <Text style={styles.footerText}>
            Goals reset daily at midnight
          </Text>
        </View>
      </ScrollView>
      
      {/* Enhanced Mascot */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="right"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={() => setShowMascot(false)}
        autoHide={true}
        autoHideDuration={3000}
        fullScreen={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
   debugButton: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    ...theme.shadows.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
     goalDescription: {
     fontSize: 14,
     color: '#666',
     fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
   },
   honorBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     marginTop: 4,
   },
   honorText: {
     fontSize: 10,
     color: '#FF5722',
     marginLeft: 4,
     fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
     fontWeight: 'bold',
   },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rewardText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9F1C',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  claimButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    ...theme.shadows.small,
  },
  claimedButton: {
    backgroundColor: '#4CAF50',
  },
  animatingButton: {
    backgroundColor: '#FF9800',
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
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
});

export default DailyGoalsScreen;