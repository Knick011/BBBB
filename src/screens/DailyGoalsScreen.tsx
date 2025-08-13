// src/screens/DailyGoalsScreen.tsx - Updated with ad-gating support
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Alert,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DailyGoalsService from '../services/DailyGoalsService';
import SoundService from '../services/SoundService';
import LinearGradient from 'react-native-linear-gradient';
import { DailyGoal } from '../services/DailyGoalsService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import RewardedAdService from '../services/RewardedAdService';
import theme from '../styles/theme';

// Extracted child component to avoid using hooks inside render loops
type GoalCardProps = {
  goal: DailyGoal;
  index: number;
  fadeValue?: Animated.Value | number;
  scaleValue?: Animated.Value | number;
  onUnlockGoal: (goalId: string) => void;
  onClaimReward: (goalId: string) => void;
  onCompleteHonorGoal: (goalId: string) => void;
};

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  index,
  fadeValue,
  scaleValue,
  onUnlockGoal,
  onClaimReward,
  onCompleteHonorGoal,
}) => {
  const isLocked = goal.requiresAdUnlock && !goal.unlocked;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: goal.progress,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [goal.progress, progressAnim]);

  const getStatusColor = () => {
    if (isLocked) return '#BDBDBD';
    if (goal.completed) return '#4CAF50';
    // Default to goal's accent color for a more vibrant look
    return goal.color || '#4CAF50';
  };

  const getStatusIcon = () => {
    if (isLocked) return 'lock';
    if (goal.completed && goal.claimed) return 'check-circle';
    if (goal.completed) return 'gift';
    return goal.icon;
  };

  return (
    <Animated.View
      style={[
        styles.goalCard,
        {
          opacity: fadeValue || 1,
          transform: [{ scale: (scaleValue as any) || 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={isLocked ? ['#f8f8f8', '#f0f0f0'] : ['#ffffff', '#fafafa']}
        style={styles.goalGradient}
      >
        {/* Progress Border */}
        <View style={[styles.progressBorder, { backgroundColor: getStatusColor() }]} />

        {/* Goal Header */}
        <View style={styles.goalHeader}>
          <View style={[styles.goalIconContainer, { backgroundColor: getStatusColor() }]}>
            <Icon name={getStatusIcon()} size={24} color="white" />
          </View>

            <View style={styles.goalInfo}>
            <View style={styles.titleRow}>
                <Text style={[styles.goalTitle, isLocked && styles.lockedText]}>
                  {goal.title}
                  {/* Inline reward minutes on title */}
                  <Text style={styles.rewardInline}>{`  +${Math.floor(goal.reward / 60)}min`}</Text>
                </Text>
              {goal.isSpecial && (
                <View style={styles.specialBadge}>
                  <Icon name="star" size={12} color="#FFD700" />
                  <Text style={styles.specialBadgeText}>SPECIAL</Text>
                </View>
              )}
            </View>

              <Text style={[styles.goalDescription, isLocked && styles.lockedText]}>
              {goal.description}
            </Text>

            {/* Reward Info */}
              <View style={styles.rewardRow}>
                <Icon name="clock-outline" size={14} color="#FF9F1C" />
                <Text style={styles.rewardText}>+{Math.floor(goal.reward / 60)}min</Text>
              </View>
          </View>
        </View>

        {/* Progress Section */}
        {!isLocked && (
          <View style={styles.progressSection}>
            {!goal.honorBased ? (
              // Regular goal progress
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressPercentage}>{Math.round(goal.progress)}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          }),
                          backgroundColor: goal.completed ? '#4CAF50' : goal.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {goal.type === 'accuracy' && goal.questionsAnswered
                      ? `${goal.current}% accuracy (${goal.questionsAnswered}/${goal.questionsRequired || 10} questions)`
                      : goal.type === 'speed' && goal.subType === 'streak_speed'
                      ? `${goal.speedStreak || 0} / ${goal.target} fast answers in a row`
                      : `${goal.current} / ${goal.target} completed`}
                  </Text>
                </View>
              </>
            ) : (
              // Honor goal info
              <View style={styles.honorSection}>
                <View style={styles.honorInfo}>
                  <Icon name="heart" size={16} color="#E91E63" />
                  <Text style={styles.honorLabel}>Honor-Based Goal</Text>
                </View>
                <Text style={styles.honorDescription}>
                  Complete this activity on your own and mark it as done!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {isLocked ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.unlockButton]}
              onPress={() => onUnlockGoal(goal.id)}
            >
              <Icon name="play-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Watch Ad to Unlock</Text>
            </TouchableOpacity>
          ) : goal.completed && !goal.claimed ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.claimButton]}
              onPress={() => onClaimReward(goal.id)}
            >
              <Icon name="gift" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Claim +{Math.floor(goal.reward / 60)} minutes</Text>
            </TouchableOpacity>
          ) : goal.honorBased && !goal.completed ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => onCompleteHonorGoal(goal.id)}
            >
              <Icon name="check-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          ) : goal.completed && goal.claimed ? (
            <View style={styles.completedBadge}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.completedText}>Completed & Claimed!</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const DailyGoalsScreen = ({ navigation }: any) => {
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState<'happy' | 'sad' | 'excited' | 'depressed' | 'gamemode' | 'below'>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  
  // Animation values
  const fadeAnims = useRef<Animated.Value[]>([]).current;
  const scaleAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    loadGoals();
    
    // Set up listener for goal updates
    const unsubscribe = DailyGoalsService.addListener((goals) => {
      setDailyGoals(goals);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Animate goals when they change
    if (dailyGoals.length > 0) {
      fadeAnims.length = dailyGoals.length;
      scaleAnims.length = dailyGoals.length;
      
      for (let i = 0; i < dailyGoals.length; i++) {
        if (!fadeAnims[i]) {
          fadeAnims[i] = new Animated.Value(0);
          scaleAnims[i] = new Animated.Value(0.8);
        }
      }
      
      // Stagger animations
      const animations = fadeAnims.map((anim, index) => 
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            delay: index * 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnims[index], {
            toValue: 1,
            delay: index * 100,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ])
      );

      Animated.stagger(100, animations).start();
    }
  }, [dailyGoals]);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      await DailyGoalsService.initialize();
      const goals = DailyGoalsService.getGoals();
      setDailyGoals(goals);
      DailyGoalsService.debugGoals();
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Failed to load goals:', error);
      Alert.alert('Error', 'Failed to load daily goals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGoals();
    setIsRefreshing(false);
  };

  const handleUnlockGoal = async (goalId: string) => {
    try {
      // Determine goal type from ID
      let kind: 'daily' | 'honor';
      if (goalId.startsWith('special_speed_')) {
        kind = 'daily';
      } else if (goalId.startsWith('special_honor_')) {
        kind = 'honor';
      } else {
        console.error('❌ [DailyGoalsScreen] Unknown special goal ID:', goalId);
        return;
      }
      
      console.log(`📺 [DailyGoalsScreen] Attempting to unlock special ${kind} goal: ${goalId}`);
      
      // Show rewarded ad
      const adShown = await RewardedAdService.showRewardedAd();
      
      if (adShown) {
        console.log('✅ [DailyGoalsScreen] Ad completed successfully, unlocking goal');
        
        // Unlock the goal
        const unlockedGoal = await DailyGoalsService.unlockGatedGoal(kind);
        
        if (unlockedGoal) {
          SoundService.playCorrect();
          
          // Show mascot celebration
          setMascotType('excited');
          setMascotMessage(`🎉 Special Goal Unlocked!\n"${unlockedGoal.title}"\n\nNow you can work towards completing it!`);
          setShowMascot(true);
          
          console.log('✅ [DailyGoalsScreen] Special goal unlocked and mascot shown');
        } else {
          console.error('❌ [DailyGoalsScreen] Failed to unlock goal after ad');
          Alert.alert('Error', 'Failed to unlock goal. Please try again.');
        }
      } else {
        console.log('❌ [DailyGoalsScreen] Ad was not completed successfully');
        Alert.alert('Ad Not Completed', 'Please watch the full ad to unlock the goal.');
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Failed to unlock goal:', error);
      Alert.alert('Error', 'Failed to unlock goal. Please try again.');
    }
  };

  const handleCompleteHonorGoal = async (goalId: string) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal || !goal.honorBased || goal.completed) {
      return;
    }

    try {
      const success = await DailyGoalsService.completeHonorGoal(goalId);
      
      if (success) {
        SoundService.playCorrect();
        
        // Show mascot celebration
        setMascotType('excited');
        setMascotMessage(`Great job! You completed "${goal.title}"! 🎉`);
        setShowMascot(true);
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Failed to complete goal:', error);
      Alert.alert('Error', 'Unable to complete goal. Please try again.');
    }
  };

  const handleClaimReward = async (goalId: string) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal || !goal.completed || goal.claimed) {
      return;
    }

    try {
      const success = await DailyGoalsService.claimReward(goalId);
      
      if (success) {
        SoundService.playCorrect();
        
        const minutes = Math.floor(goal.reward / 60);
        setMascotType('excited');
        setMascotMessage(`🎉 Reward Claimed!\n+${minutes} minutes added to your timer!`);
        setShowMascot(true);
      }
    } catch (error) {
      console.error('❌ [DailyGoalsScreen] Failed to claim reward:', error);
      Alert.alert('Error', 'Unable to claim reward. Please try again.');
    }
  };

  // NOTE: Render helper removed; hooks now live in child `GoalCard`.

  // Separate goals by type for better organization
  const regularGoals = dailyGoals.filter(g => !g.honorBased && !g.isSpecial);
  const honorGoals = dailyGoals.filter(g => g.honorBased && !g.isSpecial);
  const specialGoals = dailyGoals.filter(g => g.isSpecial);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Goals</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Icon name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {regularGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Challenges</Text>
            {regularGoals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={index}
                fadeValue={fadeAnims[index]}
                scaleValue={scaleAnims[index]}
                onUnlockGoal={handleUnlockGoal}
                onClaimReward={handleClaimReward}
                onCompleteHonorGoal={handleCompleteHonorGoal}
              />
            ))}
          </View>
        )}

        {honorGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Honor Goals</Text>
            {honorGoals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={regularGoals.length + index}
                fadeValue={fadeAnims[regularGoals.length + index]}
                scaleValue={scaleAnims[regularGoals.length + index]}
                onUnlockGoal={handleUnlockGoal}
                onClaimReward={handleClaimReward}
                onCompleteHonorGoal={handleCompleteHonorGoal}
              />
            ))}
          </View>
        )}

        {specialGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Special Goals</Text>
            <Text style={styles.sectionSubtitle}>Premium challenges unlocked with ads</Text>
            {specialGoals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={regularGoals.length + honorGoals.length + index}
                fadeValue={fadeAnims[regularGoals.length + honorGoals.length + index]}
                scaleValue={scaleAnims[regularGoals.length + honorGoals.length + index]}
                onUnlockGoal={handleUnlockGoal}
                onClaimReward={handleClaimReward}
                onCompleteHonorGoal={handleCompleteHonorGoal}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <EnhancedMascotDisplay
        type={mascotType}
        position="right"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={() => setShowMascot(false)}
        onMessageComplete={() => setShowMascot(false)}
        autoHide={true}
        autoHideDuration={4000}
        fullScreen={false}
      />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(255, 248, 231, 0.95)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#777',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  goalCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  goalGradient: {
    position: 'relative',
  },
  progressBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  goalContent: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  goalInfo: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    marginLeft: 4,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9F1C',
    marginLeft: 4,
    marginRight: 12,
  },
  rewardInline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9F1C',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  difficultyeasy: {
    backgroundColor: '#4CAF50',
  },
  difficultymedium: {
    backgroundColor: '#FF9800',
  },
  difficultyhard: {
    backgroundColor: '#F44336',
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lockedText: {
    color: '#BDBDBD',
  },
  
  // Progress Section
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9F1C',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
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
    lineHeight: 16,
  },
  
  // Honor Section
  honorSection: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  honorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  honorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
    marginLeft: 8,
  },
  honorDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  
  // Action Section
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unlockButton: {
    backgroundColor: '#FF9F1C',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  completedText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
});

export default DailyGoalsScreen;