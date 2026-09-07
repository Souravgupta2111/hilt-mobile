import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Sparkles, Minus, Plus, ChevronRight } from 'lucide-react-native';
import { generateMountainItinerary, type GeneratedItinerary } from '../../lib/ai-concierge';
import {
  getMyItineraries,
  saveGeneratedItinerary,
  itineraryToGenerated,
} from '../../lib/supabase';
import type { Itinerary } from '../../types/database';
import { ItineraryResultView } from '../../components/ItineraryResultView';
import { EmptyState } from '../../components/EmptyState';
import { Colors } from '../../constants/theme';

const SUGGESTIONS = ['Jibhi & Tirthan', 'Old Manali', 'Mukteshwar', 'Kasol'];

const VIBES = [
  { id: 'slow_living', label: 'Slow living' },
  { id: 'trekking_adventure', label: 'Treks' },
  { id: 'food_culture', label: 'Food' },
  { id: 'quiet_workation', label: 'Workation' },
] as const;

export default function ItinerariesScreen() {
  const [valley, setValley] = useState('');
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [vibe, setVibe] = useState<(typeof VIBES)[number]['id']>('slow_living');
  const [plan, setPlan] = useState<GeneratedItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Itinerary[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(async () => {
    setSaved(await getMyItineraries());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  const handleGenerate = async () => {
    const destination = valley.trim();
    if (!destination) {
      setError('Tell Gemini where you want to go.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await generateMountainItinerary({
        valley: destination,
        durationDays: days,
        travelersCount: travelers,
        travelStyle: vibe,
        amenitiesNeeded: ['fiber_wifi'],
      });
      setPlan(data);
      setSavedFlag(false);
    } catch (e: any) {
      setError(e.message || 'Could not plan this trip. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plan || saving) return;
    setSaving(true);
    try {
      await saveGeneratedItinerary(plan);
      setSavedFlag(true);
      await loadSaved();
    } catch (e: any) {
      setError(e.message || 'Could not save trip.');
    } finally {
      setSaving(false);
    }
  };

  const openSaved = (item: Itinerary) => {
    setPlan(itineraryToGenerated(item));
    setSavedFlag(true);
    setError(null);
  };

  const reset = () => {
    setPlan(null);
    setSavedFlag(false);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ghumna Phirna</Text>
        <Text style={styles.headerSub}>AI trip planner for the hills</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadSaved();
              setRefreshing(false);
            }}
          />
        }
      >
        {!plan ? (
          <View style={styles.plannerCard}>
            <View style={styles.aiRow}>
              <Sparkles size={14} color={Colors.textPrimary} />
              <Text style={styles.aiLabel}>Planned by Gemini</Text>
            </View>

            <Text style={styles.fieldLabel}>Where to?</Text>
            <TextInput
              style={styles.input}
              value={valley}
              onChangeText={(t) => {
                setValley(t);
                if (error) setError(null);
              }}
              placeholder="Jibhi, Manali, Mukteshwar…"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.suggestionRow}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestion} onPress={() => setValley(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Days</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(Math.max(1, days - 1))}>
                  <Minus size={14} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{days}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDays(Math.min(7, days + 1))}>
                  <Plus size={14} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Travelers</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setTravelers(Math.max(1, travelers - 1))}
                >
                  <Minus size={14} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{travelers}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setTravelers(Math.min(10, travelers + 1))}
                >
                  <Plus size={14} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.vibeRow}>
              {VIBES.map((v) => {
                const active = vibe === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vibeChip, active && styles.vibeChipActive]}
                    onPress={() => setVibe(v.id)}
                  >
                    <Text style={[styles.vibeText, active && styles.vibeTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.textWhite} />
              ) : (
                <>
                  <Sparkles size={16} color={Colors.textWhite} />
                  <Text style={styles.generateButtonText}>Plan my trip</Text>
                </>
              )}
            </TouchableOpacity>
            {loading && <Text style={styles.loadingHint}>Gemini is planning your days…</Text>}
          </View>
        ) : (
          <View>
            <TouchableOpacity onPress={reset} style={styles.backRow}>
              <Text style={styles.backText}>‹ New plan</Text>
            </TouchableOpacity>
            {error && <Text style={[styles.errorText, { marginBottom: 8 }]}>{error}</Text>}
            <ItineraryResultView
              plan={plan}
              showSave
              saved={savedFlag}
              saving={saving}
              onSave={handleSave}
              onNewPlan={reset}
            />
          </View>
        )}

        {!plan && saved.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved trips</Text>
            {saved.map((item) => (
              <TouchableOpacity key={item.id} style={styles.savedRow} onPress={() => openSaved(item)}>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedName} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.savedMeta}>
                    {item.region} · {item.duration_days} day{item.duration_days === 1 ? '' : 's'}
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!plan && saved.length === 0 && !loading && (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No trips yet"
              description="Plan your first mountain getaway above."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 14 : 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  plannerCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  aiLabel: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestion: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 9999, paddingHorizontal: 13, paddingVertical: 7 },
  suggestionText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  stepperLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 22, textAlign: 'center' },
  vibeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  vibeChip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 9999, paddingHorizontal: 15, paddingVertical: 9 },
  vibeChipActive: { backgroundColor: Colors.primaryBlack, borderColor: Colors.primaryBlack },
  vibeText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  vibeTextActive: { color: Colors.textWhite },
  errorText: { fontSize: 13, color: '#B91C1C', marginTop: 12, lineHeight: 18 },
  generateButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
  loadingHint: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 10 },
  backRow: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  savedSection: { marginTop: 22 },
  savedTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundApp,
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  savedInfo: { flex: 1 },
  savedName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  savedMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyWrap: { marginTop: 8 },
});
