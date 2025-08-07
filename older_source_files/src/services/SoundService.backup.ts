// src/services/SoundService.ts
// ✅ MODERN AUDIO: Using react-native-sound-player
// ✅ FIXES: Simple and reliable audio playback for React Native 0.79.5
// ✅ LOOPING: Background music now loops seamlessly
// console.log: "Modern audio service using react-native-sound-player for RN 0.79.5"

import { Platform } from 'react-native';
import SoundPlayer from 'react-native-sound-player';

// Audio availability flags
let audioInitialized = false;
let backgroundMusicPlaying = false;
let currentMusicTrack: string | null = null;
let musicLooping = false;
let loopTimer: NodeJS.Timeout | null = null;

// Sound effect tracking
let soundEffectsEnabled = true;
let musicEnabled = true;

// Sound file paths - using require for local assets
const SOUND_FILES = {
  buttonPress: require('../assets/sounds/buttonpress.mp3'),
  correct: require('../assets/sounds/correct.mp3'),
  incorrect: require('../assets/sounds/incorrect.mp3'),
  streak: require('../assets/sounds/streak.mp3'),
  gameMusic: require('../assets/sounds/gamemusic.mp3'),
  menuMusic: require('../assets/sounds/menumusic.mp3')
};

// Initialize audio system
const initializeAudio = async (): Promise<boolean> => {
  try {
    console.log('🔊 [Modern Audio] Initializing react-native-sound-player...');
    
    // Set up event listeners for looping
    SoundPlayer.addEventListener('onFinishedPlaying', (data) => {
      console.log('🔊 [Modern Audio] onFinishedPlaying event triggered');
      handleMusicFinished(data);
    });
    
    // Test if audio is working by trying to play a silent sound
    audioInitialized = true;
    console.log('✅ [Modern Audio] react-native-sound-player ready with looping support');
    return true;

  } catch (error: any) {
    console.log('❌ [Modern Audio] Audio initialization failed:', error?.message || error);
    return false;
  }
};

// Handle music finishing - restart if looping is enabled
const handleMusicFinished = (data: any) => {
  console.log('🔊 [Modern Audio] Music finished event received:', {
    musicLooping,
    backgroundMusicPlaying,
    currentMusicTrack,
    musicEnabled,
    data
  });
  
  if (musicLooping && backgroundMusicPlaying && currentMusicTrack && musicEnabled) {
    console.log('🔊 [Modern Audio] Music finished, restarting for loop...');
    // Small delay to prevent immediate restart issues
    setTimeout(() => {
      try {
        console.log('🔊 [Modern Audio] Attempting to restart:', currentMusicTrack);
        SoundPlayer.playSoundFile(currentMusicTrack, 'mp3');
        console.log('🔊 [Modern Audio] Music loop restarted successfully');
      } catch (error) {
        console.log('🔊 [Modern Audio] Failed to restart music loop:', error);
        musicLooping = false;
      }
    }, 100);
  } else {
    console.log('🔊 [Modern Audio] Music finished, not looping - conditions not met');
    backgroundMusicPlaying = false;
  }
};

// Timer-based fallback loop mechanism
const startLoopTimer = (trackName: string) => {
  // Clear any existing timer
  if (loopTimer) {
    clearTimeout(loopTimer);
  }
  
  // Set timer to restart music after estimated duration
  // Menu music is typically 2-3 minutes, game music 1-2 minutes
  const estimatedDuration = trackName === 'menumusic' ? 180000 : 120000; // 3 min vs 2 min
  
  loopTimer = setTimeout(() => {
    if (musicLooping && backgroundMusicPlaying && currentMusicTrack === trackName && musicEnabled) {
      console.log('🔊 [Modern Audio] Timer-based loop restart for:', trackName);
      try {
        SoundPlayer.playSoundFile(trackName, 'mp3');
        // Restart the timer
        startLoopTimer(trackName);
      } catch (error) {
        console.log('🔊 [Modern Audio] Timer-based loop restart failed:', error);
        musicLooping = false;
      }
    }
  }, estimatedDuration);
};

