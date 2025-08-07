// Type definitions for native modules

declare module 'react-native' {
  interface NativeModulesStatic {
    DailyScoreCarryover: {
      getTodayStartScore(): Promise<number>;
      getCarryoverInfo(): Promise<{
        remainingTimeMinutes: number;
        overtimeMinutes: number;
        potentialCarryoverScore: number;
        appliedCarryoverScore: number;
        isPositive: boolean;
      }>;
      checkAndProcessNewDay(): Promise<boolean>;
      processEndOfDay(): Promise<boolean>;
    };
    ToastModule?: {
      show(message: string, duration: number): void;
      SHORT: number;
      LONG: number;
    };
  }
} 