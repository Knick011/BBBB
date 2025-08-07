// src/hooks/useBackHandler.ts
// ✅ FIXES: "BackHandler.removeEventListener is not a function" - RN 0.79.5 API change
// console.log: "This hook provides BackHandler compatibility for React Native 0.79.5 using subscription pattern"

import { useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Custom hook for handling back button press in React Native 0.79.5+
 * 
 * IMPORTANT: RN 0.79.5 changed BackHandler API:
 * - OLD: BackHandler.addEventListener() / removeEventListener() 
 * - NEW: BackHandler.addEventListener() returns subscription object
 * 
 * @param handler - Function to handle back press. Return true to prevent default behavior.
 * @param enabled - Whether the handler should be active
 */
export const useBackHandler = (
  handler: () => boolean,
  enabled: boolean = true
) => {
  const backHandler = useCallback(() => {
    if (!enabled) {
      console.log('🔙 BackHandler disabled, allowing default behavior');
      return false;
    }
    
    console.log('🔙 BackHandler triggered, calling custom handler');
    return handler();
  }, [handler, enabled]);

  useEffect(() => {
    if (!enabled) {
      console.log('🔙 BackHandler hook disabled, not adding listener');
      return;
    }

    console.log('🔙 Adding BackHandler listener (RN 0.79.5 compatible)');
    
    // NEW API: addEventListener returns subscription object
    const subscription = BackHandler.addEventListener('hardwareBackPress', backHandler);
    
    // Cleanup function using subscription
    return () => {
      console.log('🔙 Removing BackHandler listener');
      if (subscription) {
        // Check if subscription has remove method (newer RN versions)
        if (typeof subscription.remove === 'function') {
          subscription.remove();
        }
        // Fallback for older compatibility
        else if (typeof subscription === 'function') {
          subscription();
        }
      }
    };
  }, [backHandler, enabled]);
};

/**
 * Utility function for one-time back handler setup
 * Use this if you don't need the hook pattern
 */
export const addBackHandler = (handler: () => boolean) => {
  console.log('🔙 Adding one-time BackHandler (RN 0.79.5 compatible)');
  
  const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
  
  // Return cleanup function
  return () => {
    console.log('🔙 Cleaning up one-time BackHandler');
    if (subscription) {
      if (typeof subscription.remove === 'function') {
        subscription.remove();
      } else if (typeof subscription === 'function') {
        subscription();
      }
    }
  };
};

/**
 * Legacy compatibility wrapper
 * DEPRECATED: Use useBackHandler hook instead
 */
export const BackHandlerCompat = {
  addEventListener: (eventName: string, handler: () => boolean) => {
    console.log('⚠️ Using BackHandlerCompat.addEventListener (consider using useBackHandler hook)');
    
    if (eventName !== 'hardwareBackPress') {
      console.warn('🔙 BackHandlerCompat only supports hardwareBackPress event');
      return null;
    }
    
    const subscription = BackHandler.addEventListener(eventName, handler);
    
    return {
      remove: () => {
        if (subscription) {
          if (typeof subscription.remove === 'function') {
            subscription.remove();
          } else if (typeof subscription === 'function') {
            subscription();
          }
        }
      }
    };
  }
};