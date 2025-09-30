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
  const [buttonScale1] = React.useState(new Animated.Value(1));
  const [buttonScale2] = React.useState(new Animated.Value(1));

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

    // Playful floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale1, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale2, {
          toValue: 1.05,
          duration: 2000,
          delay: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale2, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLanguageSelect = async (language: 'en' | 'tr') => {
    await changeLanguage(language);
    onLanguageSelected(language);
  };

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.95,
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
    <LinearGradient
      colors={['#FFE5D9', '#FFD7C9', '#FFC9B9']}
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
            <View style={styles.iconBubble}>
              <Icon name="earth" size={70} color="#FF9F1C" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Choose Your Language! 🌍</Text>
          <Text style={styles.titleTR}>Dilinizi Seçin! 🌍</Text>

          {/* Language Buttons */}
          <View style={styles.buttonsContainer}>
            {/* English Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale1 }] }}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleLanguageSelect('en')}
                onPressIn={() => handlePressIn(buttonScale1)}
                onPressOut={() => handlePressOut(buttonScale1)}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={['#81C784', '#66BB6A', '#4CAF50']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.flagCircle}>
                    <Text style={styles.flag}>🇬🇧</Text>
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.languageName}>English</Text>
                    <Text style={styles.languageSubtext}>Let's go!</Text>
                  </View>
                  <Icon name="arrow-right-circle" size={32} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Turkish Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale2 }] }}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => handleLanguageSelect('tr')}
                onPressIn={() => handlePressIn(buttonScale2)}
                onPressOut={() => handlePressOut(buttonScale2)}
                activeOpacity={1}
              >
                <LinearGradient
                  colors={['#E57373', '#EF5350', '#F44336']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.flagCircle}>
                    <Text style={styles.flag}>🇹🇷</Text>
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.languageName}>Türkçe</Text>
                    <Text style={styles.languageSubtext}>Hadi başlayalım!</Text>
                  </View>
                  <Icon name="arrow-right-circle" size={32} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer Note */}
          <View style={styles.footerContainer}>
            <Icon name="information-outline" size={16} color="#FF9F1C" />
            <Text style={styles.footerText}>
              You can change this later in Settings
            </Text>
          </View>
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
    marginBottom: 24,
  },
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9F1C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF9F1C',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleTR: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF8C00',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  languageButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 16,
  },
  flagCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  flag: {
    fontSize: 36,
  },
  textContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  languageSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 40,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  footerTextTR: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LanguageSelector;