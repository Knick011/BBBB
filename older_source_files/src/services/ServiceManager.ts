// src/services/ServiceManager.ts
// ✅ FIXES: Service dependencies, proper initialization order, undefined property access errors
// console.log: "This ServiceManager ensures all services are properly initialized and handles dependencies"

interface ServiceStatus {
    name: string;
    initialized: boolean;
    available: boolean;
    error?: string;
    dependencies?: string[];
  }
  
  interface ServiceManagerState {
    services: Map<string, ServiceStatus>;
    initializationStarted: boolean;
    initializationComplete: boolean;
  }
  
  class ServiceManagerClass {
    private state: ServiceManagerState = {
      services: new Map(),
      initializationStarted: false,
      initializationComplete: false,
    };
  
    private maxRetries = 3;
    private retryDelay = 1000; // milliseconds
  
    constructor() {
      console.log('🏗️ ServiceManager created');
      this.initializeServiceRegistry();
    }
  
    private initializeServiceRegistry() {
      // Register all services with their dependencies
      const services: Array<{ name: string; dependencies?: string[] }> = [
        { name: 'SoundService', dependencies: [] }, // No dependencies  
        { name: 'QuestionService', dependencies: [] }, // No dependencies
        { name: 'ScoreService', dependencies: [] }, // No dependencies
      ];
  
      services.forEach(service => {
        this.state.services.set(service.name, {
          name: service.name,
          initialized: false,
          available: false,
          dependencies: service.dependencies,
        });
      });
  
      console.log('📋 Service registry initialized:', Array.from(this.state.services.keys()));
    }
  
    async initializeAllServices(): Promise<boolean> {
      if (this.state.initializationStarted) {
        console.log('⚠️ Service initialization already in progress');
        return this.state.initializationComplete;
      }
  
      this.state.initializationStarted = true;
      console.log('🚀 Starting service initialization sequence...');
  
      const initResults = await this.initializeServicesInOrder();
      
      this.state.initializationComplete = true;
      console.log('🎉 Service initialization sequence completed');
      this.printServiceStatus();
  
      return initResults.every(result => result.success);
    }
  
    private async initializeServicesInOrder(): Promise<Array<{ name: string; success: boolean }>> {
      const results: Array<{ name: string; success: boolean }> = [];
      const processed = new Set<string>();
  
      // Helper function to initialize service with dependencies
      const initializeService = async (serviceName: string): Promise<boolean> => {
        if (processed.has(serviceName)) {
          return this.state.services.get(serviceName)?.initialized ?? false;
        }
  
        const serviceInfo = this.state.services.get(serviceName);
        if (!serviceInfo) {
          console.log(`❌ Service ${serviceName} not found in registry`);
          return false;
        }
  
        // Initialize dependencies first
        if (serviceInfo.dependencies && serviceInfo.dependencies.length > 0) {
          console.log(`🔗 Initializing dependencies for ${serviceName}:`, serviceInfo.dependencies);
          
          for (const dep of serviceInfo.dependencies) {
            const depSuccess = await initializeService(dep);
            if (!depSuccess) {
              console.log(`⚠️ Dependency ${dep} failed for ${serviceName}, continuing anyway...`);
            }
          }
        }
  
        // Initialize the service itself
        console.log(`🚀 Initializing service: ${serviceName}`);
        const success = await this.initializeSingleService(serviceName);
        
        processed.add(serviceName);
        results.push({ name: serviceName, success });
        
        return success;
      };
  
      // Initialize all services
      for (const serviceName of this.state.services.keys()) {
        await initializeService(serviceName);
      }
  
      return results;
    }
  
    private async initializeSingleService(serviceName: string): Promise<boolean> {
      const serviceStatus = this.state.services.get(serviceName);
      if (!serviceStatus) return false;
  
      let attempts = 0;
      let lastError: string | undefined;
  
      while (attempts < this.maxRetries) {
        attempts++;
        
        try {
          console.log(`🔄 Attempting to initialize ${serviceName} (attempt ${attempts}/${this.maxRetries})`);
          
          let success = false;
          let available = false;
  
          switch (serviceName) {
            case 'SoundService':
              success = await this.initializeSoundService();
              available = this.checkSoundServiceAvailability();
              break;
              
            case 'QuestionService':
              success = await this.initializeQuestionService();
              available = success;
              break;
              
            case 'ScoreService':
              success = await this.initializeScoreService();
              available = success;
              break;
              
            default:
              console.log(`⚠️ Unknown service: ${serviceName}`);
              success = false;
              available = false;
          }
  
          // Update service status
          this.state.services.set(serviceName, {
            ...serviceStatus,
            initialized: success,
            available: available,
            error: success ? undefined : lastError,
          });
  
          if (success) {
            console.log(`✅ ${serviceName} initialized successfully`);
            return true;
          } else {
            console.log(`⚠️ ${serviceName} initialization returned false`);
          }
  
        } catch (error: any) {
          lastError = error?.message || String(error);
          console.log(`❌ ${serviceName} initialization failed (attempt ${attempts}):`, lastError);
          
          // Update service status with error
          this.state.services.set(serviceName, {
            ...serviceStatus,
            initialized: false,
            available: false,
            error: lastError,
          });
        }
  
        // Wait before retry (except on last attempt)
        if (attempts < this.maxRetries) {
          console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
  
      console.log(`❌ ${serviceName} failed to initialize after ${this.maxRetries} attempts`);
      return false;
    }
  
    // ===== SERVICE INITIALIZERS =====
  
    private async initializeSoundService(): Promise<boolean> {
      try {
        const SoundService = require('./EnhancedSoundService').default;
        if (SoundService && typeof SoundService.initialize === 'function') {
          await SoundService.initialize();
          return true;
        }
        return false;
      } catch (error) {
        console.log('❌ SoundService not available:', error);
        return false;
      }
    }
  
    private checkSoundServiceAvailability(): boolean {
      try {
        const SoundService = require('./EnhancedSoundService').default;
        return !!(SoundService && 
                 typeof SoundService.playButtonPress === 'function' &&
                 typeof SoundService.playCorrect === 'function' &&
                 typeof SoundService.playIncorrect === 'function');
      } catch (error) {
        return false;
      }
    }
  
    private async initializeQuestionService(): Promise<boolean> {
      try {
        const QuestionService = require('./QuestionService').default;
        if (QuestionService && typeof QuestionService.initialize === 'function') {
          await QuestionService.initialize();
          return true;
        }
        return false;
      } catch (error) {
        console.log('❌ QuestionService not available:', error);
        return false;
      }
    }
  
    private async initializeScoreService(): Promise<boolean> {
      try {
        const ScoreService = require('./EnhancedScoreService').default;
        if (ScoreService && typeof ScoreService.initialize === 'function') {
          await ScoreService.initialize();
          return true;
        }
        return false;
      } catch (error) {
        console.log('❌ ScoreService not available:', error);
        return false;
      }
    }
  
    // ===== PUBLIC METHODS =====
  
    isServiceAvailable(serviceName: string): boolean {
      const service = this.state.services.get(serviceName);
      return service?.available ?? false;
    }
  
    isServiceInitialized(serviceName: string): boolean {
      const service = this.state.services.get(serviceName);
      return service?.initialized ?? false;
    }
  
    getServiceStatus(serviceName: string): ServiceStatus | null {
      return this.state.services.get(serviceName) ?? null;
    }
  
    getAllServiceStatus(): ServiceStatus[] {
      return Array.from(this.state.services.values());
    }
  
    isAllServicesReady(): boolean {
      return this.state.initializationComplete;
    }
  
    getCriticalServicesStatus(): { available: number; total: number } {
      // Define critical services (app won't work without these)
      const criticalServices = ['QuestionService'];
      
      let available = 0;
      let total = criticalServices.length;
      
      criticalServices.forEach(serviceName => {
        if (this.isServiceAvailable(serviceName)) {
          available++;
        }
      });
  
      return { available, total };
    }
  
    private printServiceStatus() {
      console.log('\n📊 SERVICE STATUS REPORT:');
      console.log('========================');
      
      this.state.services.forEach((status, name) => {
        const icon = status.initialized ? '✅' : '❌';
        const availableText = status.available ? '(Available)' : '(Unavailable)';
        const errorText = status.error ? ` - Error: ${status.error}` : '';
        
        console.log(`${icon} ${name} ${availableText}${errorText}`);
      });
      
      const critical = this.getCriticalServicesStatus();
      console.log(`\n🎯 Critical Services: ${critical.available}/${critical.total} available`);
      console.log('========================\n');
    }
  
    // Safe service accessor methods
    getSafeSoundService() {
      if (!this.isServiceAvailable('SoundService')) return null;
      
      try {
        return require('./SoundService').default;
      } catch (error) {
        console.log('⚠️ Error accessing SoundService:', error);
        return null;
      }
    }
  
    // Utility method for safe method calls
    safeCall(serviceName: string, methodName: string, ...args: any[]): any {
      try {
        const service = this.getSafeService(serviceName);
        if (service && typeof service[methodName] === 'function') {
          return service[methodName](...args);
        } else {
          console.log(`⚠️ Method ${methodName} not available on ${serviceName}`);
          return null;
        }
      } catch (error) {
        console.log(`❌ Error calling ${serviceName}.${methodName}:`, error);
        return null;
      }
    }
  
    private getSafeService(serviceName: string): any {
      switch (serviceName) {
        case 'SoundService':
          return this.getSafeSoundService();
        default:
          return null;
      }
    }
  }
  
  // Export singleton instance
  export default new ServiceManagerClass();