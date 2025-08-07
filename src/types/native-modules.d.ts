// src/types/native-modules.d.ts
// Type definitions for native modules

declare module 'react-native' {
  interface NativeModulesStatic {
    ScreenTimeModule: {
      startScreenTimeTracking(): Promise<boolean>;
      stopScreenTimeTracking(): Promise<boolean>;
      getScreenTimeData(): Promise<{
        totalTime: number;
        isTracking: boolean;
        remainingTime: number;
        debtTime: number;
      }>;
      addScreenTime(minutes: number): Promise<boolean>;
      isScreenTimeServiceRunning(): Promise<boolean>;
    };
    
    DailyScoreCarryoverModule: {
      handleDailyCarryover(): Promise<{
        success: boolean;
        carriedOverPoints: number;
        newDailyScore: number;
        message: string;
      }>;
      checkCarryoverEligibility(): Promise<{
        eligible: boolean;
        currentScore: number;
        requiredScore: number;
        hoursUntilReset: number;
      }>;
    };
    
    NotificationPermissionHandler: {
      requestNotificationPermission(): Promise<{
        granted: boolean;
        shouldShowRationale: boolean;
        permanentlyDenied: boolean;
      }>;
      checkNotificationPermission(): Promise<{
        granted: boolean;
        shouldShowRationale: boolean;
        permanentlyDenied: boolean;
      }>;
      openNotificationSettings(): Promise<void>;
    };
  }
}

// Extend global types for timer updates
declare global {
  interface NativeEventEmitter {
    addListener(eventType: 'TimerUpdate', listener: (data: TimerUpdateData) => void): any;
    addListener(eventType: 'CarryoverUpdate', listener: (data: CarryoverUpdateData) => void): any;
  }
}

export interface TimerUpdateData {
  remainingTime: number;
  isTracking: boolean;
  debtTime: number;
  isAppForeground: boolean;
}

export interface CarryoverUpdateData {
  success: boolean;
  carriedOverPoints: number;
  newDailyScore: number;
  message: string;
}

export {};