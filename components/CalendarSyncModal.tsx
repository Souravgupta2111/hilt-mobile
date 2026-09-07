import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface CalendarSyncModalProps {
  visible: boolean;
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function CalendarSyncModal({ visible, propertyId, propertyTitle, onClose }: CalendarSyncModalProps) {
  const [icalUrl, setIcalUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const exportUrl = SUPABASE_URL && propertyId
    ? `${SUPABASE_URL}/functions/v1/ical-export?property_id=${propertyId}`
    : '';

  const handleSync = async () => {
    if (!icalUrl.trim() || !propertyId) {
      Alert.alert('Add a feed', 'Paste an Airbnb / MMT iCal URL first.');
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      Alert.alert('Not configured', 'Calendar sync is unavailable in this build.');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ical-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ property_id: propertyId, ical_url: icalUrl.trim(), source: 'airbnb' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Sync failed (${res.status})`);
      setLastResult(`${data.events_synced ?? 0} dates synced`);
    } catch (e: any) {
      Alert.alert('Sync failed', e.message || 'Try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar sync</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.propertyTitle}>{propertyTitle || 'Your listing'}</Text>
          <Text style={styles.subtitle}>Import external bookings, export Hilt availability.</Text>

          <Text style={styles.fieldLabel}>Import iCal URL</Text>
          <TextInput
            style={styles.input}
            value={icalUrl}
            onChangeText={setIcalUrl}
            placeholder="https://…/calendar.ics"
            autoCapitalize="none"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.syncBtnText}>Sync now</Text>
            )}
          </TouchableOpacity>
          {lastResult ? <Text style={styles.result}>{lastResult}</Text> : null}

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Export Hilt feed</Text>
          <View style={styles.exportRow}>
            <Text style={styles.exportUrl} selectable>{exportUrl || 'Unavailable'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceLight },
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 20, paddingVertical: 18 },
  propertyTitle: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  syncBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  syncBtnText: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
  result: { fontSize: 13, color: '#15803D', fontWeight: '600', marginTop: 10 },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: Colors.backgroundApp,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exportUrl: { flex: 1, fontSize: 11, color: Colors.textSecondary },
  copyBtn: { backgroundColor: Colors.primaryBlack, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999 },
  copyText: { color: Colors.textWhite, fontSize: 12, fontWeight: '700' },
});
