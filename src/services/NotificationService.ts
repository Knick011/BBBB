import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple notification interface for BrainBites
interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  scheduledTime?: Date;
}

interface LocalNotificationData {
  title: string;
  body: string;
  data?: any;
  playSound?: boolean;
  vibrate?: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // HH:MM format
  streakReminder: boolean;
  achievementNotifications: boolean;
  hourlyReminders: boolean;
}

class NotificationServiceClass {
  private isInitialized = false;
  private settings: NotificationSettings = {
    enabled: true,
    dailyReminder: true,
    reminderTime: '19:00', // 7 PM
    streakReminder: true,
    achievementNotifications: true,
    hourlyReminders: true,
  };
  private SETTINGS_KEY = '@BrainBites:notificationSettings';

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing NotificationService...');
      
      // Load saved settings
      await this.loadSettings();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (hasPermission && this.settings.enabled) {
        await this.scheduleDefaultNotifications();
      }
      
      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'BrainBites would like to send you notifications to help you stay on track with your learning goals.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }
      
      // For iOS, permissions are handled differently
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  private async loadSettings() {
    try {
      const savedSettings = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  private async saveSettings() {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  async updateSettings(newSettings: Partial<NotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    if (this.settings.enabled) {
      await this.scheduleDefaultNotifications();
    } else {
      await this.cancelAllNotifications();
    }
  }

  private async scheduleDefaultNotifications() {
    if (!this.settings.enabled) return;

    // Schedule daily reminder
    if (this.settings.dailyReminder) {
      await this.scheduleDailyReminder();
    }

    // Schedule weekly streak reminder
    if (this.settings.streakReminder) {
      await this.scheduleStreakReminder();
    }
  }

  private async scheduleDailyReminder() {
    const notification: NotificationData = {
      id: 'daily_reminder',
      title: '🧠 Time for Brain Bites!',
      body: 'Ready to boost your brainpower? Answer a few questions and have fun learning!',
      data: { type: 'daily_reminder' }
    };

    // In a real app, you'd schedule this with a notification library
    console.log('Daily reminder scheduled:', notification);
  }

  private async scheduleStreakReminder() {
    const notification: NotificationData = {
      id: 'streak_reminder',
      title: '🔥 Don\'t break your streak!',
      body: 'You\'re doing great! Keep your learning streak alive with a quick quiz.',
      data: { type: 'streak_reminder' }
    };

    console.log('Streak reminder scheduled:', notification);
  }

  async sendImmediateNotification(title: string, body: string, data?: any) {
    if (!this.settings.enabled || !this.settings.achievementNotifications) {
      return;
    }

    // In a real app, you'd use a notification library here
    console.log('Immediate notification:', { title, body, data });
    
    // For now, just show an alert (you could integrate with @notifee/react-native later)
    Alert.alert(title, body);
  }

  async sendAchievementNotification(achievementTitle: string, description: string) {
    await this.sendImmediateNotification(
      `🏆 Achievement Unlocked!`,
      `${achievementTitle}: ${description}`,
      { type: 'achievement', title: achievementTitle }
    );
  }

  async sendStreakNotification(streakCount: number) {
    await this.sendImmediateNotification(
      `🔥 ${streakCount} Day Streak!`,
      `Amazing! You've kept your learning streak going for ${streakCount} days!`,
      { type: 'streak', count: streakCount }
    );
  }

  async sendTimeRewardNotification(secondsEarned: number) {
    const minutes = Math.floor(secondsEarned / 60);
    const seconds = secondsEarned % 60;
    
    let timeString = '';
    if (minutes > 0) {
      timeString = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      if (seconds > 0) {
        timeString += ` and ${seconds} second${seconds > 1 ? 's' : ''}`;
      }
    } else {
      timeString = `${seconds} second${seconds > 1 ? 's' : ''}`;
    }

    await this.sendImmediateNotification(
      '⏰ Time Earned!',
      `Great job! You earned ${timeString} of app time!`,
      { type: 'time_reward', seconds: secondsEarned }
    );
  }

  async scheduleMorningReminder(time: Date) {
    try {
      // For Android, use native module
      const { NativeModules } = require('react-native');
      const { NotificationModule } = NativeModules;
      
      if (NotificationModule && NotificationModule.scheduleMorningReminder) {
        const hours = time.getHours();
        const minutes = time.getMinutes();
        
        await NotificationModule.scheduleMorningReminder(hours, minutes, {
          title: "🌅 Time to Start Your Day Right!",
          body: "Let's begin with some brain-boosting questions! Complete a daily goal to keep your streak alive.",
          data: { type: 'morning_reminder' }
        });
        
        console.log(`✅ Morning reminder scheduled for ${hours}:${minutes}`);
      }
    } catch (error) {
      console.error('Failed to schedule morning reminder:', error);
    }
  }

  async cancelMorningReminder() {
    try {
      const { NativeModules } = require('react-native');
      const { NotificationModule } = NativeModules;
      
      if (NotificationModule && NotificationModule.cancelMorningReminder) {
        await NotificationModule.cancelMorningReminder();
      }
    } catch (error) {
      console.error('Failed to cancel morning reminder:', error);
    }
  }

  // Enhanced timer notification formatting
  private formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  updateNotification = (timeLeft: number, screenTime: number) => {
    const notification = {
      title: `Time left: ${this.formatTime(timeLeft)}`,
      body: `Screen time: ${this.formatTime(screenTime)}`,
      // Don't show overtime in minimized view
      android: {
        smallIcon: 'ic_notification',
        ongoing: true,
        onlyAlertOnce: true,
        showWhen: false,
      },
    };
    
    // Update notification - in real implementation would use PushNotification
    console.log('Updating timer notification:', notification);
  };


  private async cancelAllNotifications() {
    // In a real app, you'd cancel all scheduled notifications here
    console.log('All notifications cancelled');
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  isNotificationEnabled(): boolean {
    return this.isInitialized && this.settings.enabled;
  }

  /**
   * Show a local notification immediately
   */
  async showLocalNotification(notification: LocalNotificationData): Promise<void> {
    try {
      if (!this.isInitialized || !this.settings.enabled) {
        console.log('⚠️ Notifications not enabled, skipping');
        return;
      }
      
      const { NativeModules, Platform } = require('react-native');
      
      if (Platform.OS === 'android') {
        const { NotificationModule } = NativeModules;
        
        if (NotificationModule && NotificationModule.showNotification) {
          await NotificationModule.showNotification({
            title: notification.title,
            message: notification.body,
            playSound: notification.playSound !== false,
            vibrate: notification.vibrate !== false,
            data: notification.data || {}
          });
          
          console.log('✅ Local notification shown:', notification.title);
        }
      } else if (Platform.OS === 'ios') {
        // iOS implementation - fallback to console log if push notifications not available
        try {
          // Try to use native iOS notifications if available
          console.log('✅ iOS local notification (fallback):', notification.title);
          // TODO: Implement iOS notifications when @react-native-community/push-notification-ios is installed
        } catch (error) {
          console.log('iOS notifications not available, logged instead:', notification.title);
        }
      }
    } catch (error) {
      console.error('❌ Failed to show local notification:', error);
    }
  }

  /**
   * Schedule hourly screentime reminders
   */
  async scheduleHourlyReminders(enabled: boolean = true): Promise<void> {
    try {
      const key = '@BrainBites:hourlyRemindersEnabled';
      
      if (enabled) {
        await AsyncStorage.setItem(key, 'true');
        console.log('✅ Hourly screentime reminders enabled');
      } else {
        await AsyncStorage.setItem(key, 'false');
        console.log('⏸️ Hourly screentime reminders disabled');
      }
      
      // Update settings
      this.settings = {
        ...this.settings,
        hourlyReminders: enabled
      };
      await this.saveSettings();
      
    } catch (error) {
      console.error('❌ Failed to update hourly reminder settings:', error);
    }
  }

  /**
   * Check if hourly reminders are enabled
   */
  async areHourlyRemindersEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('@BrainBites:hourlyRemindersEnabled');
      return enabled !== 'false'; // Default to true
    } catch (error) {
      console.error('Error checking hourly reminder status:', error);
      return true; // Default to enabled
    }
  }

  /**
   * Show a motivational notification for break time
   */
  async showBreakNotification(hours: number): Promise<void> {
    const breakMessages = [
      '🧘 Time for a mindful break! Your eyes will thank you.',
      '🚶 How about a quick walk? Movement boosts brain power!',
      '💧 Hydration check! When did you last have some water?',
      '🌟 Great job tracking your time! Now for a quick refresh.',
      '🎯 You\'re doing great! A short break will help you focus better.'
    ];
    
    const message = breakMessages[Math.floor(Math.random() * breakMessages.length)];
    
    await this.showLocalNotification({
      title: '⏰ Break Time Suggestion',
      body: message,
      data: { type: 'break_reminder', hours }
    });
  }

  /**
   * Clear specific notification by ID (for Android)
   */
  async clearNotification(notificationId: number): Promise<void> {
    try {
      const { NativeModules, Platform } = require('react-native');
      
      if (Platform.OS === 'android') {
        const { NotificationModule } = NativeModules;
        if (NotificationModule && NotificationModule.clearNotification) {
          await NotificationModule.clearNotification(notificationId);
        }
      }
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }
}

export const NotificationService = new NotificationServiceClass();