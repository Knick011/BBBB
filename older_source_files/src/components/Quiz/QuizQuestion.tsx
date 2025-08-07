import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Question } from '../../types';
import theme from '../../styles/theme';

interface QuizQuestionProps {
  question: Question | null;
  questionNumber: number;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({ question, questionNumber }) => {
  if (!question) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.questionNumber}>Question {questionNumber}</Text>
      <Text style={styles.questionText}>{question.question}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  questionNumber: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  questionText: {
    fontSize: theme.typography.fontSize.xxl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.xxl * 1.3,
  },
});