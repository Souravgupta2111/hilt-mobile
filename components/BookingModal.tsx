import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ShieldCheck, Minus, Plus } from 'lucide-react-native';
import { Property, PropertyRoom } from '../types/database';
import { Colors } from '../constants/theme';
import { createRazorpayOrder } from '../lib/razorpay';
import {
  getCurrentUserProfile,
  getPropertyAvailability,
  markIdentityVerified,
  getBookingByOrderId,
  priceQuote,
  KYC_REQUIRED_ABOVE,
} from '../lib/supabase';
import { AuthModal } from './AuthModal';
import { AadhaarKycModal } from './AadhaarKycModal';
import { CalendarRangePicker } from './CalendarRangePicker';
import { CheckoutWebView } from './CheckoutWebView';

interface BookingModalProps {
  visible: boolean;
  property: Property;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialGuests?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({
  visible,
  property,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [bookingType, setBookingType] = useState<'entire_villa' | 'single_room'>(
    property.allows_entire_villa ? 'entire_villa' : 'single_room'
  );
  const [selectedRoom, setSelectedRoom] = useState<PropertyRoom | null>(
    property.rooms && property.rooms.length > 0 ? property.rooms[0] : null
  );
  const [checkIn, setCheckIn] = useState<string | null>(initialCheckIn || null);
  const [checkOut, setCheckOut] = useState<string | null>(initialCheckOut || null);
  const [guests, setGuests] = useState(initialGuests || 2);
  const [availability, setAvailability] = useState<{
    bookedRanges: Array<{ start: string; end: string }>;
    blockedDates: string[];
  }>({ bookedRanges: [], blockedDates: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isKycOpen, setIsKycOpen] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; amountPaise: number } | null>(null);
  const [waitingCapture, setWaitingCapture] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      getCurrentUserProfile().then((u) => setCurrentUser(u));
      getPropertyAvailability(property.id).then(setAvailability);
      setBookingType(property.allows_entire_villa ? 'entire_villa' : 'single_room');
      setSelectedRoom(property.rooms && property.rooms.length > 0 ? property.rooms[0] : null);
      setCheckIn(initialCheckIn || null);
      setCheckOut(initialCheckOut || null);
      setGuests(initialGuests || 2);
      setCheckout(null);
      setWaitingCapture(false);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible, property]);

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;

  const nightlyRate =
    bookingType === 'entire_villa'
      ? property.price_entire_villa
      : selectedRoom?.price_per_night ?? property.price_entire_villa;

  const cleaningFee = property.cleaning_fee ?? 0;
  const { subtotal, platformFee, gstAmount, total: totalAmount } = priceQuote(
    nightlyRate,
    nights,
    cleaningFee
  );
  const minNights = property.min_nights ?? 1;
  const maxNights = property.max_nights ?? 30;
  const requestOnly = !property.instant_book;

  const kycReason = !currentUser
    ? null
    : !currentUser.is_identity_verified &&
      (property.requires_verified_guests || totalAmount >= KYC_REQUIRED_ABOVE)
    ? property.requires_verified_guests
      ? 'verified-host'
      : 'high-value'
    : null;
  const needsKyc = kycReason !== null;

