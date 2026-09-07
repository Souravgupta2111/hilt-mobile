import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import {
  getPropertyAvailability,
  addPropertyBlock,
  removePropertyBlock,
} from '../lib/supabase';

interface AvailabilityManagerProps {
  visible: boolean;
  propertyId: string;
  propertyTitle: string;
  hostId: string;
  onClose: () => void;
}

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

/** Host blackout dates: tap a day to block / unblock it. */
export function AvailabilityManager({
  visible,
  propertyId,
  propertyTitle,
  hostId,
  onClose,
}: AvailabilityManagerProps) {
  const [blocked, setBlocked] = useState<string[]>([]);
  const [bookedRanges, setBookedRanges] = useState<Array<{ start: string; end: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const a = await getPropertyAvailability(propertyId);
    setBlocked(a.blockedDates);
    setBookedRanges(a.bookedRanges);
  };

  useEffect(() => {
    if (visible && propertyId) load();
  }, [visible, propertyId]);

  const toggleDay = async (iso: string) => {
    if (busy) return;
    setBusy(iso);
    try {
      if (blocked.includes(iso)) {
        await removePropertyBlock(propertyId, iso);
        setBlocked((b) => b.filter((d) => d !== iso));
      } else {
        await addPropertyBlock(propertyId, iso, hostId);
        setBlocked((b) => [...b, iso]);
      }
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const today = toISO(new Date());

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Availability</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{propertyTitle}</Text>
          <Text style={styles.sub}>Tap a day to block or unblock it. Booked nights can't change.</Text>
          <DayToggles
            blocked={blocked}
            bookedRanges={bookedRanges}
            today={today}
            busy={busy}
            onToggle={toggleDay}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DayToggles({
  blocked,
  bookedRanges,
  today,
  busy,
  onToggle,
}: {
  blocked: string[];
  bookedRanges: Array<{ start: string; end: string }>;
  today: string;
  busy: string | null;
  onToggle: (iso: string) => void;
}) {
  // Next 60 days as a simple toggle list (clearer than overloading the picker).
  const days: string[] = [];
  for (let i = 0; i < 60; i++) {
    days.push(toISO(new Date(Date.now() + i * 24 * 60 * 60 * 1000)));
  }
  return (
    <View style={styles.list}>
      {days.map((iso) => {
        const booked = bookedRanges.some((r) => iso >= r.start && iso < r.end);
        const isBlocked = blocked.includes(iso);
        return (
          <TouchableOpacity
            key={iso}
            style={[styles.dayRow, isBlocked && styles.dayRowBlocked, booked && styles.dayRowBooked]}
            onPress={() => !booked && onToggle(iso)}
            disabled={booked || busy === iso}
          >
            <Text style={styles.dayText}>
              {new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
            {busy === iso ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={[styles.dayState, isBlocked && styles.dayStateBlocked]}>
                {booked ? 'Booked' : isBlocked ? 'Blocked — tap to open' : 'Open — tap to block'}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
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
  content: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40 },
  title: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
  list: { marginTop: 16 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayRowBlocked: { opacity: 1 },
  dayRowBooked: { opacity: 0.5 },
  dayText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  dayState: { fontSize: 12, color: Colors.textSecondary },
  dayStateBlocked: { color: '#B91C1C', fontWeight: '700' },
});
