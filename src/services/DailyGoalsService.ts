// src/services/DailyGoalsService.ts
// ✅ UPDATED DAILY GOALS SERVICE WITH AD-GATING AND NEW GOAL STRUCTURE
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - RN types may not include these named exports in this setup
import { NativeEventEmitter, NativeModules } from 'react-native';
import { getTorontoDateString } from '../utils/timeUtils';
import EnhancedScoreService from './EnhancedScoreService';
import TimerIntegrationService from './TimerIntegrationService';

export interface DailyGoal {
  id: string;
  type: 'questions' | 'streak' | 'accuracy' | 'speed' | 'honor';
  subType?: 'quick_answers' | 'streak_speed' | 'honor_standard' | 'honor_walk';
  target: number;
  questionsRequired?: number;
  thresholdPerAnswerSeconds?: number; // For speed goals
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
  difficulty?: 'easy' | 'medium' | 'hard';
  requiresAdUnlock?: boolean;
  unlocked?: boolean;
  isPlaceholder?: boolean;
  isSpecial?: boolean; // Special ad-gated goals that are always visible
  notified?: boolean;
  speedStreak?: number; // For tracking consecutive fast answers
}

// Define difficulty levels for each goal type
const QUESTIONS_GOALS = {
  easy: {
    id: 'questions_10',
    type: 'questions' as const,
    target: 10,
    reward: 1500, // 25 minutes
    title: 'Quick 10',
    description: 'Answer 10 questions',
    icon: 'help-circle-outline',
    color: '#4CAF50',
    difficulty: 'easy' as const
  },
  medium: {
    id: 'questions_20',
    type: 'questions' as const,
    target: 20,
    reward: 3000, // 50 minutes
    title: 'Solid 20',
    description: 'Answer 20 questions',
    icon: 'help-circle-outline',
    color: '#4CAF50',
    difficulty: 'medium' as const
  },
  hard: {
    id: 'questions_40',
    type: 'questions' as const,
    target: 40,
    reward: 6000, // 100 minutes
    title: 'Marathon 40',
    description: 'Answer 40 questions',
    icon: 'help-circle-multiple',
    color: '#2E7D32',
    difficulty: 'hard' as const
  }
};

const STREAK_GOALS = {
  easy: {
    id: 'streak_3',
    type: 'streak' as const,
    target: 3,
    reward: 1200, // 20 minutes
    title: 'Warm Streak',
    description: 'Achieve 3 question streak',
    icon: 'fire',
    color: '#FF9800',
    difficulty: 'easy' as const
  },
  medium: {
    id: 'streak_6',
    type: 'streak' as const,
    target: 6,
    reward: 2700, // 45 minutes
    title: 'On a Roll',
    description: 'Achieve 6 question streak',
    icon: 'fire',
    color: '#FF9F1C',
    difficulty: 'medium' as const
  },
  hard: {
    id: 'streak_10',
    type: 'streak' as const,
    target: 10,
    reward: 4500, // 75 minutes
    title: 'Unstoppable',
    description: 'Achieve 10 question streak',
    icon: 'fire',
    color: '#F57C00',
    difficulty: 'hard' as const
  }
};

const ACCURACY_GOALS = {
  easy: {
    id: 'accuracy_65_q12',
    type: 'accuracy' as const,
    target: 65,
    questionsRequired: 12,
    reward: 2100, // 35 minutes
    title: 'Steady Aim',
    description: 'Get 65% accuracy (min 12 questions)',
    icon: 'target',
    color: '#2196F3',
    difficulty: 'easy' as const
  },
  medium: {
    id: 'accuracy_75_q16',
    type: 'accuracy' as const,
    target: 75,
    questionsRequired: 16,
    reward: 3600, // 60 minutes
    title: 'Eagle Eye',
    description: 'Get 75% accuracy (min 16 questions)',
    icon: 'target',
    color: '#1976D2',
    difficulty: 'medium' as const
  },
  hard: {
    id: 'accuracy_85_q20',
    type: 'accuracy' as const,
    target: 85,
    questionsRequired: 20,
    reward: 5400, // 90 minutes
    title: 'Sharpshooter',
    description: 'Get 85% accuracy (min 20 questions)',
    icon: 'target',
    color: '#0D47A1',
    difficulty: 'hard' as const
  }
};

