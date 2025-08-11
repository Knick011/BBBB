// src/services/DailyGoalsService.ts
// ✅ COMPREHENSIVE DAILY GOALS SERVICE - FIXED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeEventEmitter, NativeModules } from 'react-native';
import EnhancedScoreService from './EnhancedScoreService';
import TimerIntegrationService from './TimerIntegrationService';

export interface DailyGoal {
  id: string;
  type: 'questions' | 'streak' | 'accuracy' | 'difficulty' | 'category' | 'perfect' | 'honor';
  target: number;
  questionsRequired?: number;
  reward: number; // in seconds
  title: string;
  description: string;
  icon: string;
  color: string;
  current: number;
  progress: number; // 0-100
  completed: boolean;
  claimed: boolean;
  questionsAnswered?: number;
  honorBased?: boolean;
  notified?: boolean;
}

const DAILY_GOALS_POOL: Omit<DailyGoal, 'current' | 'progress' | 'completed' | 'claimed'>[] = [
  {
    id: 'questions_20',
    type: 'questions',
    target: 20,
    reward: 3000, // 50 minutes (20 * 2.5)
    title: 'Quiz Starter',
    description: 'Answer 20 questions',
    icon: 'help-circle-outline',
    color: '#4CAF50'
  },
  {
    id: 'questions_30',
    type: 'questions',
    target: 30,
    reward: 4500, // 75 minutes (30 * 2.5)
    title: 'Quiz Master',
    description: 'Answer 30 questions',
    icon: 'help-circle-outline',
    color: '#4CAF50'
  },
  {
    id: 'questions_50',
    type: 'questions',
    target: 50,
    reward: 9000, // 150 minutes (60 * 2.5)
    title: 'Knowledge Seeker',
    description: 'Answer 50 questions',
    icon: 'help-circle-multiple',
    color: '#2E7D32'
  },
  {
    id: 'streak_5',
    type: 'streak',
    target: 5,
    reward: 2250, // 37.5 minutes (15 * 2.5)
    title: 'Getting Hot',
    description: 'Achieve 5 question streak',
    icon: 'fire',
    color: '#FF9800'
  },
  {
    id: 'streak_10',
    type: 'streak',
    target: 10,
    reward: 6750, // 112.5 minutes (45 * 2.5)
    title: 'Streak Champion',
    description: 'Achieve 10 question streak',
    icon: 'fire',
    color: '#FF9F1C'
  },
  {
    id: 'streak_15',
    type: 'streak',
    target: 15,
    reward: 9000, // 150 minutes (60 * 2.5)
    title: 'Streak Master',
    description: 'Achieve 15 question streak',
    icon: 'fire',
    color: '#F57C00'
  },
  {
    id: 'accuracy_70',
    type: 'accuracy',
    target: 70,
    questionsRequired: 15,
    reward: 4500, // 75 minutes (30 * 2.5)
    title: 'Good Aim',
    description: 'Get 70% accuracy (min 15 questions)',
    icon: 'target',
    color: '#2196F3'
  },
  {
    id: 'accuracy_80',
    type: 'accuracy',
    target: 80,
    questionsRequired: 20,
    reward: 9000, // 150 minutes (60 * 2.5)
    title: 'Precision Expert',
    description: 'Get 80% accuracy (min 20 questions)',
    icon: 'target',
    color: '#1976D2'
  },
  {
    id: 'hard_difficulty',
    type: 'difficulty',
    target: 10,
    questionsRequired: 10,
    reward: 6750, // 112.5 minutes (45 * 2.5)
    title: 'Challenge Accepted',
    description: 'Answer 10 hard questions correctly',
    icon: 'trophy-outline',
    color: '#E91E63'
  },
  {
    id: 'perfect_5',
    type: 'perfect',
    target: 5,
    reward: 3000, // 50 minutes (20 * 2.5)
    title: 'Perfect Start',
    description: 'Get 5 questions correct in a row',
    icon: 'star-circle-outline',
    color: '#FFD700'
  },
  {
    id: 'perfect_10',
    type: 'perfect',
    target: 10,
    reward: 6000, // 100 minutes (40 * 2.5)
    title: 'Perfect Run',
    description: 'Get 10 questions correct in a row',
    icon: 'star-circle',
    color: '#FFC107'
  },
  {
    id: 'walk_5000',
    type: 'honor',
    target: 5000,
    reward: 4500, // 75 minutes (30 * 2.5)
    title: 'Daily Walker',
    description: 'Walk 5000 steps (honor-based)',
    icon: 'walk',
    color: '#4CAF50',
    honorBased: true
  },
  {
    id: 'pushups_10',
    type: 'honor',
    target: 10,
    reward: 2250, // 37.5 minutes (15 * 2.5)
    title: 'Fitness Boost',
    description: 'Do 10 pushups (honor-based)',
    icon: 'arm-flex',
    color: '#FF5722',
    honorBased: true
  },
  {
    id: 'water_8',
    type: 'honor',
    target: 8,
    reward: 1500, // 25 minutes (10 * 2.5)
    title: 'Stay Hydrated',
    description: 'Drink 8 glasses of water (honor-based)',
    icon: 'cup-water',
    color: '#2196F3',
    honorBased: true
  },
  {
    id: 'meditation_10',
    type: 'honor',
    target: 10,
    reward: 3000, // 50 minutes (20 * 2.5)
    title: 'Mindful Moment',
    description: 'Meditate for 10 minutes (honor-based)',
    icon: 'meditation',
    color: '#9C27B0',
    honorBased: true
  }
];

