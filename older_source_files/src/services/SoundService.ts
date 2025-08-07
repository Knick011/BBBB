// src/services/SoundService.ts
// ✅ ADVANCED AUDIO: Event-driven looping with pause/resume for sound effects
// ✅ COMPATIBLE: Maintains all existing API methods for seamless integration
// ✅ FEATURES: Immediate looping, pause/resume for effects, game music lifecycle
// console.log: "Advanced audio service with event-driven looping and smart pause/resume"

import { Platform } from 'react-native';
import SoundPlayer from 'react-native-sound-player';

// =============================
// TYPES & INTERFACES
// =============================

interface AudioTrack {
  name: string;
  filename: string;
  priority?: number;
  loop?: boolean;
  fadeIn?: boolean;
  fadeOut?: boolean;
}

interface QueuedSound {
  track: string;
  priority: number;
  timestamp: number;
}

// =============================
// ADVANCED SOUND SERVICE
// =============================

class AdvancedSoundService {
  // Core state
  private audioInitialized = false;
  private currentMusic: string | null = null;
  private musicPlaying = false;
  private musicPaused = false;
  private musicLooping = false;
  
  // Settings
  private soundEffectsEnabled = true;
  private musicEnabled = true;
  
  // Sound queue with pause/resume
  private soundQueue: QueuedSound[] = [];
  private isProcessingQueue = false;
  private soundEffectPlaying = false;
  
  // Game music lifecycle
  private gameQuestionActive = false;
  
  // Audio tracks with metadata
  private tracks: Map<string, AudioTrack> = new Map([
    ['buttonpress', { 
      name: 'buttonpress', 
      filename: 'buttonpress',
      priority: 1
    }],
    ['correct', { 
      name: 'correct', 
      filename: 'correct',
      priority: 3,
      fadeIn: true
    }],
    ['incorrect', { 
      name: 'incorrect', 
      filename: 'incorrect',
      priority: 3
    }],
    ['streak', { 
      name: 'streak', 
      filename: 'streak',
      priority: 5,
      fadeIn: true
    }],
    ['gamemusic', { 
      name: 'gamemusic', 
      filename: 'gamemusic',
      loop: true,
      fadeIn: true,
      fadeOut: true
    }],
    ['menumusic', { 
      name: 'menumusic', 
      filename: 'menumusic',
      loop: true,
      fadeIn: true,
      fadeOut: true
    }],
  ]);
  
  // Singleton pattern
  private static instance: AdvancedSoundService;
  private initPromise: Promise<boolean> | null = null;
  
  constructor() {
    console.log('🎵 [Advanced Audio] Initializing event-driven sound service...');
  }
  
  static getInstance(): AdvancedSoundService {
    if (!AdvancedSoundService.instance) {
      AdvancedSoundService.instance = new AdvancedSoundService();
    }
    return AdvancedSoundService.instance;
  }
  
  // =============================
  // INITIALIZATION WITH EVENT LISTENERS
  // =============================
  
  async initialize(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.initializeAudio();
    return this.initPromise;
  }
  
  private async initializeAudio(): Promise<boolean> {
    try {
      console.log('🎵 [Advanced Audio] Setting up event-driven audio system...');
      
      // Setup reliable event listeners
      this.setupEventListeners();
      
      this.audioInitialized = true;
      console.log('✅ [Advanced Audio] Event-driven audio system ready');
      console.log('🎵 Features: Immediate Looping, Pause/Resume Effects, Game Music Lifecycle');
      
      return true;
      
    } catch (error) {
      console.error('❌ [Advanced Audio] Initialization failed:', error);
      return false;
    }
  }
  
  private setupEventListeners(): void {
    try {
      // Remove any existing listeners first
      SoundPlayer.removeEventListener('onFinishedPlaying');
      SoundPlayer.removeEventListener('onFinishedLoading');
      
      // Setup music finished listener for immediate looping
      SoundPlayer.addEventListener('onFinishedPlaying', (data) => {
        console.log('🎵 [Advanced Audio] Music finished event:', {
          currentMusic: this.currentMusic,
          musicPlaying: this.musicPlaying,
          musicLooping: this.musicLooping,
          data
        });
        
        this.handleMusicFinished();
      });
      
      // Setup loading listener for error detection
      SoundPlayer.addEventListener('onFinishedLoading', ({ success }) => {
        if (!success) {
          console.warn('⚠️ [Advanced Audio] Audio file failed to load');
        }
      });
      
      console.log('✅ [Advanced Audio] Event listeners setup complete');
      
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Event listener setup failed:', error);
    }
  }
  
