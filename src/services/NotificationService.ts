import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTorontoDateString } from '../utils/timeUtils';

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
  private LAST_DAILY_SCHEDULE_KEY = '@BrainBites:lastDailyScheduleDate';

  // Default schedule times (local)
  private MORNING_GOALS_TIME = { hour: 7, minute: 30 };
  private MIDDAY_LEADERBOARD_TIME = { hour: 12, minute: 0 };
  private EVENING_LEADERBOARD_TIME = { hour: 18, minute: 30 };

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing NotificationService...');
      
      // Load saved settings
      await this.loadSettings();
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      // Immediately (and only once) request battery optimization exemption after notification prompt
      try {
        const { Platform, NativeModules } = require('react-native');
        if (Platform.OS === 'android' && NativeModules.NotificationModule?.requestIgnoreBatteryOptimizations) {
          const askedKey = '@BrainBites:askedBatteryExemption';
          const asked = await AsyncStorage.getItem(askedKey);
          if (asked !== 'true') {
            await NativeModules.NotificationModule.requestIgnoreBatteryOptimizations();
            await AsyncStorage.setItem(askedKey, 'true');
          }
        }
      } catch {}
      
      if (hasPermission && this.settings.enabled) {
        await this.scheduleDefaultNotifications();
        // Ensure daily set (morning goals + leaderboard nudges) is scheduled for today
        await this.ensureDailySchedules();
      }
      
      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Ensure the daily notification set is scheduled for the current local date.
   * Includes: Morning Daily Goal reminder + midday/evening leaderboard nudges.
   */
  async ensureDailySchedules(): Promise<void> {
    try {
      if (!this.isInitialized || !this.settings.enabled) return;
      const dateKey = getTorontoDateString();
      const last = await AsyncStorage.getItem(this.LAST_DAILY_SCHEDULE_KEY);
      if (last === dateKey) {
        console.log('📅 Daily schedules already set for', dateKey);
        return;
      }

      // Morning daily goals reminder — skip if a regular daily goal was already completed today (streak day recorded)
      const dayDone = await this.isDailyGoalDayCompletedToday();
      if (dayDone) {
        console.log('⏭️ Skipping morning Daily Goal reminder (already completed today)');
        try { await this.cancelScheduledNotification('daily_goals_morning'); } catch {}
      } else {
        await this.scheduleDailyGoalsMorningReminder(this.MORNING_GOALS_TIME.hour, this.MORNING_GOALS_TIME.minute);
      }
      // Leaderboard nudges
      await this.scheduleLeaderboardNudge('midday', this.MIDDAY_LEADERBOARD_TIME.hour, this.MIDDAY_LEADERBOARD_TIME.minute);
      await this.scheduleLeaderboardNudge('evening', this.EVENING_LEADERBOARD_TIME.hour, this.EVENING_LEADERBOARD_TIME.minute);

      await AsyncStorage.setItem(this.LAST_DAILY_SCHEDULE_KEY, dateKey);
      console.log('✅ Scheduled daily notifications for', dateKey);
    } catch (e) {
      console.error('Failed to ensure daily schedules:', e);
    }
  }

  /** Check if a regular daily goal has been completed today (streak day recorded). */
  private async isDailyGoalDayCompletedToday(): Promise<boolean> {
    try {
      const today = getTorontoDateString();
      const last = await AsyncStorage.getItem('@BrainBites:lastDailyGoalDay');
      return last === today;
    } catch {
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          try {
            // First check if permission is already granted
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            if (hasPermission) {
              return true;
            }

            // Only request if we have an active Activity context
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
          } catch (permissionError) {
            console.warn('Permission request failed (app may not be in foreground):', permissionError);
            // Return true for now, permission will be requested when app comes to foreground
            return true;
          }
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
      body: 'Open BrainBites to boost your brainpower today.',
      data: { type: 'daily_reminder' }
    };
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
        
        await NotificationModule.scheduleMorningReminder(
          hours, 
          minutes, 
          "🌅 Time to Start Your Day Right!",
          "Let's begin with some brain-boosting questions! Complete a daily goal to keep your streak alive."
        );
        
        console.log(`✅ Morning reminder scheduled for ${hours}:${minutes}`);
      }
    } catch (error) {
      console.error('Failed to schedule morning reminder:', error);
    }
  }

  /** Schedule morning Daily Goal reminder (native if available, fallback to one-time). */
  private async scheduleDailyGoalsMorningReminder(hour: number, minute: number): Promise<void> {
    try {
      const now = new Date();
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
      if (when.getTime() <= Date.now()) {
        // if time passed, schedule a few minutes later today
        when.setMinutes(when.getMinutes() + 5);
      }
      // Prefer dedicated native scheduling if present
      const { NativeModules } = require('react-native');
      const { NotificationModule } = NativeModules;
      if (NotificationModule && NotificationModule.scheduleMorningReminder) {
        await NotificationModule.scheduleMorningReminder(hour, minute,
          '🌅 Start Strong: Complete a Daily Goal',
          'Knock out your first goal and set the tone for today.'
        );
        console.log('✅ Morning Daily Goal reminder scheduled via native');
        return;
      }
      // Fallback: one-time schedule for today
      await this.scheduleOneTimeNotification(
        'daily_goals_morning', when,
        '🌅 Start Strong: Complete a Daily Goal',
        'Knock out your first goal and set the tone for today.',
        { type: 'daily_goal_morning' }
      );
    } catch (e) {
      console.error('Failed to schedule morning daily-goal reminder:', e);
    }
  }

  /** Schedule leaderboard nudge (midday/evening). */
  private async scheduleLeaderboardNudge(kind: 'midday' | 'evening', hour: number, minute: number): Promise<void> {
    try {
      const now = new Date();
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
      if (when.getTime() <= Date.now()) {
        // If time passed already, nudge a bit later today
        when.setMinutes(when.getMinutes() + 10);
      }
      const title = kind === 'midday' ? '📈 Midday Momentum' : '🏁 Evening Push';
      const body = kind === 'midday'
        ? 'Quick score push moves your rank up. Jump in when ready.'
        : 'One last score boost can secure your spot on the leaderboard.';

      await this.scheduleOneTimeNotification(
        `leaderboard_${kind}_${when.toDateString()}`,
        when,
        title,
        body,
        { type: 'leaderboard_nudge', kind }
      );
      console.log(`✅ Leaderboard ${kind} nudge scheduled for ${when.toISOString()}`);
    } catch (e) {
      console.error('Failed to schedule leaderboard nudge:', e);
    }
  }

  async cancelMorningReminder() {
    try {
      const { NativeModules } = require('react-native');
      const { NotificationModule } = NativeModules;
      
      if (NotificationModule && NotificationModule.cancelMorningReminder) {
        await NotificationModule.cancelMorningReminder();
        console.log('✅ Morning reminder cancelled');
      }
    } catch (error) {
      console.error('Failed to cancel morning reminder:', error);
    }
  }

  async testMorningNotification() {
    try {
      const { NativeModules } = require('react-native');
      const { NotificationModule } = NativeModules;
      
      if (NotificationModule && NotificationModule.testMorningNotification) {
        await NotificationModule.testMorningNotification();
        console.log('✅ Test notification sent');
      }
    } catch (error) {
      console.error('Failed to test morning notification:', error);
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
   * Schedule a one-time local notification at a specific Date.
   * Falls back to storing the schedule and delivering on next app activation if native scheduling is unavailable.
   */
  async scheduleOneTimeNotification(id: string, when: Date, title: string, body: string, data?: any): Promise<void> {
    try {
      if (!this.isInitialized || !this.settings.enabled) {
        console.log('⚠️ Notifications not enabled, skipping schedule');
        return;
      }

      const { NativeModules, Platform } = require('react-native');
      const ts = when.getTime();

      if (Platform.OS === 'android') {
        const { NotificationModule } = NativeModules;
        if (NotificationModule && NotificationModule.scheduleOneTimeNotification) {
          await NotificationModule.scheduleOneTimeNotification(ts, title, body, id, data || {});
          console.log(`✅ Scheduled one-time notification (${id}) for ${when.toISOString()}`);
          return;
        }
      }

      // Fallback: store schedule; will deliver on next app activation if due
      await AsyncStorage.setItem(`@BrainBites:scheduledNotif:${id}`, JSON.stringify({ ts, title, body, data: data || {} }));
      console.log(`🗓️ Stored fallback notification (${id}) for ${when.toISOString()}`);
    } catch (error) {
      console.error('❌ Failed to schedule one-time notification:', error);
    }
  }

  /** Cancel a scheduled one-time notification */
  async cancelScheduledNotification(id: string): Promise<void> {
    try {
      const { NativeModules, Platform } = require('react-native');
      if (Platform.OS === 'android') {
        const { NotificationModule } = NativeModules;
        if (NotificationModule && NotificationModule.cancelScheduledNotification) {
          await NotificationModule.cancelScheduledNotification(id);
          console.log(`✅ Canceled scheduled notification (${id})`);
        }
      }
      await AsyncStorage.removeItem(`@BrainBites:scheduledNotif:${id}`);
    } catch (error) {
      console.error('❌ Failed to cancel scheduled notification:', error);
    }
  }

  /** Deliver any pending fallback notifications that are due (called on app active) */
  async deliverPendingIfDue(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dueKeys = keys.filter(k => k.startsWith('@BrainBites:scheduledNotif:'));
      if (dueKeys.length === 0) return;
      const entries = await AsyncStorage.multiGet(dueKeys);
      const now = Date.now();
      for (const [key, value] of entries) {
        if (!value) continue;
        try {
          const parsed = JSON.parse(value);
          if (parsed.ts <= now) {
            await this.showLocalNotification({ title: parsed.title, body: parsed.body, data: parsed.data });
            await AsyncStorage.removeItem(key);
            console.log(`📬 Delivered pending notification: ${key}`);
          }
        } catch {}
      }
    } catch (error) {
      console.error('❌ Failed to deliver pending notifications:', error);
    }
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
