import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { generateMountainItinerary, GeneratedItinerary } from '../lib/ai-concierge';
import { ItineraryResultView } from './ItineraryResultView';
import { Colors } from '../constants/theme';

interface AiConciergeModalProps {
  visible: boolean;
  onClose: () => void;
  onItineraryGenerated?: (itinerary: GeneratedItinerary) => void;
}

export function AiConciergeModal({
  visible,
  onClose,
  onItineraryGenerated,
}: AiConciergeModalProps) {
  const [valley, setValley] = useState('Tirthan Valley & Jibhi');
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [style, setStyle] = useState<'quiet_workation' | 'trekking_adventure' | 'slow_living' | 'food_culture'>('slow_living');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedItinerary | null>(null);

  const travelStyles = [
    { id: 'slow_living', label: 'Slow Living & Cafes' },
    { id: 'quiet_workation', label: 'Quiet Workation (Fiber Wi-Fi)' },
    { id: 'trekking_adventure', label: 'Waterfalls & Treks' },
    { id: 'food_culture', label: 'Authentic Pahadi Food' },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const data = await generateMountainItinerary({
        valley,
        durationDays: days,
        travelersCount: travelers,
        travelStyle: style,
        amenitiesNeeded: ['fiber_wifi'],
      });
      setResult(data);
      setIsLoading(false);
      if (onItineraryGenerated) {
        onItineraryGenerated(data);
      }
    } catch (e: any) {
      setIsLoading(false);
      Alert.alert('AI Error', e.message || 'Could not generate itinerary');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Sparkles size={16} color={Colors.textPrimary} />
            <Text style={styles.headerTitle}>Ghumna Phirna AI Concierge</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!result ? (
            <>
              {/* Intro Card */}
              <View style={styles.introCard}>
                <Text style={styles.introKicker}>AI CONCIERGE</Text>
                <Text style={styles.introTitle}>Plan slow mountain days.</Text>
                <Text style={styles.introSub}>Local food, hikes, and road advice for your valley.</Text>
              </View>

              {/* Valley Selector */}
              <Text style={styles.fieldLabel}>Which Mountain Valley?</Text>
              <TextInput
                style={styles.input}
                value={valley}
                onChangeText={setValley}
                placeholder="e.g. Jibhi, Old Manali, Mukteshwar, Kasol"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Days Stepper */}
              <View style={styles.stepperRow}>
                <View>
                  <Text style={styles.stepperLabel}>Trip Duration</Text>
                  <Text style={styles.stepperSub}>Days in the hills</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setDays(Math.max(1, days - 1))}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{days} Days</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setDays(Math.min(7, days + 1))}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Travel Style Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>What's Your Mountain Mood?</Text>
              <View style={styles.styleGrid}>
                {travelStyles.map((s) => {
                  const isActive = style === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.styleChip, isActive && styles.styleChipActive]}
                      onPress={() => setStyle(s.id as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.styleChipText, isActive && styles.styleChipTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerate}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.textWhite} />
                ) : (
                  <>
                    <Sparkles size={18} color={Colors.textWhite} />
                    <Text style={styles.generateButtonText}>Generate Custom Itinerary</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <ItineraryResultView plan={result} onNewPlan={() => setResult(null)} />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: '#0F1419',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  introKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 1,
    marginBottom: 6,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textWhite,
    lineHeight: 24,
  },
  introSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepperSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 50,
    textAlign: 'center',
  },
  styleGrid: {
    gap: 8,
    marginBottom: 24,
  },
  styleChip: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  styleChipActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  styleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  styleChipTextActive: {
    color: Colors.textWhite,
  },
  generateButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  generateButtonText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
});
