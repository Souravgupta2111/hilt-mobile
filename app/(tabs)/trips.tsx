import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Luggage,
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  Wifi,
  Key,
  ShieldCheck,
  ChevronRight,
  Download,
  Sparkles,
} from 'lucide-react-native';
import { Colors } from '../../constants/theme';
import { AadhaarBadge } from '../../components/AadhaarBadge';
import { EmptyState } from '../../components/EmptyState';
import { getTravelerBookings } from '../../lib/supabase';
import { Booking } from '../../types/database';

export default function TripsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBookings = async () => {
    setIsLoading(true);
    const data = await getTravelerBookings();
    setBookings(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadBookings();
    setIsRefreshing(false);
  };

  const activeBooking = bookings[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips & Passes</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primaryBlack} />
        }
      >
        {/* Empty State when no bookings exist */}
        {!isLoading && bookings.length === 0 && (
          <View style={{ marginTop: 40 }}>
            <EmptyState
              title="No Upcoming Trips"
              description="You haven't reserved any Himalayan stays yet. Explore handcrafted wooden estates to generate your offline hill boarding pass."
              actionText="Explore Mountain Stays"
              onAction={() => router.push('/(tabs)')}
            />
          </View>
        )}

        {/* Active Upcoming Stay (Dynamic Immersive Boarding Pass) */}
        {!isLoading && activeBooking && activeBooking.property && (
          <View>
            <Text style={styles.sectionHeader}>Upcoming Mountain Stay</Text>

            <View style={styles.boardingPass}>
              <Image
                source={{
                  uri:
                    activeBooking.property.images?.[0] ||
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
                }}
                style={styles.passImage}
                resizeMode="cover"
              />

              <View style={styles.passContent}>
                <View style={styles.statusRow}>
                  <View style={styles.confirmedBadge}>
                    <ShieldCheck size={13} color="#15803D" />
                    <Text style={styles.confirmedText}>
                      {activeBooking.status === 'confirmed' ? 'Confirmed & Escrow Secured' : activeBooking.status}
                    </Text>
                  </View>
                  <AadhaarBadge label="Verified Guest" size="small" />
                </View>

                <Text style={styles.stayTitle}>{activeBooking.property.title}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color={Colors.textSecondary} />
                  <Text style={styles.locationText}>
                    {activeBooking.property.valley} • {activeBooking.property.town}, {activeBooking.property.state}
                  </Text>
                </View>

                <View style={styles.datesBox}>
                  <Calendar size={15} color={Colors.textPrimary} />
                  <Text style={styles.datesText}>
                    {new Date(activeBooking.check_in).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} –{' '}
                    {new Date(activeBooking.check_out).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                    ({activeBooking.total_nights} Nights)
                  </Text>
                </View>

                {/* Escrow Details Capsule */}
                <View style={styles.escrowDetailsCapsule}>
                  <Text style={styles.escrowCapsuleText}>
                    ₹{activeBooking.total_amount?.toLocaleString('en-IN')} Secured in Escrow • Order: {activeBooking.razorpay_order_id?.slice(-8)}
                  </Text>
                </View>

                {/* Offline Hill Pass (Zero Cell Service Safe) */}
                <View style={styles.offlineBox}>
                  <View style={styles.offlineHeader}>
                    <Text style={styles.offlineTitle}>📶 OFFLINE HILL ACCESS PACKET</Text>
                    <Download size={14} color={Colors.textWhite} />
                  </View>

                  <View style={styles.credentialRow}>
                    <View style={styles.credItem}>
                      <Key size={13} color={Colors.textSecondary} />
                      <Text style={styles.credLabel}>Keybox PIN:</Text>
                      <Text style={styles.credValue}>4921</Text>
                    </View>

                    <View style={styles.credItem}>
                      <Wifi size={13} color={Colors.textSecondary} />
                      <Text style={styles.credLabel}>Wi-Fi Pass:</Text>
                      <Text style={styles.credValue}>CedarHilt2026</Text>
                    </View>
                  </View>

                  <Text style={styles.roadGuideTitle}>📍 Offline Road Directions:</Text>
                  <Text style={styles.roadGuideText}>
                    {activeBooking.property.address}. Sedan accessible tarmac road directly connected to highway.
                  </Text>
                </View>

                {/* Host Direct Contact Row */}
                <View style={styles.hostRow}>
                  <View>
                    <Text style={styles.hostName}>
                      Host: {activeBooking.property.host?.full_name || 'Abdur Rob'}
                    </Text>
                    <Text style={styles.hostPhone}>
                      {activeBooking.property.host?.phone || '+91 98160 44219'}
                    </Text>
                  </View>

                  <View style={styles.hostButtons}>
                    <TouchableOpacity
                      style={styles.hostContactBtn}
                      onPress={() =>
                        Alert.alert(
                          'Calling Host',
                          `Dialing ${activeBooking.property?.host?.phone || '+91 98160 44219'}...`
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Phone size={15} color={Colors.textWhite} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.hostContactBtn, { backgroundColor: Colors.primaryBlack }]}
                      onPress={() => Alert.alert('Chatting with Host', 'Opening direct message thread...')}
                      activeOpacity={0.8}
                    >
                      <MessageCircle size={15} color={Colors.textWhite} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Past Trips Section */}
        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Past Stays</Text>
        <View style={styles.pastTripCard}>
          <Text style={styles.pastTitle}>The Elements Villa • Manali</Text>
          <Text style={styles.pastDate}>Stayed July 2026 • 4.8★ Rated</Text>
          <TouchableOpacity
            style={styles.rebookBtn}
            onPress={() => Alert.alert('Rebook', 'Checking seasonal availability...')}
          >
            <Text style={styles.rebookText}>Book Again with 5% Host Loyalty</Text>
            <ChevronRight size={14} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  boardingPass: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  passImage: {
    width: '100%',
    height: 180,
  },
  passContent: {
    padding: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  stayTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  datesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.pillInactive,
    borderRadius: 12,
    padding: 12,
    marginVertical: 14,
  },
  datesText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  offlineBox: {
    backgroundColor: '#0F1419',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  offlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineTitle: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  credentialRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  credItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  credLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  credValue: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  roadGuideTitle: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  roadGuideText: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  hostPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  hostButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  hostContactBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastTripCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pastDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: Colors.surfaceLight,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  escrowDetailsCapsule: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  escrowCapsuleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
});
