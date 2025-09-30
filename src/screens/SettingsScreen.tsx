import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Platform,
  Alert,
  Vibration,
  Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import AudioManager from '../services/AudioManager';
import { NotificationService } from '../services/NotificationService';
import { NativeModules } from 'react-native';
import BannerAdComponent from '../components/common/BannerAdComponent';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '../locales/i18n';
import QuestionService from '../services/QuestionService';

interface NotificationSettings {
  morningReminder: boolean;
  morningReminderTime: Date;
  dailyGoalReminder: boolean;
  streakReminder: boolean;
  achievementNotifications: boolean;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();

  // Language setting
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    morningReminder: false,
    morningReminderTime: new Date(2024, 0, 1, 8, 0), // 8:00 AM
    dailyGoalReminder: true,
    streakReminder: true,
    achievementNotifications: true
  });
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // App settings
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [autoStartTimer, setAutoStartTimer] = useState(true);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const settings = AudioManager.getSettings();
      setSoundEnabled(settings.soundEffectsEnabled);
      setMusicEnabled(settings.musicEnabled);
      setHapticEnabled(settings.hapticFeedbackEnabled);
      
      // Load notification settings
      const savedNotifications = await AsyncStorage.getItem('@BrainBites:notificationSettings');
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotificationSettings({
          ...parsed,
          morningReminderTime: new Date(parsed.morningReminderTime)
        });
      }
      
      // Load app settings
      const savedHaptic = await AsyncStorage.getItem('@BrainBites:hapticFeedback');
      const savedAutoStart = await AsyncStorage.getItem('@BrainBites:autoStartTimer');
      
      if (savedHaptic !== null) setHapticFeedback(savedHaptic === 'true');
      if (savedAutoStart !== null) setAutoStartTimer(savedAutoStart === 'true');
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };
  
  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    await AudioManager.setSoundEffectsEnabled(value);
    if (value) {
      // Play a test sound
      AudioManager.playButtonPress();
    }
  };

  const handleMusicToggle = async (value: boolean) => {
    setMusicEnabled(value);
    await AudioManager.setMusicEnabled(value);
    
    if (value) {
      // Small delay to ensure settings are fully updated
      setTimeout(async () => {
        console.log('🎵 [SettingsScreen] Starting menu music after enabling');
        await AudioManager.playMenuMusic();
      }, 100);
    }
  };

  const handleHapticToggle = async (value: boolean) => {
    setHapticEnabled(value);
    await AudioManager.setHapticFeedbackEnabled(value);
    if (value) {
      // Test haptic
      Vibration.vibrate(50);
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'tr') => {
    await changeLanguage(lang);
    setCurrentLanguage(lang);
    // Trigger re-render
    i18n.changeLanguage(lang);

    // Reinitialize questions with new language
    console.log('🔄 [SettingsScreen] Reinitializing questions for language:', lang);
    await QuestionService.reinitialize();
    console.log('✅ [SettingsScreen] Questions reinitialized successfully');
  };
  
  const handleMorningReminderToggle = async (value: boolean) => {
    const newSettings = { ...notificationSettings, morningReminder: value };
    setNotificationSettings(newSettings);
    await AsyncStorage.setItem('@BrainBites:notificationSettings', JSON.stringify(newSettings));
    
    if (value) {
      // Schedule morning notification
      await NotificationService.scheduleMorningReminder(newSettings.morningReminderTime);
    } else {
      // Cancel morning notification
      await NotificationService.cancelMorningReminder();
    }
  };
  
  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    
    if (selectedDate) {
      const newSettings = { ...notificationSettings, morningReminderTime: selectedDate };
      setNotificationSettings(newSettings);
      await AsyncStorage.setItem('@BrainBites:notificationSettings', JSON.stringify(newSettings));
      
      if (notificationSettings.morningReminder) {
        await NotificationService.scheduleMorningReminder(selectedDate);
      }
    }
  };
  
  const handleSendFeedback = () => {
    const email = 'brainbites.vx@gmail.com';
    const subject = 'BrainBites App Feedback';
    const body = 'Hi! I have some feedback about the BrainBites app:\n\n';
    
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(mailto)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mailto);
        } else {
          Alert.alert(
            'Email Not Available',
            `Please send your feedback to: ${email}`,
            [
              { text: 'Copy Email', onPress: () => {
                // Note: Clipboard copy would require additional import
                Alert.alert('Email Address', email);
              }},
              { text: 'OK' }
            ]
          );
        }
      })
      .catch((error) => {
        console.error('Failed to open email:', error);
        Alert.alert(
          'Email Not Available', 
          `Please send your feedback to: ${email}`
        );
      });
  };

  const renderSettingItem = (icon: string, title: string, subtitle?: string, rightElement?: React.ReactNode) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color={theme.colors.primary} style={styles.settingIcon} />
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>

          {renderSettingItem(
            'translate',
            t('settings.selectLanguage'),
            undefined,
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[styles.languageButton, currentLanguage === 'en' && styles.languageButtonActive]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.languageButtonText, currentLanguage === 'en' && styles.languageButtonTextActive]}>
                  🇬🇧 English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.languageButton, currentLanguage === 'tr' && styles.languageButtonActive]}
                onPress={() => handleLanguageChange('tr')}
              >
                <Text style={[styles.languageButtonText, currentLanguage === 'tr' && styles.languageButtonTextActive]}>
                  🇹🇷 Türkçe
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.audio')}</Text>
          
          {/* Sound Effects Toggle */}
          {renderSettingItem(
            'volume-high',
            t('settings.soundEffects'),
            undefined,
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#767577', true: '#FF9F1C' }}
              thumbColor={soundEnabled ? '#FFFFFF' : '#f4f3f4'}
            />
          )}

          {/* Music Toggle */}
          {renderSettingItem(
            'music',
            t('settings.music'),
            undefined,
            <Switch
              value={musicEnabled}
              onValueChange={handleMusicToggle}
              trackColor={{ false: '#767577', true: '#FF9F1C' }}
              thumbColor={musicEnabled ? '#FFFFFF' : '#f4f3f4'}
            />
          )}

          {/* Haptic Feedback Toggle */}
          {renderSettingItem(
            'vibrate',
            t('settings.volume'),
            undefined,
            <Switch
              value={hapticEnabled}
              onValueChange={handleHapticToggle}
              trackColor={{ false: '#767577', true: '#FF9F1C' }}
              thumbColor={hapticEnabled ? '#FFFFFF' : '#f4f3f4'}
            />
          )}
        </View>
        
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {renderSettingItem(
            'alarm',
            'First Thing in the Morning',
            notificationSettings.morningReminder ? 
              `Daily at ${notificationSettings.morningReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 
              'Start your day with learning',
            <Switch
              value={notificationSettings.morningReminder}
              onValueChange={handleMorningReminderToggle}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={notificationSettings.morningReminder ? theme.colors.primary : '#f4f3f4'}
            />
          )}
          
          {notificationSettings.morningReminder && (
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeButton}>
              <Icon name="clock-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.timeButtonText}>
                {notificationSettings.morningReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}
          
          {renderSettingItem(
            'target',
            'Daily Goal Reminders',
            'Remind me to complete daily goals',
            <Switch
              value={notificationSettings.dailyGoalReminder}
              onValueChange={async (value) => {
                const newSettings = { ...notificationSettings, dailyGoalReminder: value };
                setNotificationSettings(newSettings);
                await AsyncStorage.setItem('@BrainBites:notificationSettings', JSON.stringify(newSettings));
              }}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={notificationSettings.dailyGoalReminder ? theme.colors.primary : '#f4f3f4'}
            />
          )}
          
          {renderSettingItem(
            'fire',
            'Streak Reminders',
            'Don\'t lose your streak!',
            <Switch
              value={notificationSettings.streakReminder}
              onValueChange={async (value) => {
                const newSettings = { ...notificationSettings, streakReminder: value };
                setNotificationSettings(newSettings);
                await AsyncStorage.setItem('@BrainBites:notificationSettings', JSON.stringify(newSettings));
              }}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={notificationSettings.streakReminder ? theme.colors.primary : '#f4f3f4'}
            />
          )}
        </View>
        
        {/* Timer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Time Timer</Text>
          
          {renderSettingItem(
            'timer',
            'Auto-Start Timer',
            'Start timer when screen time is added',
            <Switch
              value={autoStartTimer}
              onValueChange={async (value) => {
                setAutoStartTimer(value);
                await AsyncStorage.setItem('@BrainBites:autoStartTimer', value.toString());
              }}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={autoStartTimer ? theme.colors.primary : '#f4f3f4'}
            />
          )}
        </View>

        {/* Power Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power Management</Text>

          <TouchableOpacity
            style={styles.feedbackItem}
            onPress={async () => {
              try {
                const ignoring = await NativeModules.NotificationModule?.isIgnoringBatteryOptimizations?.();
                if (!ignoring) {
                  await NativeModules.NotificationModule?.requestIgnoreBatteryOptimizations?.();
                } else {
                  Alert.alert('Already Allowed', 'Battery optimizations are already disabled for BrainBites.');
                }
              } catch (e) {
                Alert.alert('Action Unavailable', 'Opening battery optimization dialog failed. Opening settings list…');
                try { await NativeModules.NotificationModule?.openBatteryOptimizationSettings?.(); } catch {}
              }
            }}
          >
            <View style={styles.settingLeft}>
              <Icon name="battery-heart" size={24} color={theme.colors.primary} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Allow uninterrupted background timing</Text>
                <Text style={styles.settingSubtitle}>Ask Android to ignore battery optimizations (one-time)</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackItem}
            onPress={async () => {
              try { await NativeModules.NotificationModule?.openBatteryOptimizationSettings?.(); } catch {}
            }}
          >
            <View style={styles.settingLeft}>
              <Icon name="cog-outline" size={24} color={theme.colors.primary} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Open battery optimization settings</Text>
                <Text style={styles.settingSubtitle}>Manually set BrainBites to “Don’t optimize”</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        {/* Support & Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Feedback</Text>
          
          <TouchableOpacity style={styles.feedbackItem} onPress={handleSendFeedback}>
            <View style={styles.settingLeft}>
              <Icon name="email-outline" size={24} color={theme.colors.primary} style={styles.settingIcon} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Send Feedback</Text>
                <Text style={styles.settingSubtitle}>Help us improve BrainBites with your suggestions</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.aboutItem}>
            <Text style={styles.aboutText}>Version 1.0.0</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.aboutItem} onPress={() => {
            Alert.alert(
              'Brain Bites',
              'A fun educational app to boost your knowledge while managing screen time!\n\nMade with ❤️ for curious minds.',
              [{ text: 'OK' }]
            );
          }}>
            <Text style={styles.aboutText}>About Brain Bites</Text>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {showTimePicker && (
        <DateTimePicker
          value={notificationSettings.morningReminderTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      <BannerAdComponent placement="settings_screen" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 8,
    ...theme.shadows.small,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
    width: 24,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 56,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  timeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  languageButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  languageButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

export default SettingsScreen;