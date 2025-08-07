// src/services/AnalyticsManager.ts
// Simple, reliable analytics system using React Native built-in capabilities
// No external dependencies, privacy-first, production-ready

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================
// TYPES & INTERFACES
// =============================

export interface UserProperties {
  userId?: string;
  level?: number;
  totalScore?: number;
  questionsAnswered?: number;
  accuracy?: number;
  bestStreak?: number;
  daysPlayed?: number;
  preferredCategories?: string[];
  lastActiveDate?: string;
  registrationDate?: string;
}

export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  debugMode: boolean;
  consentGiven: boolean;
  localStorageOnly: boolean;
}

// =============================
// SIMPLE ANALYTICS MANAGER
// =============================

class AnalyticsManager {
  private static instance: AnalyticsManager;
  private initialized = false;
  private sessionStartTime: number = 0;
  private currentSessionId: string = '';
  private eventQueue: AnalyticsEvent[] = [];
  
  private config: AnalyticsConfig = {
    enabled: true,
    debugMode: __DEV__,
    consentGiven: false,
    localStorageOnly: true, // Store events locally for now
  };

  private constructor() {
    console.log('📊 [Analytics] Initializing simple analytics system...');
  }

  // =============================
  // SINGLETON & INITIALIZATION
  // =============================

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      console.log('📊 [Analytics] Setting up analytics system...');
      
      // Load saved configuration
      await this.loadConfig();
      
      // Start session tracking
      this.startSession();

      // Set up periodic event flushing
      this.setupEventFlushing();

