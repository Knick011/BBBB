// src/services/EnhancedScoreService.ts - TypeScript version with daily goals tracking
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DailyGoalsService from './DailyGoalsService';
import { UserStats } from '../types';

interface ScoreInfo {
  dailyScore: number;
  currentStreak: number;
  highestStreak: number;
  streakLevel: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  questionsToday: number;
  carryoverScore?: number; // Added for daily carryover
}

interface ScoreResult {
  pointsEarned: number;
  newScore: number;
  newStreak: number;
  streakLevel: number;
  isMilestone: boolean;
  speedCategory: string;
  speedMultiplier: number;
  baseScore: number;
}

interface AnswerMetadata {
  startTime?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface TodayStats {
  totalQuestions: number;
  correctAnswers: number;
  categoryCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  date: string;
  accuracy: number;
}

class EnhancedScoreService {
  private currentStreak: number = 0;
  private dailyScore: number = 0;
  private highestStreak: number = 0;
  private totalQuestionsAnswered: number = 0;
  private correctAnswers: number = 0;
  private streakLevel: number = 0;
  private questionStartTime: number | null = null;
  
  // Daily tracking
  private todayStats: TodayStats = {
    totalQuestions: 0,
    correctAnswers: 0,
    categoryCounts: {},
    difficultyCounts: {},
    date: new Date().toDateString(),
    accuracy: 0
  };
  
  // Storage keys
  private readonly STORAGE_KEYS = {
    DAILY_SCORE: '@BrainBites:dailyScore',
    CURRENT_STREAK: '@BrainBites:currentStreak', 
    HIGHEST_STREAK: '@BrainBites:highestStreak',
    TOTAL_QUESTIONS: '@BrainBites:totalQuestions',
    CORRECT_ANSWERS: '@BrainBites:correctAnswers',
    DAILY_STATS: '@BrainBites:dailyStats',
    LAST_RESET: '@BrainBites:lastReset',
    CARRYOVER_APPLIED: '@BrainBites:carryoverApplied'
  };

  async loadSavedData(): Promise<void> {
    try {
      // Check if we need to reset daily data
      await this.checkDailyReset();
      
      // Load all saved data
      const [
        savedScore,
        savedStreak, 
        savedHighest,
        savedTotal,
        savedCorrect,
        savedDailyStats
      ] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.DAILY_SCORE),
        AsyncStorage.getItem(this.STORAGE_KEYS.CURRENT_STREAK),
        AsyncStorage.getItem(this.STORAGE_KEYS.HIGHEST_STREAK),
        AsyncStorage.getItem(this.STORAGE_KEYS.TOTAL_QUESTIONS),
        AsyncStorage.getItem(this.STORAGE_KEYS.CORRECT_ANSWERS),
        AsyncStorage.getItem(this.STORAGE_KEYS.DAILY_STATS)
      ]);
      
      this.dailyScore = savedScore ? parseInt(savedScore, 10) : 0;
      this.currentStreak = savedStreak ? parseInt(savedStreak, 10) : 0;
      this.highestStreak = savedHighest ? parseInt(savedHighest, 10) : 0;
      this.totalQuestionsAnswered = savedTotal ? parseInt(savedTotal, 10) : 0;
      this.correctAnswers = savedCorrect ? parseInt(savedCorrect, 10) : 0;
      
      if (savedDailyStats) {
        this.todayStats = JSON.parse(savedDailyStats);
      }
      