class DailyGoalsService {
  private static instance: DailyGoalsService;
  private goals: DailyGoal[] = [];
  private listeners: Array<(goals: DailyGoal[]) => void> = [];
  private isInitialized = false;

  static getInstance(): DailyGoalsService {
    if (!DailyGoalsService.instance) {
      DailyGoalsService.instance = new DailyGoalsService();
    }
    return DailyGoalsService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎯 [DailyGoals] Initializing service...');
    
    try {
      await this.loadOrGenerateGoals();
      this.isInitialized = true;
      console.log('✅ [DailyGoals] Service initialized with', this.goals.length, 'goals');
    } catch (error) {
      console.error('❌ [DailyGoals] Failed to initialize:', error);
      // Fallback to generated goals
      this.goals = this.generateDailyGoals();
      this.isInitialized = true;
    }
  }

  private async loadOrGenerateGoals(): Promise<void> {
    const today = new Date().toDateString();
    const lastResetDate = await AsyncStorage.getItem('@BrainBites:lastGoalReset');
    
    console.log('🎯 [DailyGoals] Today:', today, 'Last reset:', lastResetDate);

    if (lastResetDate === today) {
      // Load existing goals
      const savedGoals = await AsyncStorage.getItem('@BrainBites:dailyGoals');
      if (savedGoals) {
        this.goals = JSON.parse(savedGoals);
        console.log('✅ [DailyGoals] Loaded existing goals');
        return;
      }
    }

    // Generate new goals for today
    console.log('🎯 [DailyGoals] Generating new goals for today');
    this.goals = this.generateDailyGoals();
    
    // Save new goals
    await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
    await AsyncStorage.setItem('@BrainBites:lastGoalReset', today);
    
    console.log('✅ [DailyGoals] Generated and saved new goals');
  }