// Speed goals pool (ad-gated, rotated daily)
const SPEED_GOALS_POOL = [
  {
    id: 'speed_5_under4s',
    type: 'speed' as const,
    subType: 'quick_answers' as const,
    target: 5,
    thresholdPerAnswerSeconds: 4,
    reward: 2400, // 40 minutes
    title: 'Quickfire Five',
    description: 'Answer 5 questions correctly in under 4s each',
    icon: 'lightning-bolt',
    color: '#FFC107'
  },
  {
    id: 'speed_8_under5s',
    type: 'speed' as const,
    subType: 'quick_answers' as const,
    target: 8,
    thresholdPerAnswerSeconds: 5,
    reward: 3000, // 50 minutes
    title: 'Lightning Eight',
    description: 'Answer 8 questions correctly in under 5s each',
    icon: 'lightning-bolt',
    color: '#FF9800'
  },
  {
    id: 'speed_streak3_under3s',
    type: 'speed' as const,
    subType: 'streak_speed' as const,
    target: 3,
    thresholdPerAnswerSeconds: 3,
    reward: 2700, // 45 minutes
    title: 'Focus Triple Streak',
    description: 'Answer 3 questions in a row correctly in under 3s each',
    icon: 'lightning-bolt-circle',
    color: '#FF5722'
  }
];

// Honor goals
const HONOR_GOALS = {
  stretch: {
    id: 'stretch_10',
    type: 'honor' as const,
    subType: 'honor_standard' as const,
    target: 10,
    reward: 1500, // 25 minutes
    title: 'Stretch Flow',
    description: '10 minutes of stretching',
    icon: 'yoga',
    color: '#9C27B0',
    honorBased: true
  },
  read: {
    id: 'read_15',
    type: 'honor' as const,
    subType: 'honor_standard' as const,
    target: 15,
    reward: 1500, // 25 minutes
    title: 'Bookworm',
    description: '15 minutes of reading',
    icon: 'book-open',
    color: '#3F51B5',
    honorBased: true
  },
  walk: {
    id: 'walk_5000',
    type: 'honor' as const,
    subType: 'honor_walk' as const,
    target: 5000,
    reward: 2400, // 40 minutes
    title: 'Nature Walk',
    description: 'Walk 5000 steps',
    icon: 'walk',
    color: '#4CAF50',
    honorBased: true,
    requiresAdUnlock: true
  }
};

