// src/services/EnhancedSoundService.ts
// Professional audio service with advanced features for a polished experience

import { Platform } from 'react-native';
import SoundPlayer from 'react-native-sound-player';

// Types for better type safety
interface AudioTrack {
  name: string;
  file: any;
  volume?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  loop?: boolean;
}

interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  crossfadeDuration: number;
  duckingEnabled: boolean;
  duckingFactor: number;
}

interface QueuedSound {
  track: string;
  priority: number;
  timestamp: number;
}

// Professional audio management
class EnhancedSoundService {
  private audioInitialized = false;
  private currentMusic: string | null = null;
  private musicPlaying = false;
  private audioConfig: AudioConfig = {
    masterVolume: 1.0,
    musicVolume: 0.7,
    effectsVolume: 0.9,
    crossfadeDuration: 1000, // ms
    duckingEnabled: true,
    duckingFactor: 0.3, // Duck music to 30% when effect plays
  };
  
  // Audio ducking for professional mixing
  private isDucking = false;
  private duckingTimeout: NodeJS.Timeout | null = null;
  
  // Sound queue for managing multiple effects
  private soundQueue: QueuedSound[] = [];
  private isProcessingQueue = false;
  
  // Fade animation values
  private fadeInterval: NodeJS.Timeout | null = null;
  private currentVolume = 1.0;
  
  // Audio tracks with metadata
  private tracks: Map<string, AudioTrack> = new Map([
    ['buttonPress', { 
      name: 'buttonPress', 
      file: require('../assets/sounds/buttonpress.mp3'),
      volume: 0.6 
    }],
    ['correct', { 
      name: 'correct', 
      file: require('../assets/sounds/correct.mp3'),
      volume: 0.8,
      fadeIn: true 
    }],
    ['incorrect', { 
      name: 'incorrect', 
      file: require('../assets/sounds/incorrect.mp3'),
      volume: 0.7 
    }],
    ['streak', { 
      name: 'streak', 
      file: require('../assets/sounds/streak.mp3'),
      volume: 1.0,
      fadeIn: true 
    }],
    ['gamemusic', { 
      name: 'gamemusic', 
      file: require('../assets/sounds/gamemusic.mp3'),
      volume: 0.6,
      loop: true,
      fadeIn: true,
      fadeOut: true 
    }],
    ['menumusic', { 
      name: 'menumusic', 
      file: require('../assets/sounds/menumusic.mp3'),
      volume: 0.5,
      loop: true,
      fadeIn: true,
      fadeOut: true 
    }],
  ]);
  
  // Singleton pattern
  private static instance: EnhancedSoundService;
  
  private constructor() {}
  
  static getInstance(): EnhancedSoundService {
    if (!EnhancedSoundService.instance) {
      EnhancedSoundService.instance = new EnhancedSoundService();
    }
    return EnhancedSoundService.instance;
  }
  
  // Initialize with error recovery
  async initialize(): Promise<boolean> {
    if (this.audioInitialized) return true;
    
    try {
      console.log('🎵 Initializing Enhanced Audio System...');
      
      // Setup event listeners with proper error handling
      this.setupEventListeners();
      
      // Test audio system
      await this.testAudioSystem();
      
      this.audioInitialized = true;
      console.log('✅ Enhanced Audio System Ready');
      return true;
      
    } catch (error) {
      console.error('❌ Audio initialization failed:', error);
      // Graceful degradation - app continues without audio
      return false;
    }
  }
  
  private setupEventListeners(): void {
    // Remove any existing listeners
    SoundPlayer.removeEventListener('onFinishedPlaying');
    SoundPlayer.removeEventListener('onFinishedLoading');
    
    // Setup new listeners
    SoundPlayer.addEventListener('onFinishedPlaying', ({ success }) => {
      if (success && this.currentMusic) {
        const track = this.tracks.get(this.currentMusic);
        if (track?.loop && this.musicPlaying) {
          this.playMusicTrack(this.currentMusic);
        }
      }
    });
    
    SoundPlayer.addEventListener('onFinishedLoading', ({ success }) => {
      if (!success) {
        console.warn('⚠️ Audio file failed to load');
      }
    });
  }
  
