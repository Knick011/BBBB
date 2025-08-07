// src/styles/commonStyles.ts
import { StyleSheet } from 'react-native';
import theme from './theme';

// Common styles that match the web version's look and feel
const commonStyles = StyleSheet.create({
  // Screen containers
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  
  // Cards and sections
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    marginBottom: theme.spacing.lg,
  },
  
  // Headers
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textDark,
  },
  
  // Typography
  title: {
    fontSize: theme.typography.fontSize.title,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  text: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  smallText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
  },
  
  // Buttons
  button: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.btn,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.md,
    marginLeft: theme.spacing.xs,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.md,
    marginLeft: theme.spacing.xs,
  },
  
  // Question styles
  questionCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
    marginTop: theme.spacing.lg,
  },
  questionText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textDark,
    lineHeight: 24,
  },
  
  // Option buttons for quiz
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  correctOption: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderColor: 'rgba(46, 204, 113, 0.5)',
    borderWidth: 2,
  },
  incorrectOption: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderColor: 'rgba(231, 76, 60, 0.5)',
    borderWidth: 2,
  },
  optionKey: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: theme.spacing.sm,
    width: 20,
  },
  optionText: {
    fontSize: theme.typography.fontSize.md,
    flex: 1,
  },
  
  // Progress bars
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  
  // Streak counter
  streakCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  streakCounterText: {
    marginLeft: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  streakPulse: {
    // Animation applied via animated API
  },
  streakMilestone: {
    backgroundColor: theme.colors.primary,
  },
  streakMilestoneText: {
    color: theme.colors.white,
  },
  
  // Explanation box
  explanationContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  correctExplanation: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(46, 204, 113, 0.3)',
  },
  incorrectExplanation: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  explanationTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
  },
  
  // Welcome screen
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary, // Gradient applied via component
  },
  welcomeLogo: {
    width: 150,
    height: 150,
    marginBottom: theme.spacing.xl,
    // Animation applied via animated API
  },
  welcomeButton: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.lg,
  },
  welcomeButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  
  // Category selection
  categoryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    width: '48%',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  categorySubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

export default commonStyles;