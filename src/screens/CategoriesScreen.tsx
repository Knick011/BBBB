// src/screens/CategoriesScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ScrollView,
  Animated,
  Platform,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your brain food...</Text>
        </View>
      </View>
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
    <View style={styles.container}>
      {/* Custom header that extends to top */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#FFB84D', '#FF9F1C']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your Challenge!</Text>
          <View style={styles.questionCount}>
            <Icon name="brain" size={20} color="#FFF" />
            <Text style={styles.questionCountText}>{totalQuestions} brain-tickling questions</Text>
          </View>
        </View>
      </View>
      
      {/* Categories content */}
      <View style={styles.content}>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    backgroundColor: '#FF9F1C',
    // No fixed height - uses paddingTop for safe area
  },
  headerContent: {
    padding: 20,
    paddingTop: 10, // Additional padding after safe area
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  questionCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionCountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF8E7',
    marginTop: 15,  // ADD THIS
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