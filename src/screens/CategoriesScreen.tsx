// src/screens/CategoriesScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
  Platform,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import theme from '../styles/theme';
import SoundService from '../services/SoundService';
import CategoryCard from '../components/CategoryCard';
import PeekingMascot from '../components/Mascot/PeekingMascot';
import { getAvailableCategories, CategoryInfo, getTotalQuestionsCount } from '../utils/categoryUtils';
import LinearGradient from 'react-native-linear-gradient';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Categories'>;

const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]);
  const mascotAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      
      const availableCategories = getAvailableCategories();
      const totalCount = getTotalQuestionsCount();
      
      setCategories(availableCategories || []);
      setTotalQuestions(totalCount || 0);
      
      cardAnims.current = (availableCategories || []).map(() => new Animated.Value(0));
      
      if (availableCategories && availableCategories.length > 0) {
        startAnimations();
      }
      
    } catch (error) {
      console.error('❌ [CategoriesScreen] Error loading categories:', error);
      setCategories([]);
      setTotalQuestions(0);
    } finally {
      setIsLoading(false);
    }
  };

  const startAnimations = () => {
    // Animate header
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animate mascot
    Animated.spring(mascotAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    // Animate cards with stagger
    const animations = cardAnims.current.map((anim, index) => 
      Animated.spring(anim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(100, animations).start();
  };
  
  const handleCategorySelect = (category: CategoryInfo) => {
    SoundService.playButtonPress();
    navigation.navigate('Quiz', { category: category.id });
  };
  
  const handleBack = () => {
    SoundService.playButtonPress();
    navigation.goBack();
  };
  
  const renderCategoryCard = ({ item, index }: { item: CategoryInfo; index: number }) => (
    <CategoryCard
      category={item}
      onPress={handleCategorySelect}
      animationValue={cardAnims.current[index]}
      delay={index * 100}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your brain food...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const mascotTranslateX = mascotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFE5D9', '#FFF', '#FFF']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.header,
            { 
              opacity: headerAnim,
              transform: [{ translateY: headerTranslateY }]
            }
          ]}
        >
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Choose Your Challenge!</Text>
            <View style={styles.statsContainer}>
              <Icon name="brain" size={16} color={theme.colors.primary} />
              <Text style={styles.headerSubtitle}>
                {totalQuestions} brain-tickling questions
              </Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        <Animated.View 
          style={[
            styles.mascotContainer,
            {
              transform: [{ translateX: mascotTranslateX }]
            }
          ]}
        >
          <PeekingMascot mood="excited" size={100} />
        </Animated.View>
        
        {categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={renderCategoryCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.row}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="brain" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No categories available</Text>
            <Text style={styles.emptySubtext}>Time to feed your brain!</Text>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 28, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  mascotContainer: {
    position: 'absolute',
    top: 100,
    right: 0,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  gridContainer: {
    padding: 12,
    paddingTop: 20,
  },
  row: {
    justifyContent: 'space-around',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
});

export default CategoriesScreen;