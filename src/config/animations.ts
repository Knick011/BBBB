// Animation configuration for consistent timing across the app
export const AnimationTimings = {
  // Mascot animations
  mascotEntrance: {
    fadeIn: 400,
    slideIn: 600,
    bounceIn: 800,
  },
  mascotExit: {
    fadeOut: 300,
    slideOut: 500,
  },
  
  // Interaction delays
  showInteractionPrompt: 2000, // 2 seconds before showing "tap to continue"
  autoHideMascot: 4000, // 4 seconds auto-hide for celebrations
  
  // Button animations
  buttonPress: 100,
  buttonRelease: 200,
  
  // Screen transitions
  screenFadeIn: 300,
  screenFadeOut: 200,
  
  // Particle effects
  particleAnimation: 1500,
  
  // Quiz animations
  questionTransition: 500,
  optionReveal: 400,
  explanationSlide: 300,
};

// Easing configurations
export const AnimationEasings = {
  easeInOut: 'ease-in-out',
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  bouncy: 'spring',
  linear: 'linear',
};

// Spring configurations
export const SpringConfigs = {
  gentle: {
    tension: 120,
    friction: 14,
  },
  bouncy: {
    tension: 180,
    friction: 12,
  },
  wobbly: {
    tension: 180,
    friction: 5,
  },
  stiff: {
    tension: 200,
    friction: 26,
  },
};

export default {
  AnimationTimings,
  AnimationEasings,
  SpringConfigs,
};