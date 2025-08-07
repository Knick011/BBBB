// src/services/FirebaseAnalyticsService.ts
// Backward compatibility wrapper for the new AnalyticsManager
// Maintains the same API that existing code expects

import AnalyticsManager from './AnalyticsManager';

interface QuizAnalyticsData {
  category: string;
  difficulty: string;
  question_id: string;
  correct: boolean;
  time_taken: number;
  streak: number;
  score_earned: number;
}

interface UserProgressData {
  level: number;
  total_score: number;
  questions_answered: number;
  accuracy: number;
  best_streak: number;
  days_played: number;
}

interface GameSessionData {
  session_duration: number;
  questions_answered: number;
  correct_answers: number;
  categories_played: string[];
  final_score: number;
  final_streak: number;
}

class FirebaseAnalyticsService {
  private analyticsManager = AnalyticsManager;

  // =============================
  // INITIALIZATION
  // =============================
  
  async initialize(): Promise<boolean> {
    return await this.analyticsManager.initialize();
  }

  // =============================
  // USER EVENTS
  // =============================
  
  async logUserRegistration(method: string = 'default'): Promise<void> {
    // Map to new system's user identification
    this.analyticsManager.trackEvent('user_registered', {
      registration_method: method,
    });
  }

  async setUserProperties(userId: string, properties: Record<string, any>): Promise<void> {
    await this.analyticsManager.identifyUser(userId);
    await this.analyticsManager.updateUserProperties(properties);
  }

  // =============================
  // QUIZ EVENTS
  // =============================
  
  async logQuizStarted(category: string, difficulty: string): Promise<void> {
    this.analyticsManager.trackQuizStarted(category, difficulty);
  }

  async logQuestionAnswered(data: QuizAnalyticsData): Promise<void> {
    this.analyticsManager.trackQuestionAnswered({
      category: data.category,
      difficulty: data.difficulty as 'easy' | 'medium' | 'hard',
      questionId: data.question_id,
      correct: data.correct,
      timeTaken: data.time_taken,
      streak: data.streak,
      scoreEarned: data.score_earned,
    });
  }

  async logQuizCompleted(sessionData: GameSessionData): Promise<void> {
    this.analyticsManager.trackQuizCompleted({
      sessionId: this.analyticsManager.getStatus().currentSessionId,
      duration: sessionData.session_duration,
      questionsAnswered: sessionData.questions_answered,
      correctAnswers: sessionData.correct_answers,
      categoriesPlayed: sessionData.categories_played,
      finalScore: sessionData.final_score,
      finalStreak: sessionData.final_streak,
    });
  }

  // =============================
  // ACHIEVEMENT EVENTS
  // =============================
  
  async logAchievementUnlocked(achievementId: string, achievementName: string): Promise<void> {
    this.analyticsManager.trackAchievementUnlocked(achievementId, achievementName);
  }

  async logStreakMilestone(streakCount: number): Promise<void> {
    this.analyticsManager.trackStreakMilestone(streakCount);
  }

  // =============================
  // USER PROGRESS EVENTS
  // =============================
  
  async logLevelUp(newLevel: number, userData: UserProgressData): Promise<void> {
    this.analyticsManager.trackLevelUp(newLevel, {
      level: newLevel,
      totalScore: userData.total_score,
      questionsAnswered: userData.questions_answered,
      accuracy: userData.accuracy,
      bestStreak: userData.best_streak,
      daysPlayed: userData.days_played,
    });
  }

  // =============================
  // DAILY GOALS EVENTS
  // =============================
  
  async logDailyGoalCompleted(goalType: string, goalValue: number, reward: number): Promise<void> {
    this.analyticsManager.trackDailyGoalCompleted(goalType, goalValue, reward);
  }

  // =============================
  // AD EVENTS
  // =============================
  
  async logAdShown(adType: 'banner' | 'interstitial' | 'rewarded', placement: string): Promise<void> {
    this.analyticsManager.trackAdViewed(adType, placement);
  }

  async logAdRewardEarned(rewardType: string, rewardAmount: number): Promise<void> {
    this.analyticsManager.trackAdRewardEarned(rewardType, rewardAmount);
  }

  // =============================
  // SCREEN EVENTS
  // =============================
  
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    this.analyticsManager.trackScreenView(screenName, {
      screen_class: screenClass,
    });
  }

  // =============================
  // SETTINGS EVENTS
  // =============================
  
  async logSettingsChanged(settingName: string, newValue: any): Promise<void> {
    this.analyticsManager.trackSettingsChanged(settingName, null, newValue);
  }

  // =============================
  // SESSION EVENTS
  // =============================
  
  async logSessionStart(): Promise<void> {
    // Session is automatically started by AnalyticsManager
    console.log('📊 [FirebaseAnalytics] Session start (handled by AnalyticsManager)');
  }

  async logSessionEnd(): Promise<void> {
    await this.analyticsManager.endSession();
  }

  // =============================
  // UTILITY METHODS
  // =============================
  
  isInitialized(): boolean {
    return this.analyticsManager.getStatus().initialized;
  }

  async enableAnalytics(enabled: boolean): Promise<void> {
    await this.analyticsManager.setAnalyticsEnabled(enabled);
  }

  // =============================
  // PRIVACY & CONSENT
  // =============================
  
  async setUserConsent(consentGiven: boolean): Promise<void> {
    await this.analyticsManager.setUserConsent(consentGiven);
  }

  hasUserConsent(): boolean {
    return this.analyticsManager.hasUserConsent();
  }

  // =============================
  // DEBUG & STATUS
  // =============================

  getStatus() {
    const status = this.analyticsManager.getStatus();
    return {
      initialized: status.initialized,
      enabled: status.enabled,
      consentGiven: status.consentGiven,
      library: 'mixpanel-react-native (via AnalyticsManager)',
      features: status.features,
    };
  }

  setDebugMode(enabled: boolean): void {
    this.analyticsManager.setDebugMode(enabled);
  }

  // =============================
  // CLEANUP
  // =============================

  async destroy(): Promise<void> {
    await this.analyticsManager.destroy();
  }
}

// =============================
// EXPORT SINGLETON
// =============================

const firebaseAnalyticsService = new FirebaseAnalyticsService();
export default firebaseAnalyticsService;