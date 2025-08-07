import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface DailyFlowCardProps {
  flowStreak: number;
  onPress: () => void;
}

const DailyFlowCard: React.FC<DailyFlowCardProps> = ({ flowStreak, onPress }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1; // Adjust for Monday start

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Icon name="flame-outline" size={20} color="#777" />
        <Text style={styles.title}>Daily Flow</Text>
        <View style={styles.streakBadge}>
          <Icon name="star" size={14} color="#FFB347" />
          <Text style={styles.streakCount}>{flowStreak}</Text>
        </View>
        <Icon name="time" size={20} color="#4CAF50" />
        <Text style={styles.timeText}>0:00</Text>
      </View>
      
      <View style={styles.weekGrid}>
        {days.map((day, index) => (
          <View
            key={index}
            style={[
              styles.dayCircle,
              index === adjustedToday && styles.currentDay,
              index < adjustedToday && flowStreak > (adjustedToday - index) && styles.completedDay,
            ]}
          >
            <Text style={[
              styles.dayText,
              index === adjustedToday && styles.currentDayText,
              index < adjustedToday && flowStreak > (adjustedToday - index) && styles.completedDayText,
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      <Text style={styles.motivationText}>Play today to continue your flow!</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'Roboto-Bold',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFB347',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentDay: {
    borderWidth: 2,
    borderColor: '#FFB347',
  },
  completedDay: {
    backgroundColor: '#4CAF50',
  },
  dayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'Roboto-Medium',
  },
  currentDayText: {
    color: '#FFB347',
  },
  completedDayText: {
    color: 'white',
  },
  motivationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DailyFlowCard; 