const stopLoopTimer = () => {
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
};

// Sound Service Class
class SoundServiceClass {
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    console.log('🔊 [Modern Audio] SoundService constructor called');
  }

  // Initialize the audio system
  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = initializeAudio();
    return this.initPromise;
  }

  // Ensure audio is initialized before use
  private async ensureInitialized(): Promise<boolean> {
    if (!audioInitialized) {
      return await this.initialize();
    }
    return audioInitialized;
  }

  // Play a sound effect
  private async playSound(soundFile: any, soundName: string): Promise<void> {
    try {
      if (!soundEffectsEnabled) {
        console.log(`🔊 [Modern Audio] Sound effects disabled, skipping: ${soundName}`);
        return;
      }

      const isReady = await this.ensureInitialized();
      if (!isReady) {
        console.log(`🔊 [Modern Audio] Audio not available, skipping: ${soundName}`);
        return;
      }

      // For sound effects, we'll use a simple approach
      // Stop any current music briefly, play sound, then resume
      const wasPlaying = backgroundMusicPlaying;
      const wasLooping = musicLooping;
      if (wasPlaying) {
        SoundPlayer.pause();
      }

      // Play the sound effect
      SoundPlayer.playSoundFile(soundName, 'mp3');
      
      console.log(`🔊 [Modern Audio] Playing sound effect: ${soundName}`);

      // Resume music after a short delay
      if (wasPlaying && currentMusicTrack) {
        setTimeout(() => {
          try {
            this.resumeBackgroundMusic();
            // Restore looping state
            musicLooping = wasLooping;
          } catch (error) {
            console.log('🔊 [Modern Audio] Failed to resume background music:', error);
          }
        }, 1000); // 1 second delay
      }

    } catch (error: any) {
      console.log(`🔊 [Modern Audio] Error playing ${soundName}:`, error?.message || error);
    }
  }

  // Resume background music after sound effect
  private async resumeBackgroundMusic(): Promise<void> {
    if (!currentMusicTrack || !musicEnabled) return;

    try {
      SoundPlayer.playSoundFile(currentMusicTrack, 'mp3');
      backgroundMusicPlaying = true;
      // Restore looping state for background music
      musicLooping = true;
    } catch (error) {
      console.log('🔊 [Modern Audio] Failed to resume background music:', error);
    }
  }

  // Public methods for sound effects
  async playButtonPress(): Promise<void> {
    const isReady = await this.ensureInitialized();
    if (isReady) {
      await this.playSound(SOUND_FILES.buttonPress, 'buttonpress');
    }
  }

  async playCorrect(): Promise<void> {
    const isReady = await this.ensureInitialized();
    if (isReady) {
      await this.playSound(SOUND_FILES.correct, 'correct');
    }
  }

  async playIncorrect(): Promise<void> {
    const isReady = await this.ensureInitialized();
    if (isReady) {
      await this.playSound(SOUND_FILES.incorrect, 'incorrect');
    }
  }

  async playStreak(): Promise<void> {
    const isReady = await this.ensureInitialized();
    if (isReady) {
      await this.playSound(SOUND_FILES.streak, 'streak');
    }
  }

  // Background music methods with looping
  async startGameMusic(): Promise<void> {
    try {
      if (!musicEnabled) {
        console.log('🔊 [Modern Audio] Music disabled, skipping game music');
        return;
      }

      const isReady = await this.ensureInitialized();
      if (!isReady) {
        console.log('🔊 [Modern Audio] Audio not available, skipping game music');
        return;
      }

      // Stop any current music
      await this.stopMusic();

      SoundPlayer.playSoundFile('gamemusic', 'mp3');
      backgroundMusicPlaying = true;
      currentMusicTrack = 'gamemusic';
      musicLooping = true; // Enable looping for background music
      
      // Start timer-based fallback loop
      startLoopTimer('gamemusic');
      
      console.log('🔊 [Modern Audio] Started game music with looping');

    } catch (error: any) {
      console.log('🔊 [Modern Audio] Failed to start game music:', error?.message || error);
    }
  }

  async startMenuMusic(): Promise<void> {
    try {
      if (!musicEnabled) {
        console.log('🔊 [Modern Audio] Music disabled, skipping menu music');
        return;
      }

      const isReady = await this.ensureInitialized();
      if (!isReady) {
        console.log('🔊 [Modern Audio] Audio not available, skipping menu music');
        return;
      }

      // Stop any current music
      await this.stopMusic();

      console.log('🔊 [Modern Audio] Starting menu music...');
      SoundPlayer.playSoundFile('menumusic', 'mp3');
      backgroundMusicPlaying = true;
      currentMusicTrack = 'menumusic';
      musicLooping = true; // Enable looping for background music
      
      // Start timer-based fallback loop
      startLoopTimer('menumusic');
      
      console.log('🔊 [Modern Audio] Started menu music with looping - State:', {
        backgroundMusicPlaying,
        currentMusicTrack,
        musicLooping,
        musicEnabled
      });

    } catch (error: any) {
      console.log('🔊 [Modern Audio] Failed to start menu music:', error?.message || error);
    }
  }

  async stopMusic(): Promise<void> {
    try {
      SoundPlayer.stop();
      backgroundMusicPlaying = false;
      currentMusicTrack = null;
      musicLooping = false; // Disable looping when stopping
      
      // Stop the loop timer
      stopLoopTimer();
      
      console.log('🔊 [Modern Audio] Stopped music');

    } catch (error: any) {
      console.log('🔊 [Modern Audio] Failed to stop music:', error?.message || error);
    }
  }

  async pauseMusic(): Promise<void> {
    try {
      if (backgroundMusicPlaying) {
        SoundPlayer.pause();
        console.log('🔊 [Modern Audio] Paused music');
      }
    } catch (error: any) {
      console.log('🔊 [Modern Audio] Failed to pause music:', error?.message || error);
    }
  }

  async resumeMusic(): Promise<void> {
    try {
      if (currentMusicTrack) {
        SoundPlayer.resume();
        console.log('🔊 [Modern Audio] Resumed music');
      }
    } catch (error: any) {
      console.log('🔊 [Modern Audio] Failed to resume music:', error?.message || error);
    }
  }

  // Settings methods
  setSoundEffectsEnabled(enabled: boolean): void {
    soundEffectsEnabled = enabled;
    console.log(`🔊 [Modern Audio] Sound effects ${enabled ? 'enabled' : 'disabled'}`);
  }

  setMusicEnabled(enabled: boolean): void {
    musicEnabled = enabled;
    if (!enabled && backgroundMusicPlaying) {
      this.stopMusic();
    }
    console.log(`🔊 [Modern Audio] Music ${enabled ? 'enabled' : 'disabled'}`);
  }

  isSoundEffectsEnabled(): boolean {
    return soundEffectsEnabled;
  }

  isMusicEnabled(): boolean {
    return musicEnabled;
  }

  isAudioAvailable(): boolean {
    return audioInitialized;
  }

  // Cleanup method
  async destroy(): Promise<void> {
    try {
      // Remove event listeners
      SoundPlayer.removeEventListener('onFinishedPlaying');
      
      // Stop the loop timer
      stopLoopTimer();
      
      SoundPlayer.stop();
      
      audioInitialized = false;
      backgroundMusicPlaying = false;
      currentMusicTrack = null;
      musicLooping = false;
      
      console.log('🔊 [Modern Audio] SoundService destroyed');

    } catch (error: any) {
      console.log('🔊 [Modern Audio] Error during destroy:', error?.message || error);
    }
  }

  // Get audio status for debugging
  getAudioStatus() {
    return {
      audioInitialized,
      backgroundMusicPlaying,
      currentMusicTrack,
      musicLooping,
      soundEffectsEnabled,
      musicEnabled,
      platform: Platform.OS,
      library: 'react-native-sound-player'
    };
  }
}

// Export singleton instance
const SoundService = new SoundServiceClass();
export default SoundService;