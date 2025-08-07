import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../styles/theme';

interface QuizOptionsProps {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  showResult: boolean;
  onSelectAnswer: (answer: string) => void;
}

export const QuizOptions: React.FC<QuizOptionsProps> = ({
  options,
  selectedAnswer,
  correctAnswer,
  showResult,
  onSelectAnswer,
}) => {
  const animatedValues = useRef(options.map(() => new Animated.Value(0))).current;
  const scaleValues = useRef(options.map(() => new Animated.Value(1))).current;
  
  useEffect(() => {
    // Animate options entrance
    animatedValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [options]);
  
  const getOptionLabel = (index: number): string => {
    return ['A', 'B', 'C', 'D'][index];
  };
  
  const handlePress = (option: string, index: number) => {
    if (showResult) return;
    
    // Animate press
    Animated.sequence([
      Animated.timing(scaleValues[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValues[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onSelectAnswer(option);
  };
  
  const getOptionStyle = (option: string) => {
    if (!showResult) {
      return selectedAnswer === option ? 'selected' : 'default';
    }
    
    if (option === correctAnswer) return 'correct';
    if (option === selectedAnswer && option !== correctAnswer) return 'incorrect';
    return 'default';
  };
  
  const getGradientColors = (style: string) => {
    switch (style) {
      case 'selected':
        return ['#E3F2FD', '#BBDEFB', '#90CAF9'];
      case 'correct':
        return ['#E8F5E9', '#C8E6C9', '#A5D6A7'];
      case 'incorrect':
        return ['#FFEBEE', '#FFCDD2', '#EF9A9A'];
      default:
        return ['#FFFFFF', '#FAFAFA', '#F5F5F5'];
    }
  };

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const style = getOptionStyle(option);
        const isSelected = selectedAnswer === option;
        const isCorrect = option === correctAnswer && showResult;
        const isWrong = isSelected && !isCorrect && showResult;
        
        return (
          <Animated.View
            key={index}
            style={{
              opacity: animatedValues[index],
              transform: [
                {
                  translateX: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
                { scale: scaleValues[index] },
              ],
            }}
          >
            <TouchableOpacity
              onPress={() => handlePress(option, index)}
              disabled={showResult}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={getGradientColors(style)}
                style={[
                  styles.optionButton,
                  isSelected && styles.selectedOption,
                  isCorrect && styles.correctOption,
                  isWrong && styles.incorrectOption,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionLabel,
                    isSelected && styles.selectedLabel,
                    isCorrect && styles.correctLabel,
                    isWrong && styles.incorrectLabel,
                  ]}>
                    <Text style={[
                      styles.optionLabelText,
                      (isSelected || isCorrect || isWrong) && styles.selectedLabelText,
                    ]}>
                      {getOptionLabel(index)}
                    </Text>
                  </View>
                  
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.selectedText,
                    isCorrect && styles.correctText,
                    isWrong && styles.incorrectText,
                  ]}>
                    {option}
                  </Text>
                  
                  {showResult && (
                    <View style={styles.resultIcon}>
                      {isCorrect && (
                        <Icon name="check-circle" size={24} color="#4CAF50" />
                      )}
                      {isWrong && (
                        <Icon name="close-circle" size={24} color="#F44336" />
                      )}
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  optionButton: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  selectedOption: {
    transform: [{ scale: 1.02 }],
  },
  correctOption: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    borderWidth: 2,
    borderColor: '#F44336',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionLabel: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedLabel: {
    backgroundColor: '#2196F3',
  },
  correctLabel: {
    backgroundColor: '#4CAF50',
  },
  incorrectLabel: {
    backgroundColor: '#F44336',
  },
  optionLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  selectedLabelText: {
    color: 'white',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  selectedText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  correctText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  incorrectText: {
    color: '#C62828',
    fontWeight: '600',
  },
  resultIcon: {
    marginLeft: 12,
  },
});

export default QuizOptions; 