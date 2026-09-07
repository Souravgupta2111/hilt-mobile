import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Calendar, MessageCircle, Minus, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { EmptyState } from '../../components/EmptyState';
import { ReceiptModal } from '../../components/ReceiptModal';
import { HillCoverClaimModal } from '../../components/HillCoverClaimModal';
import { CalendarRangePicker } from '../../components/CalendarRangePicker';
import { getOrCreateConversation } from '../../lib/chat';
import {
  getTravelerBookings,
  getPropertyAvailability,
  quoteCancellation,
  cancelBooking,
  modifyBooking,
} from '../../lib/supabase';
import { Booking } from '../../types/database';

export default function TripsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Booking | null>(null);
  const [claimTarget, setClaimTarget] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      setBookings(await getTravelerBookings());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadBookings();
    setIsRefreshing(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter((b) => b.check_out >= today && b.status !== 'cancelled');
  const past = bookings.filter((b) => b.check_out < today || b.status === 'cancelled');

  const openChat = async (b: Booking) => {
    try {
      const convo = await getOrCreateConversation(b);
      router.push({ pathname: '/(tabs)/messages', params: { conversationId: convo.id } });
    } catch (e: any) {
      Alert.alert('Chat unavailable', e.message || 'Try again.');
    }
  };

  const handleCancel = (b: Booking) => {
    const { refundInr, policy } = quoteCancellation(b);
    Alert.alert(
      'Cancel this trip?',
      `${b.property?.title || 'Stay'}\n${b.check_in} → ${b.check_out}\n\n${policy}\nRefund: ₹${refundInr.toLocaleString('en-IN')}`,
      [
        { text: 'Keep trip', style: 'cancel' },
        {
          text: 'Cancel trip',
          style: 'destructive',
          onPress: async () => {
            setBusyId(b.id);
            try {
              const res = await cancelBooking(b);
              Alert.alert(
                'Cancelled',
                res.refundInr > 0
                  ? `Refund of ₹${res.refundInr.toLocaleString('en-IN')} initiated.`
                  : 'Cancelled with no refund due.'
              );
              await loadBookings();
            } catch (e: any) {
              Alert.alert('Cancellation failed', e.message || 'Try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleHelp = (b: Booking) => {
    Alert.alert('Trip Help & HillCover', 'What do you need assistance with?', [
      { text: 'Chat with host', onPress: () => openChat(b) },
      { text: 'File HillCover claim', onPress: () => setClaimTarget(b) },
      {
        text: 'Cancellation policy',
        onPress: () => Alert.alert('Policy', quoteCancellation(b).policy),
      },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const renderCard = (b: Booking) => {
    const cancellable = b.status !== 'cancelled' && b.check_out >= today;
    const modifiable = (b.status === 'pending' || b.status === 'confirmed') && b.check_out >= today;
    return (
      <View key={b.id} style={styles.card}>
        {b.property?.images?.[0] ? (
          <Image source={{ uri: b.property.images[0] }} style={styles.image} resizeMode="cover" />
        ) : null}
        <View style={styles.body}>
          <View style={styles.statusRow}>
            <Text style={[styles.status, b.status === 'cancelled' && styles.statusCancelled]}>
              {b.status}
            </Text>
            <Text style={styles.nights}>{b.total_nights} nights</Text>
          </View>
          <Text style={styles.title}>{b.property?.title || 'Stay'}</Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={Colors.textSecondary} />
            <Text style={styles.meta}>
              {b.property?.town || ''}{b.property?.town ? ' · ' : ''}{b.property?.state || ''}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Calendar size={12} color={Colors.textSecondary} />
            <Text style={styles.meta}>
              {b.check_in} → {b.check_out} · {b.guests_count} guests
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>₹{b.total_amount.toLocaleString('en-IN')}</Text>
          </View>
          {b.razorpay_order_id ? (
            <Text style={styles.orderId}>Order {b.razorpay_order_id}</Text>
          ) : null}
          {b.status !== 'cancelled' && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(b)} activeOpacity={0.85}>
                <MessageCircle size={15} color={Colors.textWhite} />
                <Text style={styles.chatBtnText}>Chat</Text>
              </TouchableOpacity>
              {modifiable && (
                <TouchableOpacity style={styles.ghostBtn} onPress={() => setModifyTarget(b)}>
                  <Text style={styles.ghostText}>Modify</Text>
                </TouchableOpacity>
              )}
              {cancellable && (
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => handleCancel(b)}
                  disabled={busyId === b.id}
                >
                  {busyId === b.id ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={[styles.ghostText, styles.cancelText]}>Cancel</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setReceiptTarget(b)}>
                <Text style={styles.ghostText}>Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setClaimTarget(b)}>
                <Text style={[styles.ghostText, { color: '#059669', fontWeight: '700' }]}>HillCover</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => handleHelp(b)}>
                <Text style={styles.ghostText}>Help</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {!isLoading && bookings.length === 0 && (
          <EmptyState
            title="No trips yet"
            description="Your confirmed bookings will appear here."
            actionText="Explore stays"
            onAction={() => router.push('/(tabs)')}
          />
        )}

        {upcoming.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Upcoming</Text>
            {upcoming.map(renderCard)}
          </View>
        )}

        {past.length > 0 && (
          <View>
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Past & cancelled</Text>
            {past.map(renderCard)}
          </View>
        )}
      </ScrollView>

      <ReceiptModal
        visible={!!receiptTarget}
        booking={receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />

      <HillCoverClaimModal
        visible={!!claimTarget}
        booking={claimTarget}
        onClose={() => setClaimTarget(null)}
        onSubmitted={loadBookings}
      />

      {modifyTarget && (
        <ModifySheet
          booking={modifyTarget}
          onClose={() => setModifyTarget(null)}
          onDone={async () => {
            setModifyTarget(null);
            await loadBookings();
          }}
        />
      )}
    </SafeAreaView>
  );
}

function ModifySheet({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [checkIn, setCheckIn] = useState(booking.check_in);
  const [checkOut, setCheckOut] = useState(booking.check_out);
  const [guests, setGuests] = useState(booking.guests_count);
  const [availability, setAvailability] = useState<{
    bookedRanges: Array<{ start: string; end: string }>;
    blockedDates: string[];
  }>({ bookedRanges: [], blockedDates: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPropertyAvailability(booking.property_id).then((a) => {
      // Ignore this booking's own hold when checking.
      setAvailability({
        bookedRanges: a.bookedRanges.filter(
          (r) => !(r.start === booking.check_in && r.end === booking.check_out)
        ),
        blockedDates: a.blockedDates,
      });
    });
  }, [booking]);

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;
  const newTotal = booking.nightly_rate * Math.max(nights, 0) + Math.round(booking.nightly_rate * Math.max(nights, 0) * 0.02);
  const delta = newTotal - booking.total_amount;

  const save = async () => {
    setSaving(true);
    try {
      const res = await modifyBooking(booking, { check_in: checkIn, check_out: checkOut, guests_count: guests });
      if (res.deltaInr > 0) {
        Alert.alert(
          'Price increased',
          `The new total is ₹${res.deltaInr.toLocaleString('en-IN')} higher. Please cancel and rebook to pay the difference.`
        );
      } else if (res.deltaInr < 0) {
        Alert.alert('Updated', `Dates changed. ₹${Math.abs(res.deltaInr).toLocaleString('en-IN')} will be refunded.`);
      } else {
        Alert.alert('Updated', 'Your trip was modified.');
      }
      onDone();
    } catch (e: any) {
      Alert.alert('Modify failed', e.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.sheetSafe}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.ghostText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Modify trip</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <CalendarRangePicker
            bookedRanges={availability.bookedRanges}
            blockedDates={availability.blockedDates}
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              if (ci) setCheckIn(ci);
              if (co) setCheckOut(co);
            }}
          />
          <View style={styles.stepRow}>
            <Text style={styles.stepLabel}>Guests</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setGuests(Math.max(1, guests - 1))}>
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepVal}>{guests}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setGuests(Math.min(booking.property?.max_guests || 8, guests + 1))}
              >
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.deltaBox}>
            <Text style={styles.deltaLabel}>New total</Text>
            <Text style={styles.deltaVal}>₹{newTotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.deltaSub}>
              {delta === 0 ? 'No price change' : delta > 0 ? `+₹${delta.toLocaleString('en-IN')} more` : `−₹${Math.abs(delta).toLocaleString('en-IN')} back`}
            </Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || nights < 1}>
            {saving ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 14 : 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 130 },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  image: { width: '100%', height: 170 },
  body: { padding: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  status: { fontSize: 11, fontWeight: '700', color: '#15803D', textTransform: 'capitalize' },
  statusCancelled: { color: '#B91C1C' },
  nights: { fontSize: 11, color: Colors.textSecondary },
  title: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  meta: { fontSize: 12, color: Colors.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 13, color: Colors.textSecondary },
  totalVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  orderId: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 11,
  },
  chatBtnText: { color: Colors.textWhite, fontSize: 13, fontWeight: '700' },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  cancelText: { color: '#B91C1C' },
  sheetSafe: { flex: 1, backgroundColor: Colors.surfaceLight },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sheetBody: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  stepLabel: { fontSize: 15, color: Colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  deltaBox: { backgroundColor: Colors.backgroundApp, borderRadius: 16, padding: 14, marginTop: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  deltaLabel: { fontSize: 12, color: Colors.textSecondary },
  deltaVal: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  deltaSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
