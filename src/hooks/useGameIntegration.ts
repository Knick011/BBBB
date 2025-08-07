// src/hooks/useGameIntegration.ts
// ✅ FIXED INTEGRATION HOOKS - Working with existing screens
import { useEffect, useRef, useCallback } from 'react';
import { useLiveGameStore, useGameEvents, GameEvent } from '../store/useLiveGameStore';
import EnhancedScoreService from '../services/EnhancedScoreService';
import TimerIntegrationService from '../services/TimerIntegrationService';
import SoundService from '../services/SoundService';

// ==================== INTEGRATION HOOK ====================

export interface QuizCompletionData {
  isCorrect: boolean;
  pointsEarned: number;
  responseTime?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  streakBonus?: number;
  speedMultiplier?: number;
}

export interface GoalCompletionData {
  goalId: string;
  title: string;
  timeBonus: number;
  reward: number;
}

export interface GameIntegrationCallbacks {
  onQuizCompleted?: (data: QuizCompletionData & { 
    newScore: number; 
    newStreak: number; 
    timeEarned: number;
  }) => void;
  onDailyGoalCompleted?: (data: GoalCompletionData) => void;
  onScoreUpdate?: (data: { 
    newScore: number; 
    newStreak: number; 
    deltaScore: number;
    deltaStreak: number;
  }) => void;
  onStreakMilestone?: (data: { streak: number; level: number }) => void;
  onTimerBonus?: (data: { timeBonus: number; source: string }) => void;
}

/**
 * Main integration hook for connecting quiz completion to live state management
 * This is the primary hook that other components will use
 */
export const useGameIntegration = (callbacks?: GameIntegrationCallbacks) => {
  const { addEventListener } = useGameEvents();
  const processQuizCompletion = useLiveGameStore(state => state.processQuizCompletion);
  const scoreData = useLiveGameStore(state => state.scoreData);
  const isInitialized = useLiveGameStore(state => state.isInitialized);
  const initialize = useLiveGameStore(state => state.initialize);
  
  const previousScore = useRef(scoreData.dailyScore);
  const previousStreak = useRef(scoreData.currentStreak);
  
  // Initialize store on mount
  useEffect(() => {
    if (!isInitialized) {
      console.log('🚀 Initializing game integration...');
      initialize();
    }
  }, [isInitialized, initialize]);
  
  // Track score changes for callbacks
  useEffect(() => {
    if (callbacks?.onScoreUpdate && isInitialized) {
      const deltaScore = scoreData.dailyScore - previousScore.current;
      const deltaStreak = scoreData.currentStreak - previousStreak.current;
      
      if (deltaScore !== 0 || deltaStreak !== 0) {
        callbacks.onScoreUpdate({
          newScore: scoreData.dailyScore,
          newStreak: scoreData.currentStreak,
          deltaScore,
          deltaStreak
        });
      }
      
      previousScore.current = scoreData.dailyScore;
      previousStreak.current = scoreData.currentStreak;
    }
  }, [scoreData.dailyScore, scoreData.currentStreak, callbacks, isInitialized]);
  
  // Set up event listeners
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    // Quiz completion events
    if (callbacks?.onQuizCompleted) {
      const unsubQuiz = addEventListener('QUIZ_COMPLETED', (event: GameEvent) => {
        callbacks.onQuizCompleted?.(event.data);
      });
      unsubscribers.push(unsubQuiz);
    }
    
    // Goal completion events
    if (callbacks?.onDailyGoalCompleted) {
      const unsubGoal = addEventListener('GOAL_COMPLETED', (event: GameEvent) => {
        callbacks.onDailyGoalCompleted?.(event.data);
      });
      unsubscribers.push(unsubGoal);
    }
    
    // Streak milestone events
    if (callbacks?.onStreakMilestone) {
      const unsubStreak = addEventListener('STREAK_MILESTONE', (event: GameEvent) => {
        callbacks.onStreakMilestone?.(event.data);
      });
      unsubscribers.push(unsubStreak);
    }
    
    // Timer bonus events (for Part 3)
    if (callbacks?.onTimerBonus) {
      const unsubTimer = addEventListener('TIMER_BONUS', (event: GameEvent) => {
        callbacks.onTimerBonus?.(event.data);
      });
      unsubscribers.push(unsubTimer);
    }
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [addEventListener, callbacks]);
  
  // Main quiz completion handler
  const handleQuizCompletion = useCallback(async (data: QuizCompletionData) => {
    try {
      console.log('🎯 Handling quiz completion:', data);
      
      // Process answer through EnhancedScoreService (maintains compatibility)
      const result = await EnhancedScoreService.processAnswer(
        data.isCorrect,
        data.difficulty || 'medium',
        {
          startTime: data.responseTime ? Date.now() - data.responseTime : undefined,
          category: data.category
        }
      );
      
      console.log('📊 Score service result:', result);
      
      // Calculate time earned (this will integrate with timer service in Part 3)
      let timeEarned = 0;
      if (data.isCorrect) {
        // Base time reward for correct answers
        timeEarned = data.difficulty === 'hard' ? 180 : data.difficulty === 'medium' ? 120 : 60;
        
        // Speed bonus
        if (data.responseTime && data.responseTime < 5000) {
          timeEarned *= 1.5; // 50% bonus for fast answers
        }
        
        // Streak bonus
        if (result.newStreak >= 5) {
          timeEarned *= (1 + (result.newStreak / 20)); // Up to 50% bonus for 10+ streak
        }
      }
      
      // Update live state
      await processQuizCompletion({
        isCorrect: data.isCorrect,
        pointsEarned: result.pointsEarned,
        newScore: result.newScore,
        newStreak: result.newStreak,
        timeEarned: Math.round(timeEarned),
        category: data.category,
        difficulty: data.difficulty
      });
      
      // Play appropriate sound
      if (data.isCorrect) {
        SoundService.playCorrect();
        if (result.isMilestone) {
          SoundService.playStreak();
        }
      } else {
        SoundService.playIncorrect();
      }
      
      return {
        ...result,
        timeEarned: Math.round(timeEarned)
      };
      
    } catch (error) {
      console.error('Failed to process quiz completion:', error);
      throw error;
    }
  }, [processQuizCompletion]);
  
  return {
    handleQuizCompletion,
    scoreData,
    isInitialized
  };
};

