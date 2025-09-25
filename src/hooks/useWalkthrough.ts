// src/hooks/useWalkthrough.ts
// Hook to manage walkthrough state and interactions

import { useState, useEffect, useCallback, useRef } from 'react';
import WalkthroughService from '../services/WalkthroughService';
import SoundService from '../services/SoundService';
import { WalkthroughStep } from '../components/common/WalkthroughOverlay';

interface UseWalkthroughProps {
  screen: string;
  enabled?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  scrollViewRef?: React.RefObject<any>;
}

export const useWalkthrough = ({ 
  screen, 
  enabled = true, 
  onComplete, 
  onSkip,
  scrollViewRef
}: UseWalkthroughProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize walkthrough
  useEffect(() => {
    const initializeWalkthrough = async () => {
      if (!enabled) {
        setIsLoading(false);
        return;
      }

      try {
        console.log(`🎯 [useWalkthrough] Initializing walkthrough for screen: ${screen}`);
        
        // Check if walkthrough should be shown
        const shouldShow = await WalkthroughService.shouldShowWalkthrough(screen);
        
        if (shouldShow) {
          const walkthroughSteps = WalkthroughService.getStepsForScreen(screen);
          
          if (walkthroughSteps.length > 0) {
            setSteps(walkthroughSteps);
            setIsVisible(true);
            setCurrentStepIndex(0);
            
            console.log(`✅ [useWalkthrough] Starting walkthrough with ${walkthroughSteps.length} steps`);
            
            // Play start sound
            SoundService.playButtonPress();
          } else {
            console.log(`⚠️ [useWalkthrough] No walkthrough steps found for screen: ${screen}`);
          }
        } else {
          console.log(`ℹ️ [useWalkthrough] Walkthrough not needed for screen: ${screen}`);
        }
      } catch (error) {
        console.error('❌ [useWalkthrough] Error initializing walkthrough:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeWalkthrough();
  }, [screen, enabled]);

  // Scroll to target element if needed
  const scrollToTarget = useCallback((step: WalkthroughStep) => {
    if (scrollViewRef?.current && step.targetPosition) {
      const { y, height } = step.targetPosition;
      // Calculate better scroll position - center the element on screen
      const screenHeight = 800; // Approximate screen height
      const targetY = Math.max(0, y - (screenHeight / 2) + (height / 2));
      
      scrollViewRef.current.scrollTo({
        y: targetY,
        animated: true,
      });
      
      console.log(`📜 [useWalkthrough] Scrolling to center target at y: ${targetY} (element at ${y})`);
    }
  }, [scrollViewRef]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      SoundService.playButtonPress();
      
      // Auto-scroll to target if it exists
      const nextStep = steps[nextIndex];
      if (nextStep) {
        setTimeout(() => scrollToTarget(nextStep), 300); // Delay for smooth transition
      }
      
      console.log(`➡️ [useWalkthrough] Advanced to step ${nextIndex + 1} of ${steps.length}`);
    } else {
      handleComplete();
    }
  }, [currentStepIndex, steps, scrollToTarget]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      SoundService.playButtonPress();
      
      // Auto-scroll to target if it exists
      const prevStep = steps[prevIndex];
      if (prevStep) {
        setTimeout(() => scrollToTarget(prevStep), 300); // Delay for smooth transition
      }
      
      console.log(`⬅️ [useWalkthrough] Moved back to step ${prevIndex + 1} of ${steps.length}`);
    }
  }, [currentStepIndex, steps, scrollToTarget]);

  // Handle skip walkthrough
  const handleSkip = useCallback(async () => {
    try {
      console.log(`⏭️ [useWalkthrough] Skipping walkthrough for screen: ${screen}`);
      
      setIsVisible(false);
      await WalkthroughService.markWalkthroughCompleted(screen);
      
      SoundService.playButtonPress();
      onSkip?.();
      
      console.log(`✅ [useWalkthrough] Walkthrough skipped and marked complete for screen: ${screen}`);
    } catch (error) {
      console.error('❌ [useWalkthrough] Error skipping walkthrough:', error);
    }
  }, [screen, onSkip]);

  // Handle complete walkthrough
  const handleComplete = useCallback(async () => {
    try {
      console.log(`🎉 [useWalkthrough] Completing walkthrough for screen: ${screen}`);
      
      setIsVisible(false);
      await WalkthroughService.markWalkthroughCompleted(screen);
      
      // Play completion sound
      SoundService.playStreak();
      onComplete?.();
      
      console.log(`✅ [useWalkthrough] Walkthrough completed and marked complete for screen: ${screen}`);
    } catch (error) {
      console.error('❌ [useWalkthrough] Error completing walkthrough:', error);
    }
  }, [screen, onComplete]);

  // Handle dismiss (same as skip)
  const handleDismiss = useCallback(() => {
    handleSkip();
  }, [handleSkip]);

  // Get current step
  const currentStep = steps[currentStepIndex] || null;

  // Calculate progress
  const progress = {
    currentStep: currentStepIndex + 1,
    totalSteps: steps.length,
    percentage: steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0,
  };

  // Manually show walkthrough (for testing or re-triggering)
  const showWalkthrough = useCallback(() => {
    if (steps.length > 0) {
      setIsVisible(true);
      setCurrentStepIndex(0);
      console.log(`🎯 [useWalkthrough] Manually showing walkthrough for screen: ${screen}`);
    }
  }, [steps.length, screen]);

  // Hide walkthrough
  const hideWalkthrough = useCallback(() => {
    setIsVisible(false);
    console.log(`🙈 [useWalkthrough] Hiding walkthrough for screen: ${screen}`);
  }, [screen]);

  return {
    // State
    isVisible,
    currentStep,
    currentStepIndex,
    steps,
    progress,
    isLoading,
    
    // Actions
    onNext: handleNext,
    onPrevious: handlePrevious,
    onSkip: handleSkip,
    onComplete: handleComplete,
    onDismiss: handleDismiss,
    
    // Manual controls
    show: showWalkthrough,
    hide: hideWalkthrough,
    
    // Utilities
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    canGoBack: currentStepIndex > 0,
    canGoNext: currentStepIndex < steps.length - 1,
  };
};