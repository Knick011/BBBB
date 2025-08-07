import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import SoundService from '@services/SoundService';
import { TimerService } from '@services/TimerService';
import { useUserStore } from '@store/useUserStore';
import Mascot from '@components/Mascot/Mascot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface QuizComponentProps {
  questions: Question[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  onComplete: (score: number, correctAnswers: number) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  questions,
  category,
  difficulty,
  onComplete,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState<'happy' | 'sad' | 'excited'>('happy');
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const questionAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { addScore, addStreak, resetStreak } = useUserStore();

  const timeRewards = {
    easy: 60,    // 1 minute
    medium: 120, // 2 minutes
    hard: 180,   // 3 minutes
  };

  const scoreRewards = {
    easy: 10,
    medium: 20,
    hard: 30,
  };

  useEffect(() => {
    // Start game music
    SoundService.playGameMusic();
    
    // Animate question entrance
    animateQuestionIn();
    
    return () => {
      SoundService.stopMusic();
    };
  }, []);

  useEffect(() => {
    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (currentQuestionIndex + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentQuestionIndex]);

  const animateQuestionIn = () => {
    questionAnim.setValue(0);
    Animated.spring(questionAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correct;

    if (isCorrect) {
      // Correct answer
      SoundService.playCorrect();
      setScore(score + scoreRewards[difficulty]);
      setCorrectAnswers(correctAnswers + 1);
      setStreak(streak + 1);
      
      // Add time reward
      TimerService.addTime(timeRewards[difficulty]);
      
      // Show happy mascot
      setMascotType('happy');
      setShowMascot(true);
      
      // Add score to store
      addScore(scoreRewards[difficulty]);
      addStreak();
      
      // Check for streak bonus
      if ((streak + 1) % 5 === 0) {
        SoundService.playStreak();
        setMascotType('excited');
        // Bonus time for 5-question streak
        TimerService.addTime(120); // 2 minutes bonus
      }
      
      // Animate feedback
      Animated.spring(feedbackAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Wrong answer
      SoundService.playIncorrect();
      setStreak(0);
      resetStreak();
      
      // Show sad mascot
      setMascotType('sad');
      setShowMascot(true);
      
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Auto-proceed after delay
    setTimeout(() => {
      handleNext();
    }, 2000);
  };

  const handleNext = () => {
    setShowMascot(false);
    feedbackAnim.setValue(0);
    
    if (currentQuestionIndex < questions.length - 1) {
      // Next question
      Animated.timing(questionAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
        animateQuestionIn();
      });
    } else {
      // Quiz complete
      onComplete(score, correctAnswers);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      {/* Score and Streak */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="star" size={20} color="#FFB800" />
          <Text style={styles.statText}>{score} pts</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="flame" size={20} color="#FF6B6B" />
          <Text style={styles.statText}>{streak} streak</Text>
        </View>
      </View>

      {/* Question */}
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: questionAnim,
            transform: [
              {
                translateY: questionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              { translateX: shakeAnim },
            ],
          },
        ]}
      >
        <Text style={styles.categoryText}>{category}</Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </Animated.View>

      {/* Options */}
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correct;
          const showResult = isAnswered;

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleAnswerSelect(index)}
              disabled={isAnswered}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.optionButton,
                  isSelected && styles.selectedOption,
                  showResult && isCorrect && styles.correctOption,
                  showResult && isSelected && !isCorrect && styles.incorrectOption,
                  {
                    transform: [
                      {
                        scale: isSelected && isCorrect
                          ? feedbackAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.05],
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.selectedOptionText,
                    showResult && isCorrect && styles.correctOptionText,
                    showResult && isSelected && !isCorrect && styles.incorrectOptionText,
                  ]}
                >
                  {option}
                </Text>
                {showResult && isCorrect && (
                  <Icon name="checkmark-circle" size={24} color="#4CAF50" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <Icon name="close-circle" size={24} color="#FF6B6B" />
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Explanation (if answered) */}
      {isAnswered && currentQuestion.explanation && (
        <Animated.View
          style={[
            styles.explanationContainer,
            {
              opacity: feedbackAnim,
              transform: [
                {
                  translateY: feedbackAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Icon name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
        </Animated.View>
      )}

      {/* Mascot */}
      {showMascot && (
        <Mascot
          type={mascotType}
          position="bottom-right"
          size={80}
          animateIn={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 20,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontFamily: 'Nunito-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 30,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#333',
  },
  questionContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Nunito-Regular',
    marginBottom: 10,
    textAlign: 'center',
  },
  questionText: {
    fontSize: 20,
    fontFamily: 'Quicksand-Bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  correctOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  incorrectOption: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1976D2',
    fontFamily: 'Nunito-Bold',
  },
  correctOptionText: {
    color: '#388E3C',
    fontFamily: 'Nunito-Bold',
  },
  incorrectOptionText: {
    color: '#D32F2F',
    fontFamily: 'Nunito-Bold',
  },
  explanationContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'flex-start',
    gap: 8,
  },
  explanationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#1976D2',
    lineHeight: 20,
  },
});

export default QuizComponent;