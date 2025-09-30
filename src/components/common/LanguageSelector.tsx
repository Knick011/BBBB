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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { changeLanguage } from '../../locales/i18n';

const { width, height } = Dimensions.get('window');

interface LanguageSelectorProps {
  onLanguageSelected: (language: 'en' | 'tr') => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageSelected }) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [scaleAnim] = React.useState(new Animated.Value(0.9));
  const [buttonScale1] = React.useState(new Animated.Value(1));
  const [buttonScale2] = React.useState(new Animated.Value(1));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 10,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLanguageSelect = async (language: 'en' | 'tr') => {
    await changeLanguage(language);
    onLanguageSelected(language);
  };

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
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
            <View style={styles.iconCircle}>
              <Icon name="web" size={40} color="#FF9F1C" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Select Language</Text>
          <Text style={styles.subtitle}>Choose your preferred language</Text>

          {/* Language Buttons */}
          <View style={styles.buttonsContainer}>
            {/* English Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale1 }] }}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleLanguageSelect('en')}
                onPressIn={() => handlePressIn(buttonScale1)}
                onPressOut={() => handlePressOut(buttonScale1)}
                activeOpacity={0.9}
              >
                <View style={styles.buttonContent}>
                  <Icon name="check-circle-outline" size={28} color="#FF9F1C" />
                  <Text style={styles.languageName}>English</Text>
                  <Icon name="chevron-right" size={24} color="#CCC" />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Turkish Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale2 }] }}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleLanguageSelect('tr')}
                onPressIn={() => handlePressIn(buttonScale2)}
                onPressOut={() => handlePressOut(buttonScale2)}
                activeOpacity={0.9}
              >
                <View style={styles.buttonContent}>
                  <Icon name="check-circle-outline" size={28} color="#FF9F1C" />
                  <Text style={styles.languageName}>Türkçe</Text>
                  <Icon name="chevron-right" size={24} color="#CCC" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer Note */}
          <Text style={styles.footerText}>
            You can change this anytime in Settings
          </Text>
          <Text style={styles.footerTextSecondary}>
            Bunu istediğiniz zaman Ayarlar'dan değiştirebilirsiniz
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 16,
  },
  languageName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  footerText: {
    marginTop: 40,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
  footerTextSecondary: {
    marginTop: 4,
    fontSize: 13,
    color: '#BBB',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default LanguageSelector;