  const startPolling = (orderId: string) => {
    setWaitingCapture(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const booking = await getBookingByOrderId(orderId);
      if (booking) {
        if (pollRef.current) clearInterval(pollRef.current);
        setWaitingCapture(false);
        setCheckout(null);
        Alert.alert(
          booking.status === 'pending' ? 'Request sent' : 'Booking confirmed',
          booking.status === 'pending'
            ? `${property.title} · the host has 24 hours to confirm. Full refund on decline.`
            : `${property.title} · ${booking.check_in} → ${booking.check_out}`,
          [
          {
            text: 'View in Trips',
            onPress: () => {
              onClose();
              onSuccess();
            },
          },
        ]);
      } else if (attempts >= 15) {
        if (pollRef.current) clearInterval(pollRef.current);
        setWaitingCapture(false);
        Alert.alert(
          'Waiting on payment',
          'We have not received confirmation yet. Your trip will appear once the payment captures.'
        );
      }
    }, 2000);
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (needsKyc) {
      Alert.alert(
        'Verification required',
        kycReason === 'high-value'
          ? `Bookings of ₹${KYC_REQUIRED_ABOVE.toLocaleString('en-IN')} and above need identity verification.`
          : 'This host only accepts verified guests.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Verify now', onPress: () => setIsKycOpen(true) },
        ]
      );
      return;
    }
    if (!checkIn || !checkOut || nights < 1) {
      Alert.alert('Pick dates', 'Choose check-in and check-out dates.');
      return;
    }
    if (nights < minNights) {
      Alert.alert('Too short', `This stay needs at least ${minNights} night${minNights === 1 ? '' : 's'}.`);
      return;
    }
    if (nights > maxNights) {
      Alert.alert('Too long', `This stay allows at most ${maxNights} nights.`);
      return;
    }
    if (guests > property.max_guests) {
      Alert.alert('Too many guests', `This stay hosts up to ${property.max_guests}.`);
      return;
    }
    setIsProcessing(true);
    try {
      const order = await createRazorpayOrder({
        amount: totalAmount,
        receipt: `rcpt_${property.id.substring(0, 8)}`,
        propertyId: property.id,
        travelerId: currentUser.id,
        roomId: bookingType === 'single_room' && selectedRoom ? selectedRoom.id : undefined,
        bookingType,
        checkIn,
        checkOut,
        guestsCount: guests,
        totalNights: nights,
        nightlyRate,
        subtotal,
        cleaningFee,
        platformFee,
        gstAmount,
        initialStatus: requestOnly ? 'pending' : 'confirmed',
        guestEmail: currentUser.email,
      });
      setIsProcessing(false);
      setCheckout({ orderId: order.id, amountPaise: order.amount });
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert('Booking failed', e.message || 'Try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.headerCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book stay</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.propTitle}>{property.title}</Text>
          <Text style={styles.propLocation}>
            {property.town} · {property.valley}
          </Text>

          {needsKyc && (
            <TouchableOpacity style={styles.kycBanner} onPress={() => setIsKycOpen(true)}>
              <ShieldCheck size={16} color="#B91C1C" />
              <Text style={styles.kycText}>
                {kycReason === 'high-value'
                  ? 'Verification needed for this amount — tap to verify with Aadhaar'
                  : 'Verified guests only — tap to verify with Aadhaar'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>Stay type</Text>
          <View style={styles.modeContainer}>
            {property.allows_entire_villa && (
              <TouchableOpacity
                style={[styles.modeCard, bookingType === 'entire_villa' && styles.modeCardActive]}
                onPress={() => setBookingType('entire_villa')}
              >
                <Text style={[styles.modeTitle, bookingType === 'entire_villa' && styles.modeTitleActive]}>
                  Entire place
                </Text>
                <Text style={[styles.modePrice, bookingType === 'entire_villa' && styles.modePriceActive]}>
                  ₹{property.price_entire_villa.toLocaleString('en-IN')}/night
                </Text>
              </TouchableOpacity>
            )}
            {property.allows_room_booking && (
              <TouchableOpacity
                style={[styles.modeCard, bookingType === 'single_room' && styles.modeCardActive]}
                onPress={() => setBookingType('single_room')}
              >
                <Text style={[styles.modeTitle, bookingType === 'single_room' && styles.modeTitleActive]}>
                  Private room
                </Text>
                <Text style={[styles.modePrice, bookingType === 'single_room' && styles.modePriceActive]}>
                  ₹{(selectedRoom?.price_per_night ?? property.price_entire_villa).toLocaleString('en-IN')}/night
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {bookingType === 'single_room' && property.rooms && property.rooms.length > 1 && (
            <View style={styles.roomList}>
              {property.rooms.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roomChip, selectedRoom?.id === r.id && styles.roomChipActive]}
                  onPress={() => setSelectedRoom(r)}
                >
                  <Text style={[styles.roomText, selectedRoom?.id === r.id && styles.roomTextActive]}>
                    {r.room_name} · ₹{r.price_per_night.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Dates{nights > 0 ? ` · ${nights} night${nights > 1 ? 's' : ''}` : ''}</Text>
          <CalendarRangePicker
            bookedRanges={availability.bookedRanges}
            blockedDates={availability.blockedDates}
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Guests (max {property.max_guests})</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepButton} onPress={() => setGuests(Math.max(1, guests - 1))}>
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{guests}</Text>
              <TouchableOpacity style={styles.stepButton} onPress={() => setGuests(Math.min(property.max_guests, guests + 1))}>
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {requestOnly && (
            <View style={styles.requestBanner}>
              <Text style={styles.requestText}>
                The host confirms within 24 hours. You pay now; a decline refunds you in full.
              </Text>
            </View>
          )}

          <View style={styles.feeHUD}>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>
                ₹{nightlyRate.toLocaleString('en-IN')} × {nights} night{nights === 1 ? '' : 's'}
              </Text>
              <Text style={styles.ledgerVal}>₹{(nightlyRate * Math.max(nights, 0)).toLocaleString('en-IN')}</Text>
            </View>
            {cleaningFee > 0 && (
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>Cleaning fee</Text>
                <Text style={styles.ledgerVal}>₹{cleaningFee.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>Service fee (2%)</Text>
              <Text style={styles.ledgerVal}>₹{platformFee.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>GST (18% on fee)</Text>
              <Text style={styles.ledgerVal}>₹{gstAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.checkoutBar}>
          <TouchableOpacity style={styles.payButton} onPress={handleCheckout} disabled={isProcessing || waitingCapture}>
            {isProcessing || waitingCapture ? (
              <ActivityIndicator color={Colors.textWhite} />
            ) : (
              <>
                <ShieldCheck size={18} color={Colors.textWhite} />
                <Text style={styles.payButtonText}>
                  {currentUser
                    ? nights > 0
                      ? requestOnly
                        ? `Request · Pay ₹${totalAmount.toLocaleString('en-IN')}`
                        : `Pay ₹${totalAmount.toLocaleString('en-IN')}`
                      : 'Pick dates to continue'
                    : 'Sign in to book'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <AuthModal
          visible={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(user) => setCurrentUser(user)}
        />
        <AadhaarKycModal
          visible={isKycOpen}
          onClose={() => setIsKycOpen(false)}
          userType="guest"
          onVerified={async (res) => {
            await markIdentityVerified(res.maskedAadhaar);
            const u = await getCurrentUserProfile();
            setCurrentUser(u);
          }}
        />
        {checkout && (
          <CheckoutWebView
            visible={!!checkout}
            orderId={checkout.orderId}
            amountPaise={checkout.amountPaise}
            prefill={{ name: currentUser?.full_name, email: currentUser?.email, phone: currentUser?.phone }}
            onPaid={() => {
              setCheckout(null);
              startPolling(checkout.orderId);
            }}
            onFailed={(msg) => {
              setCheckout(null);
              Alert.alert('Payment failed', msg);
            }}
            onClose={() => setCheckout(null)}
          />
        )}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerCancel: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 110 },
  propTitle: { fontSize: 19, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  propLocation: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  kycText: { fontSize: 13, fontWeight: '600', color: '#B91C1C', flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 20, marginBottom: 10 },
  modeContainer: { flexDirection: 'row', gap: 10 },
  modeCard: { flex: 1, backgroundColor: Colors.pillInactive, borderRadius: 16, padding: 14 },
  modeCardActive: { backgroundColor: Colors.primaryBlack },
  modeTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  modeTitleActive: { color: Colors.textWhite },
  modePrice: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 4 },
  modePriceActive: { color: Colors.textWhite },
  roomList: { gap: 8, marginTop: 12 },
  roomChip: { backgroundColor: Colors.pillInactive, borderRadius: 12, padding: 12 },
  roomChipActive: { backgroundColor: Colors.primaryBlack },
  roomText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  roomTextActive: { color: Colors.textWhite },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepperLabel: { fontSize: 15, color: Colors.textPrimary },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 28, textAlign: 'center' },
  requestBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  requestText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  feeHUD: { backgroundColor: '#0F1419', borderRadius: 20, padding: 18, marginTop: 20 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  ledgerLabel: { color: '#9CA3AF', fontSize: 13 },
  ledgerVal: { color: Colors.textWhite, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
  totalVal: { color: Colors.textWhite, fontSize: 20, fontWeight: '800' },
  checkoutBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  payButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: { color: Colors.textWhite, fontSize: 16, fontWeight: '700' },
});
