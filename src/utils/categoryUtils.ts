// src/utils/categoryUtils.ts
// Utility functions for managing quiz categories

import { questions } from '../assets/data/questionsData';

export interface CategoryInfo {
  id: string;
  name: string;
  displayName: string;
  questionCount: number;
  icon: string;
  color: string;
  gradient: string[];
}

// Extract unique categories from questions data
export const extractCategoriesFromData = (): CategoryInfo[] => {
  const categoryMap = new Map<string, number>();
  
  questions.forEach(question => {
    if (question && question.category && typeof question.category === 'string') {
      const category = question.category.toLowerCase().trim();
      if (category) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    }
  });

  const categories: CategoryInfo[] = [];
  
  categoryMap.forEach((count, categoryId) => {
    const categoryInfo = getCategoryDisplayInfo(categoryId);
    categories.push({
      id: categoryId,
      name: categoryId,
      displayName: categoryInfo.displayName,
      questionCount: count,
      icon: categoryInfo.icon,
      color: categoryInfo.color,
      gradient: categoryInfo.gradient
    });
  });

  return categories.sort((a, b) => {
    if (b.questionCount !== a.questionCount) {
      return b.questionCount - a.questionCount;
    }
    return a.displayName.localeCompare(b.displayName);
  });
};

// Get display information for a category
const getCategoryDisplayInfo = (categoryId: string) => {
  if (!categoryId || typeof categoryId !== 'string') {
    return {
      displayName: 'Unknown',
      icon: 'brain-circuit',
      color: '#9E9E9E',
      gradient: ['#BDBDBD', '#9E9E9E', '#757575']
    };
  }

  const categoryMappings: Record<string, { displayName: string; icon: string; color: string; gradient: string[] }> = {
    'science': {
      displayName: 'Science & Discovery',
      icon: 'flask-outline',
      color: '#4CAF50',
      gradient: ['#A5D6A7', '#66BB6A', '#43A047']
    },
    'biology': {
      displayName: 'Biology & Life',
      icon: 'dna',
      color: '#009688',
      gradient: ['#80CBC4', '#26A69A', '#00897B']
    },
    'chemistry': {
      displayName: 'Chemistry Lab',
      icon: 'atom-variant',
      color: '#00BCD4',
      gradient: ['#80DEEA', '#26C6DA', '#00ACC1']
    },
    'physics': {
      displayName: 'Physics & Space',
      icon: 'rocket-launch-outline',
      color: '#3F51B5',
      gradient: ['#9FA8DA', '#5C6BC0', '#3949AB']
    },
    'history': {
      displayName: 'Time Travel History',
      icon: 'clock-time-eight-outline',
      color: '#795548',
      gradient: ['#BCAAA4', '#8D6E63', '#6D4C41']
    },
    'geography': {
      displayName: 'World Explorer',
      icon: 'earth',
      color: '#2196F3',
      gradient: ['#90CAF9', '#42A5F5', '#1E88E5']
    },
    'literature': {
      displayName: 'Literary Adventures',
      icon: 'book-open-page-variant-outline',
      color: '#9C27B0',
      gradient: ['#CE93D8', '#AB47BC', '#8E24AA']
    },
    'arts': {
      displayName: 'Creative Arts',
      icon: 'palette-outline',
      color: '#E91E63',
      gradient: ['#F48FB1', '#EC407A', '#D81B60']
    },
    'music': {
      displayName: 'Musical Journey',
      icon: 'music-note',
      color: '#FF4081',
      gradient: ['#FF80AB', '#FF4081', '#F50057']
    },
    'sports': {
      displayName: 'Sports Challenge',
      icon: 'trophy-outline',
      color: '#FF5722',
      gradient: ['#FFAB91', '#FF7043', '#F4511E']
    },
    'entertainment': {
      displayName: 'Pop Culture Fun',
      icon: 'movie-open-star-outline',
      color: '#FF9800',
      gradient: ['#FFB74D', '#FFA726', '#FB8C00']
    },
    'technology': {
      displayName: 'Tech Wizardry',
      icon: 'laptop',
      color: '#607D8B',
      gradient: ['#90A4AE', '#78909C', '#546E7A']
    },
    'computers': {
      displayName: 'Computer Science',
      icon: 'code-tags',
      color: '#455A64',
      gradient: ['#90A4AE', '#607D8B', '#455A64']
    },
    'mathematics': {
      displayName: 'Math Magic',
      icon: 'function-variant',
      color: '#3F51B5',
      gradient: ['#9FA8DA', '#5C6BC0', '#3949AB']
    },
    'general': {
      displayName: 'Brain Teasers',
      icon: 'lightbulb-outline',
      color: '#FFC107',
      gradient: ['#FFE082', '#FFD54F', '#FFC107']
    },
    'food': {
      displayName: 'Food & Cuisine',
      icon: 'food-fork-drink',
      color: '#FF5252',
      gradient: ['#FF8A80', '#FF5252', '#FF1744']
    },
    'nature': {
      displayName: 'Nature & Wildlife',
      icon: 'leaf',
      color: '#8BC34A',
      gradient: ['#C5E1A5', '#9CCC65', '#7CB342']
    },
    'space': {
      displayName: 'Space Explorer',
      icon: 'space-station',
      color: '#673AB7',
      gradient: ['#B39DDB', '#7E57C2', '#5E35B1']
    },
    'mythology': {
      displayName: 'Mythical Realms',
      icon: 'shield-sun',
      color: '#FF6D00',
      gradient: ['#FFB74D', '#FF9800', '#F57C00']
    },
    'language': {
      displayName: 'Language Master',
      icon: 'translate',
      color: '#00BCD4',
      gradient: ['#80DEEA', '#26C6DA', '#00ACC1']
    }
  };

  // Get mapping or create default with fun icon
  const mapping = categoryMappings[categoryId] || {
    displayName: categoryId.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    icon: 'brain-circuit',
    color: '#9E9E9E',
    gradient: ['#BDBDBD', '#9E9E9E', '#757575']
  };

  return mapping;
};

// Get all available categories
export const getAvailableCategories = (): CategoryInfo[] => {
  try {
    return extractCategoriesFromData();
  } catch (error) {
    console.error('❌ [CategoryUtils] Error extracting categories:', error);
    return [];
  }
};

// Get category by ID
export const getCategoryById = (categoryId: string): CategoryInfo | null => {
  const categories = getAvailableCategories();
  return categories.find(cat => cat.id === categoryId) || null;
};

// Get total questions count
export const getTotalQuestionsCount = (): number => {
  try {
    return questions?.length || 0;
  } catch (error) {
    console.error('❌ [CategoryUtils] Error getting total questions count:', error);
    return 0;
  }
};

// Debug logging - wrap in try-catch to prevent errors during initialization
try {
  console.log('📚 [CategoryUtils] Available categories:', getAvailableCategories().map(c => `${c.displayName} (${c.questionCount})`).join(', '));
} catch (error) {
  console.warn('⚠️ [CategoryUtils] Error during initialization:', error);
} 