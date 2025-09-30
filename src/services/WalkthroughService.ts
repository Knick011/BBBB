// src/services/WalkthroughService.ts
// Service to manage user walkthrough and onboarding experience

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalkthroughStep } from '../components/common/WalkthroughOverlay';
import i18n from '../locales/i18n';

class WalkthroughService {
  private static instance: WalkthroughService;
  private readonly STORAGE_KEY = '@BrainBites:walkthrough';

  private constructor() {
    console.log('🎯 [WalkthroughService] Initializing walkthrough service...');
  }

  static getInstance(): WalkthroughService {
    if (!WalkthroughService.instance) {
      WalkthroughService.instance = new WalkthroughService();
    }
    return WalkthroughService.instance;
  }

  /**
   * Home Screen walkthrough steps
   */
  getHomeScreenSteps(): WalkthroughStep[] {
    return [
      {
        id: 'timer_widget',
        title: i18n.t('walkthrough.timerWidget.title'),
        description: i18n.t('walkthrough.timerWidget.description'),
        targetPosition: { x: 32, y: 120, width: 350, height: 145 },
        tooltipPosition: 'bottom',
        mascotType: 'happy',
        icon: 'clock-outline',
        action: 'none',
      },
      {
        id: 'bonus_penalty',
        title: i18n.t('walkthrough.bonusPenalty.title'),
        description: i18n.t('walkthrough.bonusPenalty.description'),
        targetPosition: { x: 53, y: 310, width: 308, height: 80 },
        tooltipPosition: 'bottom',
        mascotType: 'gamemode',
        icon: 'scale-balance',
        action: 'none',
      },
      {
        id: 'daily_flow',
        title: i18n.t('walkthrough.dailyFlow.title'),
        description: i18n.t('walkthrough.dailyFlow.description'),
        targetPosition: { x: 32, y: 375, width: 350, height: 140 },
        tooltipPosition: 'top',
        mascotType: 'excited',
        icon: 'water',
        action: 'none',
      },
      {
        id: 'difficulty_buttons',
        title: i18n.t('walkthrough.difficultyButtons.title'),
        description: i18n.t('walkthrough.difficultyButtons.description'),
        targetPosition: { x: 32, y: 460, width: 350, height: 160 },
        tooltipPosition: 'top',
        mascotType: 'gamemode',
        icon: 'target',
        action: 'none',
      },
      {
        id: 'categories_button',
        title: i18n.t('walkthrough.categoriesButton.title'),
        description: i18n.t('walkthrough.categoriesButton.description'),
        targetPosition: { x: 32, y: 588, width: 350, height: 54 },
        tooltipPosition: 'top',
        mascotType: 'happy',
        icon: 'folder-multiple-outline',
        action: 'none',
      },
      {
        id: 'daily_goals',
        title: i18n.t('walkthrough.dailyGoalsButton.title'),
        description: i18n.t('walkthrough.dailyGoalsButton.description'),
        targetPosition: {x: 32, y: 635, width: 350, height: 54 },
        tooltipPosition: 'top',
        mascotType: 'excited',
        icon: 'target',
        action: 'none',
      },
      {
        id: 'leaderboard',
        title: i18n.t('walkthrough.leaderboardButton.title'),
        description: i18n.t('walkthrough.leaderboardButton.description'),
        targetPosition: { x: 32, y: 680, width: 350, height: 54 },
        tooltipPosition: 'top',
        mascotType: 'gamemode',
        icon: 'trophy-outline',
        action: 'none',
      },
      {
        id: 'ready_to_start',
        title: i18n.t('walkthrough.readyToStart.title'),
        description: i18n.t('walkthrough.readyToStart.description'),
        tooltipPosition: 'center',
        mascotType: 'excited',
        icon: 'rocket',
        action: 'none',
      },
    ];
  }

  /**
   * Quiz Screen walkthrough steps (shown on first quiz)
   */
  getQuizScreenSteps(): WalkthroughStep[] {
    return [
      {
        id: 'quiz_welcome',
        title: 'Ready for Your First Quiz? 🎯',
        description: 'Let me show you how quizzes work. Don\'t worry, I\'ll be here to help!',
        tooltipPosition: 'center',
        mascotType: 'gamemode',
        mascotMessage: 'Quiz time! Let\'s do this! 💪',
        icon: 'help-circle',
        action: 'none',
      },
      {
        id: 'question_area',
        title: 'The Question ❓',
        description: 'Read the question carefully. Take your time - understanding is more important than speed!',
        targetPosition: { x: 20, y: 150, width: 335, height: 100 },
        tooltipPosition: 'bottom',
        mascotType: 'happy',
        mascotMessage: 'Think it through! 🤔',
        icon: 'head-question',
        action: 'none',
      },
      {
        id: 'answer_options',
        title: 'Choose Your Answer 📝',
        description: 'Tap the answer you think is correct. Each answer is clearly labeled A, B, C, or D.',
        targetPosition: { x: 20, y: 300, width: 335, height: 280 },
        tooltipPosition: 'top',
        mascotType: 'gamemode',
        mascotMessage: 'Trust your instincts! 🎯',
        icon: 'format-list-bulleted',
        action: 'none',
        actionDescription: 'Tap an answer to select it',
      },
      {
        id: 'streak_counter',
        title: 'Build Your Streak! 🔥',
        description: 'Get answers right in a row to build a streak. Higher streaks make the music more energetic!',
        targetPosition: { x: 20, y: 80, width: 100, height: 40 },
        tooltipPosition: 'bottom',
        mascotType: 'excited',
        mascotMessage: 'Streaks are awesome! 🔥',
        icon: 'fire',
        action: 'none',
      },
      {
        id: 'ready_to_answer',
        title: 'You\'ve Got This! 💪',
        description: 'Remember: every question is a chance to learn. Even wrong answers teach us something valuable!',
        tooltipPosition: 'center',
        mascotType: 'excited',
        mascotMessage: 'Believe in yourself! You\'re amazing! ✨',
        icon: 'star',
        action: 'none',
      },
    ];
  }

