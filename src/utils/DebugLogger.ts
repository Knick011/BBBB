// Debug logging utility for Firebase Analytics debugging
import analytics from '@react-native-firebase/analytics';

export class DebugLogger {
  static enabled = __DEV__; // Only log in development

  static log(category: string, message: string, data?: any) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `🔍 [${category}] ${timestamp}`;
    
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  static async logFirebaseStatus() {
    if (!this.enabled) return;
    
    try {
      console.log('📊 ========== FIREBASE ANALYTICS DEBUG ==========');
      
      // Check if analytics is enabled (modern API)
      try {
        const isEnabled = await analytics().isAnalyticsCollectionEnabled();
        console.log('🔥 Firebase Analytics Enabled:', isEnabled);
      } catch (e) {
        console.log('🔥 Firebase Analytics Status: Unknown (method unavailable)');
      }
      
      // Get app instance ID (modern API)
      try {
        const appInstanceId = await analytics().getAppInstanceId();
        console.log('🆔 App Instance ID:', appInstanceId);
      } catch (e) {
        console.log('🆔 App Instance ID: Unknown (method unavailable)');
      }
      
      // Log debug events
      await analytics().logEvent('debug_check', {
        timestamp: Date.now(),
        platform: require('react-native').Platform.OS,
        build_type: __DEV__ ? 'debug' : 'release',
      });
      
      console.log('✅ Firebase Analytics debug event sent');
      console.log('📊 ===============================================');
      
    } catch (error) {
      console.error('❌ Firebase Analytics Debug Error:', error);
    }
  }

  static async logUserActivity() {
    if (!this.enabled) return;
    
    try {
      // Log user activity event to show active user  
      await analytics().logEvent('user_activity_logged', {
        engagement_time_msec: 10000, // 10 seconds minimum engagement
        session_active: true,
        debug_mode: __DEV__,
      });
      
      // Log screen view
      await analytics().logScreenView({
        screen_name: 'Debug_Screen',
        screen_class: 'DebugActivity',
      });
      
      this.log('USER_ACTIVITY', '✅ User activity logged to Firebase');
      
    } catch (error) {
      console.error('❌ Error logging user activity:', error);
    }
  }

  static async enableDebugMode() {
    try {
      // Enable analytics collection
      await analytics().setAnalyticsCollectionEnabled(true);
      
      // Log app_open event
      await analytics().logEvent('app_open', {
        timestamp: Date.now(),
        debug_session: true,
      });
      
      // Log debug session start
      await analytics().logEvent('debug_session_start', {
        engagement_time_msec: 1000,
        debug: true,
      });
      
      this.log('DEBUG_MODE', '✅ Firebase Analytics debug mode enabled');
      
    } catch (error) {
      console.error('❌ Error enabling debug mode:', error);
    }
  }

  static async logCustomEvent(eventName: string, parameters: any = {}) {
    if (!this.enabled) return;
    
    try {
      const debugParams = {
        ...parameters,
        debug_timestamp: Date.now(),
        debug_session_id: Math.random().toString(36).substring(7),
      };
      
      await analytics().logEvent(eventName, debugParams);
      this.log('CUSTOM_EVENT', `✅ Event '${eventName}' logged`, debugParams);
      
    } catch (error) {
      console.error(`❌ Error logging event '${eventName}':`, error);
    }
  }
}

export default DebugLogger;