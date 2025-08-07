// src/components/common/PrivacyConsent.tsx
// GDPR compliant privacy consent component for analytics

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnalyticsManager from '../../services/AnalyticsManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../styles/theme';

interface Props {
  visible: boolean;
  onConsentGiven: (consent: boolean) => void;
}

const PrivacyConsentModal: React.FC<Props> = ({ visible, onConsentGiven }) => {
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadSavedConsent();
  }, []);

  const loadSavedConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem('analyticsConsent');
      if (consent !== null) {
        setAnalyticsConsent(JSON.parse(consent));
      }
    } catch (error) {
      console.warn('Failed to load consent settings:', error);
    }
  };

  const handleConsentSubmit = async (consent: boolean) => {
    try {
      await AsyncStorage.setItem('analyticsConsent', JSON.stringify(consent));
      await AnalyticsManager.setUserConsent(consent);
      onConsentGiven(consent);
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => handleConsentSubmit(analyticsConsent)}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Icon name="shield-check" size={32} color={theme.colors.primary} />
              <Text style={styles.title}>Privacy & Analytics</Text>
            </View>

            {/* Main Content */}
            <View style={styles.section}>
              <Text style={styles.description}>
                We respect your privacy. BrainBites can collect anonymous usage data to improve the app experience.
              </Text>
            </View>

            {/* Analytics Toggle */}
            <View style={styles.optionSection}>
              <View style={styles.optionHeader}>
                <Icon name="chart-line" size={24} color={theme.colors.primary} />
                <Text style={styles.optionTitle}>Usage Analytics</Text>
                <Switch
                  value={analyticsConsent}
                  onValueChange={setAnalyticsConsent}
                  trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                  thumbColor={theme.colors.surface}
                />
              </View>
              <Text style={styles.optionDescription}>
                Help us improve the app by sharing anonymous usage statistics. This includes quiz performance, app usage patterns, and feature usage.
              </Text>
            </View>

            {/* Details Toggle */}
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsButtonText}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
              <Icon 
                name={showDetails ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>

            {/* Detailed Information */}
            {showDetails && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>What data do we collect?</Text>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Quiz scores and performance metrics</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>App usage patterns and feature interaction</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Device type and operating system</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Session duration and app crashes</Text>
                </View>

                <Text style={styles.detailsTitle}>What we DON'T collect:</Text>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Personal information (name, email, etc.)</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Location data</Text>
                </View>
                <View style={styles.bulletPoint}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>Contact information or device identifiers</Text>
                </View>

                <Text style={styles.gdprText}>
                  You can change these preferences anytime in Settings. Under GDPR, you have the right to access, rectify, or delete your data.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleConsentSubmit(analyticsConsent)}
            >
              <Text style={styles.acceptButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large,
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.large,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    padding: theme.spacing.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.large,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.small,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.large,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginLeft: theme.spacing.small,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.small,
    marginBottom: theme.spacing.medium,
  },
  detailsButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: theme.spacing.small,
  },
  detailsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.small,
    marginTop: theme.spacing.small,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: theme.spacing.small,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: theme.spacing.small,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  gdprText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.medium,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  actionButtons: {
    paddingHorizontal: theme.spacing.large,
    paddingBottom: theme.spacing.large,
  },
  button: {
    paddingVertical: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.surface,
  },
});

export default PrivacyConsentModal;