// src/components/settings/AudioSettings.tsx
// Modern audio settings component with comprehensive controls

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import AudioManager, { AudioSettings } from '../../services/AudioManager';
import theme from '../../styles/theme';

interface Props {
  onSettingsChange?: (settings: AudioSettings) => void;
}

const AudioSettingsComponent: React.FC<Props> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<AudioSettings>({
    soundEffectsEnabled: true,
    musicEnabled: true,
    masterVolume: 1.0,
    effectsVolume: 0.8,
    musicVolume: 0.6,
    hapticFeedbackEnabled: true,
  });

  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingMusic, setIsTestingMusic] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const currentSettings = AudioManager.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  };

  const updateSetting = async <K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // Update the AudioManager
      switch (key) {
        case 'soundEffectsEnabled':
          await AudioManager.setSoundEffectsEnabled(value as boolean);
          break;
        case 'musicEnabled':
          await AudioManager.setMusicEnabled(value as boolean);
          break;
        case 'masterVolume':
          await AudioManager.setMasterVolume(value as number);
          break;
        case 'effectsVolume':
          await AudioManager.setEffectsVolume(value as number);
          break;
        case 'musicVolume':
          await AudioManager.setMusicVolume(value as number);
          break;
        case 'hapticFeedbackEnabled':
          await AudioManager.setHapticFeedbackEnabled(value as boolean);
          break;
      }

      // Notify parent component
      onSettingsChange?.(newSettings);

    } catch (error) {
      console.warn(`Failed to update ${key}:`, error);
      // Revert on error
      setSettings(settings);
    }
  };

  const testSoundEffect = async () => {
    if (isTestingSound) return;
    
    setIsTestingSound(true);
    try {
      await AudioManager.playCorrect();
      setTimeout(() => setIsTestingSound(false), 1000);
    } catch (error) {
      console.warn('Failed to test sound effect:', error);
      setIsTestingSound(false);
    }
  };

  const testMusic = async () => {
    if (isTestingMusic) return;

    setIsTestingMusic(true);
    try {
      const isPlaying = await AudioManager.isMusicPlaying();
      
      if (isPlaying) {
        await AudioManager.stopMusic();
        setIsTestingMusic(false);
      } else {
        await AudioManager.playMenuMusic();
        // Stop test music after 3 seconds
        setTimeout(async () => {
          try {
            await AudioManager.stopMusic();
            setIsTestingMusic(false);
          } catch (error) {
            setIsTestingMusic(false);
          }
        }, 3000);
      }
    } catch (error) {
      console.warn('Failed to test music:', error);
      setIsTestingMusic(false);
    }
  };

  const formatVolume = (volume: number): string => {
    return Math.round(volume * 100) + '%';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Settings</Text>
      
      {/* Sound Effects Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <Icon name="volume-high" size={24} color={theme.colors.primary} />
          <Text style={styles.settingLabel}>Sound Effects</Text>
        </View>
        <View style={styles.settingRight}>
          <Switch
            value={settings.soundEffectsEnabled}
            onValueChange={(value) => updateSetting('soundEffectsEnabled', value)}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {/* Sound Effects Volume */}
      {settings.soundEffectsEnabled && (
        <View style={styles.volumeSection}>
          <View style={styles.volumeHeader}>
            <Text style={styles.volumeLabel}>Effects Volume</Text>
            <Text style={styles.volumeValue}>{formatVolume(settings.effectsVolume)}</Text>
          </View>
          <View style={styles.volumeRow}>
            <Icon name="volume-low" size={20} color={theme.colors.textSecondary} />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={settings.effectsVolume}
              onValueChange={(value) => updateSetting('effectsVolume', value)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.surface}
              thumbTintColor={theme.colors.primary}
              step={0.1}
            />
            <Icon name="volume-high" size={20} color={theme.colors.textSecondary} />
            <TouchableOpacity
              style={[styles.testButton, isTestingSound && styles.testButtonActive]}
              onPress={testSoundEffect}
              disabled={isTestingSound}
            >
              <Icon 
                name={isTestingSound ? "loading" : "play-circle"} 
                size={20} 
                color={theme.colors.surface} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Music Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <Icon name="music" size={24} color={theme.colors.primary} />
          <Text style={styles.settingLabel}>Background Music</Text>
        </View>
        <View style={styles.settingRight}>
          <Switch
            value={settings.musicEnabled}
            onValueChange={(value) => updateSetting('musicEnabled', value)}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {/* Music Volume */}
      {settings.musicEnabled && (
        <View style={styles.volumeSection}>
          <View style={styles.volumeHeader}>
            <Text style={styles.volumeLabel}>Music Volume</Text>
            <Text style={styles.volumeValue}>{formatVolume(settings.musicVolume)}</Text>
          </View>
          <View style={styles.volumeRow}>
            <Icon name="volume-low" size={20} color={theme.colors.textSecondary} />
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={settings.musicVolume}
              onValueChange={(value) => updateSetting('musicVolume', value)}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.surface}
              thumbTintColor={theme.colors.primary}
              step={0.1}
            />
            <Icon name="volume-high" size={20} color={theme.colors.textSecondary} />
            <TouchableOpacity
              style={[styles.testButton, isTestingMusic && styles.testButtonActive]}
              onPress={testMusic}
              disabled={isTestingMusic}
            >
              <Icon 
                name={isTestingMusic ? "stop-circle" : "play-circle"} 
                size={20} 
                color={theme.colors.surface} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Master Volume */}
      <View style={styles.volumeSection}>
        <View style={styles.volumeHeader}>
          <Text style={styles.volumeLabel}>Master Volume</Text>
          <Text style={styles.volumeValue}>{formatVolume(settings.masterVolume)}</Text>
        </View>
        <View style={styles.volumeRow}>
          <Icon name="volume-low" size={20} color={theme.colors.textSecondary} />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={settings.masterVolume}
            onValueChange={(value) => updateSetting('masterVolume', value)}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surface}
            thumbTintColor={theme.colors.primary}
            step={0.1}
          />
          <Icon name="volume-high" size={20} color={theme.colors.textSecondary} />
        </View>
      </View>

      {/* Haptic Feedback Toggle */}
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <Icon name="vibrate" size={24} color={theme.colors.primary} />
          <Text style={styles.settingLabel}>Haptic Feedback</Text>
        </View>
        <View style={styles.settingRight}>
          <Switch
            value={settings.hapticFeedbackEnabled}
            onValueChange={(value) => updateSetting('hapticFeedbackEnabled', value)}
            trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
      </View>

      {/* Audio Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Audio system uses React Native built-in capabilities with haptic feedback for reliable performance.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.large,
    marginVertical: theme.spacing.medium,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.large,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.medium,
  },
  settingRight: {
    alignItems: 'flex-end',
  },
  volumeSection: {
    paddingVertical: theme.spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  volumeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  volumeValue: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: theme.spacing.medium,
    height: 40,
  },
  testButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.small,
    marginLeft: theme.spacing.small,
  },
  testButtonActive: {
    backgroundColor: theme.colors.secondary,
  },
  infoSection: {
    marginTop: theme.spacing.medium,
    padding: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AudioSettingsComponent;