// ==================== SPECIFIC HOOKS FOR DIFFERENT SCREENS ====================

/**
 * Hook for Quiz Screen - handles question completion and provides live feedback
 */
export const useQuizIntegration = () => {
  const integration = useGameIntegration({
    onQuizCompleted: (data) => {
      console.log('Quiz completed:', data.newScore, 'streak:', data.newStreak);
    },
    onStreakMilestone: (data) => {
      console.log('Streak milestone:', data.streak);
      SoundService.playStreak();
    }
  });
  
  return integration;
};

/**
 * Hook for Home Screen - provides live score updates and handles navigation
 */
export const useHomeIntegration = (callbacks?: GameIntegrationCallbacks) => {
  const scoreData = useLiveGameStore(state => state.scoreData);
  const dailyGoals = useLiveGameStore(state => state.dailyGoals);
  const refreshFromStorage = useLiveGameStore(state => state.refreshFromStorage);
  const isInitialized = useLiveGameStore(state => state.isInitialized);
  const initialize = useLiveGameStore(state => state.initialize);
  
  // Auto-initialize on first use
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);
  
  const integration = useGameIntegration({
    onScoreUpdate: (data) => {
      // Home screen could show score change animations
      if (data.deltaScore > 0) {
        console.log(`Score increased by ${data.deltaScore}`);
      }
      callbacks?.onScoreUpdate?.(data);
    },
    onDailyGoalCompleted: (data) => {
      console.log(`Goal completed: ${data.title} (+${data.timeBonus}s)`);
      SoundService.playStreak();
      callbacks?.onDailyGoalCompleted?.(data);
    }
  });
  
  const refreshData = useCallback(async () => {
    await refreshFromStorage();
  }, [refreshFromStorage]);
  
  return {
    ...integration,
    scoreData,
    dailyGoals,
    refreshData,
    completedGoalsCount: dailyGoals.filter(g => g.completed).length,
    totalGoals: dailyGoals.length
  };
};

/**
 * Hook for Daily Goals Screen - handles goal claiming and provides real-time progress
 */
