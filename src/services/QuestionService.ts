// src/services/QuestionService.ts
// ✅ FIXED: Direct import from questionsData.ts to resolve blank options issue
// ✅ FIXED: Proper CSV parsing and data mapping for option display
// ✅ ADDED: Multi-language support for Turkish and English questions
// console.log: "Modern QuestionService with multi-language support"

import { questionsCSV } from '../assets/data/questionsData';
import { questionsTurkishCSV } from '../assets/data/questionsTurkishData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLanguage } from '../locales/i18n';

interface Question {
  id: number;
  category: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface RawQuestionData {
  id: string;
  category: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  level: string;
}

class QuestionServiceClass {
  private questions: Question[] = [];
  private isInitialized: boolean = false;
  private usedQuestionIds: Set<number> = new Set();
  private permanentlyCorrectIds: Set<number> = new Set();
  private categoryCounts: Record<string, number> = {};

  private readonly STORAGE_KEYS = {
    PERMANENT_CORRECT_IDS: '@BrainBites:permanentCorrectQuestionIds'
  } as const;

  constructor() {
    console.log('🚀 [Modern QuestionService] Constructor called');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ [Modern QuestionService] Already initialized with', this.questions.length, 'questions');
      return;
    }

    try {
      // Get current language
      const currentLanguage = getCurrentLanguage();
      const isTurkish = currentLanguage === 'tr';

      console.log(`🚀 [Modern QuestionService] Initializing with ${isTurkish ? 'Turkish' : 'English'} questions...`);

      // Select appropriate CSV based on language
      const selectedCSV = isTurkish ? questionsTurkishCSV : questionsCSV;

      // Parse CSV data directly from imported string
      const parsedQuestions = this.parseQuestionsCSV(selectedCSV);

      if (parsedQuestions.length === 0) {
        throw new Error('No questions parsed from CSV data');
      }

      this.questions = parsedQuestions;
      this.updateCategoryCounts();
      this.isInitialized = true;
      await this.loadPermanentCorrectIds();

      console.log(`✅ [Modern QuestionService] Successfully initialized with ${this.questions.length} ${isTurkish ? 'Turkish' : 'English'} questions`);
      console.log(`📊 [Modern QuestionService] Categories available:`, Object.keys(this.categoryCounts));
      console.log(`📊 [Modern QuestionService] Questions per category:`, this.categoryCounts);

    } catch (error: any) {
      console.error('❌ [Modern QuestionService] Initialization failed:', error?.message || error);
      console.error('❌ [Modern QuestionService] Stack trace:', error?.stack);
      
      // Fallback to hardcoded questions to prevent app crash
      try {
        this.questions = this.getFallbackQuestions();
        this.updateCategoryCounts();
        this.isInitialized = true;
        
        console.log(`⚠️ [Modern QuestionService] Using ${this.questions.length} fallback questions`);
      } catch (fallbackError: any) {
        console.error('❌ [Modern QuestionService] Even fallback questions failed:', fallbackError?.message || fallbackError);
        // Last resort - create minimal questions programmatically
        this.questions = [{
          id: 1,
          category: 'general',
          question: 'What is 2 + 2?',
          options: { A: '3', B: '4', C: '5', D: '6' },
          correctAnswer: 'B',
          explanation: '2 + 2 equals 4',
          difficulty: 'Easy'
        }];
        this.updateCategoryCounts();
        this.isInitialized = true;
        console.log('⚠️ [Modern QuestionService] Using minimal emergency question');
      }
    }
  }

  /**
   * Reinitialize with new language
   * Call this when user changes language
   */
  async reinitialize(): Promise<void> {
    console.log('🔄 [Modern QuestionService] Reinitializing for language change...');
    this.isInitialized = false;
    this.questions = [];
    this.usedQuestionIds.clear();
    this.categoryCounts = {};
    await this.initialize();
  }

