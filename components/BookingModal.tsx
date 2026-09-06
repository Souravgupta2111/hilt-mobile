import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  ShieldCheck,
  Calendar,
  Users,
  Home,
  Bed,
  Check,
  Sparkles,
  Smartphone,
  CreditCard,
  Building,
  Lock,
} from 'lucide-react-native';
import { Property, PropertyRoom } from '../types/database';
import { Colors } from '../constants/theme';
import { createRazorpayOrder, processRazorpayPayment } from '../lib/razorpay';
import { createBooking, getCurrentUserProfile } from '../lib/supabase';
import { HillCoverModal } from './HillCoverModal';
import { AuthModal } from './AuthModal';

interface BookingModalProps {
  visible: boolean;
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({
  visible,
  property,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [bookingType, setBookingType] = useState<'entire_villa' | 'single_room'>(
    property.allows_entire_villa ? 'entire_villa' : 'single_room'
  );
  const [selectedRoom, setSelectedRoom] = useState<PropertyRoom | null>(
    property.rooms && property.rooms.length > 0 ? property.rooms[0] : null
  );
  const [nights, setNights] = useState(3);
  const [guests, setGuests] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHillCoverOpen, setIsHillCoverOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    getCurrentUserProfile().then((u) => setCurrentUser(u));
  }, []);

  const nightlyRate =
    bookingType === 'entire_villa'
      ? property.price_entire_villa
      : selectedRoom
      ? selectedRoom.price_per_night
      : 4500;

  const subtotal = nightlyRate * nights;
  const platformFee = Math.round(subtotal * 0.02); // 2% Hilt fee
  const airbnbFeeComparison = Math.round(subtotal * 0.18); // 18% Airbnb fee
  const savings = airbnbFeeComparison - platformFee;
  const totalAmount = subtotal + platformFee;

  const handleCheckout = async () => {
    const user = currentUser || {
      id: 'b0000000-0000-0000-0000-000000000002',
      full_name: 'Roman Vance',
      email: 'roman@hilt.travel',
      phone: '9816049210',
    };

    setIsProcessing(true);
    try {
      // 1. Create Razorpay Smart Escrow Order via live Supabase Edge Function
      const order = await createRazorpayOrder({
        amount: totalAmount,
        receipt: `rcpt_${property.id.substring(0, 8)}`,
        propertyId: property.id,
        guestName: user.full_name || 'Guest',
        guestPhone: user.phone || '9816049210',
        guestEmail: user.email || 'guest@hilt.travel',
        notes: {
          stay_title: property.title,
          nights: nights.toString(),
          method: paymentMethod,
        },
      });

      // 2. Launch Razorpay Payment Intent
      const paymentRes = await processRazorpayPayment(
        order,
        {
          name: user.full_name || 'Roman Vance',
          email: user.email || 'roman@hilt.travel',
          phone: user.phone || '9816049210',
        },
        property.title
      );

      // 3. Write real booking record to Supabase database
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 5);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + nights);

      await createBooking({
        property_id: property.id,
        room_id: bookingType === 'single_room' && selectedRoom ? selectedRoom.id : undefined,
        traveler_id: user.id || 'b0000000-0000-0000-0000-000000000002',
        booking_type: bookingType,
        check_in: checkInDate.toISOString().split('T')[0],
        check_out: checkOutDate.toISOString().split('T')[0],
        guests_count: guests,
        total_nights: nights,
        nightly_rate: nightlyRate,
        subtotal: subtotal,
        platform_fee: platformFee,
        total_amount: totalAmount,
        payment_status: 'captured_in_escrow',
        razorpay_order_id: paymentRes.razorpay_order_id,
        razorpay_payment_id: paymentRes.razorpay_payment_id,
        status: 'confirmed',
      });

      setIsProcessing(false);

