// src/locales/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import tr from './tr.json';

const LANGUAGE_KEY = '@BrainBites:language';

// Get device language
const getDeviceLanguage = (): string => {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

  if (!locale) {
    return 'en';
  }

  // Extract language code (e.g., 'tr_TR' -> 'tr', 'en_US' -> 'en')
  const languageCode = locale.split('_')[0].split('-')[0].toLowerCase();

  // Return 'tr' if Turkish, otherwise default to 'en'
  return languageCode === 'tr' ? 'tr' : 'en';
};

// Initialize i18n
const initI18n = async () => {
  try {
    // Try to get saved language preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const deviceLanguage = getDeviceLanguage();
    const initialLanguage = savedLanguage || deviceLanguage;

    console.log('🌍 [i18n] Initializing with language:', initialLanguage);
    console.log('🌍 [i18n] Device language:', deviceLanguage);
    console.log('🌍 [i18n] Saved language:', savedLanguage);

    await i18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          tr: { translation: tr },
        },
        lng: initialLanguage,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
        compatibilityJSON: 'v3',
      });

    console.log('✅ [i18n] Initialized successfully');
  } catch (error) {
    console.error('❌ [i18n] Initialization failed:', error);
    // Fallback initialization without saved language
    await i18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          tr: { translation: tr },
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
        compatibilityJSON: 'v3',
      });
  }
};

// Change language and save preference
export const changeLanguage = async (language: 'en' | 'tr') => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    console.log('✅ [i18n] Language changed to:', language);
  } catch (error) {
    console.error('❌ [i18n] Failed to change language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): string => {
  return i18n.language || 'en';
};

// Get saved language preference (async)
export const getSavedLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('❌ [i18n] Failed to get saved language:', error);
    return null;
  }
};

initI18n();

export default i18n;