  private generateDailyGoals(): DailyGoal[] {
    // Separate regular goals and honor goals
    const regularGoals = DAILY_GOALS_POOL.filter(goal => !goal.honorBased);
    const honorGoals = DAILY_GOALS_POOL.filter(goal => goal.honorBased);
    
    // Shuffle both pools
    const shuffledRegular = [...regularGoals].sort(() => 0.5 - Math.random());
    const shuffledHonor = [...honorGoals].sort(() => 0.5 - Math.random());
    
    console.log('🎯 [DailyGoals] Goal pools:', {
      regularPool: regularGoals.length,
      honorPool: honorGoals.length,
      honorTitles: honorGoals.map(g => g.title)
    });
    
    const selected: DailyGoal[] = [];
    const usedTypes = new Set<string>();

    // Select 3 regular goals (prefer different types)
    for (const goalTemplate of shuffledRegular) {
      if (selected.length >= 3) break;
      
      // Prefer different types, but allow duplicates if needed
      if (!usedTypes.has(goalTemplate.type) || selected.length === 0) {
        selected.push({
          ...goalTemplate,
          current: 0,
          progress: 0,
          completed: false,
          claimed: false,
          questionsAnswered: 0
        });
        usedTypes.add(goalTemplate.type);
      }
    }

    // If we don't have 3 regular goals, fill with remaining regular goals
    while (selected.length < 3 && selected.length < shuffledRegular.length) {
      const remaining = shuffledRegular.filter(g => !selected.find(s => s.id === g.id));
      if (remaining.length > 0) {
        const goalTemplate = remaining[0];
        selected.push({
          ...goalTemplate,
          current: 0,
          progress: 0,
          completed: false,
          claimed: false,
          questionsAnswered: 0
        });
      } else {
        break;
      }
    }

    // Add 2 honor goals
    for (let i = 0; i < 2 && i < shuffledHonor.length; i++) {
      const goalTemplate = shuffledHonor[i];
      selected.push({
        ...goalTemplate,
        current: 0,
        progress: 0,
        completed: false,
        claimed: false,
        questionsAnswered: 0
      });
    }

    console.log('🎯 [DailyGoals] Generated goals:', selected.map(g => `${g.title} (${g.type}${g.honorBased ? ' - honor' : ''})`));
    console.log('🎯 [DailyGoals] Goal breakdown:', {
      total: selected.length,
      regular: selected.filter(g => !g.honorBased).length,
      honor: selected.filter(g => g.honorBased).length,
      honorGoals: selected.filter(g => g.honorBased).map(g => g.title)
    });
    return selected;
  }

