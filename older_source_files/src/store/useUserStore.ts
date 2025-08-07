import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyGoal } from '../types';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface UserState {
  username: string;
  score: number;
  highScore: number;
  streak: number;
  maxStreak: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  dailyGoal: {
    current: number;
    target: number;
    lastUpdated: string;
  };
  dailyGoals: DailyGoal[];
  achievements: Achievement[];
  lastPlayedDate: string;
  
  // Actions
  setUsername: (name: string) => void;
  addScore: (points: number) => void;
  addStreak: () => void;
  resetStreak: () => void;
  updateDailyGoal: (correct: number) => void;
  completeGoal: (goalId: string) => void;
  unlockAchievement: (achievementId: string) => void;
  incrementStats: (correct: boolean) => void;
  loadUserData: () => Promise<void>;
  saveUserData: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

const defaultAchievements: Achievement[] = [
  {
    id: 'first_correct',
    title: 'First Steps',
    description: 'Answer your first question correctly',
    icon: '🎯',
    unlocked: false,
  },
  {
    id: 'streak_5',
    title: 'On Fire!',
    description: 'Get a 5-question streak',
    icon: '🔥',
    unlocked: false,
  },
  {
    id: 'streak_10',
    title: 'Unstoppable!',
    description: 'Get a 10-question streak',
    icon: '⚡',
    unlocked: false,
  },
  {
    id: 'perfect_quiz',
    title: 'Perfectionist',
    description: 'Complete a quiz with 100% accuracy',
    icon: '⭐',
    unlocked: false,
  },
  {
    id: 'daily_goal',
    title: 'Daily Champion',
    description: 'Complete your daily goal',
    icon: '🏆',
    unlocked: false,
  },
  {
    id: 'score_100',
    title: 'Century Club',
    description: 'Reach 100 points',
    icon: '💯',
    unlocked: false,
  },
  {
    id: 'score_500',
    title: 'High Roller',
    description: 'Reach 500 points',
    icon: '💎',
    unlocked: false,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Play before 8 AM',
    icon: '🌅',
    unlocked: false,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Play after 10 PM',
    icon: '🦉',
    unlocked: false,
  },
];

export const useUserStore = create<UserState>((set, get) => ({
  username: 'CaBBy',
  score: 0,
  highScore: 0,
  streak: 0,
  maxStreak: 0,
  totalCorrectAnswers: 0,
  totalQuestions: 0,
  dailyGoal: {
    current: 0,
    target: 10,
    lastUpdated: new Date().toDateString(),
  },
  dailyGoals: [
    {
      id: 'daily_questions',
      description: 'Answer 10 questions today',
      target: 10,
      current: 0,
      reward: 300, // 5 minutes
      completed: false,
      type: 'questions',
    },
    {
      id: 'daily_streak',
      description: 'Get a 5-question streak',
      target: 5,
      current: 0,
      reward: 180, // 3 minutes
      completed: false,
      type: 'streak',
    },
    {
      id: 'daily_accuracy',
      description: 'Maintain 80% accuracy',
      target: 8,
      current: 0,
      reward: 240, // 4 minutes
      completed: false,
      type: 'accuracy',
    },
  ],
  achievements: defaultAchievements,
  lastPlayedDate: new Date().toDateString(),

  setUsername: (name) => {
    set({ username: name });
    get().saveUserData();
  },

  addScore: (points) => {
    set((state) => {
      const newScore = state.score + points;
      const newHighScore = Math.max(newScore, state.highScore);
      
      // Check score achievements
      if (newScore >= 100 && !state.achievements.find(a => a.id === 'score_100')?.unlocked) {
        get().unlockAchievement('score_100');
      }
      if (newScore >= 500 && !state.achievements.find(a => a.id === 'score_500')?.unlocked) {
        get().unlockAchievement('score_500');
      }
      
      return { score: newScore, highScore: newHighScore };
    });
    get().saveUserData();
  },

  addStreak: () => {
    set((state) => {
      const newStreak = state.streak + 1;
      const newMaxStreak = Math.max(newStreak, state.maxStreak);
      
      // Check streak achievements
      if (newStreak === 5 && !state.achievements.find(a => a.id === 'streak_5')?.unlocked) {
        get().unlockAchievement('streak_5');
      }
      if (newStreak === 10 && !state.achievements.find(a => a.id === 'streak_10')?.unlocked) {
        get().unlockAchievement('streak_10');
      }
      
      return { streak: newStreak, maxStreak: newMaxStreak };
    });
  },

  resetStreak: () => {
    set({ streak: 0 });
  },

  updateDailyGoal: (correct) => {
    set((state) => {
      const today = new Date().toDateString();
      let dailyGoal = { ...state.dailyGoal };
      
      // Reset if it's a new day
      if (dailyGoal.lastUpdated !== today) {
        dailyGoal = {
          current: 0,
          target: 10,
          lastUpdated: today,
        };
      }
      
      dailyGoal.current = Math.min(dailyGoal.current + correct, dailyGoal.target);
      
      // Check daily goal achievement
      if (dailyGoal.current >= dailyGoal.target && 
          !state.achievements.find(a => a.id === 'daily_goal')?.unlocked) {
        get().unlockAchievement('daily_goal');
      }
      
      return { dailyGoal };
    });
    get().saveUserData();
  },

  completeGoal: (goalId) => {
    set((state) => {
      const updatedGoals = state.dailyGoals.map(goal => 
        goal.id === goalId ? { ...goal, completed: true } : goal
      );
      return { dailyGoals: updatedGoals };
    });
    get().saveUserData();
  },

  unlockAchievement: (achievementId) => {
    set((state) => {
      const achievements = state.achievements.map(a => 
        a.id === achievementId 
          ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
          : a
      );
      
      return { achievements };
    });
    get().saveUserData();
  },

  incrementStats: (correct) => {
    set((state) => {
      const totalQuestions = state.totalQuestions + 1;
      const totalCorrectAnswers = state.totalCorrectAnswers + (correct ? 1 : 0);
      
      // Check first correct achievement
      if (correct && totalCorrectAnswers === 1 && 
          !state.achievements.find(a => a.id === 'first_correct')?.unlocked) {
        get().unlockAchievement('first_correct');
      }
      
      // Check time-based achievements
      const hour = new Date().getHours();
      if (hour < 8 && !state.achievements.find(a => a.id === 'early_bird')?.unlocked) {
        get().unlockAchievement('early_bird');
      }
      if (hour >= 22 && !state.achievements.find(a => a.id === 'night_owl')?.unlocked) {
        get().unlockAchievement('night_owl');
      }
      
      return { totalQuestions, totalCorrectAnswers };
    });
    
    if (correct) {
      get().updateDailyGoal(1);
    }
    
    get().saveUserData();
  },

  loadUserData: async () => {
    try {
      const data = await AsyncStorage.getItem('brainbites_user_data');
      if (data) {
        const parsed = JSON.parse(data);
        set({
          username: parsed.username || 'CaBBy',
          score: parsed.score || 0,
          highScore: parsed.highScore || 0,
          streak: 0, // Always reset streak on app start
          maxStreak: parsed.maxStreak || 0,
          totalCorrectAnswers: parsed.totalCorrectAnswers || 0,
          totalQuestions: parsed.totalQuestions || 0,
          dailyGoal: parsed.dailyGoal || {
            current: 0,
            target: 10,
            lastUpdated: new Date().toDateString(),
          },
          achievements: parsed.achievements || defaultAchievements,
          lastPlayedDate: parsed.lastPlayedDate || new Date().toDateString(),
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },

  saveUserData: async () => {
    try {
      const state = get();
      const data = {
        username: state.username,
        score: state.score,
        highScore: state.highScore,
        maxStreak: state.maxStreak,
        totalCorrectAnswers: state.totalCorrectAnswers,
        totalQuestions: state.totalQuestions,
        dailyGoal: state.dailyGoal,
        achievements: state.achievements,
        lastPlayedDate: new Date().toDateString(),
      };
      await AsyncStorage.setItem('brainbites_user_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  resetProgress: async () => {
    set({
      score: 0,
      highScore: 0,
      streak: 0,
      maxStreak: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      dailyGoal: {
        current: 0,
        target: 10,
        lastUpdated: new Date().toDateString(),
      },
      achievements: defaultAchievements,
    });
    await get().saveUserData();
  },
}));