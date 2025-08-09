import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { Question } from '../types';

interface QuizState {
  currentQuestion: Question | null;
  currentStreak: number;
  dailyHighestStreak: number;
  lastStreakUpdate: string | null;
  questionsAnswered: number;
  lastAnswerCorrect: boolean | null;
  quizStartTime: number;
  
  // Actions
  setCurrentQuestion: (question: Question | null) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  initializeStreak: () => void;
  updateDailyHighest: () => void;
  setLastAnswerCorrect: (correct: boolean) => void;
  incrementQuestionsAnswered: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  currentQuestion: null,
  currentStreak: 0,
  dailyHighestStreak: 0,
  lastStreakUpdate: null,
  questionsAnswered: 0,
  lastAnswerCorrect: null,
  quizStartTime: Date.now(),

  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  
  // Initialize streak when entering quiz (always starts at 0)
  initializeStreak: () => {
    set({ currentStreak: 0 });
    console.log('🎯 [QuizStore] Streak initialized to 0 for new quiz session');
  },
  
  // Increment current streak on correct answer
  incrementStreak: () => {
    const { currentStreak, dailyHighestStreak } = get();
    const newStreak = currentStreak + 1;
    
    set({ currentStreak: newStreak });
    
    // Update daily highest if current exceeds it
    if (newStreak > dailyHighestStreak) {
      const today = moment().tz('America/Toronto').format('YYYY-MM-DD');
      set({ 
        dailyHighestStreak: newStreak,
        lastStreakUpdate: today
      });
      
      // Save to AsyncStorage
      AsyncStorage.setItem('@BrainBites:dailyHighestStreak', newStreak.toString());
      AsyncStorage.setItem('@BrainBites:lastStreakUpdate', today);
      
      console.log(`🔥 [QuizStore] New daily highest streak: ${newStreak}`);
    }
  },
  
  // Reset current streak (wrong answer, quit, or force-close)
  resetStreak: () => {
    set({ currentStreak: 0 });
    console.log('❌ [QuizStore] Current streak reset to 0');
  },
  
  // Update daily highest streak
  updateDailyHighest: async () => {
    const today = moment().tz('America/Toronto').format('YYYY-MM-DD');
    const savedDate = await AsyncStorage.getItem('@BrainBites:lastStreakUpdate');
    
    // Reset daily highest if it's a new day
    if (savedDate !== today) {
      set({ 
        dailyHighestStreak: 0,
        lastStreakUpdate: today 
      });
      
      await AsyncStorage.setItem('@BrainBites:dailyHighestStreak', '0');
      await AsyncStorage.setItem('@BrainBites:lastStreakUpdate', today);
      
      console.log('🌅 [QuizStore] New day - daily highest streak reset to 0');
    } else {
      // Load saved daily highest
      const savedStreak = await AsyncStorage.getItem('@BrainBites:dailyHighestStreak');
      if (savedStreak) {
        set({ dailyHighestStreak: parseInt(savedStreak, 10) });
      }
    }
  },
  
  setLastAnswerCorrect: (correct) => {
    set({ lastAnswerCorrect: correct });
    // Reset after animation
    setTimeout(() => {
      set({ lastAnswerCorrect: null });
    }, 2000);
  },
  
  incrementQuestionsAnswered: () => 
    set((state) => ({ questionsAnswered: state.questionsAnswered + 1 })),
  
  resetQuiz: () => set({
    currentQuestion: null,
    currentStreak: 0,
    questionsAnswered: 0,
    lastAnswerCorrect: null,
    quizStartTime: Date.now(),
  }),
}));