class DailyGoalsService {
  private static instance: DailyGoalsService;
  private goals: DailyGoal[] = [];
  private listeners: Array<(goals: DailyGoal[]) => void> = [];
  private isInitialized = false;
  private dailySpeedGoalIndex = 0; // Track which speed goal to use today
  private readonly DAILY_DAY_STREAK_KEY = '@BrainBites:dailyGoalDayStreak';
  private readonly DAILY_DAY_LAST_KEY = '@BrainBites:lastDailyGoalDay';
  private readonly DAILY_DAY_NOTIFIED_KEY = '@BrainBites:dailyGoalDayNotified';

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
      this.goals = await this.generateDailyGoals();
      this.isInitialized = true;
    }
  }

  private async loadOrGenerateGoals(): Promise<void> {
    // Use ISO date string for consistency across all components
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastResetDate = await AsyncStorage.getItem('@BrainBites:lastGoalReset');
    
    console.log('🎯 [DailyGoals] Today:', today, 'Last reset:', lastResetDate);

    if (lastResetDate === today) {
      // Load existing goals
      const savedGoals = await AsyncStorage.getItem('@BrainBites:dailyGoals');
      if (savedGoals) {
        try {
          this.goals = JSON.parse(savedGoals);
          console.log('✅ [DailyGoals] Loaded existing goals:', this.goals.length, 'goals');
          
          // Validate goals structure
          if (!Array.isArray(this.goals) || this.goals.length === 0) {
            console.log('⚠️ [DailyGoals] Invalid goals structure, regenerating...');
            throw new Error('Invalid goals structure');
          }
          
          return;
        } catch (error) {
          console.error('❌ [DailyGoals] Error parsing saved goals:', error);
          // Fall through to regenerate goals
        }
      }
    }

    // Generate new goals for today
    console.log('🎯 [DailyGoals] Generating new goals for today');
    this.goals = await this.generateDailyGoals();
    
    // Save new goals with error handling
    try {
      await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
      await AsyncStorage.setItem('@BrainBites:lastGoalReset', today);
      console.log('✅ [DailyGoals] Generated and saved new goals:', this.goals.length, 'goals');
    } catch (error) {
      console.error('❌ [DailyGoals] Error saving goals:', error);
    }
  }

  private async generateDailyGoals(): Promise<DailyGoal[]> {
    const selected: DailyGoal[] = [];
    
    // Get today's speed goal index (rotate through pool)
    const savedIndex = await AsyncStorage.getItem('@BrainBites:speedGoalIndex');
    this.dailySpeedGoalIndex = savedIndex ? (parseInt(savedIndex) + 1) % SPEED_GOALS_POOL.length : 0;
    await AsyncStorage.setItem('@BrainBites:speedGoalIndex', this.dailySpeedGoalIndex.toString());
    
    // Create a better seed based on current date to ensure daily variation
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Simple seeded random function for consistent but varied daily shuffling
    let seedValue = seed;
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
    
    // Select difficulty distribution: exactly 1 Easy + 1 Medium + 1 Hard
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    
    // Properly shuffle using Fisher-Yates algorithm with seeded random
    for (let i = difficulties.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [difficulties[i], difficulties[j]] = [difficulties[j], difficulties[i]];
    }
    
    console.log('🎯 [DailyGoals] Today\'s difficulty assignment:', {
      questions: difficulties[0],
      streak: difficulties[1], 
      accuracy: difficulties[2],
      seed: seed
    });
    
    // Assign difficulties to goal types
    const questionsGoal = QUESTIONS_GOALS[difficulties[0]];
    const streakGoal = STREAK_GOALS[difficulties[1]];
    const accuracyGoal = ACCURACY_GOALS[difficulties[2]];
    
    // Add the three standard daily goals
    selected.push({
      ...questionsGoal,
      current: 0,
      progress: 0,
      completed: false,
      claimed: false,
      questionsAnswered: 0,
      notified: false
    });
    
    selected.push({
      ...streakGoal,
      current: 0,
      progress: 0,
      completed: false,
      claimed: false,
      notified: false
    });
    
    selected.push({
      ...accuracyGoal,
      current: 0,
      progress: 0,
      completed: false,
      claimed: false,
      questionsAnswered: 0,
      notified: false
    });
    
    // Add 2 standard honor goals
    const honorGoalsArray = [HONOR_GOALS.stretch, HONOR_GOALS.read];
    const shuffledHonor = [...honorGoalsArray].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < 2; i++) {
      selected.push({
        ...shuffledHonor[i],
        current: 0,
        progress: 0,
        completed: false,
        claimed: false,
        honorBased: true,
        notified: false
      });
    }
    
    // SPECIAL AD-GATED GOALS - Always visible, require ads to unlock
    // These appear in a separate "Special Goals" section
    
    // Special Speed Goal - Today's rotating speed challenge
    const todaysSpeedGoal = SPEED_GOALS_POOL[this.dailySpeedGoalIndex];
    selected.push({
      ...todaysSpeedGoal,
      id: 'special_speed_' + todaysSpeedGoal.id,
      title: '⚡ ' + todaysSpeedGoal.title,
      description: todaysSpeedGoal.description + ' (Watch ad to unlock)',
      current: 0,
      progress: 0,
      completed: false,
      claimed: false,
      requiresAdUnlock: true,
      unlocked: false,
      isSpecial: true,
      speedStreak: 0,
      notified: false
    });
    
    // Special Honor Goal - Nature Walk challenge
    selected.push({
      ...HONOR_GOALS.walk,
      id: 'special_honor_walk',
      title: '🚶 ' + HONOR_GOALS.walk.title,
      description: HONOR_GOALS.walk.description + ' (Watch ad to unlock)',
      current: 0,
      progress: 0,
      completed: false,
      claimed: false,
      honorBased: true,
      requiresAdUnlock: true,
      unlocked: false,
      isSpecial: true,
      notified: false
    });
    
    console.log('🎯 [DailyGoals] Generated goals:', selected.map(g => ({
      title: g.title,
      type: g.type,
      difficulty: g.difficulty,
      locked: g.requiresAdUnlock,
      special: g.isSpecial,
      honor: g.honorBased
    })));
    
    return selected;
  }

  async unlockGatedGoal(kind: 'daily' | 'honor'): Promise<DailyGoal | null> {
    console.log(`🔓 [DailyGoals] Unlocking ${kind} special goal`);
    
    // Find the special goal to unlock
    const goalId = kind === 'daily' ? 'special_speed_' : 'special_honor_';
    const goal = this.goals.find(g => g.isSpecial && g.id.startsWith(goalId));
    
    if (!goal) {
      console.warn(`⚠️ [DailyGoals] No locked special ${kind} goal found`);
      return null;
    }
    
    if (goal.unlocked) {
      console.log(`ℹ️ [DailyGoals] Special ${kind} goal already unlocked`);
      return goal;
    }
    
    // Unlock the goal (it keeps all its original properties, just becomes unlocked)
    goal.unlocked = true;
    goal.requiresAdUnlock = true; // Keep this true so we know it was unlocked via ad
    
    await this.saveGoals();
    this.notifyListeners();
    
    console.log(`✅ [DailyGoals] Unlocked special goal: ${goal.title}`);
    return goal;
  }

  async updateProgress(questionData: {
    isCorrect: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    category?: string;
    currentStreak: number;
    todayAccuracy: number;
    todayQuestions: number;
    responseTimeMs?: number; // Add response time for speed goals
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let hasChanges = false;

    for (const goal of this.goals) {
      // Skip locked goals
      if (goal.requiresAdUnlock && !goal.unlocked) {
        continue;
      }

      const oldProgress = goal.progress;

      switch (goal.type) {
        case 'questions':
          if (questionData.isCorrect) {
            goal.current = Math.min(goal.current + 1, goal.target);
            goal.progress = (goal.current / goal.target) * 100;
          }
          break;

        case 'streak':
          if (questionData.isCorrect) {
            goal.current = Math.max(goal.current, questionData.currentStreak);
            goal.progress = Math.min(100, (goal.current / goal.target) * 100);
          }
          break;

        case 'accuracy':
          // Fix NaN issues by ensuring we have valid numbers
          if (questionData.todayQuestions > 0 && goal.questionsRequired) {
            // Always show current accuracy
            const accuracy = isNaN(questionData.todayAccuracy) ? 0 : questionData.todayAccuracy;
            goal.current = Math.round(accuracy);
            goal.questionsAnswered = questionData.todayQuestions;
            
            if (questionData.todayQuestions >= goal.questionsRequired) {
              // Enough questions - check if goal is completed
              goal.progress = goal.current >= goal.target ? 100 : (goal.current / goal.target) * 100;
            } else {
              // Not enough questions yet - don't complete
              goal.progress = 0;
            }
          } else {
            // No questions answered yet
            goal.current = 0;
            goal.progress = 0;
            goal.questionsAnswered = 0;
          }
          break;

        case 'speed':
          if (questionData.isCorrect && questionData.responseTimeMs && goal.thresholdPerAnswerSeconds) {
            const thresholdMs = goal.thresholdPerAnswerSeconds * 1000;
            
            console.log(`🏃 [DailyGoals] Speed goal progress: ${goal.title}, Response: ${questionData.responseTimeMs}ms, Threshold: ${thresholdMs}ms`);
            
            if (questionData.responseTimeMs <= thresholdMs) {
              if (goal.subType === 'streak_speed') {
                // Track consecutive fast answers
                goal.speedStreak = (goal.speedStreak || 0) + 1;
                console.log(`⚡ [DailyGoals] Streak speed goal progress: ${goal.speedStreak}/${goal.target}`);
                if (goal.speedStreak >= goal.target) {
                  goal.current = goal.target;
                  goal.progress = 100;
                }
              } else {
                // Track total fast answers
                goal.current = Math.min(goal.current + 1, goal.target);
                goal.progress = (goal.current / goal.target) * 100;
                console.log(`⚡ [DailyGoals] Quick answers goal progress: ${goal.current}/${goal.target} (${Math.round(goal.progress)}%)`);
              }
            } else if (goal.subType === 'streak_speed') {
              // Reset streak if answer wasn't fast enough
              goal.speedStreak = 0;
              console.log(`❌ [DailyGoals] Streak speed goal reset: too slow`);
            }
          } else if (!questionData.isCorrect && goal.subType === 'streak_speed') {
            // Reset streak on incorrect answer
            goal.speedStreak = 0;
            console.log(`❌ [DailyGoals] Streak speed goal reset: incorrect answer`);
          }
          break;
      }

        // Check if goal is completed
        if (!goal.completed && goal.progress >= 100) {
          goal.completed = true;
          console.log(`🎉 [DailyGoals] Goal completed: ${goal.title}`);

          // If this is a regular (non-honor, non-special) goal, register daily-day streak
          const isRegular = !goal.honorBased && !goal.isSpecial;
          if (isRegular) {
            await this.registerDailyGoalDayCompletion();
          }
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

  /**
   * Registers that at least one regular daily goal was completed today and
   * updates a persistent day-streak (consecutive days with at least one regular goal complete).
   * Emits 'dailyGoalDayCompleted' once per day when it increments/reset the streak.
   */
  private async registerDailyGoalDayCompletion(): Promise<void> {
    try {
      const today = getTorontoDateString();
      const [last, streakStr, notified] = await Promise.all([
        AsyncStorage.getItem(this.DAILY_DAY_LAST_KEY),
        AsyncStorage.getItem(this.DAILY_DAY_STREAK_KEY),
        AsyncStorage.getItem(this.DAILY_DAY_NOTIFIED_KEY),
      ]);

      // Only fire once per day
      if (notified === today) {
        return;
      }

      let streak = streakStr ? parseInt(streakStr, 10) : 0;

      if (last) {
        // If yesterday, increment; otherwise, reset to 1
        const lastDate = last;
        const yesterday = new Date(today);
        // Build yesterday string in Toronto; safe approximation by subtracting 1 day
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yyyymmdd = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
        if (lastDate === yyyymmdd) {
          streak += 1;
        } else if (lastDate === today) {
          // Already counted today
          await AsyncStorage.setItem(this.DAILY_DAY_NOTIFIED_KEY, today);
          return;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }

      await AsyncStorage.multiSet([
        [this.DAILY_DAY_STREAK_KEY, streak.toString()],
        [this.DAILY_DAY_LAST_KEY, today],
        [this.DAILY_DAY_NOTIFIED_KEY, today],
      ]);

      // Emit an event so UI (e.g., QuizScreen) can celebrate
      const emitter = new NativeEventEmitter(NativeModules.DeviceEventEmitter || {});
      try {
        emitter.emit('dailyGoalDayCompleted', { dayStreak: streak, date: today });
      } catch {}
    } catch (e) {
      console.error('❌ [DailyGoals] Failed to register daily goal day completion:', e);
    }
  }

  async completeHonorGoal(goalId: string): Promise<boolean> {
    const goal = this.goals.find(g => g.id === goalId);
    if (!goal || !goal.honorBased || goal.completed) {
      return false;
    }
    
    // Skip if locked
    if (goal.requiresAdUnlock && !goal.unlocked) {
      console.warn('⚠️ [DailyGoals] Cannot complete locked goal');
      return false;
    }

    try {
      goal.completed = true;
      goal.progress = 100;
      goal.current = goal.target;
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
    
    // Skip if locked
    if (goal.requiresAdUnlock && !goal.unlocked) {
      console.warn('⚠️ [DailyGoals] Cannot claim locked goal reward');
      return false;
    }

    try {
      // Add time to timer
      const minutesToAdd = Math.floor(goal.reward / 60);
      console.log(`⏱️ [DailyGoals] Adding ${minutesToAdd} minutes for goal: ${goal.title}`);
      
      await TimerIntegrationService.initialize();
      const success = await TimerIntegrationService.addTimeFromGoal(minutesToAdd);
      
      if (success) {
        goal.claimed = true;
        await this.saveGoals();
        this.notifyListeners();
        
        console.log(`✅ [DailyGoals] Reward claimed for: ${goal.title}`);
        // Emit events for UI layers
        try {
          const emitter = new NativeEventEmitter(NativeModules.DeviceEventEmitter || {});
          const payload = { goalId, goalTitle: goal.title, reward: goal.reward };
          if (goal.honorBased) {
            emitter.emit('honorGoalClaimed', payload);
          } else {
            emitter.emit('dailyGoalClaimed', payload);
          }
        } catch {}
        return true;
      } else {
        console.error('❌ [DailyGoals] Failed to add time to timer');
        return false;
      }
    } catch (error) {
      console.error('❌ [DailyGoals] Error claiming reward:', error);
      return false;
    }
  }

  getGoals(): DailyGoal[] {
    return [...this.goals];
  }

  getCompletedGoals(): DailyGoal[] {
    return this.goals.filter(g => g.completed && !g.claimed);
  }

  getUnlockedGoals(): DailyGoal[] {
    return this.goals.filter(g => !g.requiresAdUnlock || g.unlocked);
  }

  private async saveGoals(): Promise<void> {
    try {
      await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
      console.log('✅ [DailyGoals] Goals saved successfully');
    } catch (error) {
      console.error('❌ [DailyGoals] Failed to save goals:', error);
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem('@BrainBites:dailyGoals', JSON.stringify(this.goals));
          console.log('✅ [DailyGoals] Goals saved on retry');
        } catch (retryError) {
          console.error('❌ [DailyGoals] Failed to save goals on retry:', retryError);
        }
      }, 1000);
    }
  }

  // Debug method to check current goals
  debugGoals(): void {
    console.log('🔍 [DailyGoals] Current goals debug:', {
      total: this.goals.length,
      regular: this.goals.filter(g => !g.honorBased).length,
      honor: this.goals.filter(g => g.honorBased).length,
      locked: this.goals.filter(g => g.requiresAdUnlock && !g.unlocked).length,
      unlocked: this.goals.filter(g => !g.requiresAdUnlock || g.unlocked).length,
      allGoals: this.goals.map(g => ({
        title: g.title,
        type: g.type,
        difficulty: g.difficulty,
        honorBased: g.honorBased,
        completed: g.completed,
        claimed: g.claimed,
        locked: g.requiresAdUnlock && !g.unlocked
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

  async resetForTesting(): Promise<void> {
    console.log('🧪 [DailyGoals] Resetting for testing');
    await AsyncStorage.removeItem('@BrainBites:dailyGoals');
    await AsyncStorage.removeItem('@BrainBites:lastGoalReset');
    await AsyncStorage.removeItem('@BrainBites:speedGoalIndex');
    this.goals = [];
    this.isInitialized = false;
    await this.initialize();
  }

  async forceRegenerateGoals(): Promise<void> {
    console.log('🔄 [DailyGoals] Force regenerating goals');
    await AsyncStorage.removeItem('@BrainBites:dailyGoals');
    await AsyncStorage.removeItem('@BrainBites:lastGoalReset');
    await AsyncStorage.removeItem('@BrainBites:speedGoalIndex');
    this.goals = [];
    this.isInitialized = false;
    await this.initialize();
    this.notifyListeners();
    console.log('✅ [DailyGoals] Goals force regenerated');
  }

  // Add method to test different difficulty distributions
  async testDifficultyDistribution(): Promise<void> {
    console.log('🧪 [DailyGoals] Testing difficulty distribution over multiple generations:');
    const distributions: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Temporarily clear storage to force regeneration
      await AsyncStorage.removeItem('@BrainBites:dailyGoals');
      await AsyncStorage.removeItem('@BrainBites:lastGoalReset');
      
      // Generate new goals
      const testGoals = await this.generateDailyGoals();
      const regularGoals = testGoals.filter(g => !g.honorBased && !g.isSpecial);
      
      const dist = regularGoals.map(g => `${g.type}:${g.difficulty}`).join(', ');
      distributions.push(dist);
      console.log(`Generation ${i + 1}: ${dist}`);
    }
    
    console.log('🧪 [DailyGoals] Distribution test complete');
    
    // Restore normal goals
    await this.forceRegenerateGoals();
  }

  // Add midnight reset functionality
  async checkAndResetAtMidnight(): Promise<void> {
    const today = getTorontoDateString(); // This function doesn't take parameters
    
    const lastReset = await AsyncStorage.getItem('@BrainBites:lastGoalReset');
    
    if (lastReset !== today) {
      console.log('🌙 Midnight reset triggered - Goals and daily stats will be reset');
      
      // Reset all goals including accuracy
      this.goals = await this.generateDailyGoals();
      
      // Reset accuracy tracking in EnhancedScoreService
      await EnhancedScoreService.resetDailyStats();
      
      await AsyncStorage.setItem('@BrainBites:lastGoalReset', today);
      await this.saveGoals();
      this.notifyListeners();
      
      console.log('✅ Midnight reset completed');
    }
  }
}

export default DailyGoalsService.getInstance();