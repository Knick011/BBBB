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
  Alert,
  BackHandler
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QuestionService from '../services/QuestionService';
import SoundService from '../services/SoundService';
import EnhancedScoreService from '../services/EnhancedScoreService';
import TimerIntegrationService from '../services/TimerIntegrationService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import { useQuizStore } from '../store/useQuizStore';
import { useUserStore } from '../store/useUserStore';

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
  const [showSpeedFeedback, setShowSpeedFeedback] = useState(false);
  
  // Mascot state - simplified for quiz functionality
  const [mascotType, setMascotType] = useState<'happy' | 'sad' | 'excited' | 'depressed' | 'gamemode' | 'below'>('happy');
  const [mascotMessage, setMascotMessage] = useState('');
  const [showMascot, setShowMascot] = useState(false);
  
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
  
  useEffect(() => {
    console.log('🎮 [Modern QuizScreen] Component mounted');
    
    // Initialize services
    const initializeServices = async () => {
      try {
        await initializeAudio();
        await EnhancedScoreService.loadSavedData();
      } catch (error) {
        console.error('❌ [Modern QuizScreen] Failed to initialize services:', error);
      }
    };
    
    initializeServices();
    
    // Load first question
    loadQuestion();
    
    return () => {
      console.log('🎮 [Modern QuizScreen] Component unmounting, cleaning up...');
      
      // Stop game music
      SoundService.stopMusic();
      
      // Clear timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      if (timerAnimation.current) {
        timerAnimation.current.stop();
      }
    };
  }, []);

  const initializeAudio = async () => {
    try {
      console.log('🔊 [Modern QuizScreen] Initializing audio...');
      const audioReady = await SoundService.initialize();
      if (audioReady) {
        await SoundService.startGameMusic();
        console.log('🔊 [Modern QuizScreen] Audio initialized and game music started');
      } else {
        console.log('⚠️ [Modern QuizScreen] Audio not available, continuing without sound');
      }
    } catch (error) {
      console.log('❌ [Modern QuizScreen] Audio initialization failed:', error);
    }
  };

  // Start a new question
  const loadQuestion = async () => {
    setIsLoading(true);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowExplanation(false);
    setShowPointsAnimation(false);
    setIsStreakMilestone(false);
    setShowMascot(false); // Hide mascot when loading new question
    setShowSpeedFeedback(false);
    setSpeedCategory('');
    setSpeedMultiplier(1.0);
    
    // Reset animations
    cardAnim.setValue(0);
    fadeAnim.setValue(0);
    explanationAnim.setValue(0);
    timerAnim.setValue(1);
    
    try {
      let question;
      
      if (category) {
        console.log(`🎯 [Modern QuizScreen] Loading question for category: ${category}`);
        question = await QuestionService.getRandomQuestion(category);
      } else if (difficulty) {
        console.log(`🎯 [Modern QuizScreen] Loading question for difficulty: ${difficulty}`);
        question = await QuestionService.getQuestionsByDifficulty(difficulty);
      } else {
        console.log(`🎯 [Modern QuizScreen] Loading random question`);
        question = await QuestionService.getRandomQuestion();
      }
      
      if (!question) {
        console.error('❌ [Modern QuizScreen] No question received from service');
        // Handle error case - maybe show error message or fallback
        return;
      }

      console.log(`✅ [Modern QuizScreen] Loaded question:`, {
        id: question.id,
        category: question.category,
        difficulty: question.difficulty,
        options: question.options
      });

      setCurrentQuestion(question);
      setQuestionsAnswered(prev => prev + 1);
      
      // Play button sound
      SoundService.playButtonPress();
      
      // Create animation values for each option
      const optionKeys = Object.keys(question.options || {});
      optionsAnim.length = optionKeys.length;
      for (let i = 0; i < optionsAnim.length; i++) {
        optionsAnim[i] = new Animated.Value(0);
      }
      
      // Start animations
      Animated.parallel([
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        // Staggered options animation
        ...optionsAnim.map((anim, index) => 
          Animated.sequence([
            Animated.delay(400 + (index * 100)),
            Animated.spring(anim, {
              toValue: 1,
              friction: 7,
              tension: 40,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
      
      // Start timer animation (20 seconds)
      timerAnimation.current = Animated.timing(timerAnim, {
        toValue: 0,
        duration: 20000,
        useNativeDriver: false, // Need for width animation
        easing: Easing.linear,
      });
      
      timerAnimation.current.start();
      
      // Set timer to show time's up after 20 seconds
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        // Only trigger if no answer selected yet
        if (selectedAnswer === null) {
          handleTimeUp();
        }
      }, 20000);
      
      // Record start time for scoring
      questionStartTime.current = Date.now();
      
    } catch (error: any) {
      console.error('❌ [Modern QuizScreen] Error loading question:', error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTimeUp = () => {
    // Check if already answered
    if (selectedAnswer !== null) return;
    
    console.log('⏰ [Modern QuizScreen] Time up!');
    setSelectedAnswer('TIMEOUT');
    setIsCorrect(false);
    
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
  };
  
  const showMascotForTimeout = () => {
    setMascotType('sad');
    setMascotMessage("Time's up! ⏰\nDon't worry, you'll get the next one!");
    setShowMascot(true);
  };

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer !== null) return;
    
    console.log(`🎯 [Modern QuizScreen] Answer selected: ${option}`);
    
    // Stop timer animation and clear timeout immediately
    if (timerAnimation.current) {
      timerAnimation.current.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setSelectedAnswer(option);
    const correct = option === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    
    // Process answer using EnhancedScoreService
    const processScoring = async () => {
      try {
        const difficulty = route.params?.difficulty || 'medium';
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
          setCorrectAnswers(prev => prev + 1);
          setShowPointsAnimation(true);
          setShowSpeedFeedback(true);
          
          // ✅ ADD TIMER INTEGRATION - Add time for correct answers
          let timeToAdd = 1; // Base 1 minute for easy
          if (difficulty === 'medium') timeToAdd = 2;
          if (difficulty === 'hard') timeToAdd = 3;
          
          console.log(`🧠 [QuizScreen] Adding ${timeToAdd} minutes for correct ${difficulty} answer`);
          
          // Initialize timer integration if needed
          await TimerIntegrationService.initialize();
          const timerResult = await TimerIntegrationService.addTimeFromQuiz(timeToAdd);
          
          if (timerResult) {
            console.log(`✅ [QuizScreen] Successfully added ${timeToAdd}m to timer`);
          } else {
            console.error(`❌ [QuizScreen] Failed to add time to timer`);
          }
          
          // Animate points and speed feedback
          pointsAnim.setValue(0);
          speedAnim.setValue(0);
          
          Animated.parallel([
            Animated.spring(pointsAnim, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(300),
              Animated.spring(speedAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
              })
            ])
          ]).start();

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
          
          // Show explanation
          setTimeout(() => {
            setShowExplanation(true);
            showExplanationWithAnimation();
          }, 1200);
        } else {
          // Wrong answer
          SoundService.playIncorrect();
          
          // Show mascot for wrong answer
          setTimeout(() => {
            showMascotForWrongAnswer();
          }, 500);
          
          // Show explanation
          setTimeout(() => {
            setShowExplanation(true);
            showExplanationWithAnimation();
          }, 2000);
        }
      } catch (error) {
        console.error('Error processing score:', error);
      }
    };
    
    processScoring();
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
  
  const handleContinue = () => {
    // Play button sound
    SoundService.playButtonPress();
    
    // Hide mascot if still showing
    setShowMascot(false);
    
    // Add a small delay before starting next question
    setTimeout(() => {
      // Hide explanation with animation
      Animated.timing(explanationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        // Fix useInsertionEffect error
        setTimeout(() => {
          setShowExplanation(false);
          loadQuestion();
        }, 0);
      });
    }, 100); // Small delay to prevent accidental double-tap
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
    // Show mascot with sad expression but no message
    setMascotType('sad');
    setShowMascot(true);
    
    // Create a custom styled alert with themed buttons
    Alert.alert(
      '🥺 Leaving so soon?',
      `You're on a ${streak} question streak!\nQuitting will reset your progress.`,
      [
        { 
          text: "Let's Continue!", 
          style: 'default',
          onPress: () => {
            // Animate mascot back to happy
            setMascotType('happy');
            setTimeout(() => {
              setShowMascot(false);
            }, 1000);
          }
        },
        {
          text: 'Quit Quiz',
          style: 'destructive',
          onPress: () => {
            // Play button sound
            SoundService.playButtonPress();
            // Reset streak in both stores
            useQuizStore.getState().resetStreak();
            useUserStore.getState().resetStreak();
            // Hide mascot if showing
            setShowMascot(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          // Animate mascot back to happy
          setMascotType('happy');
          setTimeout(() => {
            setShowMascot(false);
          }, 1000);
        }
      }
    );
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
      <StatusBar backgroundColor="#FFF8E7" barStyle="dark-content" />
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
            {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value], index) => (
              <Animated.View
                key={key}
                style={{
                  opacity: optionsAnim[index] || fadeAnim,
                  transform: [
                    { 
                      translateY: (optionsAnim[index] || fadeAnim).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
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
                    // Add hover effect when no selection yet
                    selectedAnswer === null && styles.hoverableOption
                  ]}
                  onPress={() => handleAnswerSelect(key)}
                  disabled={selectedAnswer !== null}
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
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 1]
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

        {/* Speed feedback popup */}
        {showSpeedFeedback && (
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
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.1, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.speedFeedbackContent}>
              <Icon 
                name={speedMultiplier >= 2 ? "flash" : speedMultiplier >= 1.5 ? "run-fast" : "check"} 
                size={18} 
                color={speedMultiplier >= 2 ? "#FF6B35" : speedMultiplier >= 1.5 ? "#FFA500" : "#4CAF50"} 
              />
              <Text style={[
                styles.speedCategoryText,
                { color: speedMultiplier >= 2 ? "#FF6B35" : speedMultiplier >= 1.5 ? "#FFA500" : "#4CAF50" }
              ]}>
                {speedCategory}
              </Text>
              {speedMultiplier > 1 && (
                <Text style={styles.speedMultiplierText}>
                  {speedMultiplier}x Bonus!
                </Text>
              )}
            </View>
          </Animated.View>
        )}
        
        {/* Continue button after answering */}
        {selectedAnswer !== null && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Next Question</Text>
            <Icon name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        )}
      </ScrollView>
      
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
    elevation: 6,
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
    elevation: 8,
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
    elevation: 6,
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
});

export default QuizScreen;