import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  Alert,
} from 'react-native';
import { colors } from '../styles/theme';

export const CarryoverTest: React.FC = () => {
  const [carryoverInfo, setCarryoverInfo] = useState<any>(null);
  const [todayScore, setTodayScore] = useState<number>(0);

  useEffect(() => {
    loadCarryoverInfo();
  }, []);

  const loadCarryoverInfo = async () => {
    try {
      if (NativeModules.DailyScoreCarryover) {
        const info = await NativeModules.DailyScoreCarryover.getCarryoverInfo();
        const score = await NativeModules.DailyScoreCarryover.getTodayStartScore();
        setCarryoverInfo(info);
        setTodayScore(score);
      }
    } catch (error) {
      console.error('Failed to load carryover info:', error);
    }
  };

  const testProcessEndOfDay = async () => {
    try {
      if (NativeModules.DailyScoreCarryover) {
        await NativeModules.DailyScoreCarryover.processEndOfDay();
        Alert.alert('Success', 'End of day processing completed');
        loadCarryoverInfo();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process end of day');
    }
  };

  const testCheckNewDay = async () => {
    try {
      if (NativeModules.DailyScoreCarryover) {
        await NativeModules.DailyScoreCarryover.checkAndProcessNewDay();
        Alert.alert('Success', 'New day check completed');
        loadCarryoverInfo();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check new day');
    }
  };

  if (!NativeModules.DailyScoreCarryover) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>DailyScoreCarryover module not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carryover System Test</Text>
      
      <View style={styles.infoSection}>
        <Text style={styles.label}>Today's Start Score:</Text>
        <Text style={styles.value}>{todayScore}</Text>
      </View>

      {carryoverInfo && (
        <View style={styles.infoSection}>
          <Text style={styles.label}>Remaining Time:</Text>
          <Text style={styles.value}>{carryoverInfo.remainingTimeMinutes} minutes</Text>
          
          <Text style={styles.label}>Overtime:</Text>
          <Text style={styles.value}>{carryoverInfo.overtimeMinutes} minutes</Text>
          
          <Text style={styles.label}>Potential Carryover:</Text>
          <Text style={[styles.value, carryoverInfo.isPositive ? styles.positive : styles.negative]}>
            {carryoverInfo.potentialCarryoverScore > 0 ? '+' : ''}{carryoverInfo.potentialCarryoverScore} points
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={loadCarryoverInfo}>
          <Text style={styles.buttonText}>Refresh Info</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testProcessEndOfDay}>
          <Text style={styles.buttonText}>Test End of Day</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testCheckNewDay}>
          <Text style={styles.buttonText}>Test New Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundLight,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontSize: 16,
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
}); 