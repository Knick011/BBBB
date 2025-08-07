import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const AssetTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asset Test</Text>
      
      <View style={styles.mascotContainer}>
        <Text style={styles.subtitle}>Mascot Images:</Text>
        <View style={styles.imageRow}>
          <Image 
            source={require('../../assets/mascot/below.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Image 
            source={require('../../assets/mascot/happy.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Image 
            source={require('../../assets/mascot/sad.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.imageRow}>
          <Image 
            source={require('../../assets/mascot/excited.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Image 
            source={require('../../assets/mascot/gamemode.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Image 
            source={require('../../assets/mascot/depressed.png')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>
      </View>
      
      <View style={styles.soundContainer}>
        <Text style={styles.subtitle}>Sound Files:</Text>
        <Text style={styles.soundText}>✓ correct.mp3</Text>
        <Text style={styles.soundText}>✓ incorrect.mp3</Text>
        <Text style={styles.soundText}>✓ buttonpress.mp3</Text>
        <Text style={styles.soundText}>✓ streak.mp3</Text>
        <Text style={styles.soundText}>✓ gamemusic.mp3</Text>
        <Text style={styles.soundText}>✓ menumusic.mp3</Text>
      </View>
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
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 10,
    fontFamily: 'Nunito-Bold',
  },
  mascotContainer: {
    marginBottom: 30,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  mascotImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  soundContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
  },
  soundText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 5,
    fontFamily: 'Nunito-Regular',
  },
});

export default AssetTest; 