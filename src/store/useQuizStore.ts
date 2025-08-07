import { create } from 'zustand';
import { Question } from '../types';

interface QuizState {
  currentQuestion: Question | null;
  currentStreak: number;
  questionsAnswered: number;
  lastAnswerCorrect: boolean | null;
  quizStartTime: number;
  
  // Actions
  setCurrentQuestion: (question: Question | null) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  setLastAnswerCorrect: (correct: boolean) => void;
  incrementQuestionsAnswered: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  currentQuestion: null,
  currentStreak: 0,
  questionsAnswered: 0,
  lastAnswerCorrect: null,
  quizStartTime: Date.now(),

  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  
  incrementStreak: () => set((state) => ({ currentStreak: state.currentStreak + 1 })),
  
  resetStreak: () => set({ currentStreak: 0 }),
  
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