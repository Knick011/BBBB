// src/utils/BackHandlerUtils.ts
// ✅ FIXES: Global BackHandler compatibility utils for RN 0.79.5
// ✅ FIXES: Update ALL screens using BackHandler across the app
// console.log: "Global BackHandler utilities for consistent RN 0.79.5 compatibility"

import { BackHandler } from 'react-native';
import { useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Type definition for BackHandler subscription (RN 0.79.5)
type BackHandlerSubscription = {
  remove: () => void;
} | (() => void) | null;

// ===== UTILITY FUNCTIONS =====

/**
 * Safe BackHandler event listener for RN 0.79.5
 * Handles both new subscription pattern and legacy compatibility
 */
export const addBackHandler = (handler: () => boolean): (() => void) => {
  console.log('🔙 [RN 0.79.5] Adding BackHandler listener (safe)');
  
  let subscription: BackHandlerSubscription = null;
  
  try {
    subscription = BackHandler.addEventListener('hardwareBackPress', handler);
  } catch (error) {
    console.log('❌ [RN 0.79.5] Error adding BackHandler:', error);
    return () => {}; // Return empty cleanup function
  }
  
  // Return cleanup function
  return () => {
    console.log('🔙 [RN 0.79.5] Removing BackHandler listener (safe)');
    
    if (subscription) {
      try {
        // Try new subscription pattern first
        if (typeof subscription === 'object' && subscription.remove) {
          subscription.remove();
        }
        // Try legacy function pattern
        else if (typeof subscription === 'function') {
          subscription();
        }
        console.log('✅ [RN 0.79.5] BackHandler removed successfully');
      } catch (error) {
        console.log('⚠️ [RN 0.79.5] Error removing BackHandler:', error);
      }
    }
  };
};

// ===== REACT HOOKS =====

/**
 * React hook for BackHandler with RN 0.79.5 compatibility
 * Use this instead of manual BackHandler.addEventListener
 */
export const useBackHandler = (
  handler: () => boolean,
  enabled: boolean = true
): void => {
  const backHandler = useCallback(() => {
    if (!enabled) {
      console.log('🔙 [RN 0.79.5] BackHandler disabled, allowing default behavior');
      return false;
    }
    
    console.log('🔙 [RN 0.79.5] BackHandler triggered, calling custom handler');
    return handler();
  }, [handler, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('🔙 [RN 0.79.5] Setting up BackHandler hook');
    const cleanup = addBackHandler(backHandler);
    
    return cleanup;
  }, [backHandler, enabled]);
};

/**
 * React hook for BackHandler with navigation focus integration
 * Use this for screens that need back handling only when focused
 */
export const useFocusedBackHandler = (
  handler: () => boolean,
  enabled: boolean = true
): void => {
  const backHandler = useCallback(() => {
    if (!enabled) {
      console.log('🔙 [RN 0.79.5] FocusedBackHandler disabled, allowing default behavior');
      return false;
    }
    
    console.log('🔙 [RN 0.79.5] FocusedBackHandler triggered, calling custom handler');
    return handler();
  }, [handler, enabled]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      console.log('🔙 [RN 0.79.5] Setting up focused BackHandler');
      const cleanup = addBackHandler(backHandler);
      
      return cleanup;
    }, [backHandler, enabled])
  );
};

// ===== SCREEN EXAMPLES =====

/**
 * Example: Fixed QuizScreen BackHandler (use this pattern)
 * Replace existing BackHandler usage with this approach
 */
