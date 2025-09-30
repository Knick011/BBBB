// src/components/common/LanguageSelector.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { changeLanguage } from '../../locales/i18n';

const { width, height } = Dimensions.get('window');

interface LanguageSelectorProps {
  onLanguageSelected: (language: 'en' | 'tr') => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageSelected }) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [scaleAnim] = React.useState(new Animated.Value(0.8));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLanguageSelect = async (language: 'en' | 'tr') => {
    await changeLanguage(language);
    onLanguageSelected(language);
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo/Icon */}
          <View style={styles.iconContainer}>
            <Icon name="translate" size={80} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.titleTR}>Dilinizi Seçin</Text>

          {/* Language Buttons */}
          <View style={styles.buttonsContainer}>
            {/* English Button */}
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => handleLanguageSelect('en')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F0F0F0']}
                style={styles.buttonGradient}
              >
                <Text style={styles.flag}>🇬🇧</Text>
                <Text style={styles.languageName}>English</Text>
                <Icon name="chevron-right" size={24} color="#667eea" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Turkish Button */}
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => handleLanguageSelect('tr')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F0F0F0']}
                style={styles.buttonGradient}
              >
                <Text style={styles.flag}>🇹🇷</Text>
                <Text style={styles.languageName}>Türkçe</Text>
                <Icon name="chevron-right" size={24} color="#667eea" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            You can change this later in Settings
          </Text>
          <Text style={styles.footerTextTR}>
            Bunu daha sonra Ayarlar'dan değiştirebilirsiniz
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleTR: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  languageButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 16,
  },
  flag: {
    fontSize: 40,
  },
  languageName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  footerText: {
    marginTop: 32,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  footerTextTR: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

export default LanguageSelector;