export { default as QuizComponent } from './QuizComponent';
export { default as QuizOptionButton } from './QuizOptionButton';
export { QuizOptions } from './QuizOptions';
export { QuizQuestion } from './QuizQuestion';
export { StreakIndicator } from './StreakIndicator';

// Export all components
export const QuizComponents = {
  QuizComponent: require('./QuizComponent').default,
  QuizOptionButton: require('./QuizOptionButton').default,
  QuizOptions: require('./QuizOptions').QuizOptions,
  QuizQuestion: require('./QuizQuestion').QuizQuestion,
  StreakIndicator: require('./StreakIndicator').StreakIndicator,
};

export default QuizComponents;