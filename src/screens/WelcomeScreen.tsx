// src/screens/WelcomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import SoundService from '../services/SoundService';
import EnhancedMascotDisplay from '../components/Mascot/EnhancedMascotDisplay';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');

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

const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentPage, setCurrentPage] = useState(0);
  const [showMascot, setShowMascot] = useState(false);
  const [mascotType, setMascotType] = useState<'excited' | 'happy' | 'gamemode' | 'sad' | 'depressed' | 'below'>('excited');
  const [mascotMessage, setMascotMessage] = useState('');

  // Animation values
  const logoAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SoundService.startMenuMusic();
    startAnimations();
    
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

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, {
            toValue: -15,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(logoAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();


  };

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
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => {
        setCurrentPage(currentPage + 1);
        slideAnim.setValue(0);
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }).start();
      });
    } else {
      await AsyncStorage.setItem('brainbites_onboarding_complete', 'true');
      SoundService.playStreak();
      navigation.replace('Home');
    }
  };

  const page = pages[currentPage];

  const Gradient = ({ colors }: { colors: string[] }) => (
    <View style={[styles.gradient, { backgroundColor: colors[0] }]}>
      <View style={[styles.gradientInner, { backgroundColor: colors[1] }]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={page.gradient[0]} barStyle="light-content" />
      <Gradient colors={page.gradient} />
      
      <Animated.View style={[styles.container, { 
        opacity: fadeAnim,
        transform: [{ 
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }]}>
        <View style={styles.content}>
          <Animated.View style={[styles.logoContainer, {
            transform: [{ translateY: logoAnim }]
          }]}>
            <Icon name={page.icon} size={80} color="white" />
          </Animated.View>
          
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
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.dotContainer}>
            {pages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dot, currentPage === index && styles.activeDot]}
                onPress={() => {
                  if (index <= currentPage) {
                    setShowMascot(false);
                    setCurrentPage(index);
                  }
                }}
              />
            ))}
          </View>
          
          <Text style={styles.progressText}>
            {currentPage + 1} of {pages.length}
          </Text>
        </View>
        
        <Animated.View style={{
          transform: [{ scale: buttonAnim }],
          opacity: fadeAnim
        }}>
          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: page.gradient[1] }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {page.isLast ? "Let's Begin!" : "Next"}
            </Text>
            {page.isLast ? 
              <Icon name="rocket-launch" size={20} color="white" /> :
              <Icon name="arrow-right" size={20} color="white" />
            }
          </TouchableOpacity>
        </Animated.View>
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
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientInner: {
    position: 'absolute',
    right: 0,
    top: '15%',
    width: '120%',
    height: '60%',
    borderTopLeftRadius: 500,
    borderBottomLeftRadius: 500,
    opacity: 0.4,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Black' : 'sans-serif-black',
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: 'center',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
    opacity: 0.95,
  },
  bulletsContainer: {
    width: '100%',
    maxWidth: 380,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 18,
    color: 'white',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 28,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  nextButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 200,
  },
  nextText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});

export default WelcomeScreen;