  private async testAudioSystem(): Promise<void> {
    // Silently test the audio system
    try {
      await SoundPlayer.getInfo();
    } catch (error) {
      // System might not support getInfo, but that's okay
    }
  }
  
  // Professional volume fading
  private async fadeVolume(
    from: number, 
    to: number, 
    duration: number,
    onComplete?: () => void
  ): Promise<void> {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    const steps = 20; // Smooth fade with 20 steps
    const stepDuration = duration / steps;
    const volumeStep = (to - from) / steps;
    let currentStep = 0;
    
    this.currentVolume = from;
    
    return new Promise((resolve) => {
      this.fadeInterval = setInterval(() => {
        currentStep++;
        this.currentVolume += volumeStep;
        
        // Apply volume (would need native module for true volume control)
        // For now, we'll use this as a placeholder
        if (Platform.OS === 'ios') {
          SoundPlayer.setVolume(this.currentVolume * this.audioConfig.masterVolume);
        }
        
        if (currentStep >= steps) {
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          this.currentVolume = to;
          onComplete?.();
          resolve();
        }
      }, stepDuration);
    });
  }
  
  // Audio ducking for professional sound mixing
  private async duckMusic(): Promise<void> {
    if (!this.audioConfig.duckingEnabled || !this.musicPlaying) return;
    
    this.isDucking = true;
    
    // Duck the music volume
    await this.fadeVolume(
      this.audioConfig.musicVolume,
      this.audioConfig.musicVolume * this.audioConfig.duckingFactor,
      100 // Quick duck
    );
    
    // Clear any existing timeout
    if (this.duckingTimeout) {
      clearTimeout(this.duckingTimeout);
    }
    
    // Restore volume after effect
    this.duckingTimeout = setTimeout(() => {
      this.restoreMusicVolume();
    }, 500); // Adjust based on effect duration
  }
  
  private async restoreMusicVolume(): Promise<void> {
    if (!this.isDucking) return;
    
    this.isDucking = false;
    
    await this.fadeVolume(
      this.audioConfig.musicVolume * this.audioConfig.duckingFactor,
      this.audioConfig.musicVolume,
      200 // Smooth restore
    );
  }
  
