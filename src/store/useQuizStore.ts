import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';

interface QuizStore {
  // Streak data
  currentStreak: number;  // Always 0 when quiz starts
  dailyHighestStreak: number;
  lastStreakDate: string | null;
  
  // Quiz state
  questionsAnswered: number;
  correctAnswers: number;
  
  // Actions
  initializeQuizSession: () => Promise<void>;
  incrementStreak: () => Promise<void>;
  resetCurrentStreak: () => void;
  loadDailyHighest: () => Promise<void>;
  saveDailyHighest: () => Promise<void>;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  currentStreak: 0,
  dailyHighestStreak: 0,
  lastStreakDate: null,
  questionsAnswered: 0,
  correctAnswers: 0,
  
  // CRITICAL: Called when entering quiz - ALWAYS starts at 0
  initializeQuizSession: async () => {
    console.log('🎯 [QuizStore] Initializing new quiz session');
    
    // Load today's highest streak but DON'T restore current streak
    await get().loadDailyHighest();
    
    // ALWAYS start current streak at 0 for new quiz
    set({ 
      currentStreak: 0,
      questionsAnswered: 0,
      correctAnswers: 0
    });
    
    console.log('✅ [QuizStore] Quiz session initialized - Current streak: 0');
  },
  
  // Increment streak on correct answer
  incrementStreak: async () => {
    const { currentStreak, dailyHighestStreak } = get();
    const newStreak = currentStreak + 1;
    
    set({ currentStreak: newStreak });
    console.log(`🔥 [QuizStore] Streak increased to ${newStreak}`);
    
    // Update daily highest if exceeded
    if (newStreak > dailyHighestStreak) {
      set({ dailyHighestStreak: newStreak });
      await get().saveDailyHighest();
      console.log(`🏆 [QuizStore] New daily highest: ${newStreak}`);
    }
  },
  
  // Reset current streak (wrong answer or quit)
  resetCurrentStreak: () => {
    console.log('❌ [QuizStore] Resetting current streak to 0');
    set({ currentStreak: 0 });
  },
  
  // Load daily highest (check for new day)
  loadDailyHighest: async () => {
    try {
      const today = moment().tz('America/Toronto').format('YYYY-MM-DD');
      const savedDate = await AsyncStorage.getItem('@BrainBites:lastStreakDate');
      
      if (savedDate !== today) {
        // New day - reset daily highest
        console.log('🌅 [QuizStore] New day detected - resetting daily highest');
        set({ 
          dailyHighestStreak: 0,
          lastStreakDate: today 
        });
        await AsyncStorage.setItem('@BrainBites:dailyHighestStreak', '0');
        await AsyncStorage.setItem('@BrainBites:lastStreakDate', today);
      } else {
        // Same day - load saved highest
        const savedHighest = await AsyncStorage.getItem('@BrainBites:dailyHighestStreak');
        const highest = savedHighest ? parseInt(savedHighest, 10) : 0;
        set({ 
          dailyHighestStreak: highest,
          lastStreakDate: today
        });
        console.log(`📊 [QuizStore] Loaded daily highest: ${highest}`);
      }
    } catch (error) {
      console.error('❌ [QuizStore] Error loading daily highest:', error);
    }
  },
  
  // Save daily highest
  saveDailyHighest: async () => {
    const { dailyHighestStreak } = get();
    const today = moment().tz('America/Toronto').format('YYYY-MM-DD');
    
    try {
      await AsyncStorage.setItem('@BrainBites:dailyHighestStreak', dailyHighestStreak.toString());
      await AsyncStorage.setItem('@BrainBites:lastStreakDate', today);
      console.log(`💾 [QuizStore] Saved daily highest: ${dailyHighestStreak}`);
    } catch (error) {
      console.error('❌ [QuizStore] Error saving daily highest:', error);
    }
  },
}));