  private parseQuestionsCSV(csvData: string): Question[] {
    try {
      console.log('📋 [Modern QuestionService] Parsing CSV data...');
      
      // Split into lines and remove empty lines
      const lines = csvData.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error('CSV data appears to be empty or invalid');
      }

      // Skip header row and parse data rows
      const dataLines = lines.slice(1);
      const questions: Question[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        try {
          const question = this.parseCSVLine(dataLines[i], i + 2); // +2 because we skipped header and 0-indexed
          if (question) {
            questions.push(question);
          }
        } catch (parseError: any) {
          console.warn(`⚠️ [Modern QuestionService] Failed to parse line ${i + 2}:`, parseError?.message);
          // Continue parsing other lines
        }
      }

      console.log(`✅ [Modern QuestionService] Successfully parsed ${questions.length} questions from CSV`);
      return questions;

    } catch (error: any) {
      console.error('❌ [Modern QuestionService] CSV parsing failed:', error?.message || error);
      return [];
    }
  }

  private parseCSVLine(line: string, lineNumber: number): Question | null {
    try {
      // Robust CSV parsing that tolerates commas in question and explanation fields
      // Strategy: split by comma, then assign fields from both ends inward
      const tokens = line.split(',');
      if (tokens.length < 10) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} has insufficient fields (${tokens.length})`);
        return null;
      }

      const id = tokens[0];
      const category = tokens[1];
      const level = tokens[tokens.length - 1];

      // Find the last single-letter token A/B/C/D to identify the correct answer position
      let correctIdx = -1;
      for (let i = tokens.length - 2; i >= 0; i--) {
        const t = tokens[i].trim().toUpperCase();
        if (t.length === 1 && ['A', 'B', 'C', 'D'].includes(t)) {
          correctIdx = i;
          break;
        }
      }
      if (correctIdx === -1) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} could not locate correct answer token (A/B/C/D)`);
        return null;
      }

      // Expect options immediately before correct answer (A,B,C,D order)
      const optionD = tokens[correctIdx - 1];
      const optionC = tokens[correctIdx - 2];
      const optionB = tokens[correctIdx - 3];
      const optionA = tokens[correctIdx - 4];
      if ([optionA, optionB, optionC, optionD].some(v => v === undefined)) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} missing options around correct answer index`);
        return null;
      }

      const correctAnswer = tokens[correctIdx];
      const question = tokens.slice(2, correctIdx - 4).join(',');
      const explanation = tokens.slice(correctIdx + 1, tokens.length - 1).join(',');

      // Validate required fields
      if (!id || !category || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !explanation) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} missing required fields after reconstruction`);
        return null;
      }

      // Validate correct answer
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer.trim().toUpperCase())) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} has invalid correct answer: ${correctAnswer}`);
        return null;
      }

      const questionData: Question = {
        id: parseInt(id.trim(), 10),
        category: category.trim().toLowerCase(),
        question: question.trim(),
        options: {
          A: optionA.trim(),
          B: optionB.trim(),
          C: optionC.trim(),
          D: optionD.trim(),
        },
        correctAnswer: correctAnswer.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D',
        explanation: explanation.trim(),
        difficulty: (level?.trim() || 'Medium') as 'Easy' | 'Medium' | 'Hard',
      };

      // Validate parsed data
      if (isNaN(questionData.id) || questionData.id <= 0) {
        console.warn(`⚠️ [Modern QuestionService] Line ${lineNumber} has invalid ID: ${id}`);
        return null;
      }

      return questionData;

    } catch (error: any) {
      console.warn(`⚠️ [Modern QuestionService] Error parsing line ${lineNumber}:`, error?.message);
      return null;
    }
  }

  private getFallbackQuestions(): Question[] {
    console.log('🆘 [Modern QuestionService] Creating fallback questions...');
    
    return [
      {
        id: 1,
        category: 'science',
        question: 'What is the largest organ in the human body?',
        options: {
          A: 'Heart',
          B: 'Brain', 
          C: 'Liver',
          D: 'Skin'
        },
        correctAnswer: 'D',
        explanation: 'The skin is the largest organ covering the entire body surface.',
        difficulty: 'Easy'
      },
      {
        id: 2,
        category: 'history',
        question: 'Who was the first President of the United States?',
        options: {
          A: 'Thomas Jefferson',
          B: 'George Washington',
          C: 'John Adams',
          D: 'Benjamin Franklin'
        },
        correctAnswer: 'B',
        explanation: 'George Washington served as the first US President from 1789 to 1797.',
        difficulty: 'Easy'
      },
      {
        id: 3,
        category: 'math',
        question: 'What is 7 × 8?',
        options: {
          A: '54',
          B: '55',
          C: '56',
          D: '57'
        },
        correctAnswer: 'C',
        explanation: '7 multiplied by 8 equals 56.',
        difficulty: 'Easy'
      }
    ];
  }

  private updateCategoryCounts(): void {
    this.categoryCounts = {};
    this.questions.forEach(question => {
      const category = question.category;
      this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;
    });
  }

  async getRandomQuestion(category?: string, difficulty?: 'Easy' | 'Medium' | 'Hard'): Promise<Question | null> {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      let filteredQuestions = [...this.questions];
      
      // Filter by category if provided
      if (category) {
        const normalizedCategory = category.toLowerCase().trim();
        filteredQuestions = filteredQuestions.filter(q => 
          q.category.toLowerCase() === normalizedCategory
        );
        
        if (filteredQuestions.length === 0) {
          console.warn(`⚠️ [Modern QuestionService] No questions found for category: ${category}`);
          
          // Fallback to any available category
          const availableCategories = Object.keys(this.categoryCounts);
          if (availableCategories.length > 0) {
            const fallbackCategory = availableCategories[0];
            console.log(`🔄 [Modern QuestionService] Falling back to category: ${fallbackCategory}`);
            return this.getRandomQuestion(fallbackCategory, difficulty);
          }
          
          // Last resort: return first question if any exist
          if (this.questions.length > 0) {
            console.log(`🆘 [Modern QuestionService] Returning first available question as fallback`);
            return this.questions[0];
          }
          
          return null;
        }
        
        console.log(`📚 [Modern QuestionService] Found ${filteredQuestions.length} questions for category: ${category}`);
      }
      
      // Filter by difficulty if provided
      if (difficulty) {
        const beforeDifficultyFilter = filteredQuestions.length;
        filteredQuestions = filteredQuestions.filter(q => 
          q.difficulty === difficulty
        );
        
        console.log(`📊 [Modern QuestionService] Filtered by difficulty ${difficulty}: ${beforeDifficultyFilter} → ${filteredQuestions.length} questions`);
        
        // If no questions match both category and difficulty, prioritize category
        if (filteredQuestions.length === 0 && category) {
          console.warn(`⚠️ [Modern QuestionService] No ${difficulty} questions in ${category}, using any difficulty`);
          return this.getRandomQuestion(category); // Retry without difficulty filter
        }
      }

      if (filteredQuestions.length === 0) {
        console.warn(`⚠️ [Modern QuestionService] No questions match the criteria`);
        
        // Last resort: return first question if any exist
        if (this.questions.length > 0) {
          console.log(`🆘 [Modern QuestionService] Returning first available question as fallback`);
          return this.questions[0];
        }
        
        return null;
      }

      // Filter out permanently-correct questions first, then recently used
      filteredQuestions = filteredQuestions.filter(q => !this.permanentlyCorrectIds.has(q.id));
      const availableQuestions = filteredQuestions.filter(q => !this.usedQuestionIds.has(q.id));

      // If all questions have been used, reset the used set for this filter
      if (availableQuestions.length === 0) {
        console.log(`🔄 [Modern QuestionService] No available questions for current filter after exclusions`);
        // Try any category/difficulty, still respecting permanent and used exclusions
        const fallbackPool = this.questions.filter(q => !this.permanentlyCorrectIds.has(q.id) && !this.usedQuestionIds.has(q.id));
        if (fallbackPool.length === 0) {
          console.warn('🛑 [Modern QuestionService] Entire pool exhausted (all questions answered correctly). Resetting pool.');
          await this.resetPermanentCorrectIds();
          // Retry with same filters from a fresh pool
          return this.getRandomQuestion(category, difficulty);
        }
        const idx = Math.floor(Math.random() * fallbackPool.length);
        const picked = fallbackPool[idx];
        this.usedQuestionIds.add(picked.id);
        return picked;
      }

      // Select random question from available ones
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const selectedQuestion = availableQuestions[randomIndex];

      // Mark as used
      this.usedQuestionIds.add(selectedQuestion.id);

      console.log(`✅ [Modern QuestionService] Selected question ${selectedQuestion.id}`, {
        category: selectedQuestion.category,
        difficulty: selectedQuestion.difficulty,
        availableCount: availableQuestions.length
      });
      
      return selectedQuestion;

    } catch (error: any) {
      console.error('❌ [Modern QuestionService] Error getting random question:', error?.message || error);
      
      // Return fallback question to prevent app crash
      if (this.questions.length > 0) {
        return this.questions[0];
      }
      
      return null;
    }
  }

  private async loadPermanentCorrectIds(): Promise<void> {
    try {
      const json = await AsyncStorage.getItem(this.STORAGE_KEYS.PERMANENT_CORRECT_IDS);
      if (json) {
        const arr: number[] = JSON.parse(json);
        this.permanentlyCorrectIds = new Set(arr);
        console.log(`🔒 [Modern QuestionService] Loaded ${this.permanentlyCorrectIds.size} permanently-correct IDs`);
      }
    } catch (e) {
      console.warn('⚠️ [Modern QuestionService] Failed to load permanent correct IDs');
    }
  }

  async markQuestionCorrect(questionId: number): Promise<void> {
    try {
      if (!this.permanentlyCorrectIds.has(questionId)) {
        this.permanentlyCorrectIds.add(questionId);
        const arr = Array.from(this.permanentlyCorrectIds);
        await AsyncStorage.setItem(this.STORAGE_KEYS.PERMANENT_CORRECT_IDS, JSON.stringify(arr));
        console.log(`✅ [Modern QuestionService] Permanently excluded question ${questionId}`);
      }
    } catch (e) {
      console.warn('⚠️ [Modern QuestionService] Failed to persist permanent correct ID:', questionId);
    }
  }

  private async resetPermanentCorrectIds(): Promise<void> {
    try {
      this.permanentlyCorrectIds.clear();
      this.usedQuestionIds.clear();
      await AsyncStorage.removeItem(this.STORAGE_KEYS.PERMANENT_CORRECT_IDS);
      console.log('♻️ [Modern QuestionService] Cleared permanent correct IDs and session used IDs');
    } catch (e) {
      console.warn('⚠️ [Modern QuestionService] Failed to reset permanent correct IDs');
    }
  }

  async getAvailableCategories(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return Object.keys(this.categoryCounts);
  }

  async getCategoryQuestionCount(category: string): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const normalizedCategory = category.toLowerCase().trim();
    return this.categoryCounts[normalizedCategory] || 0;
  }

  async getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<Question | null> {
    // Map difficulty levels to service format
    const difficultyMap = {
      easy: 'Easy',
      medium: 'Medium', 
      hard: 'Hard'
    } as const;
    
    const serviceDifficulty = difficultyMap[difficulty];
    return this.getRandomQuestion(undefined, serviceDifficulty);
  }

  async getTotalQuestionCount(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.questions.length;
  }

  resetUsedQuestions(): void {
    this.usedQuestionIds.clear();
    console.log('🔄 [Modern QuestionService] Reset all used questions');
  }

  resetUsedQuestionsForCategory(category: string): void {
    const normalizedCategory = category.toLowerCase().trim();
    const categoryQuestions = this.questions.filter(q => 
      q.category.toLowerCase() === normalizedCategory
    );
    
    categoryQuestions.forEach(q => this.usedQuestionIds.delete(q.id));
    console.log(`🔄 [Modern QuestionService] Reset used questions for category: ${normalizedCategory}`);
  }

  getServiceStatus() {
    return {
      initialized: this.isInitialized,
      totalQuestions: this.questions.length,
      usedQuestionsCount: this.usedQuestionIds.size,
      availableCategories: Object.keys(this.categoryCounts),
      categoryCounts: this.categoryCounts,
      dataSource: 'questionsData.ts (direct import)',
      lastError: null
    };
  }
}

// Export singleton instance
const QuestionService = new QuestionServiceClass();
export default QuestionService;