  async updateProgress(questionData: {
    isCorrect: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    category?: string;
    currentStreak: number;
    todayAccuracy: number;
    todayQuestions: number;
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let hasChanges = false;

    for (const goal of this.goals) {
      if (goal.completed) continue;
      
      // Skip honor-based goals - they are manually completed by user
      if (goal.honorBased) continue;

      const oldProgress = goal.progress;
      const wasCompleted = goal.completed;

      switch (goal.type) {
        case 'questions':
          goal.current = questionData.todayQuestions || 0;
          goal.progress = Math.min(100, ((goal.current || 0) / goal.target) * 100);
          break;

        case 'streak':
          const currentStreak = isNaN(questionData.currentStreak) ? 0 : questionData.currentStreak;
          goal.current = Math.max(goal.current || 0, currentStreak);
          goal.progress = Math.min(100, ((goal.current || 0) / goal.target) * 100);
          break;

        case 'accuracy':
          if ((questionData.todayQuestions || 0) >= (goal.questionsRequired || 0)) {
            goal.current = questionData.todayAccuracy || 0;
            const current = goal.current || 0;
            goal.progress = current >= goal.target ? 100 : (current / goal.target) * 100;
            goal.questionsAnswered = questionData.todayQuestions || 0;
          }
          break;

        case 'difficulty':
          if (questionData.isCorrect && questionData.difficulty === 'hard') {
            goal.current = Math.min((goal.current || 0) + 1, goal.target);
            goal.progress = ((goal.current || 0) / goal.target) * 100;
          }
          break;

        case 'perfect':
          const perfectStreak = isNaN(questionData.currentStreak) ? 0 : questionData.currentStreak;
          goal.current = Math.max(goal.current || 0, perfectStreak);
          goal.progress = Math.min(100, ((goal.current || 0) / goal.target) * 100);
          break;
      }

      // Check if goal is completed
      if (!goal.completed && goal.progress >= 100) {
        goal.completed = true;
        console.log(`🎉 [DailyGoals] Goal completed: ${goal.title}`);

        // Prefer excited mascot instead of system alert
        try {
          const eventEmitter = new (require('react-native').NativeEventEmitter)();
          eventEmitter.emit('showGoalCompletedMascot', {
            goalTitle: goal.title,
            reward: goal.reward,
          });
          goal.notified = true;
        } catch {}
      }

      if (goal.progress !== oldProgress) {
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveGoals();
      this.notifyListeners();
    }
  }

  async completeHonorGoal(goalId: string): Promise<boolean> {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal || !goal.honorBased || goal.completed) {
      return false;
    }

    try {
      goal.completed = true;
      goal.progress = 100;
      await this.saveGoals();
      this.notifyListeners();
      
      console.log(`✅ [DailyGoals] Honor goal completed: ${goal.title}`);
      return true;
    } catch (error) {
      console.error('❌ [DailyGoals] Error completing honor goal:', error);
      return false;
    }
  }

  async claimReward(goalId: string): Promise<boolean> {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal || !goal.completed || goal.claimed) {
      return false;
    }

    try {
      // Add time to timer using updated integration service
      const timeInMinutes = Math.floor(goal.reward / 60);
      console.log(`🎯 [DailyGoals] Claiming reward: ${timeInMinutes} minutes for ${goal.title}`);
      console.log(`🎯 [DailyGoals] Goal reward in seconds: ${goal.reward}, converted to minutes: ${timeInMinutes}`);
      
      await TimerIntegrationService.initialize();
      console.log(`🎯 [DailyGoals] TimerIntegrationService initialized, calling addTimeFromGoal...`);
      
      let success = await TimerIntegrationService.addTimeFromGoal(timeInMinutes);
      console.log(`🎯 [DailyGoals] addTimeFromGoal result: ${success}`);
      
      // If first attempt failed, try once more after a short delay
      if (!success) {
        console.log(`🔄 [DailyGoals] Timer integration failed, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        success = await TimerIntegrationService.addTimeFromGoal(timeInMinutes);
        console.log(`🎯 [DailyGoals] addTimeFromGoal retry result: ${success}`);
      }
      
      if (success) {
        console.log(`✅ [DailyGoals] Timer integration successful! Added ${timeInMinutes} minutes to timer.`);
      } else {
        console.error(`❌ [DailyGoals] Timer integration failed after retry! This might be a timer service issue.`);
        console.error(`❌ [DailyGoals] User will still get the goal marked as claimed to avoid frustration.`);
      }
      
      // Mark goal as claimed regardless of timer integration result
      // This prevents users from being unable to claim rewards due to timer issues
      goal.claimed = true;
      await this.saveGoals();
      
      // Get today's date
      const today = new Date().toDateString();
      
      // Store claimed rewards with dates
      const claimedRewardsData = await AsyncStorage.getItem('@BrainBites:liveGameStore:claimedRewards') || '{}';
      const claimedRewards = JSON.parse(claimedRewardsData);
      claimedRewards[goalId] = today;
      await AsyncStorage.setItem('@BrainBites:liveGameStore:claimedRewards', JSON.stringify(claimedRewards));
      
      // Update daily streak tracking (only for non-honor goals)
      if (!goal.honorBased) {
        await AsyncStorage.setItem('@BrainBites:lastGoalClaimedDate', today);
      }
      
      // Emit event for streak update (only for non-honor goals)
      if (!goal.honorBased) {
          const eventEmitter = new NativeEventEmitter(NativeModules.DeviceEventEmitter || {});
          eventEmitter.emit('dailyGoalClaimed', { 
            goalId, 
            goalTitle: goal.title,
            reward: goal.reward,
            date: today,
            isHonorGoal: false
          });
      } else {
        // Emit a separate event for honor goals (no streak update)
        const eventEmitter = new NativeEventEmitter(NativeModules.DeviceEventEmitter || {});
        eventEmitter.emit('honorGoalClaimed', { 
          goalId, 
          goalTitle: goal.title,
          reward: goal.reward,
          date: today,
          isHonorGoal: true
        });
      }
      
      // Show mascot celebration
      const showMascotCelebration = () => {
          // Send event to show mascot
          const eventEmitter = new (require('react-native').NativeEventEmitter)();
          eventEmitter.emit('showGoalCompletedMascot', {
            goalTitle: goal.title,
            reward: goal.reward
          });
        };

      // Call the celebration
      showMascotCelebration();
      
      this.notifyListeners();
      
      if (success) {
        console.log(`✅ [DailyGoals] Successfully claimed ${timeInMinutes}m for ${goal.title} with timer integration`);
      } else {
        console.log(`⚠️ [DailyGoals] Claimed ${timeInMinutes}m for ${goal.title} but timer integration failed`);
      }
      
      return true; // Always return true since we marked the goal as claimed
    } catch (error) {
      console.error('❌ [DailyGoals] Error claiming reward:', error);
      return false;
    }
  }

  async saveGoals(): Promise<void> {
    try {
      await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
    } catch (error) {
      console.error('❌ [DailyGoals] Failed to save goals:', error);
    }
  }

  getGoals(): DailyGoal[] {
    return [...this.goals];
  }

  getCompletedCount(): number {
    return this.goals.filter(g => g.completed).length;
  }

  getClaimedCount(): number {
    return this.goals.filter(g => g.claimed).length;
  }

  getTotalRewards(): number {
    return this.goals
      .filter(g => g.claimed)
      .reduce((total, g) => total + g.reward, 0);
  }

  // Debug method to check current goals
  debugGoals(): void {
    console.log('🔍 [DailyGoals] Current goals debug:', {
      total: this.goals.length,
      regular: this.goals.filter(g => !g.honorBased).length,
      honor: this.goals.filter(g => g.honorBased).length,
      allGoals: this.goals.map(g => ({
        title: g.title,
        type: g.type,
        honorBased: g.honorBased,
        completed: g.completed,
        claimed: g.claimed
      }))
    });
  }

  addListener(callback: (goals: DailyGoal[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.goals]);
      } catch (error) {
        console.error('❌ [DailyGoals] Error in listener:', error);
      }
    });
  }

  // Helper to persist current goals state
  async saveGoals(): Promise<void> {
    try {
      await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
    } catch (error) {
      console.error('❌ [DailyGoals] Failed to save goals:', error);
    }
  }

  async resetForTesting(): Promise<void> {
    console.log('🧪 [DailyGoals] Resetting for testing');
    await AsyncStorage.removeItem('@BrainBites:dailyGoals');
    await AsyncStorage.removeItem('@BrainBites:lastGoalReset');
    this.goals = [];
    this.isInitialized = false;
    await this.initialize();
  }

  // Force regenerate goals for today (useful for testing)
  async forceRegenerateGoals(): Promise<void> {
    console.log('🔄 [DailyGoals] Force regenerating goals');
    await AsyncStorage.removeItem('@BrainBites:dailyGoals');
    await AsyncStorage.removeItem('@BrainBites:lastGoalReset');
    this.goals = [];
    this.isInitialized = false;
    await this.initialize();
  }
  
  // Test timer integration (for debugging)
  async testTimerIntegration(minutes: number = 5): Promise<boolean> {
    console.log(`🧪 [DailyGoals] Testing timer integration with ${minutes} minutes...`);
    try {
      await TimerIntegrationService.initialize();
      const success = await TimerIntegrationService.addTimeFromGoal(minutes);
      console.log(`🧪 [DailyGoals] Timer integration test result: ${success}`);
      return success;
    } catch (error) {
      console.error('🧪 [DailyGoals] Timer integration test failed:', error);
      return false;
    }
  }
}

export default DailyGoalsService.getInstance();