  /**
   * Settings Screen walkthrough steps
   */
  getSettingsScreenSteps(): WalkthroughStep[] {
    return [
      {
        id: 'audio_settings',
        title: 'Customize Your Experience 🎵',
        description: 'Adjust sound effects, music, and volume levels to your preference. The music gets faster as you build streaks!',
        targetPosition: { x: 20, y: 200, width: 335, height: 200 },
        tooltipPosition: 'bottom',
        mascotType: 'happy',
        mascotMessage: 'Make it sound just right! 🎶',
        icon: 'volume-high',
        action: 'none',
        actionDescription: 'Adjust your audio preferences',
      },
    ];
  }

  /**
   * Check if user has completed the walkthrough
   */
  async hasCompletedWalkthrough(screen: string = 'home'): Promise<boolean> {
    try {
      const completedScreens = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!completedScreens) return false;
      
      const screens = JSON.parse(completedScreens);
      return screens.includes(screen);
    } catch (error) {
      console.error('❌ [WalkthroughService] Error checking walkthrough completion:', error);
      return false;
    }
  }

  /**
   * Mark walkthrough as completed for a specific screen
   */
  async markWalkthroughCompleted(screen: string = 'home'): Promise<void> {
    try {
      const completedScreens = await AsyncStorage.getItem(this.STORAGE_KEY);
      let screens: string[] = [];
      
      if (completedScreens) {
        screens = JSON.parse(completedScreens);
      }
      
      if (!screens.includes(screen)) {
        screens.push(screen);
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(screens));
        console.log(`✅ [WalkthroughService] Walkthrough completed for screen: ${screen}`);
      }
    } catch (error) {
      console.error('❌ [WalkthroughService] Error marking walkthrough completion:', error);
    }
  }

  /**
   * Reset walkthrough completion (for testing or user preference)
   */
  async resetWalkthrough(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🔄 [WalkthroughService] Walkthrough reset completed');
    } catch (error) {
      console.error('❌ [WalkthroughService] Error resetting walkthrough:', error);
    }
  }

  /**
   * Check if this is the user's first time using the app
   */
  async isFirstTimeUser(): Promise<boolean> {
    try {
      // Check both onboarding completion and whether they've seen any walkthrough
      const onboardingComplete = await AsyncStorage.getItem('brainbites_onboarding_complete');
      const walkthroughData = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      // First time if no onboarding complete and no walkthrough seen
      return !onboardingComplete && !walkthroughData;
    } catch (error) {
      console.error('❌ [WalkthroughService] Error checking first time user:', error);
      return false;
    }
  }

  /**
   * Get appropriate steps based on screen and user progress
   */
  getStepsForScreen(screen: string): WalkthroughStep[] {
    switch (screen.toLowerCase()) {
      case 'home':
        return this.getHomeScreenSteps();
      case 'quiz':
        return this.getQuizScreenSteps();
      case 'settings':
        return this.getSettingsScreenSteps();
      default:
        console.warn(`⚠️ [WalkthroughService] No walkthrough steps defined for screen: ${screen}`);
        return [];
    }
  }

  /**
   * Should show walkthrough based on user preferences and completion status
   */
  async shouldShowWalkthrough(screen: string): Promise<boolean> {
    try {
      const hasCompleted = await this.hasCompletedWalkthrough(screen);
      const isFirstTime = await this.isFirstTimeUser();
      
      // Show walkthrough for home screen if first time user or not completed
      if (screen === 'home') {
        return isFirstTime || !hasCompleted;
      }
      
      // For other screens, only show if not completed and user has seen home walkthrough
      const homeCompleted = await this.hasCompletedWalkthrough('home');
      return homeCompleted && !hasCompleted;
      
    } catch (error) {
      console.error('❌ [WalkthroughService] Error determining walkthrough display:', error);
      return false;
    }
  }

  /**
   * Get walkthrough progress for a specific screen
   */
  async getWalkthroughProgress(screen: string): Promise<{completed: boolean; stepCount: number; completedAt?: string}> {
    try {
      const completed = await this.hasCompletedWalkthrough(screen);
      const steps = this.getStepsForScreen(screen);
      
      return {
        completed,
        stepCount: steps.length,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
    } catch (error) {
      console.error('❌ [WalkthroughService] Error getting walkthrough progress:', error);
      return { completed: false, stepCount: 0 };
    }
  }
}

export default WalkthroughService.getInstance();