// src/services/SoundService.ts
// Backward compatibility wrapper for the new AudioManager
// Provides the same API that existing components expect

import AudioManager from './AudioManager';

class SoundService {
  private audioManager = AudioManager;

  // =============================
  // INITIALIZATION
  // =============================
  
  async initialize(): Promise<boolean> {
    return await this.audioManager.initialize();
  }

  // =============================
  // SOUND EFFECTS
  // =============================
  
  async playButtonPress(): Promise<void> {
    await this.audioManager.playButtonPress();
  }

  async playButtonClick(): Promise<void> {
    await this.audioManager.playButtonClick();
  }

  async playCorrect(): Promise<void> {
    await this.audioManager.playCorrect();
  }

  async playIncorrect(): Promise<void> {
    await this.audioManager.playIncorrect();
  }

  async playStreak(): Promise<void> {
    await this.audioManager.playStreak();
  }

  // =============================
  // MUSIC MANAGEMENT
  // =============================
  
  async playMenuMusic(): Promise<void> {
    await this.audioManager.playMenuMusic();
  }

  async startMenuMusic(): Promise<void> {
    await this.audioManager.startMenuMusic();
  }

  async playGameMusic(): Promise<void> {
    await this.audioManager.playGameMusic();
  }

  async startGameMusic(): Promise<void> {
    await this.audioManager.startGameMusic();
  }

  async stopMusic(): Promise<void> {
    await this.audioManager.stopMusic();
  }

  async pauseMusic(): Promise<void> {
    await this.audioManager.pauseMusic();
  }

  async resumeMusic(): Promise<void> {
    await this.audioManager.resumeMusic();
  }

  // =============================
  // GAME LIFECYCLE METHODS  
  // =============================

  async startQuestionMusic(): Promise<void> {
    await this.audioManager.playGameMusic();
  }

  async stopQuestionMusic(): Promise<void> {
    await this.audioManager.stopMusic();
  }

  async onQuestionAnswered(): Promise<void> {
    await this.audioManager.stopMusic();
  }

  async onQuestionTimeout(): Promise<void> {
    await this.audioManager.stopMusic();
  }

  async onNewQuestion(): Promise<void> {
    await this.audioManager.playGameMusic();
  }

  // =============================
  // SETTINGS
  // =============================
  
  setSoundEnabled(enabled: boolean): void {
    this.audioManager.setSoundEffectsEnabled(enabled);
  }

  setSoundEffectsEnabled(enabled: boolean): void {
    this.audioManager.setSoundEffectsEnabled(enabled);
  }

  setMusicEnabled(enabled: boolean): void {
    this.audioManager.setMusicEnabled(enabled);
  }

  setMasterVolume(volume: number): void {
    this.audioManager.setMasterVolume(volume);
  }

  setMusicVolume(volume: number): void {
    this.audioManager.setMusicVolume(volume);
  }

  setEffectsVolume(volume: number): void {
    this.audioManager.setEffectsVolume(volume);
  }

  // Legacy volume methods (for compatibility)
  setDuckingEnabled(enabled: boolean): void {
    console.log(`🎵 [SoundService] Ducking ${enabled ? 'enabled' : 'disabled'} (handled automatically)`);
  }

  setCrossfadeDuration(duration: number): void {
    console.log(`🎵 [SoundService] Crossfade duration: ${duration}ms (handled automatically)`);
  }

  // =============================
  // STATUS METHODS
  // =============================
  
  isSoundEffectsEnabled(): boolean {
    return this.audioManager.isSoundEffectsEnabled();
  }

  isMusicEnabled(): boolean {
    return this.audioManager.isMusicEnabled();
  }

  isAudioAvailable(): boolean {
    return this.audioManager.isInitialized();
  }

  async isMusicPlaying(): Promise<boolean> {
    return await this.audioManager.isMusicPlaying();
  }

  getCurrentMusic(): string | null {
    return this.audioManager.getCurrentMusicId();
  }

  // =============================
  // LEGACY COMPATIBILITY
  // =============================

  async playSound(file: any, name: string): Promise<void> {
    // Map legacy names to new system
    const soundMapping: { [key: string]: string } = {
      'buttonpress': 'buttonPress',
      'correct': 'correct',
      'incorrect': 'incorrect', 
      'streak': 'streak'
    };

    const mappedName = soundMapping[name] || name;
    
    if (mappedName === 'buttonPress') {
      await this.playButtonPress();
    } else if (mappedName === 'correct') {
      await this.playCorrect();
    } else if (mappedName === 'incorrect') {
      await this.playIncorrect();
    } else if (mappedName === 'streak') {
      await this.playStreak();
    } else {
      console.warn(`🎵 [SoundService] Unknown legacy sound: ${name}`);
    }
  }

  // =============================
  // DEBUG & STATUS
  // =============================

  getAudioStatus() {
    const settings = this.audioManager.getSettings();
    return {
      initialized: this.audioManager.isInitialized(),
      currentMusic: this.audioManager.getCurrentMusicId(),
      settings,
      library: 'expo-av',
      features: [
        'Modern Audio Management',
        'Automatic Resource Management', 
        'Fade In/Out Effects',
        'Priority Sound Queue',
        'Persistent Settings',
        'Error Recovery',
        'Memory Efficient'
      ]
    };
  }

  // =============================
  // CLEANUP
  // =============================

  async destroy(): Promise<void> {
    await this.audioManager.destroy();
  }
}

// =============================
// EXPORT SINGLETON
// =============================

const soundService = new SoundService();
export default soundService;