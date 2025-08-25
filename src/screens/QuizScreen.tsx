// src/screens/QuizScreen.tsx - Modern implementation based on reference with Firebase removed
// ✅ FIXES: Complete redesign using reference implementation
// ✅ FIXES: Modern audio integration with react-native-track-player
// console.log: "Modern QuizScreen with Firebase removed and updated service integrations"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  Platform,
  BackHandler,
  Alert,
  NativeEventEmitter,
  NativeModules
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QuestionService from '../services/QuestionService';
import SoundService from '../services/SoundService';
import AudioManager from '../services/AudioManager';
import EnhancedScoreService from '../services/EnhancedScoreService';
import TimerIntegrationService from '../services/TimerIntegrationService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import MascotModal from '../components/Mascot/MascotModal';
import BannerAdComponent from '../components/common/BannerAdComponent';
import { useQuizStore } from '../store/useQuizStore';
import { useUserStore } from '../store/useUserStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DailyGoalsService from '../services/DailyGoalsService';

const QuizScreen = ({ navigation, route }: any) => {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [category, setCategory] = useState(route.params?.category);
  const [difficulty, setDifficulty] = useState(route.params?.difficulty);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [score, setScore] = useState(0);
  const [streakLevel, setStreakLevel] = useState(0);
  const [isStreakMilestone, setIsStreakMilestone] = useState(false);
  const [speedCategory, setSpeedCategory] = useState('');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [showConfirmQuit, setShowConfirmQuit] = useState(false);
  const [showSpeedFeedback, setShowSpeedFeedback] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  // Goal celebration state (new flow)
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [celebrationGoal, setCelebrationGoal] = useState<{title: string; reward: number} | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState(false);
  
  // Daily goal completion modal state
  const [showDailyGoalModal, setShowDailyGoalModal] = useState(false);
  const [completedGoal, setCompletedGoal] = useState<{title: string; reward: number} | null>(null);
  
  // New timing control state variables
  const [showingQuestion, setShowingQuestion] = useState(false);
  const [showingOptions, setShowingOptions] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [readyForInput, setReadyForInput] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const continueButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Mascot state - simplified for quiz functionality
  const [mascotType, setMascotType] = useState<'happy' | 'sad' | 'excited' | 'depressed' | 'gamemode' | 'below'>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  const [showCelebrationScreen, setShowCelebrationScreen] = useState(false);
  
  // Response time tracking
  const [responseTime, setResponseTime] = useState<number>(0);
  
  // Animation values
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const optionsAnim = useRef<Animated.Value[]>([]).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(1)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const speedAnim = useRef(new Animated.Value(0)).current;
  
  // Timer animation
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAnimation = useRef<Animated.CompositeAnimation | null>(null);
  
  // Store start time for scoring
  const questionStartTime = useRef(0);
  
  // In the useEffect for initialization
  useEffect(() => {
    const initializeQuiz = async () => {
      console.log('🎮 Initializing quiz session');
      
      // CRITICAL: Initialize quiz session (sets streak to 0)
      await useQuizStore.getState().initializeQuizSession();
      setStreak(0); // Ensure local state matches
      // Ensure scoring service streak is fully reset for a fresh session
      try {
        EnhancedScoreService.endQuizSession();
      } catch {}
      
      // Initialize services
      await DailyGoalsService.initialize();
      
      // Initialize audio
      await initializeAudio();
      
      // Load first question
      loadQuestion();
    };
    
    initializeQuiz();
    
    return () => {
      console.log('🎮 Cleaning up quiz session');
      if (continueButtonTimerRef.current) {
        clearTimeout(continueButtonTimerRef.current);
        continueButtonTimerRef.current = null;
      }
      SoundService.stopMusic();
      // Also stop AudioManager music
      AudioManager.stopMusic();
    };
  }, []);

  // Listen for goal completion events to prepare celebration
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.DeviceEventEmitter || {});
    const goalListener = eventEmitter.addListener('dailyGoalCompleted', (data) => {
      try {
        console.log('🎯 [QuizScreen] Daily goal completed event received:', data);
        setCelebrationGoal({ title: data.goalTitle, reward: data.reward });
      } catch (e) {}
    });
    const honorListener = eventEmitter.addListener('honorGoalCompleted', (data) => {
      try {
        console.log('🎯 [QuizScreen] Honor goal completed event received:', data);
        setCelebrationGoal({ title: data.goalTitle, reward: data.reward });
      } catch (e) {}
    });
    // Back-compat: some services emit 'showGoalCompletedMascot'
    const legacyListener = eventEmitter.addListener('showGoalCompletedMascot', (data) => {
      try {
        console.log('🎯 [QuizScreen] Legacy goal completed event received:', data);
        setCelebrationGoal({ title: data.goalTitle, reward: data.reward });
      } catch (e) {}
    });
    return () => {
      try { goalListener.remove(); } catch {}
      try { honorListener.remove(); } catch {}
      try { legacyListener.remove(); } catch {}
    };
  }, []);

  // Proceed to next question helper
  const proceedToNextQuestion = () => {
    setTimeout(() => {
      Animated.timing(explanationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        setTimeout(() => {
          setShowExplanation(false);
          loadQuestion();
        }, 0);
      });
    }, 100);
  };

  const initializeAudio = async () => {
    try {
      console.log('🔊 [Modern QuizScreen] Initializing audio...');
      const audioReady = await SoundService.initialize();
      
      // Initialize AudioManager for enhanced music system
      await AudioManager.initialize();
      
      if (audioReady) {
        await SoundService.startGameMusic();
        // Also start game music in AudioManager for speed control
        await AudioManager.playGameMusic();
        console.log('🔊 [Modern QuizScreen] Audio initialized and game music started');
        console.log('🎵 [Modern QuizScreen] Enhanced music system ready for streak-based speed changes');
      } else {
        console.log('⚠️ [Modern QuizScreen] Audio not available, continuing without sound');
      }
    } catch (error) {
      console.log('❌ [Modern QuizScreen] Audio initialization failed:', error);
    }
  };

  // Start a new question with comprehensive timing gaps
  const loadQuestion = async () => {
    try {
      setIsLoading(true);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowExplanation(false);
      setSpeedCategory('');
      setPointsEarned(0);
      setSpeedMultiplier(1.0);
      setShowingQuestion(false);
      setShowingOptions(false);
      setTimerStarted(false);
      setReadyForInput(false);
      // Hide score popups when starting new question
      setShowPointsAnimation(false);
      setShowSpeedFeedback(false);
      
      // Reset all animations
      fadeAnim.setValue(0);
      cardAnim.setValue(0);
      explanationAnim.setValue(0);
      optionsAnim.forEach(anim => anim?.setValue(0));
      timerAnim.setValue(1);
      
      // Stop any running timers
      if (timerAnimation.current) {
        timerAnimation.current.stop();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (continueButtonTimerRef.current) {
        clearTimeout(continueButtonTimerRef.current);
        continueButtonTimerRef.current = null;
      }
      setShowContinueButton(false);
      
      // Get the question
      let question;
      if (category) {
        question = await QuestionService.getRandomQuestion(category);
      } else if (difficulty) {
        question = await QuestionService.getQuestionsByDifficulty(difficulty);
      } else {
        question = await QuestionService.getRandomQuestion();
      }
      
      if (!question) {
        throw new Error('No question received');
      }
      
      setCurrentQuestion(question);
      setIsLoading(false);
      
      // STEP 1: Fade in the question card (1 second)
      await new Promise((resolve) => {
        setShowingQuestion(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(cardAnim, {
            toValue: 1,
            delay: 200,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => resolve(undefined));
      });
      
      // STEP 2: Let user read the question (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // STEP 3: Show "Get Ready!" message (optional)
      // You could show a countdown here: 3... 2... 1...
      
      // STEP 4: Animate options in with stagger (1.5 seconds total)
      const optionKeys = Object.keys(question.options || {});
      optionsAnim.length = optionKeys.length;
      for (let i = 0; i < optionsAnim.length; i++) {
        optionsAnim[i] = new Animated.Value(0);
      }
      
      setShowingOptions(true);
      
      await new Promise((resolve) => {
        const animations = optionsAnim.map((anim, index) => 
          Animated.sequence([
            Animated.delay(index * 200), // Stagger by 200ms
            Animated.spring(anim, {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: true,
            }),
          ])
        );
        
        Animated.parallel(animations).start(() => {
          // Start timer immediately when options animation completes
          setTimerStarted(true);
          setReadyForInput(true);
          questionStartTime.current = Date.now();
          
          // Animate timer countdown
          timerAnimation.current = Animated.timing(timerAnim, {
            toValue: 0,
            duration: 20000,
            useNativeDriver: false,
            easing: Easing.linear,
          });
          
          timerAnimation.current.start();
          
          // Set timeout for time up
          timerRef.current = setTimeout(() => {
            if (selectedAnswer === null) {
              handleTimeUp();
            }
          }, 20000);
          
          resolve(undefined);
        });
      });
      
    } catch (error) {
      console.error('Error loading question:', error);
      setIsLoading(false);
    }
  };
  
  const handleTimeUp = () => {
    // Check if already answered
    if (selectedAnswer !== null) return;
    
    console.log('⏰ [Modern QuizScreen] Time up!');
    setSelectedAnswer('TIMEOUT');
    setIsCorrect(false);
    // Count this question as answered in-session
    setQuestionsAnswered((prev) => prev + 1);
    
    // Show explanation with a short delay
    setTimeout(() => {
      setShowExplanation(true);
      showExplanationWithAnimation();
    }, 500);
    
    // Reset streak and play incorrect sound
    setStreak(0);
    SoundService.playIncorrect();
    
    // Show mascot for timeout
    showMascotForTimeout();

    // Show continue button after a short delay to avoid simultaneous appearance
    if (continueButtonTimerRef.current) {
      clearTimeout(continueButtonTimerRef.current);
    }
    continueButtonTimerRef.current = setTimeout(() => {
      setShowContinueButton(true);
    }, 1000);
  };
  
  const showMascotForTimeout = () => {
    setMascotType('sad');
    setMascotMessage("Time's up! ⏰\nDon't worry, you'll get the next one!");
    setShowMascot(true);
  };

  // Update handleAnswerSelect with better timing
  const handleAnswerSelect = async (option: string) => {
    // Don't accept input until ready
    if (!readyForInput || selectedAnswer !== null || isLoading) return;
    
    setReadyForInput(false); // Disable further input
    
    // Stop timer immediately and capture response time
    const responseTime = Date.now() - questionStartTime.current;
    setResponseTime(responseTime);
    
    if (timerAnimation.current) {
      timerAnimation.current.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Play selection sound
    SoundService.playButtonPress();
    
    setSelectedAnswer(option);
    const correct = option === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    // Count this question in-session
    setQuestionsAnswered((prev) => prev + 1);
    
    // STEP 1: Show selection feedback (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // STEP 2: Calculate speed multiplier
    const speedMultiplier = calculateSpeedMultiplier(responseTime);
    setSpeedMultiplier(speedMultiplier);
    
    // STEP 3: Process the scoring first
    await processScoring(correct, responseTime);
    
    // STEP 4: Show animations only for correct answers, after scoring is complete
    if (correct) {
      // Reset animation values
      pointsAnim.setValue(0);
      speedAnim.setValue(0);
      
      // Show multiplier popup first, then score popup
      await new Promise((resolve) => {
        setShowSpeedFeedback(true);
        Animated.timing(speedAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start(() => resolve(undefined));
      });
      
      // Then show score popup after a short delay
      await new Promise(resolve => setTimeout(resolve, 200));
      await new Promise((resolve) => {
        setShowPointsAnimation(true);
        Animated.timing(pointsAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start(() => resolve(undefined));
      });
      
      // Auto-hide both popups with smooth exit after 2 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(pointsAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.bezier(0.55, 0.085, 0.68, 0.53),
            useNativeDriver: true,
          }),
          Animated.timing(speedAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.bezier(0.55, 0.085, 0.68, 0.53),
            useNativeDriver: true,
          })
        ]).start(() => {
          setShowPointsAnimation(false);
          setShowSpeedFeedback(false);
        });
      }, 2000);
    }
    
    // STEP 4.5: Reveal Continue button 1s after scoring update
    if (continueButtonTimerRef.current) {
      clearTimeout(continueButtonTimerRef.current);
    }
    continueButtonTimerRef.current = setTimeout(() => {
      setShowContinueButton(true);
    }, 1000);

    // STEP 5: Show explanation after a delay (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setShowExplanation(true);
    Animated.timing(explanationAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };
  
  // Add calculateSpeedMultiplier function
  const calculateSpeedMultiplier = (responseTime: number): number => {
    if (responseTime < 3000) return 2.0; // Lightning fast
    if (responseTime < 5000) return 1.5; // Fast
    if (responseTime < 10000) return 1.2; // Good
    return 1.0; // Normal
  };
  
  // Add processScoring function
  const processScoring = async (correct: boolean, responseTimeMs?: number) => {
    try {
      const difficulty = route.params?.difficulty || 'medium';
      const responseTime = responseTimeMs || (Date.now() - questionStartTime.current);
      const metadata = {
        startTime: questionStartTime.current,
        category: category,
        difficulty: difficulty
      };
      
      const scoreResult = await EnhancedScoreService.processAnswer(correct, difficulty, metadata);
      
      // Update UI with score results
      setPointsEarned(scoreResult.pointsEarned);
      setScore(scoreResult.newScore);
      setStreak(scoreResult.newStreak);
      setStreakLevel(scoreResult.streakLevel);
      setIsStreakMilestone(scoreResult.isMilestone);
      setSpeedCategory(scoreResult.speedCategory);
      setSpeedMultiplier(scoreResult.speedMultiplier);
      
      if (correct) {
        // Use store method to increment
        await useQuizStore.getState().incrementStreak();
        const newStreak = useQuizStore.getState().currentStreak;
        setStreak(newStreak); // Update local state
        
        // Update music speed based on new streak
        await AudioManager.updateMusicSpeedForStreak(newStreak);
        console.log(`🎵 [QuizScreen] Music speed updated for streak: ${newStreak}`);
        
        setCorrectAnswers(prev => prev + 1);
        // Score animations are now handled in the answer selection logic above

        // Add time for correct answers
        let timeToAdd = 1; // Base 1 minute for easy
        if (difficulty === 'medium') timeToAdd = 2;
        if (difficulty === 'hard') timeToAdd = 3;
        
        console.log(`🧠 [QuizScreen] Adding ${timeToAdd} minutes for correct ${difficulty} answer`);
        
        await TimerIntegrationService.initialize();
        const timerResult = await TimerIntegrationService.addTimeFromQuiz(timeToAdd);
        
        if (timerResult) {
          console.log(`✅ [QuizScreen] Successfully added ${timeToAdd} minutes to timer`);
        }
        
        // Check for streak milestone
        if (scoreResult.isMilestone) {
          setMascotType('gamemode');
          setMascotMessage(`🔥 ${scoreResult.newStreak} question streak! 🔥\nAmazing work! Keep it up!`);
          setShowMascot(true);
          SoundService.playStreak();
        } else {
          // Regular correct answer
          SoundService.playCorrect();
        }
      } else {
        // Reset on wrong answer
        useQuizStore.getState().resetCurrentStreak();
        setStreak(0);
        
        // Reset music speed to normal when streak breaks
        await AudioManager.updateMusicSpeedForStreak(0);
        console.log(`🎵 [QuizScreen] Music speed reset to normal (streak broken)`);
        
        // Wrong answer
        SoundService.playIncorrect();
        
        // Show mascot for wrong answer
        setTimeout(() => {
          showMascotForWrongAnswer();
        }, 500);
      }
      
      // Daily goals progress is handled inside EnhancedScoreService; no duplicate call here
      
      // Check for completed goals and show celebration
      const completedGoals = DailyGoalsService.getCompletedGoals();
      if (completedGoals.length > 0) {
        const unclaimedGoal = completedGoals.find(g => !g.claimed);
        if (unclaimedGoal) {
          // Show mascot celebration for completed goal
          setMascotType('excited');
          setMascotMessage(`🎉 Goal Complete!\n"${unclaimedGoal.title}"\nClaim your reward!`);
          setShowMascot(true);
        }
      }
      
    } catch (error) {
      console.error('Error processing score:', error);
    }
  };
  
  const showExplanationWithAnimation = () => {
    Animated.timing(explanationAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const showMascotForWrongAnswer = () => {
    setMascotType('sad');
    setMascotMessage(`Oops! That's not quite right. 😔\n\nThe correct answer was:\n${currentQuestion.correctAnswer}: ${currentQuestion.options[currentQuestion.correctAnswer]}\n\nTap for explanation!`);
    setShowMascot(true);
  };
  
  // Handle peeking mascot press for explanations
  const handlePeekingMascotPress = () => {
    if (!currentQuestion) return;
    
    if (selectedAnswer && showExplanation) {
      // Show detailed explanation after answering
      if (isCorrect) {
        setMascotType('happy');
        setMascotMessage(`Great job! Here's why this is correct:\n\n${currentQuestion.explanation}\n\nKeep up the excellent work! 🌟`);
      } else {
        setMascotType('happy');
        setMascotMessage(`Let me explain why the answer was ${currentQuestion.correctAnswer}:\n\n${currentQuestion.explanation}\n\nDon't worry, you'll get the next one! 💪`);
      }
      setShowMascot(true);
    } else if (!selectedAnswer) {
      // No answer selected yet - show hint
      setMascotType('happy');
      setMascotMessage('Take your time and think carefully! 🤔\n\nRead each option and pick the one that seems most correct.\n\nYou\'ve got this! 💪');
      setShowMascot(true);
    }
  };
  
  const handleMascotDismiss = () => {
    setShowMascot(false);
  };
  
  // Helper function to get speed feedback
  const getSpeedFeedback = (responseTimeMs: number): string => {
    const seconds = responseTimeMs / 1000;
    if (seconds < 3) return "⚡ Lightning Fast!";
    if (seconds < 4) return "🔥 Super Quick!";
    if (seconds < 5) return "✨ Very Fast!";
    if (seconds < 7) return "👍 Good Speed!";
    return "✓ Nice Work!";
  };
  
  // Update handleDailyGoalClaim with enhanced timer integration
  const handleDailyGoalClaim = async () => {
    if (!completedGoal) return;
    
    try {
      // Find and claim the goal
      const goals = DailyGoalsService.getGoals();
      const goalToClaim = goals.find(g => g.title === completedGoal.title && g.completed && !g.claimed);
      
      if (goalToClaim) {
        console.log(`🎯 [QuizScreen] Attempting to claim goal: ${goalToClaim.title}`);
        console.log(`🎯 [QuizScreen] Goal reward: ${goalToClaim.reward} seconds (${Math.floor(goalToClaim.reward / 60)} minutes)`);
        
        // Claim the reward (this adds time to timer internally)
        const success = await DailyGoalsService.claimReward(goalToClaim.id);
        
        if (success) {
          console.log(`✅ [QuizScreen] Successfully claimed daily goal: ${goalToClaim.title}`);
          
          // Double-check that time was added by getting timer state
          const timerState = await TimerIntegrationService.getTimerState();
          console.log(`🕐 [QuizScreen] Timer state after claiming reward:`, timerState);
          
          // Play success sound
          SoundService.playStreak();
        } else {
          console.error(`❌ [QuizScreen] Failed to claim goal: ${goalToClaim.title}`);
          
          // Try manual timer integration as fallback
          const timeInMinutes = Math.floor(goalToClaim.reward / 60);
          console.log(`🔄 [QuizScreen] Attempting manual timer integration for ${timeInMinutes} minutes`);
          
          const fallbackSuccess = await TimerIntegrationService.addTimeFromGoal(timeInMinutes);
          if (fallbackSuccess) {
            console.log(`✅ [QuizScreen] Manual timer integration successful!`);
            // Mark as claimed manually since the service failed but timer worked
            goalToClaim.claimed = true;
            await DailyGoalsService.saveGoals();
            SoundService.playStreak();
          } else {
            console.error(`❌ [QuizScreen] Both goal claim and manual timer integration failed!`);
          }
        }
      } else {
        console.warn(`⚠️ [QuizScreen] Could not find goal to claim: ${completedGoal.title}`);
      }
    } catch (error) {
      console.error('❌ [QuizScreen] Error claiming daily goal:', error);
    } finally {
      // Close modal and celebration screen, then proceed to next question
      setShowDailyGoalModal(false);
      setCompletedGoal(null);
      setShowCelebrationScreen(false);
      
      // Load next question after celebration
      setTimeout(() => {
        loadQuestion();
      }, 300);
    }
  };
  
  const handleContinue = async () => {
    SoundService.playButtonPress();
    setShowMascot(false);
    setShowContinueButton(false);

    try {
      const goals = DailyGoalsService.getGoals();
      const unclaimedCompletedGoal = goals.find(g => g.completed && !g.claimed);

      if (unclaimedCompletedGoal || celebrationGoal) {
        const goalToShow = unclaimedCompletedGoal || celebrationGoal!;
        console.log('🎉 [QuizScreen] Showing goal celebration for:', goalToShow.title);
        setCelebrationGoal({ title: goalToShow.title, reward: goalToShow.reward });
        setShowGoalCelebration(true);
        setPendingNextQuestion(true);
        return;
      }
    } catch (error) {
      console.error('Error checking for completed goals:', error);
    }

    // Proceed normally
    proceedToNextQuestion();
  };

  const handleClaimGoalReward = async () => {
    if (!celebrationGoal) return;
    try {
      console.log('🎯 [QuizScreen] Claiming goal reward:', celebrationGoal.title);
      const goals = DailyGoalsService.getGoals();
      const goalToClaim = goals.find(g => g.title === celebrationGoal.title && g.completed && !g.claimed);
      if (goalToClaim) {
        const success = await DailyGoalsService.claimReward(goalToClaim.id);
        if (success) {
          const timeInMinutes = Math.floor(goalToClaim.reward / 60);
          Alert.alert('⏰ Time Added!', `${timeInMinutes} minutes added to your timer!`, [{ text: 'Awesome!', style: 'default' }]);
        }
      }
    } catch (error) {
      console.error('❌ [QuizScreen] Error claiming goal reward:', error);
    } finally {
      setShowGoalCelebration(false);
      setCelebrationGoal(null);
      if (pendingNextQuestion) {
        setPendingNextQuestion(false);
        proceedToNextQuestion();
      }
    }
  };
  
  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true; // Prevent default behavior
      });

      return () => subscription.remove();
    }, [streak])
  );

  const handleGoBack = () => {
    // Always show professional mascot modal for consistent UI
    setShowQuitModal(true);
  };

  const handleQuitConfirm = () => {
    SoundService.playButtonPress();
    
    // Reset streak
    useQuizStore.getState().resetCurrentStreak();
    useUserStore.getState().resetStreak();
    try { EnhancedScoreService.endQuizSession(); } catch {}
    
    setShowQuitModal(false);
    
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleQuitCancel = () => {
    SoundService.playButtonPress();
    setShowQuitModal(false);
  };
  
  // Get streak progress (0-1)
  const getStreakProgress = () => {
    if (streak === 0) return 0;
    return (streak % 5) / 5;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9F1C" />
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" hidden={false} translucent={false} />
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with stats */}
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.statsContainer}>
            <Icon name="check-circle-outline" size={18} color="#4CAF50" />
            <Text style={styles.statsText}>{correctAnswers}/{questionsAnswered}</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Icon name="star" size={18} color="#FF9F1C" />
            <Text style={styles.scoreText}>{score}</Text>
          </View>
          
          <Animated.View 
            style={[
              styles.streakContainer,
              {
                transform: [{ scale: streakAnim }],
                backgroundColor: isStreakMilestone ? '#FF9F1C' : 'white',
              }
            ]}
          >
            <Icon 
              name="fire" 
              size={16} 
              color={isStreakMilestone ? 'white' : (streak > 0 ? '#FF9F1C' : '#ccc')} 
            />
            <Text 
              style={[
                styles.streakText,
                isStreakMilestone && { color: 'white' }
              ]}
            >
              {streak}
            </Text>
          </Animated.View>
        </Animated.View>
        
        {/* Category indicator */}
        {/* Category display - only show if category is provided */}
        {category && (
          <Animated.View 
            style={[
              styles.categoryContainer,
              { opacity: fadeAnim }
            ]}
          >
            <Text style={styles.categoryText}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </Animated.View>
        )}
        
        {/* Streak progress bar */}
        {streak > 0 && (
          <Animated.View 
            style={[
              styles.streakProgressContainer,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.streakProgressBar}>
              <Animated.View 
                style={[
                  styles.streakProgressFill,
                  {
                    width: `${getStreakProgress() * 100}%`,
                    backgroundColor: isStreakMilestone ? '#FF9F1C' : '#FF9F1C'
                  }
                ]}
              />
            </View>
            <Text style={styles.streakProgressText}>
              {isStreakMilestone ? 'Streak Milestone!' : `Next milestone: ${Math.ceil(streak/5)*5}`}
            </Text>
          </Animated.View>
        )}
        
        {/* Timer bar */}
        <Animated.View 
          style={[
            styles.timerContainer,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.timerBar}>
            <Animated.View 
              style={[
                styles.timerFill,
                {
                  width: timerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: timerAnim.interpolate({
                    inputRange: [0, 0.3, 0.7, 1],
                    outputRange: ['#ef4444', '#facc15', '#22c55e', '#22c55e']
                  })
                }
              ]}
            />
          </View>
          <View style={styles.timerIconContainer}>
            <Icon name="timer-outline" size={18} color="#777" />
          </View>
        </Animated.View>
        
        {/* Question card */}
        <Animated.View 
          style={[
            styles.questionContainer,
            {
              opacity: cardAnim,
              transform: [
                { 
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                },
                { 
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.questionText}>{currentQuestion?.question}</Text>
          
          <View style={styles.optionsContainer}>
            {/* In the render, conditionally show options based on state */}
            {showingOptions && currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value], index) => (
              <Animated.View
                key={key}
                style={{
                  opacity: optionsAnim[index] || new Animated.Value(0),
                  transform: [
                    { 
                      translateY: (optionsAnim[index] || new Animated.Value(0)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    },
                    {
                      scale: (optionsAnim[index] || new Animated.Value(0)).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }
                  ]
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    selectedAnswer === key && (
                      key === currentQuestion.correctAnswer ? styles.correctOption : styles.incorrectOption
                    ),
                    !readyForInput && styles.disabledOption
                  ]}
                  onPress={() => handleAnswerSelect(key)}
                  disabled={!readyForInput || selectedAnswer !== null}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.optionKeyContainer,
                    // Change background color based on selection
                    selectedAnswer === key && key === currentQuestion.correctAnswer && styles.correctKeyContainer,
                    selectedAnswer === key && key !== currentQuestion.correctAnswer && styles.incorrectKeyContainer
                  ]}>
                    <Text style={[
                      styles.optionKey,
                      // Change text color based on selection
                      selectedAnswer === key && styles.selectedOptionKeyText
                    ]}>{key}</Text>
                  </View>
                  
                  <Text style={styles.optionText}>{String(value)}</Text>
                  
                  {/* Result icons with enhanced visual feedback */}
                  {selectedAnswer === key && key === currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="check-circle" size={24} color="#4CAF50" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {selectedAnswer === key && key !== currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="close-circle" size={24} color="#F44336" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {selectedAnswer !== key && selectedAnswer !== null && key === currentQuestion.correctAnswer && (
                    <View style={styles.resultIconContainer}>
                      <Icon name="check-circle-outline" size={24} color="#4CAF50" style={styles.resultIcon} />
                    </View>
                  )}
                  
                  {/* Add subtle arrow icon when no selection yet to indicate this is clickable */}
                  {selectedAnswer === null && (
                    <Icon name="chevron-right" size={20} color="#ccc" style={styles.optionArrow} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
        
        {/* Points animation popup */}
        {showPointsAnimation && (
          <Animated.View 
            style={[
              styles.pointsAnimationContainer,
              {
                opacity: pointsAnim,
                transform: [
                  { 
                    translateY: pointsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30]
                    })
                  },
                  { 
                    scale: pointsAnim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0.5, 1.1, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <Icon name="star" size={20} color="#FFD700" style={styles.pointsIcon} />
            <Text style={styles.pointsText}>+{pointsEarned}</Text>
          </Animated.View>
        )}

        {/* Speed feedback popup (classic style) */}
        {showSpeedFeedback && isCorrect && (
          <Animated.View 
            style={[
              styles.speedFeedbackContainer,
              {
                opacity: speedAnim,
                transform: [
                  { 
                    translateY: speedAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, -10]
                    })
                  },
                  { 
                    scale: speedAnim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0.5, 1.05, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.speedFeedbackContent}>
              <Icon 
                name={speedMultiplier >= 2 ? 'flash' : speedMultiplier >= 1.5 ? 'run-fast' : 'check'}
                size={18}
                color={speedMultiplier >= 2 ? '#FF6B35' : speedMultiplier >= 1.5 ? '#FFA500' : '#4CAF50'}
              />
              <Text
                style={[
                  styles.speedCategoryText,
                  { color: speedMultiplier >= 2 ? '#FF6B35' : speedMultiplier >= 1.5 ? '#FFA500' : '#4CAF50' },
                ]}
              >
                {speedCategory || getSpeedFeedback(responseTime)}
              </Text>
              {speedMultiplier > 1 && (
                <Text style={styles.speedMultiplierText}>{speedMultiplier}x Bonus!</Text>
              )}
            </View>
          </Animated.View>
        )}
        
        {/* Continue button after answering with 1s delay after score update */}
        {showContinueButton && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Next Question</Text>
            <Icon name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Banner Ad - Subtle placement at bottom */}
      <BannerAdComponent placement="quiz_screen" style={styles.bannerAd} />
      
      {/* Quit confirmation overlay using mascot instead of system alert */}
      {showConfirmQuit && (
        <View style={styles.quitOverlay}>
          <TouchableOpacity
            style={[styles.quitButton, { backgroundColor: '#FF3B30' }]}
            onPress={async () => {
              SoundService.playButtonPress();
              try { await AsyncStorage.setItem('@BrainBites:currentQuizStreak', '0'); } catch {}
              useQuizStore.getState().resetCurrentStreak();
              setShowMascot(false);
              setShowConfirmQuit(false);
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Home');
            }}
          >
            <Icon name="exit-run" size={18} color="white" />
            <Text style={styles.quitButtonText}>Quit Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quitButton, { backgroundColor: '#34C759' }]}
            onPress={() => {
              SoundService.playButtonPress();
              setMascotType('happy');
              setShowConfirmQuit(false);
              setTimeout(() => setShowMascot(false), 800);
            }}
          >
            <Icon name="arrow-right-bold-circle" size={18} color="white" />
            <Text style={styles.quitButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Mascot - Quiz Screen with original functionality */}
      <EnhancedMascotDisplay
        type={mascotType}
        position="left"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={handleMascotDismiss}
        onMessageComplete={handleMascotDismiss}
        autoHide={false}
        fullScreen={true}
        onPeekingPress={handlePeekingMascotPress}
        // Quiz-specific props for original functionality
        isQuizScreen={true}
        currentQuestion={currentQuestion}
        selectedAnswer={selectedAnswer}
        showExplanation={showExplanation}
        isCorrect={isCorrect}
      />

      <MascotModal
        visible={showQuitModal}
        type="depressed"
        title="Leaving Already?"
        message={`You're on a ${streak} question streak!\n\nYou'll lose your progress if you quit now. Are you sure?`}
        streak={streak}
        onDismiss={() => setShowQuitModal(false)}
        buttons={[
          {
            text: "Keep Playing!",
            onPress: handleQuitCancel,
            style: 'primary'
          },
          {
            text: 'Quit Quiz',
            onPress: handleQuitConfirm,
            style: 'danger'
          }
        ]}
      />
      
      {/* Celebration Screen - blank background for goal celebration */}
      {showCelebrationScreen && (
        <View style={styles.celebrationScreen}>
          <Text style={styles.celebrationText}>🎉 Goal Complete! 🎉</Text>
        </View>
      )}
      
      {/* New Goal Celebration Modal that interrupts flow */}
      <MascotModal
        visible={showGoalCelebration}
        type="excited"
        title="🎉 Goal Completed!"
        message={celebrationGoal ? `You completed "${celebrationGoal.title}"!\n\nReward: ${Math.floor((celebrationGoal.reward || 0) / 60)} minutes of extra time!` : ''}
        buttons={[
          {
            text: `Claim ${celebrationGoal ? Math.floor((celebrationGoal.reward || 0) / 60) : 0} Minutes`,
            onPress: handleClaimGoalReward,
            style: 'primary'
          }
        ]}
        onDismiss={() => {
          setShowGoalCelebration(false);
          setCelebrationGoal(null);
          if (pendingNextQuestion) {
            setPendingNextQuestion(false);
            proceedToNextQuestion();
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
    marginTop: 15,  // ADD THIS
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    color: '#333',
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9F1C',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  streakProgressContainer: {
    marginBottom: 16,
  },
  streakProgressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  streakProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  streakProgressText: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
    textAlign: 'right',
  },
  questionContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionKeyContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  resultIcon: {
    marginLeft: 12,
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  incorrectOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  continueButton: {
    backgroundColor: '#FF9F1C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255, 159, 28, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  pointsAnimationContainer: {
    position: 'absolute',
    top: '30%', 
    right: '15%',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  pointsIcon: {
    marginRight: 6,
  },
  pointsText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  speedFeedbackContainer: {
    position: 'absolute',
    top: '40%', 
    right: '10%',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  speedFeedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedCategoryText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  speedMultiplierText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  hoverableOption: {
    // This is for a subtle hover effect
    borderColor: '#ddd',
  },
  correctKeyContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  incorrectKeyContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  selectedOptionKeyText: {
    color: 'white',
  },
  resultIconContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
  },
  optionArrow: {
    position: 'absolute',
    right: 16,
  },
  timerContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  timerBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerIconContainer: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bannerAd: {
    backgroundColor: 'rgba(255, 248, 231, 0.9)',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  quitOverlay: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledOption: {
    opacity: 0.6,
  },
  celebrationScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  speedFeedback: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#FFC107',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  speedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  speedMultiplier: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default QuizScreen;