export const useDailyGoalsIntegration = () => {
  const dailyGoals = useLiveGameStore(state => state.dailyGoals);
  const animatingGoals = useLiveGameStore(state => state.animatingGoals);
  const claimGoalReward = useLiveGameStore(state => state.claimGoalReward);
  const updateDailyGoalProgress = useLiveGameStore(state => state.updateDailyGoalProgress);
  const isInitialized = useLiveGameStore(state => state.isInitialized);
  const initialize = useLiveGameStore(state => state.initialize);
  
  // Auto-initialize on first use
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);
  
  const integration = useGameIntegration({
    onDailyGoalCompleted: (data) => {
      // Show celebration animation
      console.log(`🎉 Goal completed: ${data.title}`);
    },
    onTimerBonus: (data) => {
      console.log(`⏰ Time bonus: +${data.timeBonus}s`);
    }
  });
  
  const handleClaimReward = useCallback(async (goalId: string) => {
    try {
      const goal = dailyGoals.find(g => g.id === goalId);
      if (!goal) return;

      console.log(`🎯 [DailyGoals] Claiming reward for goal: ${goal.title}`);
      
      // Existing goal completion logic...
      await claimGoalReward(goalId);
      
      // ✅ ADD TIMER INTEGRATION - Add time for goal completion
      // Convert reward from seconds to minutes
      const timeToAdd = Math.floor(goal.reward / 60);
      
      if (timeToAdd > 0) {
        console.log(`🎯 [DailyGoals] Adding ${timeToAdd} minutes for goal completion`);
        const timerResult = await TimerIntegrationService.addTimeFromGoal(timeToAdd);
        
        if (timerResult) {
          console.log(`✅ [DailyGoals] Successfully added ${timeToAdd}m to timer`);
        } else {
          console.error(`❌ [DailyGoals] Failed to add time to timer`);
        }
      }
      
      SoundService.playStreak();
    } catch (error) {
      console.error('❌ [DailyGoals] Error claiming goal reward:', error);
    }
  }, [claimGoalReward, dailyGoals]);
  
  const refreshProgress = useCallback(async () => {
    await updateDailyGoalProgress();
  }, [updateDailyGoalProgress]);
  
  return {
    ...integration,
    dailyGoals,
    animatingGoals,
    handleClaimReward,
    refreshProgress,
    completedCount: dailyGoals.filter(g => g.completed).length,
    claimedCount: dailyGoals.filter(g => g.claimed).length,
    totalRewards: dailyGoals.filter(g => g.claimed).reduce((sum, g) => sum + g.reward, 0)
  };
};

/**
 * Hook for Leaderboard Screen - provides live score updates
 */
export const useLeaderboardIntegration = () => {
  const scoreData = useLiveGameStore(state => state.scoreData);
  const refreshFromStorage = useLiveGameStore(state => state.refreshFromStorage);
  const isInitialized = useLiveGameStore(state => state.isInitialized);
  const initialize = useLiveGameStore(state => state.initialize);
  
  // Auto-initialize on first use
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);
  
  const integration = useGameIntegration({
    onScoreUpdate: (data) => {
      // Leaderboard could animate rank changes
      console.log('Leaderboard: score updated', data.newScore);
    }
  });
  
  return {
    ...integration,
    scoreData,
    userScore: scoreData.dailyScore,
    userStreak: scoreData.currentStreak,
    userAccuracy: scoreData.accuracy,
    refreshData: refreshFromStorage
  };
};

// ==================== TIMER INTEGRATION (READY FOR PART 3) ====================

/**
 * Hook ready for timer service integration in Part 3
 * Provides event handlers for time-based rewards
 */
export const useTimerIntegration = () => {
  const { addEventListener } = useGameEvents();
  
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    // Listen for events that should add time
    const unsubQuiz = addEventListener('QUIZ_COMPLETED', (event: GameEvent) => {
      const { timeEarned } = event.data;
      if (timeEarned > 0) {
        // This will integrate with EnhancedTimerService in Part 3
        console.log(`⏰ Would add ${timeEarned}s to timer`);
        // EnhancedTimerService.addTime(timeEarned);
      }
    });
    
    const unsubGoal = addEventListener('GOAL_COMPLETED', (event: GameEvent) => {
      const { timeBonus } = event.data;
      if (timeBonus > 0) {
        // This will integrate with EnhancedTimerService in Part 3
        console.log(`🎯 Would add ${timeBonus}s goal bonus to timer`);
        // EnhancedTimerService.addTime(timeBonus);
      }
    });
    
    unsubscribers.push(unsubQuiz, unsubGoal);
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [addEventListener]);
  
  return {
    // Ready for timer service integration
    addTimeForCorrectAnswer: (seconds: number) => {
      console.log(`Timer integration: +${seconds}s`);
    },
    addTimeForGoalCompletion: (seconds: number) => {
      console.log(`Timer integration: +${seconds}s (goal bonus)`);
    }
  };
};

export default useGameIntegration;