      // 4. Confirm booking with Escrow guarantee & show receipt
      Alert.alert(
        'Booking Confirmed & Escrow Secured! 🏔️',
        `Reservation Confirmed for ${property.title}.\n\nRazorpay Order: ${paymentRes.razorpay_order_id}\nPayment ID: ${paymentRes.razorpay_payment_id}\n\nDates: ${checkInDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${checkOutDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} (${nights} Nights)\nAmount in Escrow: ₹${totalAmount.toLocaleString('en-IN')}\nHost Escrow Release: 24h post check-in\nHilt Fair 2% Fee: ₹${platformFee}\nYou saved ₹${savings.toLocaleString('en-IN')} vs Airbnb!\n\n🛡️ 100% Landslide & Roadblock Protection Active.`,
        [
          {
            text: 'View Hill Pass in Trips',
            onPress: () => {
              onClose();
              onSuccess();
            },
          },
        ]
      );
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert('Payment Error', e.message || 'Payment could not be completed.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reserve Stay</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Property Summary Kicker */}
          <View style={styles.propertySummary}>
            <Text style={styles.propTitle}>{property.title}</Text>
            <Text style={styles.propLocation}>
              {property.town}, {property.valley} • {property.altitude_meters}m ASL
            </Text>
          </View>

          {/* Dual Booking Selector (Entire Villa vs Room) */}
          <Text style={styles.sectionLabel}>Select Booking Mode</Text>
          <View style={styles.modeContainer}>
            {property.allows_entire_villa && (
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  bookingType === 'entire_villa' && styles.modeCardActive,
                ]}
                onPress={() => setBookingType('entire_villa')}
                activeOpacity={0.85}
              >
                <View style={styles.modeIconRow}>
                  <Home
                    size={20}
                    color={bookingType === 'entire_villa' ? Colors.textWhite : Colors.textPrimary}
                  />
                  {bookingType === 'entire_villa' && <Check size={18} color={Colors.textWhite} />}
                </View>
                <Text
                  style={[
                    styles.modeTitle,
                    bookingType === 'entire_villa' && styles.modeTitleActive,
                  ]}
                >
                  Entire Villa
                </Text>
                <Text
                  style={[
                    styles.modeDesc,
                    bookingType === 'entire_villa' && styles.modeDescActive,
                  ]}
                >
                  Exclusive estate • Up to {property.max_guests} guests
                </Text>
                <Text
                  style={[
                    styles.modePrice,
                    bookingType === 'entire_villa' && styles.modePriceActive,
                  ]}
                >
                  ₹{property.price_entire_villa.toLocaleString('en-IN')}/night
                </Text>
              </TouchableOpacity>
            )}

            {property.allows_room_booking && (
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  bookingType === 'single_room' && styles.modeCardActive,
                ]}
                onPress={() => setBookingType('single_room')}
                activeOpacity={0.85}
              >
                <View style={styles.modeIconRow}>
                  <Bed
                    size={20}
                    color={bookingType === 'single_room' ? Colors.textWhite : Colors.textPrimary}
                  />
                  {bookingType === 'single_room' && <Check size={18} color={Colors.textWhite} />}
                </View>
                <Text
                  style={[
                    styles.modeTitle,
                    bookingType === 'single_room' && styles.modeTitleActive,
                  ]}
                >
                  Individual Room
                </Text>
                <Text
                  style={[
                    styles.modeDesc,
                    bookingType === 'single_room' && styles.modeDescActive,
                  ]}
                >
                  Private ensuite bedroom in cedar homestay
                </Text>
                <Text
                  style={[
                    styles.modePrice,
                    bookingType === 'single_room' && styles.modePriceActive,
                  ]}
                >
                  from ₹4,500/night
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dates & Guests Controls */}
          <View style={styles.rowControls}>
            <View style={styles.controlBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Calendar size={16} color={Colors.textSecondary} />
                <Text style={styles.controlLabel}>Duration</Text>
              </View>
              <Text style={styles.controlValue}>{nights} Nights</Text>
            </View>

            <View style={styles.controlBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Users size={16} color={Colors.textSecondary} />
                <Text style={styles.controlLabel}>Guests</Text>
              </View>
              <Text style={styles.controlValue}>{guests} Guests</Text>
            </View>
          </View>

          {/* HillCover™ Assurance Card */}
          <TouchableOpacity
            style={styles.hillCoverCard}
            onPress={() => setIsHillCoverOpen(true)}
            activeOpacity={0.88}
          >
            <View style={styles.hillCoverHeader}>
              <View style={styles.shieldPill}>
                <ShieldCheck size={14} color="#15803D" />
                <Text style={styles.shieldPillText}>Hilt HillCover™ Included</Text>
              </View>
              <Text style={styles.hillCoverLearn}>Details →</Text>
            </View>
            <Text style={styles.hillCoverTitle}>
              100% Landslide, Roadblock & Escrow Protection
            </Text>
            <Text style={styles.hillCoverDesc}>
              Pass closure refund guarantee • 98% Smart Escrow held until 24h post check-in • ₹5L wood heritage damage care.
            </Text>
          </TouchableOpacity>

          {/* Payment Method Selector */}
          <Text style={styles.sectionLabel}>Select Payment Method</Text>
          <View style={styles.methodTabsRow}>
            <TouchableOpacity
              style={[styles.methodTab, paymentMethod === 'upi' && styles.methodTabActive]}
              onPress={() => setPaymentMethod('upi')}
              activeOpacity={0.85}
            >
              <Smartphone size={16} color={paymentMethod === 'upi' ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.methodTabText, paymentMethod === 'upi' && styles.methodTabTextActive]}>
                UPI / GPay
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, paymentMethod === 'card' && styles.methodTabActive]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.85}
            >
              <CreditCard size={16} color={paymentMethod === 'card' ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.methodTabText, paymentMethod === 'card' && styles.methodTabTextActive]}>
                Cards
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodTab, paymentMethod === 'netbanking' && styles.methodTabActive]}
              onPress={() => setPaymentMethod('netbanking')}
              activeOpacity={0.85}
            >
              <Building size={16} color={paymentMethod === 'netbanking' ? Colors.textWhite : Colors.textPrimary} />
              <Text style={[styles.methodTabText, paymentMethod === 'netbanking' && styles.methodTabTextActive]}>
                NetBanking
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2% Fair Fee Transparency HUD */}
          <View style={styles.feeHUD}>
            <View style={styles.feeHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color={Colors.textWhite} />
                <Text style={styles.feeTitle}>HILT 2% FAIR PRICING</Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save ₹{savings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>
                ₹{nightlyRate.toLocaleString('en-IN')} x {nights} nights
              </Text>
              <Text style={styles.ledgerVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>Hilt Platform Fee (2% only)</Text>
              <Text style={styles.ledgerVal}>₹{platformFee.toLocaleString('en-IN')}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total in Escrow</Text>
              <Text style={styles.totalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>

            <Text style={styles.escrowNote}>
              🛡️ 100% held safely in Razorpay Smart Escrow. Disbursed to host UPI 24h after your verified check-in.
            </Text>
          </View>
        </ScrollView>

        {/* Sticky Bottom Checkout Bar */}
        <View style={styles.checkoutBar}>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handleCheckout}
            disabled={isProcessing}
            activeOpacity={0.88}
          >
            <ShieldCheck size={20} color={Colors.textWhite} />
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Securing Escrow...' : `Pay ₹${totalAmount.toLocaleString('en-IN')} via ${paymentMethod.toUpperCase()}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* HillCover Modal */}
        <HillCoverModal
          visible={isHillCoverOpen}
          onClose={() => setIsHillCoverOpen(false)}
        />

        {/* Unified Auth Modal */}
        <AuthModal
          visible={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            handleCheckout();
          }}
        />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerCancel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  propertySummary: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  propTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  propLocation: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: Colors.pillInactive,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeCardActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  modeIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeTitleActive: {
    color: Colors.textWhite,
  },
  modeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  modeDescActive: {
    color: '#9CA3AF',
  },
  modePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  modePriceActive: {
    color: Colors.textWhite,
  },
  rowControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  controlBox: {
    flex: 1,
    backgroundColor: Colors.pillInactive,
    borderRadius: 16,
    padding: 14,
  },
  controlLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  controlValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  feeHUD: {
    backgroundColor: '#0F1419',
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  feeTitle: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savingsBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  savingsText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  ledgerLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  ledgerVal: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  totalVal: {
    color: Colors.textWhite,
    fontSize: 20,
    fontWeight: '800',
  },
  escrowNote: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  payButton: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  payButtonText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  hillCoverCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  hillCoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shieldPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  hillCoverLearn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  hillCoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  hillCoverDesc: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 15,
  },
  methodTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodTabActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  methodTabTextActive: {
    color: Colors.textWhite,
  },
});