  private handleMusicFinished(): void {
    // Only loop if music should be looping and is currently playing
    if (this.musicLooping && this.musicPlaying && this.currentMusic && this.musicEnabled) {
      const track = this.tracks.get(this.currentMusic);
      if (track && track.loop) {
        console.log('🎵 [Advanced Audio] Immediate loop restart:', this.currentMusic);
        
        // Small delay to prevent immediate restart issues, then loop
        setTimeout(() => {
          if (this.musicLooping && this.musicPlaying && this.currentMusic) {
            this.playMusicTrack(this.currentMusic, false); // Don't restart state, just replay
          }
        }, 100);
      }
    }
  }
  
  private async ensureInitialized(): Promise<boolean> {
    if (!this.audioInitialized) {
      return await this.initialize();
    }
    return this.audioInitialized;
  }
  
  // =============================
  // SOUND EFFECTS WITH PAUSE/RESUME
  // =============================
  
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
      const soundItem = this.soundQueue.shift();
      if (soundItem) {
        await this.playQueuedSound(soundItem);
        // Small delay between sounds
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  private async playQueuedSound(soundItem: QueuedSound): Promise<void> {
    try {
      const track = this.tracks.get(soundItem.track);
      if (!track) return;
      
      console.log('🎵 [Advanced Audio] Playing sound effect:', soundItem.track);
      
      // PAUSE MENU MUSIC during sound effects (but not game music)
      const shouldPauseMusic = this.currentMusic === 'menumusic' && this.musicPlaying && !this.musicPaused;
      
      if (shouldPauseMusic) {
        console.log('🎵 [Advanced Audio] Pausing menu music for sound effect');
        SoundPlayer.pause();
        this.musicPaused = true;
      }
      
      this.soundEffectPlaying = true;
      
      // Simulate fade in with small delay if configured
      if (track.fadeIn) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Play the sound effect
      SoundPlayer.playSoundFile(track.filename, 'mp3');
      
      // Wait for sound effect to finish (estimated duration)
      const effectDuration = this.getEstimatedDuration(soundItem.track);
      await new Promise(resolve => setTimeout(resolve, effectDuration));
      
      this.soundEffectPlaying = false;
      
      // RESUME MENU MUSIC after sound effect
      if (shouldPauseMusic && this.musicPaused && this.currentMusic === 'menumusic') {
        console.log('🎵 [Advanced Audio] Resuming menu music after sound effect');
        setTimeout(() => {
          if (this.musicPaused && this.musicPlaying) {
            SoundPlayer.resume();
            this.musicPaused = false;
          }
        }, 100);
      }
      
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Sound effect failed:', soundItem.track, error);
      this.soundEffectPlaying = false;
      
      // Ensure music resumes even if sound effect fails
      if (this.musicPaused && this.currentMusic === 'menumusic') {
        SoundPlayer.resume();
        this.musicPaused = false;
      }
    }
  }
  
  private getEstimatedDuration(trackName: string): number {
    // Estimated durations for sound effects (in milliseconds)
    const durations: { [key: string]: number } = {
      'buttonpress': 200,
      'correct': 800,
      'incorrect': 600,
      'streak': 1200
    };
    
    return durations[trackName] || 500;
  }
  
  // =============================
  // MUSIC MANAGEMENT WITH LIFECYCLE
  // =============================
  
  private async playMusicTrack(trackName: string, resetState: boolean = true): Promise<void> {
    try {
      const track = this.tracks.get(trackName);
      if (!track) {
        console.warn('⚠️ [Advanced Audio] Unknown music track:', trackName);
        return;
      }
      
      // Stop current music if playing different track
      if (resetState && this.musicPlaying && this.currentMusic !== trackName) {
        await this.stopCurrentMusic();
      }
      
      // Set state if this is a new track
      if (resetState) {
        this.currentMusic = trackName;
        this.musicPlaying = true;
        this.musicPaused = false;
        
        if (track.loop) {
          this.musicLooping = true;
        }
      }
      
      console.log('🎵 [Advanced Audio] Playing music:', trackName, resetState ? '(new)' : '(loop)');
      
      // Simulate fade in with delay if configured
      if (track.fadeIn && resetState) {
        console.log('🎵 [Advanced Audio] Simulating fade-in for:', trackName);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Play the music
      SoundPlayer.playSoundFile(track.filename, 'mp3');
      
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Music playback failed:', error);
      if (resetState) {
        this.musicPlaying = false;
        this.currentMusic = null;
        this.musicLooping = false;
      }
    }
  }
  
  private async stopCurrentMusic(): Promise<void> {
    if (!this.musicPlaying) return;
    
    const track = this.tracks.get(this.currentMusic || '');
    
    // Simulate fade out with delay if configured
    if (track?.fadeOut) {
      console.log('🎵 [Advanced Audio] Simulating fade-out for:', this.currentMusic);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    SoundPlayer.stop();
    this.musicPlaying = false;
    this.musicLooping = false;
    this.musicPaused = false;
    this.currentMusic = null;
  }
  
  // =============================
  // PUBLIC API - SOUND EFFECTS
  // =============================
  
  async playButtonPress(): Promise<void> {
    if (!this.soundEffectsEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    const track = this.tracks.get('buttonpress');
    this.queueSound('buttonpress', track?.priority || 1);
  }
  
  async playCorrect(): Promise<void> {
    if (!this.soundEffectsEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    const track = this.tracks.get('correct');
    this.queueSound('correct', track?.priority || 3);
  }
  
  async playIncorrect(): Promise<void> {
    if (!this.soundEffectsEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    const track = this.tracks.get('incorrect');
    this.queueSound('incorrect', track?.priority || 3);
  }
  
  async playStreak(): Promise<void> {
    if (!this.soundEffectsEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    const track = this.tracks.get('streak');
    this.queueSound('streak', track?.priority || 5);
  }
  
  // =============================
  // PUBLIC API - MUSIC
  // =============================
  
  async playMenuMusic(): Promise<void> {
    if (!this.musicEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    console.log('🎵 [Advanced Audio] Starting menu music (loops continuously, pauses for effects)');
    await this.playMusicTrack('menumusic');
  }
  
  async playGameMusic(): Promise<void> {
    if (!this.musicEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    console.log('🎵 [Advanced Audio] Starting game music (per-question lifecycle)');
    await this.playMusicTrack('gamemusic');
  }
  
  // =============================
  // GAME MUSIC LIFECYCLE CONTROLS
  // =============================
  
  async startQuestionMusic(): Promise<void> {
    if (!this.musicEnabled) return;
    const isReady = await this.ensureInitialized();
    if (!isReady) return;
    
    this.gameQuestionActive = true;
    console.log('🎵 [Advanced Audio] Starting music for new question');
    await this.playMusicTrack('gamemusic');
  }
  
  async stopQuestionMusic(): Promise<void> {
    if (!this.gameQuestionActive) return;
    
    this.gameQuestionActive = false;
    console.log('🎵 [Advanced Audio] Stopping music - question answered/timeout');
    
    if (this.currentMusic === 'gamemusic') {
      await this.stopCurrentMusic();
    }
  }
  
  async onQuestionAnswered(): Promise<void> {
    // Stop music when player answers
    await this.stopQuestionMusic();
  }
  
  async onQuestionTimeout(): Promise<void> {
    // Stop music when time runs out
    await this.stopQuestionMusic();
  }
  
  async onNewQuestion(): Promise<void> {
    // Start music for new question
    await this.startQuestionMusic();
  }
  
  // =============================
  // STANDARD MUSIC CONTROLS
  // =============================
  
  async stopMusic(): Promise<void> {
    console.log('🎵 [Advanced Audio] Stopping all music');
    this.gameQuestionActive = false;
    await this.stopCurrentMusic();
  }
  
  async pauseMusic(): Promise<void> {
    if (!this.musicPlaying || this.musicPaused) return;
    
    try {
      SoundPlayer.pause();
      this.musicPaused = true;
      console.log('🎵 [Advanced Audio] Music manually paused');
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Failed to pause music:', error);
    }
  }
  
  async resumeMusic(): Promise<void> {
    if (!this.musicPlaying || !this.musicPaused) return;
    
    try {
      SoundPlayer.resume();
      this.musicPaused = false;
      console.log('🎵 [Advanced Audio] Music manually resumed');
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Failed to resume music:', error);
    }
  }
  
  // =============================
  // BACKWARD COMPATIBILITY
  // =============================
  
  // Music aliases
  async startGameMusic(): Promise<void> {
    return this.playGameMusic();
  }
  
  async startMenuMusic(): Promise<void> {
    return this.playMenuMusic();
  }
  
  // Sound effect aliases
  async playButtonClick(): Promise<void> {
    return this.playButtonPress();
  }
  
  // Settings
  setSoundEffectsEnabled(enabled: boolean): void {
    this.soundEffectsEnabled = enabled;
    console.log('🎵 [Advanced Audio] Sound effects:', enabled ? 'enabled' : 'disabled');
  }
  
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled && this.musicPlaying) {
      this.stopMusic();
    }
    console.log('🎵 [Advanced Audio] Music:', enabled ? 'enabled' : 'disabled');
  }
  
  setSoundEnabled(enabled: boolean): void {
    this.setSoundEffectsEnabled(enabled);
  }
  
  isSoundEffectsEnabled(): boolean {
    return this.soundEffectsEnabled;
  }
  
  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }
  
  isAudioAvailable(): boolean {
    return this.audioInitialized;
  }
  
  // =============================
  // VOLUME CONTROLS (LIMITED SUPPORT)
  // =============================
  
  setMasterVolume(volume: number): void {
    console.log('🎵 [Advanced Audio] Volume control limited by library');
  }
  
  setMusicVolume(volume: number): void {
    console.log('🎵 [Advanced Audio] Music volume control limited by library');
  }
  
  setEffectsVolume(volume: number): void {
    console.log('🎵 [Advanced Audio] Effects volume control limited by library');
  }
  
  setDuckingEnabled(enabled: boolean): void {
    console.log('🎵 [Advanced Audio] Using pause/resume instead of ducking');
  }
  
  setCrossfadeDuration(duration: number): void {
    console.log('🎵 [Advanced Audio] Using simulated crossfading with delays');
  }
  
  // =============================
  // LEGACY COMPATIBILITY
  // =============================
  
  async playSound(file: any, name: string): Promise<void> {
    try {
      if (!this.soundEffectsEnabled) return;
      const isReady = await this.ensureInitialized();
      if (!isReady) return;
      
      console.log('🎵 [Advanced Audio] Playing legacy sound:', name);
      
      // Handle both string filenames and require() results
      if (typeof file === 'string') {
        SoundPlayer.playSoundFile(file, 'mp3');
      } else {
        // Map known legacy names to filenames
        const mapping: { [key: string]: string } = {
          'buttonpress': 'buttonpress',
          'correct': 'correct',
          'incorrect': 'incorrect',
          'streak': 'streak',
          'gamemusic': 'gamemusic',
          'menumusic': 'menumusic'
        };
        
        const filename = mapping[name] || name;
        SoundPlayer.playSoundFile(filename, 'mp3');
      }
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Legacy sound failed:', name, error);
    }
  }
  
  // =============================
  // DIAGNOSTICS
  // =============================
  
  getAudioStatus() {
    return {
      // Core status
      initialized: this.audioInitialized,
      musicPlaying: this.musicPlaying,
      musicPaused: this.musicPaused,
      currentMusic: this.currentMusic,
      musicLooping: this.musicLooping,
      
      // Game state
      gameQuestionActive: this.gameQuestionActive,
      soundEffectPlaying: this.soundEffectPlaying,
      
      // Queue status
      queueLength: this.soundQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      
      // Settings
      soundEffectsEnabled: this.soundEffectsEnabled,
      musicEnabled: this.musicEnabled,
      
      // System info
      platform: Platform.OS,
      library: 'react-native-sound-player',
      features: [
        'Event-driven Immediate Looping',
        'Pause/Resume for Sound Effects',
        'Game Music Lifecycle',
        'Simulated Fade Effects',
        'Priority Sound Queue',
        'Full Backward Compatibility'
      ]
    };
  }
  
  // =============================
  // CLEANUP
  // =============================
  
  async destroy(): Promise<void> {
    try {
      console.log('🎵 [Advanced Audio] Cleaning up audio system...');
      
      // Clear sound queue
      this.soundQueue = [];
      this.isProcessingQueue = false;
      
      // Remove event listeners
      SoundPlayer.removeEventListener('onFinishedPlaying');
      SoundPlayer.removeEventListener('onFinishedLoading');
      
      // Stop audio
      SoundPlayer.stop();
      
      // Reset state
      this.audioInitialized = false;
      this.musicPlaying = false;
      this.musicPaused = false;
      this.musicLooping = false;
      this.currentMusic = null;
      this.gameQuestionActive = false;
      this.soundEffectPlaying = false;
      
      console.log('✅ [Advanced Audio] Audio system cleaned up successfully');
      
    } catch (error) {
      console.warn('⚠️ [Advanced Audio] Cleanup error:', error);
    }
  }
}

// =============================
// SINGLETON EXPORT
// =============================

const SoundService = AdvancedSoundService.getInstance();
export default SoundService;