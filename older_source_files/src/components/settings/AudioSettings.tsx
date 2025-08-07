// src/components/settings/AudioSettings.tsx
// Professional audio settings UI with advanced controls

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import EnhancedSoundService from '../../services/EnhancedSoundService';

interface AudioSettingsProps {
  onClose?: () => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ onClose }) => {
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [effectsVolume, setEffectsVolume] = useState(0.9);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [previewAnimation] = useState(new Animated.Value(0));
  
  // Visual feedback animations
  const animatePreview = () => {
    Animated.sequence([
      Animated.timing(previewAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(previewAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const handleMasterVolumeChange = (value: number) => {
    setMasterVolume(value);
    EnhancedSoundService.setMasterVolume(value);
  };
  
  const handleMusicVolumeChange = (value: number) => {
    setMusicVolume(value);
    EnhancedSoundService.setMusicVolume(value);
  };
  
  const handleEffectsVolumeChange = (value: number) => {
    setEffectsVolume(value);
    EnhancedSoundService.setEffectsVolume(value);
  };
  
  const handleDuckingToggle = (value: boolean) => {
    setDuckingEnabled(value);
    EnhancedSoundService.setDuckingEnabled(value);
  };
  
  const testSound = async () => {
    animatePreview();
    await EnhancedSoundService.playButtonPress();
  };
  
  const VolumeSlider = ({ 
    label, 
    value, 
    onChange, 
    icon,
    color 
  }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon: string;
    color: string;
  }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <View style={styles.labelContainer}>
          <Icon name={icon} size={24} color={color} />
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <Text style={styles.volumeText}>{Math.round(value * 100)}%</Text>
      </View>
      
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor="#E0E0E0"
          thumbTintColor={color}
        />
        
        {/* Volume level indicator */}
        <View style={styles.volumeIndicator}>
          <View 
            style={[
              styles.volumeFill,
              { 
                width: `${value * 100}%`,
                backgroundColor: color,
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Audio Settings</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Master Volume */}
        <View style={styles.section}>
          <VolumeSlider
            label="Master Volume"
            value={masterVolume}
            onChange={handleMasterVolumeChange}
            icon="volume-high"
            color="#FF6B6B"
          />
        </View>
        
        {/* Music Volume */}
        <View style={styles.section}>
          <VolumeSlider
            label="Music Volume"
            value={musicVolume}
            onChange={handleMusicVolumeChange}
            icon="music"
            color="#4ECDC4"
          />
        </View>
        
        {/* Effects Volume */}
        <View style={styles.section}>
          <VolumeSlider
            label="Effects Volume"
            value={effectsVolume}
            onChange={handleEffectsVolumeChange}
            icon="bell-ring"
            color="#FFD93D"
          />
        </View>
        
        {/* Advanced Settings */}
        <View style={styles.advancedSection}>
          <Text style={styles.advancedTitle}>Advanced</Text>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Icon name="duck" size={24} color="#95E1D3" />
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Audio Ducking</Text>
                <Text style={styles.toggleDescription}>
                  Lowers music volume when sound effects play
                </Text>
              </View>
            </View>
            <Switch
              value={duckingEnabled}
              onValueChange={handleDuckingToggle}
              trackColor={{ false: '#767577', true: '#95E1D3' }}
              thumbColor={duckingEnabled ? '#FFFFFF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
        </View>
        
        {/* Test Button */}
        <TouchableOpacity style={styles.testButton} onPress={testSound}>
          <Animated.View
            style={[
              styles.testButtonInner,
              {
                transform: [{
                  scale: previewAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.95],
                  }),
                }],
              },
            ]}
          >
            <Icon name="play-circle" size={24} color="#FFFFFF" />
            <Text style={styles.testButtonText}>Test Sound</Text>
          </Animated.View>
        </TouchableOpacity>
        
        {/* Visual EQ Animation */}
        <View style={styles.eqContainer}>
          {[...Array(5)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.eqBar,
                {
                  height: 20 + Math.random() * 30,
                  backgroundColor: i % 2 === 0 ? '#4ECDC4' : '#95E1D3',
                  transform: [{
                    scaleY: previewAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.5 + Math.random() * 0.5],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  section: {
    marginBottom: 30,
  },
  sliderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 12,
    fontWeight: '600',
  },
  volumeText: {
    fontSize: 16,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  sliderWrapper: {
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 40,
    zIndex: 2,
  },
  volumeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
  },
  advancedSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  advancedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleText: {
    marginLeft: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 13,
    color: '#B0B0B0',
    marginTop: 2,
  },
  testButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
  },
  testButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  testButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  eqContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 60,
    gap: 8,
  },
  eqBar: {
    width: 8,
    borderRadius: 4,
  },
});

export default AudioSettings;