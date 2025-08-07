// src/types/index.ts
// Type definitions for the BrainBites quiz app

export type RootStackParamList = {
  Home: undefined;
  Quiz: { difficulty?: 'easy' | 'medium' | 'hard'; category?: string };
  Categories: undefined;
  DailyGoals: undefined;
  Leaderboard: undefined;
  Welcome: undefined;
  Settings: undefined;
};

export interface Question {
  id: string;
  question: string;
  correctAnswer: string;
  options: Record<string, string>;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  level?: 'easy' | 'medium' | 'hard';
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
}

export interface QuizScreenState {
  currentQuestion: Question | null;
  selectedAnswer: string | null;
  showResult: boolean;
  isCorrect: boolean | null;
  streak: number;
  showStreakAnimation: boolean;
  showMascot: boolean;
  mascotMessage: string;
  isLoading: boolean;
  questionsAnswered: number;
  correctAnswers: number;
  showExplanation: boolean;
  score: number;
  isStreakMilestone: boolean;
  showPointsAnimation: boolean;
  pointsEarned: number;
}

export interface UserStats {
  totalScore: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  bestStreak: number;
  dailyStreak: number;
  lastPlayedDate: string;
  totalPlayTime: number;
  categoriesPlayed: { [key: string]: number };
  difficultyStats: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };
  leaderboardRank: number;
}

export interface DailyGoal {
  id: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  type: 'questions' | 'streak' | 'accuracy' | 'time' | 'difficulty' | 'category' | 'perfect';
}

export interface TimerState {
  remainingTime: number;
  isRunning: boolean;
  negativeScore: number;
  isPaused: boolean;
}

export type SoundEffect = 
  | 'correct'
  | 'incorrect'
  | 'levelUp'
  | 'timerWarning'
  | 'buttonClick'
  | 'mascotPeek'
  | 'mascotHappy'
  | 'mascotSad'
  | 'streakStart'
  | 'streakContinue'
  | 'streakBreak'
  | 'goalComplete'
  | 'backgroundMusic';

export type MascotMood = 
  | 'peeking'
  | 'happy'
  | 'sad'
  | 'excited'
  | 'gamemode'
  | 'depressed'
  | 'below';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  questionsPerDay: number;
  streak: number;
  avatar: string;
  isPlayer?: boolean;
  displayName?: string;
  highestStreak?: number;
  lastActive?: string;
  isCurrentUser?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  questionCount: number;
}

export interface DifficultyOption {
  level: 'easy' | 'medium' | 'hard';
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  points: string;
  timeReward: number;
}

// Score Types
export interface ScoreInfo {
  dailyScore: number;
  currentStreak: number;
  highestStreak: number;
  streakLevel: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  questionsToday: number;
}

export interface ScoreResult {
  pointsEarned: number;
  currentStreak: number;
  newScore: number;
  streakLevel: number;
  isMilestone: boolean;
  newStreak: number;
  speedCategory: string;
  speedMultiplier: number;
  baseScore: number;
}

// Timer Update Types
export interface TimerUpdateData {
  remainingTime: number;
  isTracking: boolean;
  debtTime: number;
  isAppForeground: boolean;
}

// Goal Types
export interface GoalTemplate {
  id: string;
  type: 'questions' | 'streak' | 'accuracy' | 'difficulty' | 'category' | 'perfect';
  target: number | string;
  minQuestions?: number;
  reward: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface GoalProgress {
  current: number;
  target?: number;
  questionsAnswered?: number;
  completed: boolean;
  claimed: boolean;
}

// Quiz Stats Types
export interface TodayStats {
  totalQuestions: number;
  correctAnswers: number;
  categoryCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  date: string;
  accuracy: number;
}

// Question Service Types
export interface AnsweredQuestion {
  correct: boolean;
  timestamp: string;
}

export interface QuestionStats {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  remaining: number;
}

// Settings Types
export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  darkMode: boolean;
  username: string;
}

// Achievement Types
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
  unlockedAt?: string;
  reward?: number;
}