  // Queue system for overlapping sounds
  private queueSound(trackName: string, priority: number = 0): void {
    this.soundQueue.push({
      track: trackName,
      priority,
      timestamp: Date.now(),
    });
    
    // Sort by priority (higher first) then timestamp (older first)
    this.soundQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
    
    this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.soundQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.soundQueue.length > 0) {
      const sound = this.soundQueue.shift();
      if (sound) {
        await this.playQueuedSound(sound.track);
        // Small delay between sounds for clarity
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  private async playQueuedSound(trackName: string): Promise<void> {
    const track = this.tracks.get(trackName);
    if (!track) return;
    
    try {
      // Duck music if playing
      await this.duckMusic();
      
      // Play the sound
      SoundPlayer.playSoundFile(trackName, 'mp3');
      
    } catch (error) {
      console.warn(`Failed to play ${trackName}:`, error);
    }
  }
  
  // Public API
  async playButtonPress(): Promise<void> {
    if (!this.audioInitialized) return;
    this.queueSound('buttonPress', 1);
  }
  
  async playCorrect(): Promise<void> {
    if (!this.audioInitialized) return;
    this.queueSound('correct', 2);
  }
  
  async playIncorrect(): Promise<void> {
    if (!this.audioInitialized) return;
    this.queueSound('incorrect', 2);
  }
  
  async playStreak(): Promise<void> {
    if (!this.audioInitialized) return;
    this.queueSound('streak', 3); // Higher priority
  }
  
  // Music with crossfading
  async startGameMusic(): Promise<void> {
    if (!this.audioInitialized) return;
    await this.crossfadeToMusic('gamemusic');
  }
  
  async startMenuMusic(): Promise<void> {
    if (!this.audioInitialized) return;
    await this.crossfadeToMusic('menumusic');
  }
  
  private async crossfadeToMusic(trackName: string): Promise<void> {
    const track = this.tracks.get(trackName);
    if (!track) return;
    
    // If same track is playing, don't restart
    if (this.currentMusic === trackName && this.musicPlaying) return;
    
    try {
      // Fade out current music if playing
      if (this.musicPlaying && this.currentMusic) {
        await this.fadeVolume(
          this.audioConfig.musicVolume,
          0,
          this.audioConfig.crossfadeDuration / 2
        );
        SoundPlayer.stop();
      }
      
      // Start new music
      this.currentMusic = trackName;
      this.musicPlaying = true;
      
      await this.playMusicTrack(trackName);
      
      // Fade in new music
      if (track.fadeIn) {
        await this.fadeVolume(
          0,
          this.audioConfig.musicVolume,
          this.audioConfig.crossfadeDuration / 2
        );
      }
      
    } catch (error) {
      console.error(`Failed to start ${trackName}:`, error);
      this.musicPlaying = false;
    }
  }
  
  private async playMusicTrack(trackName: string): Promise<void> {
    try {
      SoundPlayer.playSoundFile(trackName, 'mp3');
      
      // Set volume if supported
      if (Platform.OS === 'ios') {
        const track = this.tracks.get(trackName);
        const volume = (track?.volume || 1.0) * this.audioConfig.musicVolume * this.audioConfig.masterVolume;
        SoundPlayer.setVolume(volume);
      }
    } catch (error) {
      console.error(`Failed to play music track ${trackName}:`, error);
    }
  }
  
  async stopMusic(): Promise<void> {
    if (!this.musicPlaying) return;
    
    const track = this.tracks.get(this.currentMusic || '');
    
    if (track?.fadeOut) {
      await this.fadeVolume(
        this.audioConfig.musicVolume,
        0,
        500
      );
    }
    
    SoundPlayer.stop();
    this.musicPlaying = false;
    this.currentMusic = null;
  }
  
  async pauseMusic(): Promise<void> {
    if (!this.musicPlaying) return;
    
    try {
      SoundPlayer.pause();
    } catch (error) {
      console.warn('Failed to pause music:', error);
    }
  }
  
  async resumeMusic(): Promise<void> {
    if (!this.musicPlaying || !this.currentMusic) return;
    
    try {
      SoundPlayer.resume();
    } catch (error) {
      console.warn('Failed to resume music:', error);
    }
  }
  
  // Configuration methods
  setMasterVolume(volume: number): void {
    this.audioConfig.masterVolume = Math.max(0, Math.min(1, volume));
  }
  
  setMusicVolume(volume: number): void {
    this.audioConfig.musicVolume = Math.max(0, Math.min(1, volume));
    
    // Apply to current music if playing
    if (this.musicPlaying && Platform.OS === 'ios') {
      SoundPlayer.setVolume(this.audioConfig.musicVolume * this.audioConfig.masterVolume);
    }
  }
  
  setEffectsVolume(volume: number): void {
    this.audioConfig.effectsVolume = Math.max(0, Math.min(1, volume));
  }
  
  setDuckingEnabled(enabled: boolean): void {
    this.audioConfig.duckingEnabled = enabled;
  }
  
  // Cleanup
  async destroy(): Promise<void> {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    
    if (this.duckingTimeout) {
      clearTimeout(this.duckingTimeout);
    }
    
    this.soundQueue = [];
    
    SoundPlayer.removeEventListener('onFinishedPlaying');
    SoundPlayer.removeEventListener('onFinishedLoading');
    SoundPlayer.stop();
    
    this.audioInitialized = false;
    this.musicPlaying = false;
    this.currentMusic = null;
  }
  
  // Debug info
  getStatus() {
    return {
      initialized: this.audioInitialized,
      musicPlaying: this.musicPlaying,
      currentMusic: this.currentMusic,
      config: this.audioConfig,
      queueLength: this.soundQueue.length,
      isDucking: this.isDucking,
    };
  }
}

// Export singleton instance
export default EnhancedSoundService.getInstance();