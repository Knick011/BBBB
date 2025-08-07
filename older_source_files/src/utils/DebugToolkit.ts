// src/utils/DebugToolkit.ts
// Comprehensive debugging and compatibility checking toolkit for React Native app

import { BackHandler, Alert } from 'react-native';

interface ServiceStatus {
  name: string;
  available: boolean;
  initialized: boolean;
  methods: string[];
  errors: string[];
  details?: any;
}

interface DebugReport {
  timestamp: string;
  rnVersion: string;
  platform: string;
  services: ServiceStatus[];
  api: {
    backHandler: {
      available: boolean;
      addEventListener: boolean;
      removeEventListener: boolean;
      exitApp: boolean;
    };
    react: {
      version: string | null;
      duplicates: boolean;
    };
  };
  assets: {
    sounds: string[];
    images: string[];
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

class DebugToolkit {
  private report: DebugReport = {
    timestamp: new Date().toISOString(),
    rnVersion: '',
    platform: '',
    services: [],
    api: {
      backHandler: {
        available: false,
        addEventListener: false,
        removeEventListener: false,
        exitApp: false,
      },
      react: {
        version: null,
        duplicates: false,
      },
    },
    assets: {
      sounds: [],
      images: [],
    },
    errors: [],
    warnings: [],
    recommendations: [],
  };

  constructor() {
    this.resetReport();
  }

  /**
   * Run complete compatibility check
   */
  public async runCompleteCheck(): Promise<DebugReport> {
    console.log('🔍 [Debug] Starting complete compatibility check...');
    
    this.resetReport();
    
    // Check all systems
    await this.checkBackHandlerAPI();
    await this.checkSoundService();
    await this.checkQuestionService();
    await this.checkReactVersions();
    await this.checkAssets();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Print comprehensive report
    this.printReport();
    
    console.log('✅ [Debug] Complete compatibility check finished');
    return { ...this.report };
  }

  /**
   * Quick health check - basic functionality test
   */
  public async quickHealthCheck(): Promise<{ healthy: boolean; criticalIssues: string[] }> {
    console.log('⚡ [Debug] Running quick health check...');
    
    const criticalIssues: string[] = [];
    
    try {
      // Check SoundService
      const SoundService = this.getSoundService();
      if (SoundService) {
        if (typeof SoundService.playButtonClick !== 'function') {
          criticalIssues.push('SoundService.playButtonClick is not a function');
        }
      } else {
        criticalIssues.push('SoundService not available');
      }
      
      // Check QuestionService
      const QuestionService = this.getQuestionService();
      if (QuestionService) {
        if (typeof QuestionService.getRandomQuestion !== 'function') {
          criticalIssues.push('QuestionService.getRandomQuestion is not a function');
        }
      } else {
        criticalIssues.push('QuestionService not available');
      }
      
      // Check BackHandler
      if (!BackHandler || typeof BackHandler.addEventListener !== 'function') {
        criticalIssues.push('BackHandler.addEventListener not available');
      }
      
      const healthy = criticalIssues.length === 0;
      console.log(`⚡ [Debug] Quick health check ${healthy ? 'PASSED' : 'FAILED'}`);
      
      if (criticalIssues.length > 0) {
        console.log('🚨 [Debug] Critical issues found:', criticalIssues);
      }
      
      return { healthy, criticalIssues };
      
    } catch (error: any) {
      criticalIssues.push(`Health check error: ${error?.message}`);
      console.log('❌ [Debug] Quick health check failed:', error);
      return { healthy: false, criticalIssues };
    }
  }

  // ===== SERVICE-SPECIFIC CHECKS =====

  private async checkSoundService(): Promise<void> {
    console.log('🔊 [Debug] Checking SoundService...');
    
    const soundService = this.getSoundService();
    const status: ServiceStatus = {
      name: 'SoundService',
      available: !!soundService,
      initialized: false,
      methods: [],
      errors: [],
    };
    
    if (soundService) {
      try {
        // Check required methods
        const requiredMethods = [
          'initialize', 'playButtonClick', 'playButtonPress', 'playCorrect', 
          'playIncorrect', 'playStreak', 'startMenuMusic', 'startGameMusic',
          'stopMusic', 'pauseMusic', 'resumeMusic', 'setMusicEnabled',
          'setSoundEnabled', 'setMusicVolume', 'setEffectsVolume',
        ];
        
        requiredMethods.forEach(method => {
          if (typeof soundService[method] === 'function') {
            status.methods.push(method);
          } else {
            status.errors.push(`Missing method: ${method}`);
          }
        });
        
        // Check initialization
        if (typeof soundService.initialize === 'function') {
          try {
            await soundService.initialize();
            status.initialized = true;
          } catch (error: any) {
            status.errors.push(`Initialization failed: ${error?.message}`);
          }
        }
        
        console.log(`✅ [Debug] SoundService: ${status.methods.length} methods, ${status.errors.length} errors`);
        
      } catch (error: any) {
        status.errors.push(`SoundService check error: ${error?.message}`);
        console.log('❌ [Debug] SoundService check failed:', error);
      }
    } else {
      status.errors.push('SoundService module not found');
      console.log('❌ [Debug] SoundService not available');
    }
    
    this.report.services.push(status);
  }

  private async checkQuestionService(): Promise<void> {
    console.log('❓ [Debug] Checking QuestionService...');
    
    const questionService = this.getQuestionService();
    const status: ServiceStatus = {
      name: 'QuestionService',
      available: !!questionService,
      initialized: false,
      methods: [],
      errors: [],
    };
    
    if (questionService) {
      try {
        // Check required methods
        const requiredMethods = [
          'initialize', 'getRandomQuestion', 'getQuestionsByCategory',
          'getQuestionsByDifficulty', 'getAllQuestions', 'getCategories',
          'getDifficulties'
        ];
        
        requiredMethods.forEach(method => {
          if (typeof questionService[method] === 'function') {
            status.methods.push(method);
          } else {
            status.errors.push(`Missing method: ${method}`);
          }
        });
        
        // Check initialization
        if (typeof questionService.initialize === 'function') {
          try {
            await questionService.initialize();
            status.initialized = true;
          } catch (error: any) {
            status.errors.push(`Initialization failed: ${error?.message}`);
          }
        }
        
        console.log(`✅ [Debug] QuestionService: ${status.methods.length} methods, ${status.errors.length} errors`);
        
      } catch (error: any) {
        status.errors.push(`QuestionService check error: ${error?.message}`);
        console.log('❌ [Debug] QuestionService check failed:', error);
      }
    } else {
      status.errors.push('QuestionService module not found');
      console.log('❌ [Debug] QuestionService not available');
    }
    
    this.report.services.push(status);
  }

  private async checkBackHandlerAPI(): Promise<void> {
    console.log('🔙 [Debug] Checking BackHandler API...');
    
    const backHandler = {
      available: !!BackHandler,
      addEventListener: typeof BackHandler?.addEventListener === 'function',
      removeEventListener: typeof BackHandler?.removeEventListener === 'function',
      exitApp: typeof BackHandler?.exitApp === 'function',
    };
    
    this.report.api.backHandler = backHandler;
    
    const allAvailable = Object.values(backHandler).every(Boolean);
    console.log(`✅ [Debug] BackHandler API: ${allAvailable ? 'FULLY AVAILABLE' : 'PARTIALLY AVAILABLE'}`);
    
    if (!allAvailable) {
      this.report.warnings.push('BackHandler API partially available');
    }
  }

  private async checkReactVersions(): Promise<void> {
    console.log('⚛️ [Debug] Checking React versions...');
    
    try {
      const React = require('react');
      this.report.api.react.version = React.version;
      
      // Check for duplicate React installations
      const reactPaths = require.resolve.paths('react');
      this.report.api.react.duplicates = reactPaths && reactPaths.length > 1;
      
      console.log(`✅ [Debug] React version: ${React.version}`);
      
      if (this.report.api.react.duplicates) {
        this.report.warnings.push('Multiple React installations detected');
      }
      
    } catch (error: any) {
      this.report.errors.push(`React version check failed: ${error?.message}`);
      console.log('❌ [Debug] React version check failed:', error);
    }
  }

  private async checkAssets(): Promise<void> {
    console.log('📁 [Debug] Checking assets...');
    
    try {
      // Check sound assets
      const soundAssets = [
        'buttonpress.mp3', 'correct.mp3', 'incorrect.mp3',
        'gamemusic.mp3', 'menumusic.mp3', 'streak.mp3'
      ];
      
      soundAssets.forEach(sound => {
        try {
          require(`../assets/sounds/${sound}`);
          this.report.assets.sounds.push(sound);
        } catch (error) {
          this.report.errors.push(`Sound asset missing: ${sound}`);
        }
      });
      
      // Check image assets
      const imageAssets = [
        'happy.png', 'sad.png', 'excited.png', 'depressed.png',
        'below.png', 'gamemode.png'
      ];
      
      imageAssets.forEach(image => {
        try {
          require(`../assets/mascot/${image}`);
          this.report.assets.images.push(image);
        } catch (error) {
          this.report.errors.push(`Image asset missing: ${image}`);
        }
      });
      
      console.log(`✅ [Debug] Assets: ${this.report.assets.sounds.length} sounds, ${this.report.assets.images.length} images`);
      
    } catch (error: any) {
      this.report.errors.push(`Asset check failed: ${error?.message}`);
      console.log('❌ [Debug] Asset check failed:', error);
    }
  }

  // ===== UTILITY METHODS =====

  private getSoundService(): any {
    try {
      return require('../services/SoundService').default;
    } catch (error) {
      return null;
    }
  }

  private getQuestionService(): any {
    try {
      return require('../services/QuestionService').default;
    } catch (error) {
      return null;
    }
  }

  private resetReport(): void {
    this.report = {
      timestamp: new Date().toISOString(),
      rnVersion: require('react-native/package.json').version,
      platform: require('react-native').Platform.OS,
      services: [],
      api: {
        backHandler: {
          available: false,
          addEventListener: false,
          removeEventListener: false,
          exitApp: false,
        },
        react: {
          version: null,
          duplicates: false,
        },
      },
      assets: {
        sounds: [],
        images: [],
      },
      errors: [],
      warnings: [],
      recommendations: [],
    };
  }

  private generateRecommendations(): void {
    const allErrors = [
      ...this.report.errors,
      ...this.report.services.flatMap(s => s.errors),
    ];
    
    if (allErrors.some(error => error.includes('SoundService'))) {
      this.report.recommendations.push('Check SoundService installation and configuration');
    }
    
    if (allErrors.some(error => error.includes('QuestionService'))) {
      this.report.recommendations.push('Verify QuestionService data files are present');
    }
    
    if (allErrors.some(error => error.includes('BackHandler'))) {
      this.report.recommendations.push('BackHandler API may not be available on this platform');
    }
    
    if (this.report.api.react.duplicates) {
      this.report.recommendations.push('Run npm dedupe to resolve React version conflicts');
    }
    
    if (this.report.assets.sounds.length < 6) {
      this.report.recommendations.push('Some sound assets are missing - check assets/sounds/ directory');
    }
    
    if (this.report.assets.images.length < 6) {
      this.report.recommendations.push('Some image assets are missing - check assets/mascot/ directory');
    }
  }

  private printReport(): void {
    console.log('\n📊 === DEBUG REPORT ===');
    console.log(`Timestamp: ${this.report.timestamp}`);
    console.log(`React Native: ${this.report.rnVersion}`);
    console.log(`Platform: ${this.report.platform}`);
    
    console.log('\n🔧 SERVICES:');
    this.report.services.forEach(service => {
      const icon = service.available ? '✅' : '❌';
      const initIcon = service.initialized ? '✅' : '❌';
      console.log(`${icon} ${service.name} (Initialized: ${initIcon})`);
      if (service.errors.length > 0) {
        service.errors.forEach(error => console.log(`  ❌ ${error}`));
      }
    });
    
    console.log('\n🔌 API:');
    console.log(`BackHandler: ${this.report.api.backHandler.available ? '✅' : '❌'}`);
    console.log(`React: ${this.report.api.react.version} ${this.report.api.react.duplicates ? '(DUPLICATES)' : ''}`);
    
    console.log('\n📁 ASSETS:');
    console.log(`Sounds: ${this.report.assets.sounds.length}/6`);
    console.log(`Images: ${this.report.assets.images.length}/6`);
    
    if (this.report.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.report.errors.forEach(error => console.log(`  ${error}`));
    }
    
    if (this.report.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.report.warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (this.report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    console.log('=== END REPORT ===\n');
  }

  // ===== TESTING METHODS =====

  /**
   * Test SoundService functionality
   */
  public testSoundService(): void {
    console.log('🔊 [Debug] Testing SoundService functionality...');
    
    const soundService = this.getSoundService();
    if (!soundService) {
      console.log('❌ [Debug] SoundService not available for testing');
      return;
    }
    
    try {
      // Test basic methods
      if (typeof soundService.playButtonClick === 'function') {
        soundService.playButtonClick();
        console.log('✅ [Debug] SoundService.playButtonClick() - OK');
      }
      
      if (typeof soundService.playCorrect === 'function') {
        soundService.playCorrect();
        console.log('✅ [Debug] SoundService.playCorrect() - OK');
      }
      
      if (typeof soundService.playIncorrect === 'function') {
        soundService.playIncorrect();
        console.log('✅ [Debug] SoundService.playIncorrect() - OK');
      }
      
    } catch (error) {
      console.log('❌ [Debug] SoundService test failed:', error);
    }
  }

  /**
   * Show diagnostic alert with key information
   */
  public showDiagnosticAlert(): void {
    const healthy = this.report.errors.length === 0;
    const title = healthy ? '✅ System Healthy' : '❌ Issues Detected';
    
    const message = [
      `React Native: ${this.report.rnVersion}`,
      `Platform: ${this.report.platform}`,
      `Services: ${this.report.services.filter(s => s.available).length}/${this.report.services.length}`,
      `Errors: ${this.report.errors.length}`,
      `Warnings: ${this.report.warnings.length}`,
    ].join('\n');
    
    Alert.alert(title, message);
  }
}

// Export utility functions
export const runCompatibilityCheck = () => new DebugToolkit().runCompleteCheck();
export const quickHealthCheck = () => new DebugToolkit().quickHealthCheck();
export const testSoundService = () => new DebugToolkit().testSoundService();
export const showDiagnostic = () => new DebugToolkit().showDiagnosticAlert();