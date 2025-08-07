// src/styles/theme.ts
export const colors = {
  // Primary Colors
  primary: '#FF9F1C',
  primaryDark: '#FF8C00',
  primaryLight: '#FFB84D',
  
  // Gradient Colors
  gradientPrimary: ['#FFE5D9', '#FFD7C9', '#FFC9B9'],
  gradientQuiz: ['#E8F4FF', '#D4E9FF', '#C0DFFF'],
  gradientSuccess: ['#A8E6CF', '#7FCDCD'],
  gradientWarning: ['#FFE082', '#FFD54F'],
  gradientError: ['#FFCDD2', '#EF9A9A'],
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  // Text Colors
  textPrimary: '#4A4A4A',
  textSecondary: '#6A6A6A',
  textLight: '#8A8A8A',
  textWhite: '#FFFFFF',
  
  // Background Colors
  background: '#FAFAFA',
  backgroundLight: '#FFFFFF',
  backgroundDark: '#F5F5F5',
  
  // UI Colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Category Colors
  categories: {
    science: '#4CAF50',
    history: '#FF9800',
    geography: '#2196F3',
    math: '#9C27B0',
    literature: '#E91E63',
    technology: '#00BCD4',
  },
};

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'Nunito-Regular',
    bold: 'Nunito-Bold',
    quicksandRegular: 'Quicksand-Regular',
    quicksandBold: 'Quicksand-Bold',
  },
  
  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 40,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  xxl: 25,
  full: 9999,
};

export const shadows = {
  small: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  }),
};

export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
};

export default theme;