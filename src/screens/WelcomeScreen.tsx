import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import SoundService from '../services/SoundService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

// Icon mappings for each slide's bullet points
const slideIcons = {
  welcome: ['check-circle-outline', 'lightbulb-outline', 'clock-outline', 'chart-line'],
  mascot: ['home', 'comment-text-outline', 'chart-box-outline', 'hand-wave'],
  quiz: ['view-grid-outline', 'trophy-outline', 'book-open-variant', 'trending-up'],
  screenTime: ['check', 'bell-outline', 'heart-outline', 'eye-outline'],
  overtime: ['clock-alert-outline', 'minus-circle-outline', 'alert-outline', 'brain'],
  goals: ['target', 'gift-outline', 'star-outline', 'fire'],
  ready: ['rocket-launch-outline', 'school-outline', 'timer-sand', 'account-heart-outline']
};

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentPage, setCurrentPage] = useState(0);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState<'excited' | 'happy' | 'gamemode' | 'sad' | 'depressed' | 'below'>('excited');
  const [mascotMessage, setMascotMessage] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  
  const pages = [
    {
      title: "Welcome to BrainBites!",
      bullets: [
        "Challenge your mind with fun quizzes",
        "Learn something new every day",
        "Build better screen time habits",
        "Track your progress and grow"
      ],
      icon: "brain",
      gradient: ['#FF9F1C', '#FFD699'],
      bulletIcons: slideIcons.welcome
    },
    {
      title: "Meet CaBBy!",
      subtitle: "Your friendly quiz companion",
      bullets: [
        "Lives in the corner during quizzes",
        "Tap for hints and explanations",
        "Tracks your progress",
        "Always ready to help"
      ],
      icon: "account-heart",
      gradient: ['#FF6B6B', '#FFB8B8'],
      isMascotSlide: true,
      bulletIcons: slideIcons.mascot
    },
    {
      title: "Quiz & Learn",
      bullets: [
        "Multiple categories to explore",
        "Earn points with correct answers",
        "Learn from detailed explanations",
        "Track your knowledge growth"
      ],
      icon: "head-question",
      gradient: ['#FFA726', '#FFCC80'],
      bulletIcons: slideIcons.quiz
    },
    {
      title: "Earn Screen Time",
      bullets: [
        "Correct answers = Screen time",
        "Persistent notification tracking",
        "Build healthier digital habits",
        "Stay aware of your usage"
      ],
      icon: "timer",
      gradient: ['#4ECDC4', '#A8E6CF'],
      bulletIcons: slideIcons.screenTime
    },
    {
      title: "Manage Overtime",
      bullets: [
        "Time runs out? Overtime begins",
        "Extra usage = Negative scores",
        "Affects overall performance",
        "Stay mindful, use time wisely"
      ],
      icon: "warning",
      gradient: ['#FF6B6B', '#FFB8B8'],
      bulletIcons: slideIcons.overtime
    },
    {
      title: "Daily Goals",
      bullets: [
        "Complete goals for big rewards",
        "Limited but highly rewarding",
        "Honor-based = Free time",
        "Keep your daily streak alive"
      ],
      icon: "target",
      gradient: ['#A8E6CF', '#7FCDCD'],
      bulletIcons: slideIcons.goals
    },
    {
      title: "Ready to Begin?",
      subtitle: "Start your journey to:",
      bullets: [
        "Smarter learning",
        "Better screen habits",
        "Daily growth",
        "CaBBy is here to help!"
      ],
      icon: "rocket-launch",
      gradient: ['#A8E6CF', '#7FCDCD'],
      isLast: true,
      bulletIcons: slideIcons.ready
    }
  ];
  
  useEffect(() => {
    SoundService.startMenuMusic();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => {
      SoundService.stopMusic();
    };
  }, []);

  // Update mascot when page changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateMascotForPage(currentPage);
    }, 500); // Small delay to let the slide animation complete
    
    return () => clearTimeout(timer);
  }, [currentPage]);

  const updateMascotForPage = (pageIndex: number) => {
    console.log('🐾 [WelcomeScreen] Updating mascot for page:', pageIndex);
    
    // Only show mascot on slide 2 (index 1) - the mascot introduction slide
    if (pageIndex === 1) {
      const mascotMessage = 'Hi there! I\'m CaBBy! 🎉\n\nI\'ll be your friendly quiz buddy, hanging out in the corner of your screen during quizzes. I love cheering on learners and helping them succeed! 💪\n\nI\'ll keep an eye on your progress and give you helpful tips along the way! 👀\n\nTap on me anytime for helpful hints, explanations, or just a friendly chat! ✨';
      const mascotType = 'excited';
      
      console.log('🐾 [WelcomeScreen] Setting mascot for slide 2:', { type: mascotType, hasMessage: !!mascotMessage });
      
      setMascotType(mascotType);
      setMascotMessage(mascotMessage);
      setShowMascot(true);
    } else {
      // Hide mascot for all other slides
      console.log('🐾 [WelcomeScreen] Hiding mascot for slide:', pageIndex);
      setShowMascot(false);
      setMascotMessage('');
    }
  };
  
  const handleNext = async () => {
    SoundService.playButtonPress();
    setShowMascot(false);

    if (currentPage < pages.length - 1) {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentPage(currentPage + 1);
        // Reset and animate in
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.8);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      await AsyncStorage.setItem('brainbites_onboarding_complete', 'true');
      SoundService.playStreak();
      navigation.replace('Home');
    }
  };
  
  const handleSkip = async () => {
    SoundService.playButtonPress();
    await AsyncStorage.setItem('brainbites_onboarding_complete', 'true');
    navigation.replace('Home');
  };
  
  const page = pages[currentPage];
  
  return (
    <LinearGradient
      colors={page.gradient}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
      
      <Animated.View style={[styles.animatedContainer, { 
        opacity: fadeAnim,
        transform: [{ 
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }]}>
        {/* Skip button */}
        {currentPage < pages.length - 1 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        
        {/* Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Icon name={page.icon} size={120} color="#FFF" />
          </View>
          
          <Text style={styles.title}>{page.title}</Text>
          {page.subtitle && (
            <Text style={styles.subtitle}>{page.subtitle}</Text>
          )}
          
          <View style={styles.bulletsContainer}>
            {page.bullets.map((bullet, index) => (
              <View key={index} style={styles.bulletItem}>
                <View style={styles.bulletIcon}>
                  <Icon 
                    name={page.bulletIcons[index]} 
                    size={20} 
                    color="white" 
                  />
                </View>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
        
        {/* Bottom section */}
        <View style={styles.bottom}>
          {/* Page indicators */}
          <View style={styles.pagination}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentPage && styles.activeDot,
                ]}
              />
            ))}
          </View>
          
          {/* Next button */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {page.isLast ? "Let's Begin!" : "Next"}
            </Text>
            <Icon 
              name={page.isLast ? 'rocket-launch' : 'arrow-right'} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <EnhancedMascotDisplay
        type={mascotType}
        position="right"
        showMascot={showMascot}
        message={mascotMessage}
        onDismiss={() => setShowMascot(false)}
        autoHide={false}
        fullScreen={true}
      />
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
  animatedContainer: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    color: '#FFF',
    fontSize: 16,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 26,
    marginBottom: 20,
  },
  bulletsContainer: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'flex-start',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  bulletIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
    lineHeight: 22,
  },
  bottom: {
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#FFF',
    width: 30,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default WelcomeScreen;