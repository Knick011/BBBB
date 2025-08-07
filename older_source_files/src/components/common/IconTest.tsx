import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const IconTest: React.FC = () => {
  const testIcons = [
    'leaf-outline',
    'flame',
    'flash',
    'trophy-outline',
    'time',
    'grid-outline',
    'checkmark-circle-outline',
    'close-circle',
    'arrow-forward-circle',
    'arrow-back-circle',
    'flash-outline',
    'help-circle-outline',
    'gift-outline',
    'information-circle-outline',
    'star-outline',
    'chevron-forward-circle',
    'close-circle-outline',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      <ScrollView>
        <View style={styles.iconGrid}>
          {testIcons.map((iconName, index) => (
            <View key={index} style={styles.iconItem}>
              <Icon name={iconName} size={24} color="#4A4A4A" />
              <Text style={styles.iconName}>{iconName}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFE5D9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Quicksand-Bold',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  iconItem: {
    alignItems: 'center',
    margin: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    width: 100,
  },
  iconName: {
    fontSize: 10,
    color: '#4A4A4A',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Nunito-Regular',
  },
});

export default IconTest; 