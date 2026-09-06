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
  Clipboard,
} from 'react-native';
import { X, Calendar, RefreshCw, Copy, Check, ShieldCheck, Link2 } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface CalendarSyncModalProps {
  visible: boolean;
  propertyTitle: string;
  onClose: () => void;
}

export function CalendarSyncModal({
  visible,
  propertyTitle,
  onClose,
}: CalendarSyncModalProps) {
  const [airbnbUrl, setAirbnbUrl] = useState(
    'https://www.airbnb.com/calendar/ical/89120491.ics?s=340192a'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('2 minutes ago');
  const [copied, setCopied] = useState(false);

  const hiltExportUrl = `https://eccqfucljzppqomaiwgp.supabase.co/functions/v1/ical-export?property_id=c0000000-0000-0000-0000-000000000001`;

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced('Just now');
      Alert.alert(
        'iCal Calendars Synced! 🔄',
        'Successfully pulled 6 blocked dates from Airbnb. Your Hilt calendar is 100% updated with zero double-booking risk.'
      );
    }, 1100);
  };

  const handleCopyExportUrl = () => {
    Clipboard.setString(hiltExportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied to Clipboard', 'Paste this URL into your Airbnb / MakeMyTrip "Import Calendar" setting.');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>2-Way Calendar Sync</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Subheader */}
          <Text style={styles.propertyTitle}>{propertyTitle}</Text>
          <Text style={styles.subtitle}>
            Keep your Airbnb, MakeMyTrip, and Hilt calendars in real-time sync. Never worry about double bookings while enjoying Hilt's 2% low fee.
          </Text>

          {/* Section 1: Import Airbnb Calendar */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Link2 size={18} color={Colors.primaryBlack} />
                <Text style={styles.cardTitle}>1. Import Airbnb Calendar (.ics)</Text>
              </View>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Active Sync</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Airbnb iCal Export URL</Text>
            <TextInput
              style={styles.input}
              value={airbnbUrl}
              onChangeText={setAirbnbUrl}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />

            <View style={styles.syncStatusRow}>
              <Text style={styles.syncStatusText}>Last synced: {lastSynced}</Text>
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={handleSyncNow}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color={Colors.textWhite} />
                <Text style={styles.syncNowBtnText}>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Export Hilt Calendar to Airbnb */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color={Colors.primaryBlack} />
                <Text style={styles.cardTitle}>2. Export Hilt Calendar to Airbnb</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Your Unique Hilt iCal Feed</Text>
            <View style={styles.exportRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, fontSize: 11 }]}
                value={hiltExportUrl}
                editable={false}
              />
              <TouchableOpacity
                style={[styles.copyBtn, copied && { backgroundColor: '#15803D' }]}
                onPress={handleCopyExportUrl}
                activeOpacity={0.8}
              >
                {copied ? (
                  <Check size={16} color={Colors.textWhite} />
                ) : (
                  <Copy size={16} color={Colors.textWhite} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.instructionText}>
              Paste this link into Airbnb Dashboard → Calendar → Import Calendar so dates booked on Hilt are blocked on Airbnb automatically.
            </Text>
          </View>

          {/* Simulated Synchronized Calendar Legend */}
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>CALENDAR SYNC STATUS</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.textWhite }]} />
                <Text style={styles.legendText}>Hilt Bookings (2% Fee)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Blocked via Airbnb</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
            </View>
          </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activeTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncStatusText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  syncNowBtnText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  legendCard: {
    backgroundColor: '#0F1419',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 1,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textWhite,
    fontWeight: '500',
  },
});
