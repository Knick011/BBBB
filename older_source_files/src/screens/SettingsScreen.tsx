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
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import { NotificationService } from '../services/NotificationService';

interface NotificationSettings {
  morningReminder: boolean;
  morningReminderTime: Date;
  dailyGoalReminder: boolean;
  streakReminder: boolean;
  achievementNotifications: boolean;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [effectsVolume, setEffectsVolume] = useState(0.7);
  
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
      // Load sound settings
      const savedSoundEnabled = await AsyncStorage.getItem('@BrainBites:soundEnabled');
      const savedMusicVolume = await AsyncStorage.getItem('@BrainBites:musicVolume');
      const savedEffectsVolume = await AsyncStorage.getItem('@BrainBites:effectsVolume');
      
      if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === 'true');
      if (savedMusicVolume !== null) setMusicVolume(parseFloat(savedMusicVolume));
      if (savedEffectsVolume !== null) setEffectsVolume(parseFloat(savedEffectsVolume));
      
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
    await AsyncStorage.setItem('@BrainBites:soundEnabled', value.toString());
    
    if (value) {
      SoundService.initialize();
    } else {
      SoundService.setMusicEnabled(false);
      SoundService.setSoundEffectsEnabled(false);
    }
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sound Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Music</Text>
          
          {renderSettingItem(
            'volume-high',
            'Sound Effects',
            soundEnabled ? 'Enabled' : 'Disabled',
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={soundEnabled ? theme.colors.primary : '#f4f3f4'}
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
          
          {renderSettingItem(
            'vibrate',
            'Haptic Feedback',
            'Vibration feedback for actions',
            <Switch
              value={hapticFeedback}
              onValueChange={async (value) => {
                setHapticFeedback(value);
                await AsyncStorage.setItem('@BrainBites:hapticFeedback', value.toString());
              }}
              trackColor={{ false: '#E0E0E0', true: theme.colors.primary + '60' }}
              thumbColor={hapticFeedback ? theme.colors.primary : '#f4f3f4'}
            />
          )}
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
});

export default SettingsScreen;