      this.calculateStreakLevel();
    } catch (error) {
      console.error('Failed to load score data:', error);
    }
  }

  private async checkDailyReset(): Promise<void> {
    const today = new Date().toDateString();
    const lastReset = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_RESET);
    
    if (lastReset !== today) {
      // Check for carryover from native module
      await this.checkAndApplyCarryover();
      
      // Reset daily data
      this.dailyScore = 0;
      this.todayStats = {
        totalQuestions: 0,
        correctAnswers: 0,
        categoryCounts: {},
        difficultyCounts: {},
        date: today,
        accuracy: 0
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_RESET, today);
      await AsyncStorage.setItem(this.STORAGE_KEYS.CARRYOVER_APPLIED, 'false');
      await this.saveData();
    }
  }

  private async checkAndApplyCarryover(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const carryoverApplied = await AsyncStorage.getItem(this.STORAGE_KEYS.CARRYOVER_APPLIED);
      
      if (carryoverApplied === 'true') {
        return; // Already applied for today
      }

      // Get carryover score from native module
      if (NativeModules.DailyScoreCarryover) {
        const carryoverScore = await NativeModules.DailyScoreCarryover.getTodayStartScore();
        
        if (carryoverScore !== 0) {
          console.log(`🎯 Applying carryover score: ${carryoverScore > 0 ? '+' : ''}${carryoverScore}`);
          
          // Apply carryover to daily score
          this.dailyScore = Math.max(0, carryoverScore); // Don't go below 0
          
          // Mark as applied
          await AsyncStorage.setItem(this.STORAGE_KEYS.CARRYOVER_APPLIED, 'true');
          await this.saveData();
          
          // Notify user about carryover
          if (NativeModules.ToastModule) {
            const message = carryoverScore > 0 
              ? `🎉 Bonus! +${carryoverScore} points from yesterday's saved time!`
              : `⚠️ Starting with ${Math.abs(carryoverScore)} point penalty from yesterday's overtime`;
            
            NativeModules.ToastModule.show(message, NativeModules.ToastModule.LONG);
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply carryover score:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_SCORE, this.dailyScore.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_STREAK, this.currentStreak.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.HIGHEST_STREAK, this.highestStreak.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.TOTAL_QUESTIONS, this.totalQuestionsAnswered.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.CORRECT_ANSWERS, this.correctAnswers.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_STATS, JSON.stringify(this.todayStats))
      ]);
    } catch (error) {
      console.error('Failed to save score data:', error);
    }
  }

  async saveAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_SCORE, this.dailyScore.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_STREAK, this.currentStreak.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.HIGHEST_STREAK, this.highestStreak.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.TOTAL_QUESTIONS, this.totalQuestionsAnswered.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.CORRECT_ANSWERS, this.correctAnswers.toString()),
        AsyncStorage.setItem(this.STORAGE_KEYS.DAILY_STATS, JSON.stringify(this.todayStats))
      ]);
    } catch (error) {
      console.error('Failed to save score data:', error);
    }
  }

  startQuestionTimer(): void {
    this.questionStartTime = Date.now();
  }

  private getSpeedInfo(responseTime: number): { category: string; multiplier: number } {
    const timeInSeconds = responseTime / 1000;
    
    if (timeInSeconds < 5) {
      return { category: "Lightning Fast!", multiplier: 2.0 };
    } else if (timeInSeconds <= 10) {
      return { category: "Quick!", multiplier: 1.5 };
    } else {
      return { category: "Good!", multiplier: 1.0 };
    }
  }

  async processAnswer(
    isCorrect: boolean,
    difficulty: 'easy' | 'medium' | 'hard',
    metadata?: AnswerMetadata
  ): Promise<ScoreResult> {
    const { startTime, category } = metadata || {};
    
    // Update total questions
    this.totalQuestionsAnswered++;
    this.todayStats.totalQuestions++;
    
    // Update category count
    if (category) {
      this.todayStats.categoryCounts[category] = 
        (this.todayStats.categoryCounts[category] || 0) + 1;
    }
    
    // Update difficulty count
    if (difficulty) {
      this.todayStats.difficultyCounts[difficulty] = 
        (this.todayStats.difficultyCounts[difficulty] || 0) + 1;
    }
    
    let pointsEarned = 0;
    let isMilestone = false;
    
    let speedCategory = "Good!";
    let speedMultiplier = 1.0;
    let baseScore = 0;
    
    if (isCorrect) {
      this.correctAnswers++;
      this.todayStats.correctAnswers++;
      
      // Update streak
      this.currentStreak++;
      if (this.currentStreak > this.highestStreak) {
        this.highestStreak = this.currentStreak;
      }
      
      // Calculate base points
      const basePoints = 100;
      
      // Time bonus (faster = more points)
      const responseTime = startTime ? Date.now() - startTime : 10000;
      const timeBonus = Math.max(0, Math.floor((20000 - responseTime) / 1000) * 5);
      
      // Streak bonus
      const streakBonus = Math.floor(this.currentStreak / 5) * 50;
      
      // Difficulty bonus
      let difficultyBonus = 0;
      if (difficulty === 'medium') difficultyBonus = 25;
      if (difficulty === 'hard') difficultyBonus = 50;
      
      // Calculate base score (before speed multiplier)
      baseScore = basePoints + timeBonus + streakBonus + difficultyBonus;
      
      // Check for milestone bonus (added to base score)
      if (this.currentStreak % 5 === 0 && this.currentStreak > 0) {
        isMilestone = true;
        baseScore += 200; // Milestone bonus
      }
      
      // Get speed multiplier info
      const speedInfo = this.getSpeedInfo(responseTime);
      speedCategory = speedInfo.category;
      speedMultiplier = speedInfo.multiplier;
      
      // Apply speed multiplier to get final points
      pointsEarned = Math.round(baseScore * speedMultiplier);
      
      this.dailyScore += pointsEarned;
    } else {
      // Reset streak on wrong answer
      this.currentStreak = 0;
    }
    
    // Apply debt penalty if timer is negative
    const debtPenalty = this.getDebtPenalty();
    if (debtPenalty > 0) {
      this.dailyScore = Math.max(0, this.dailyScore - debtPenalty);
    }
    
    // Update accuracy
    this.todayStats.accuracy = this.todayStats.totalQuestions > 0
      ? Math.round((this.todayStats.correctAnswers / this.todayStats.totalQuestions) * 100)
      : 0;
    
    this.calculateStreakLevel();
    await this.saveAllData();
    
    // Update daily goals progress
    try {
      await DailyGoalsService.updateProgress({
        isCorrect,
        difficulty,
        category: metadata?.category,
        currentStreak: this.currentStreak,
        todayAccuracy: this.todayStats.correctAnswers > 0 
          ? Math.round((this.todayStats.correctAnswers / this.todayStats.totalQuestions) * 100)
          : 0,
        todayQuestions: this.todayStats.totalQuestions
      });
      
      console.log('✅ [EnhancedScoreService] Updated daily goals progress');
    } catch (error) {
      console.error('❌ [EnhancedScoreService] Failed to update daily goals:', error);
    }
    
    return {
      pointsEarned,
      newScore: this.dailyScore,
      newStreak: this.currentStreak,
      streakLevel: this.streakLevel,
      isMilestone,
      speedCategory,
      speedMultiplier,
      baseScore
    };
  }

  private calculateStreakLevel(): void {
    // Streak levels: 0-4, 5-9, 10-14, 15-19, 20+
    if (this.currentStreak >= 20) this.streakLevel = 5;
    else if (this.currentStreak >= 15) this.streakLevel = 4;
    else if (this.currentStreak >= 10) this.streakLevel = 3;
    else if (this.currentStreak >= 5) this.streakLevel = 2;
    else if (this.currentStreak > 0) this.streakLevel = 1;
    else this.streakLevel = 0;
  }

  private getDebtPenalty(): number {
    // Import from timer service if available
    try {
      // const EnhancedTimerService = require('./EnhancedTimerService').default;
      // return EnhancedTimerService.getDebtPenalty();
      return 0; // Fallback when EnhancedTimerService is not available
    } catch (error) {
      return 0;
    }
  }

  endQuizSession(): void {
    // Reset streak but keep score
    this.currentStreak = 0;
    this.calculateStreakLevel();
    this.saveData();
  }

  getScoreInfo(): ScoreInfo {
    const accuracy = this.totalQuestionsAnswered > 0 
      ? Math.round((this.correctAnswers / this.totalQuestionsAnswered) * 100)
      : 0;
    
    return {
      dailyScore: this.dailyScore,
      currentStreak: this.currentStreak,
      highestStreak: this.highestStreak,
      streakLevel: this.streakLevel,
      totalQuestions: this.totalQuestionsAnswered,
      correctAnswers: this.correctAnswers,
      accuracy,
      questionsToday: this.todayStats.totalQuestions
    };
  }

  async getTodayQuizStats(): Promise<TodayStats> {
    // Ensure we have latest data
    await this.checkDailyReset();
    
    return {
      totalQuestions: this.todayStats.totalQuestions,
      correctAnswers: this.todayStats.correctAnswers,
      categoryCounts: this.todayStats.categoryCounts,
      difficultyCounts: this.todayStats.difficultyCounts,
      date: this.todayStats.date,
      accuracy: this.todayStats.accuracy
    };
  }

  async getCarryoverInfo(): Promise<any> {
    try {
      if (NativeModules.DailyScoreCarryover) {
        return await NativeModules.DailyScoreCarryover.getCarryoverInfo();
      }
      return null;
    } catch (error) {
      console.error('Failed to get carryover info:', error);
      return null;
    }
  }

  async resetAllData(): Promise<void> {
    this.currentStreak = 0;
    this.dailyScore = 0;
    this.highestStreak = 0;
    this.totalQuestionsAnswered = 0;
    this.correctAnswers = 0;
    this.streakLevel = 0;
    this.todayStats = {
      totalQuestions: 0,
      correctAnswers: 0,
      categoryCounts: {},
      difficultyCounts: {},
      date: new Date().toDateString(),
      accuracy: 0
    };
    
    await this.saveData();
  }
}

export default new EnhancedScoreService();