      this.initialized = true;
      console.log('✅ [Analytics] Simple analytics system ready');
      return true;

    } catch (error) {
      console.error('❌ [Analytics] Initialization failed:', error);
      // Graceful degradation - app continues without analytics
      this.initialized = true;
      return false;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem('analyticsConfig');
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...savedConfig };
        console.log('✅ [Analytics] Configuration loaded');
      }
    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to load config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('analyticsConfig', JSON.stringify(this.config));
    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to save config:', error);
    }
  }

  private startSession(): void {
    this.sessionStartTime = Date.now();
    this.currentSessionId = `session_${this.sessionStartTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.trackEvent('session_started', {
      session_id: this.currentSessionId,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });
  }

  private setupEventFlushing(): void {
    // Flush events every 30 seconds
    setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  // =============================
  // PRIVACY & CONSENT MANAGEMENT
  // =============================

  async setUserConsent(consentGiven: boolean): Promise<void> {
    this.config.consentGiven = consentGiven;
    await this.saveConfig();

    if (!consentGiven) {
      // Clear all stored events if consent is withdrawn
      await this.clearAllEvents();
    }

    console.log(`📊 [Analytics] User consent: ${consentGiven ? 'granted' : 'withdrawn'}`);
  }

  hasUserConsent(): boolean {
    return this.config.consentGiven;
  }

  // =============================
  // EVENT TRACKING
  // =============================

  trackEvent(event: string, properties: Record<string, any> = {}): void {
    if (!this.canTrack()) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        session_id: this.currentSessionId,
        platform: Platform.OS,
        app_version: '1.0.0',
      },
      timestamp: new Date().toISOString(),
      sessionId: this.currentSessionId,
    };

    if (this.config.debugMode) {
      console.log('📊 [Analytics] Event:', event, properties);
    }

    // Add to queue
    this.eventQueue.push(analyticsEvent);

    // Flush if queue gets large
    if (this.eventQueue.length >= 20) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // Store events locally
      await this.storeEventsLocally([...this.eventQueue]);
      
      console.log(`📊 [Analytics] Stored ${this.eventQueue.length} events locally`);
      this.eventQueue = [];

    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to flush events:', error);
    }
  }

  private async storeEventsLocally(events: AnalyticsEvent[]): Promise<void> {
    try {
      const existingEventsJson = await AsyncStorage.getItem('analyticsEvents');
      const existingEvents = existingEventsJson ? JSON.parse(existingEventsJson) : [];
      
      const allEvents = [...existingEvents, ...events];
      
      // Keep only last 1000 events to prevent storage bloat
      const recentEvents = allEvents.slice(-1000);
      
      await AsyncStorage.setItem('analyticsEvents', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to store events locally:', error);
    }
  }

  private canTrack(): boolean {
    return this.config.enabled && this.config.consentGiven && this.initialized;
  }

  // =============================
  // GAME EVENTS
  // =============================

  trackQuizStarted(category: string, difficulty: string): void {
    this.trackEvent('quiz_started', {
      category,
      difficulty,
    });
  }

  trackQuestionAnswered(data: {
    category: string;
    difficulty: string;
    questionId?: string;
    correct?: boolean;
    timeTaken?: number;
    streak?: number;
    scoreEarned?: number;
  }): void {
    this.trackEvent('question_answered', {
      category: data.category,
      difficulty: data.difficulty,
      question_id: data.questionId,
      correct: data.correct,
      time_taken_ms: data.timeTaken,
      current_streak: data.streak,
      score_earned: data.scoreEarned,
    });
  }

  trackQuizCompleted(sessionData: {
    sessionId: string;
    duration: number;
    questionsAnswered: number;
    correctAnswers: number;
    categoriesPlayed: string[];
    finalScore: number;
    finalStreak: number;
  }): void {
    const accuracy = sessionData.correctAnswers / sessionData.questionsAnswered;
    
    this.trackEvent('quiz_completed', {
      session_duration_seconds: Math.round(sessionData.duration / 1000),
      questions_answered: sessionData.questionsAnswered,
      correct_answers: sessionData.correctAnswers,
      accuracy_percentage: Math.round(accuracy * 100),
      categories_played: sessionData.categoriesPlayed,
      final_score: sessionData.finalScore,
      final_streak: sessionData.finalStreak,
    });
  }

  // =============================
  // ACHIEVEMENT EVENTS
  // =============================

  trackAchievementUnlocked(achievementId: string, achievementName: string): void {
    this.trackEvent('achievement_unlocked', {
      achievement_id: achievementId,
      achievement_name: achievementName,
    });
  }

  trackStreakMilestone(streakCount: number): void {
    this.trackEvent('streak_milestone', {
      streak_count: streakCount,
      milestone_tier: this.getStreakTier(streakCount),
    });
  }

  trackLevelUp(newLevel: number, userData: UserProperties): void {
    this.trackEvent('level_up', {
      new_level: newLevel,
      total_score: userData.totalScore,
      questions_answered: userData.questionsAnswered,
      accuracy: userData.accuracy,
      best_streak: userData.bestStreak,
    });
  }

  // =============================
  // ENGAGEMENT EVENTS
  // =============================

  trackScreenView(screenName: string, properties?: any): void {
    this.trackEvent('screen_viewed', {
      screen_name: screenName,
      ...properties,
    });
  }

  trackDailyGoalCompleted(goalType: string, goalValue: number, reward: number): void {
    this.trackEvent('daily_goal_completed', {
      goal_type: goalType,
      goal_value: goalValue,
      reward_amount: reward,
    });
  }

  trackSettingsChanged(settingName: string, oldValue: any, newValue: any): void {
    this.trackEvent('settings_changed', {
      setting_name: settingName,
      old_value: String(oldValue),
      new_value: String(newValue),
    });
  }

  // =============================
  // SESSION MANAGEMENT
  // =============================

  async endSession(): Promise<void> {
    if (!this.currentSessionId) return;

    const sessionDuration = Date.now() - this.sessionStartTime;
    
    this.trackEvent('session_ended', {
      session_id: this.currentSessionId,
      duration_seconds: Math.round(sessionDuration / 1000),
    });

    await this.flushEvents();
  }

  // =============================
  // USER MANAGEMENT
  // =============================

  async identifyUser(userId: string, properties?: UserProperties): Promise<void> {
    if (!this.canTrack()) return;

    this.trackEvent('user_identified', {
      user_id: userId,
      ...properties,
    });
  }

  async updateUserProperties(properties: Partial<UserProperties>): Promise<void> {
    if (!this.canTrack()) return;

    this.trackEvent('user_properties_updated', properties);
  }

  // =============================
  // UTILITY METHODS
  // =============================

  private getStreakTier(streakCount: number): string {
    if (streakCount >= 100) return 'legendary';
    if (streakCount >= 50) return 'epic';
    if (streakCount >= 20) return 'rare';
    if (streakCount >= 10) return 'common';
    return 'basic';
  }

  // =============================
  // CONFIGURATION
  // =============================

  async setAnalyticsEnabled(enabled: boolean): Promise<void> {
    this.config.enabled = enabled;
    await this.saveConfig();
    
    if (!enabled) {
      await this.clearAllEvents();
    }
    
    console.log(`📊 [Analytics] Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled;
    console.log(`📊 [Analytics] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  // =============================
  // DATA MANAGEMENT
  // =============================

  async getStoredEvents(): Promise<AnalyticsEvent[]> {
    try {
      const eventsJson = await AsyncStorage.getItem('analyticsEvents');
      return eventsJson ? JSON.parse(eventsJson) : [];
    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to get stored events:', error);
      return [];
    }
  }

  async clearAllEvents(): Promise<void> {
    try {
      await AsyncStorage.removeItem('analyticsEvents');
      this.eventQueue = [];
      console.log('📊 [Analytics] All events cleared');
    } catch (error) {
      console.warn('⚠️ [Analytics] Failed to clear events:', error);
    }
  }

  async exportUserData(): Promise<any> {
    // For GDPR compliance - export user's analytics data
    const events = await this.getStoredEvents();
    return {
      config: this.config,
      sessionId: this.currentSessionId,
      queuedEvents: this.eventQueue.length,
      storedEvents: events.length,
      events: events,
    };
  }

  async deleteUserData(): Promise<void> {
    // For GDPR compliance - delete user's analytics data
    await this.clearAllEvents();
    this.eventQueue = [];
    console.log('📊 [Analytics] User data deleted');
  }

  // =============================
  // STATUS & DEBUG
  // =============================

  getStatus() {
    return {
      initialized: this.initialized,
      enabled: this.config.enabled,
      consentGiven: this.config.consentGiven,
      currentSessionId: this.currentSessionId,
      queuedEvents: this.eventQueue.length,
      debugMode: this.config.debugMode,
      platform: Platform.OS,
      library: 'react-native-builtin',
      features: [
        'Local Event Storage',
        'Privacy-First Analytics',
        'GDPR Compliant',
        'Session Tracking',
        'Zero External Dependencies',
        'Full Backward Compatibility',
        'Production Ready'
      ]
    };
  }

  // Development helper
  async logAllEvents(): Promise<void> {
    const events = await this.getStoredEvents();
    console.log(`📊 [Analytics] Stored Events (${events.length}):`, events);
  }

  // =============================
  // CLEANUP
  // =============================

  async destroy(): Promise<void> {
    try {
      console.log('📊 [Analytics] Cleaning up analytics system...');
      
      // End current session
      await this.endSession();
      
      // Flush any remaining events
      await this.flushEvents();
      
      // Reset state
      this.eventQueue = [];
      this.initialized = false;
      this.currentSessionId = '';
      
      console.log('✅ [Analytics] Analytics system cleaned up');
      
    } catch (error) {
      console.warn('⚠️ [Analytics] Cleanup error:', error);
    }
  }
}

// =============================
// EXPORT SINGLETON
// =============================

export default AnalyticsManager.getInstance();