export const QuizScreenBackHandlerExample = `
// In your QuizScreen.tsx - REPLACE existing BackHandler code with:

import { useFocusedBackHandler } from '../utils/BackHandlerUtils';

const QuizScreen: React.FC = () => {
  // ... other code ...

  // ✅ CORRECT: Use the hook instead of manual BackHandler
  const handleBackPress = useCallback(() => {
    console.log('🔙 Back button pressed in QuizScreen');
    handleQuitQuiz();
    return true; // Prevent default back behavior
  }, []);

  // ✅ CORRECT: RN 0.79.5 compatible BackHandler
  useFocusedBackHandler(handleBackPress, true);

  // Remove OLD BackHandler code like:
  // ❌ OLD: BackHandler.addEventListener('hardwareBackPress', onBackPress);
  // ❌ OLD: BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  
  // ... rest of component ...
};
`;

/**
 * Example: Fixed SettingsScreen BackHandler
 */
export const SettingsScreenBackHandlerExample = `
// In your SettingsScreen.tsx - ADD this BackHandler:

import { useBackHandler } from '../utils/BackHandlerUtils';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // ✅ CORRECT: Handle back button press
  const handleBackPress = useCallback(() => {
    console.log('🔙 Back button pressed in SettingsScreen');
    navigation.goBack();
    return true; // Prevent default behavior
  }, [navigation]);

  // ✅ CORRECT: RN 0.79.5 compatible BackHandler
  useBackHandler(handleBackPress, true);

  // ... rest of component ...
};
`;

// ===== MIGRATION HELPERS =====

/**
 * Find and replace patterns for updating existing BackHandler usage
 */
export const MigrationPatterns = {
  // Pattern 1: useFocusEffect with BackHandler
  oldPattern1: `
    useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          // handler logic
          return true;
        };

        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      }, [])
    );
  `,
  
  newPattern1: `
    const handleBackPress = useCallback(() => {
      // handler logic  
      return true;
    }, []);

    useFocusedBackHandler(handleBackPress, true);
  `,

  // Pattern 2: useEffect with BackHandler
  oldPattern2: `
    useEffect(() => {
      const onBackPress = () => {
        // handler logic
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, []);
  `,
  
  newPattern2: `
    const handleBackPress = useCallback(() => {
      // handler logic
      return true;
    }, []);

    useBackHandler(handleBackPress, true);
  `,
};

// ===== DEBUGGING HELPERS =====

/**
 * Test BackHandler functionality (for debugging)
 */
export const testBackHandler = (): void => {
  console.log('🧪 [RN 0.79.5] Testing BackHandler functionality...');
  
  try {
    const testHandler = () => {
      console.log('🧪 [RN 0.79.5] Test BackHandler triggered');
      return true;
    };
    
    const cleanup = addBackHandler(testHandler);
    
    // Test cleanup after 1 second
    setTimeout(() => {
      cleanup();
      console.log('✅ [RN 0.79.5] BackHandler test completed successfully');
    }, 1000);
    
  } catch (error) {
    console.log('❌ [RN 0.79.5] BackHandler test failed:', error);
  }
};

/**
 * Check BackHandler API availability
 */
export const checkBackHandlerAPI = (): {
  available: boolean;
  addEventListener: boolean;
  removeEventListener: boolean;
  exitApp: boolean;
} => {
  const result = {
    available: !!BackHandler,
    addEventListener: !!(BackHandler && BackHandler.addEventListener),
    removeEventListener: !!(BackHandler && BackHandler.removeEventListener), // This will be false in RN 0.79.5
    exitApp: !!(BackHandler && BackHandler.exitApp),
  };
  
  console.log('🔍 [RN 0.79.5] BackHandler API availability:', result);
  return result;
};

// ===== ANDROID-SPECIFIC HELPERS =====

/**
 * Safe app exit for Android
 */
export const safeExitApp = (): void => {
  console.log('🚪 [RN 0.79.5] Attempting safe app exit...');
  
  try {
    if (BackHandler && BackHandler.exitApp) {
      BackHandler.exitApp();
      console.log('✅ [RN 0.79.5] App exit requested');
    } else {
      console.log('⚠️ [RN 0.79.5] BackHandler.exitApp not available');
    }
  } catch (error) {
    console.log('❌ [RN 0.79.5] Error during app exit:', error);
  }
};