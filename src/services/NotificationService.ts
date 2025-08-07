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

interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // HH:MM format
  streakReminder: boolean;
  achievementNotifications: boolean;
}

class NotificationServiceClass {
  private isInitialized = false;
  private settings: NotificationSettings = {
    enabled: true,
    dailyReminder: true,
    reminderTime: '19:00', // 7 PM
    streakReminder: true,
    achievementNotifications: true,
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
}

export const NotificationService = new NotificationServiceClass();