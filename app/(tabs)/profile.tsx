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
} from 'react-native';
import {
  Settings,
  Star,
  Users,
  Home,
  Plus,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { getHostProfile, getProperties, getHostStats, getTravelerBookings } from '../../lib/supabase';
import { Profile, Property, Booking } from '../../types/database';
import { PropertyGridCard } from '../../components/PropertyGridCard';
import { AddPropertyModal } from '../../components/AddPropertyModal';
import { CalendarSyncModal } from '../../components/CalendarSyncModal';
import { AuthModal } from '../../components/AuthModal';
import { AadhaarBadge } from '../../components/AadhaarBadge';
import { AadhaarKycModal } from '../../components/AadhaarKycModal';
import { Colors } from '../../constants/theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [activeSegment, setActiveSegment] = useState<'Listing' | 'Bookings' | 'Insights'>('Listing');
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [verifiedKyc, setVerifiedKyc] = useState<{ name?: string; maskedAadhaar?: string } | null>(null);

  useEffect(() => {
    getHostProfile().then((data) => setProfile(data));
    getProperties().then((data) => setProperties(data));
    getHostStats().then((data) => setStats(data));
    getTravelerBookings().then((data) => setHostBookings(data));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header (Ditto Mockup Exact) */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Agent profile</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setIsAuthModalOpen(true)}
          activeOpacity={0.8}
        >
          <Settings size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Row */}
        <View style={styles.profileRow}>
          <Image
            source={{
              uri:
                profile?.avatar_url ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.profileName}>{verifiedKyc?.name || profile?.full_name || 'Abdur rob'}</Text>
              <ShieldCheck size={16} color="#15803D" />
            </View>
            <Text style={styles.profileEmail}>
              {profile?.email || 'aritbd2020@gmail.com'}
            </Text>
            <TouchableOpacity
              onPress={() => setIsKycModalOpen(true)}
              activeOpacity={0.7}
              style={{ marginTop: 4, alignSelf: 'flex-start' }}
            >
              <AadhaarBadge
                label={verifiedKyc ? `Verified (${verifiedKyc.maskedAadhaar})` : "Aadhaar Verified Host"}
                size="small"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.editProfileButton} activeOpacity={0.8}>
            <Text style={styles.editProfileText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* 3 Stats Badges (Ditto Mockup Exact) */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconBadge}>
              <Star size={16} color="#F59E0B" fill="#F59E0B" />
            </View>
            <Text style={styles.statValue}>5.00</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconBadge}>
              <Users size={16} color={Colors.textPrimary} />
            </View>
            <Text style={styles.statValue}>200</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconBadge}>
              <Home size={16} color={Colors.textPrimary} />
            </View>
            <Text style={styles.statValue}>100</Text>
            <Text style={styles.statLabel}>Sold</Text>
          </View>
        </View>

        {/* Segmented Control Pill (Ditto Mockup Exact) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentPill,
              activeSegment === 'Listing' && styles.segmentPillActive,
            ]}
            onPress={() => setActiveSegment('Listing')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Listing' && styles.segmentTextActive,
              ]}
            >
              Listing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentPill,
              activeSegment === 'Bookings' && styles.segmentPillActive,
            ]}
            onPress={() => setActiveSegment('Bookings')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Bookings' && styles.segmentTextActive,
              ]}
            >
              Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentPill,
              activeSegment === 'Insights' && styles.segmentPillActive,
            ]}
            onPress={() => setActiveSegment('Insights')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'Insights' && styles.segmentTextActive,
              ]}
            >
              Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Listing View (2-Column Property Grid) */}
        {activeSegment === 'Listing' && (
          <View>
            {/* 2-Way Calendar Sync Banner */}
            <TouchableOpacity
              style={styles.calendarSyncCard}
              onPress={() => setIsCalendarSyncOpen(true)}
              activeOpacity={0.88}
            >
              <View style={styles.calendarSyncLeft}>
                <View style={styles.syncTagRow}>
                  <RefreshCw size={12} color="#15803D" />
                  <Text style={styles.syncTagText}>2-Way iCal Sync Active</Text>
                </View>
                <Text style={styles.calendarSyncTitle}>
                  Sync Airbnb & MakeMyTrip Calendars
                </Text>
                <Text style={styles.calendarSyncSub}>
                  Auto-blocks booked dates across channels • Zero double-booking risk
                </Text>
              </View>
              <View style={styles.syncBtnSmall}>
                <Text style={styles.syncBtnSmallText}>Sync iCal</Text>
              </View>
            </TouchableOpacity>

            {/* Top Action Row: Add Property Button */}
            <View style={styles.actionHeaderRow}>
              <Text style={styles.subSectionTitle}>Active Homestays & Villas</Text>
              <TouchableOpacity
                style={styles.addPropertySmallBtn}
                onPress={() => setIsAddPropertyOpen(true)}
                activeOpacity={0.85}
              >
                <Plus size={15} color={Colors.textWhite} />
                <Text style={styles.addPropertySmallText}>Add Property</Text>
              </TouchableOpacity>
            </View>

            {/* 2-Column Property Grid matching Mockup */}
            <View style={styles.gridContainer}>
              {properties.map((property) => (
                <PropertyGridCard
                  key={property.id}
                  property={property}
                  onPress={() => {}}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.addPropertyInlineBtn}
              onPress={() => setIsAddPropertyOpen(true)}
              activeOpacity={0.88}
            >
              <Plus size={18} color={Colors.textWhite} />
              <Text style={styles.addPropertyInlineText}>Start Hosting / Add Property</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2: Bookings View */}
        {activeSegment === 'Bookings' && (
          <View style={styles.bookingsContainer}>
            <Text style={styles.subSectionTitle}>Incoming Reservations</Text>

            {hostBookings.length === 0 ? (
              <View style={styles.emptyBookingsCard}>
                <Text style={styles.emptyBookingsTitle}>No Incoming Reservations</Text>
                <Text style={styles.emptyBookingsSub}>
                  Your mountain listings are active. New guest reservations will appear here with automated 98% Escrow payouts.
                </Text>
              </View>
            ) : (
              hostBookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeaderRow}>
                    <View>
                      <Text style={styles.bookingGuestName}>{b.traveler?.full_name || 'Himalayan Traveler'}</Text>
                      <View style={{ marginTop: 2 }}>
                        <AadhaarBadge label="Aadhaar Verified Guest" size="small" />
                      </View>
                    </View>
                    <View style={styles.confirmedBadge}>
                      <Text style={styles.confirmedText}>Confirmed</Text>
                    </View>
                  </View>

                  <Text style={styles.bookingStay}>
                    {b.property?.title || 'Mountain Stay'} • {b.total_nights} Nights
                  </Text>
                  <Text style={styles.bookingDates}>
                    {b.check_in} – {b.check_out} • {b.guests_count} Guests
                  </Text>

                  <View style={styles.payoutStrip}>
                    <Text style={styles.payoutLabel}>Net Host Payout (2% fee deducted):</Text>
                    <Text style={styles.payoutVal}>₹{(b.subtotal - b.platform_fee).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.bookingActionsRow}>
                    <TouchableOpacity
                      style={styles.bookingActionBtn}
                      onPress={() =>
                        Alert.alert(
                          'Digital Guest Register',
                          `HP Police Form-C generated for ${b.traveler?.full_name || 'Guest'}.\nAadhaar: Verified.\nArrival Date: ${b.check_in}.`
                        )
                      }
                    >
                      <Text style={styles.bookingActionText}>Digital Guest Reg</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.bookingActionBtn, { backgroundColor: Colors.primaryBlack }]}
                      onPress={() => Alert.alert('Message Guest', `Opening direct message thread...`)}
                    >
                      <Text style={[styles.bookingActionText, { color: Colors.textWhite }]}>
                        Message
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Insights & Analytics View */}
        {activeSegment === 'Insights' && (
          <View style={styles.insightsContainer}>
            {/* 2% Fee Transparency Counter Card */}
            <View style={styles.insightsCard}>
              <View style={styles.insightHeader}>
                <Sparkles size={16} color={Colors.textWhite} />
                <Text style={styles.insightKicker}>FAIR HILL ECONOMICS</Text>
              </View>

              <Text style={styles.insightMainStat}>
                ₹{(stats?.grossEarnings || 84200).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.insightStatSub}>Gross Earnings This Season</Text>

              <View style={styles.savingsBanner}>
                <CheckCircle2 size={16} color="#4ADE80" />
                <Text style={styles.savingsBannerText}>
                  You saved ₹{Math.round((stats?.grossEarnings || 84200) * 0.18).toLocaleString('en-IN')} in fees compared to Airbnb's 20%!
                </Text>
              </View>

              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>{stats?.occupancyPercent || 88}%</Text>
                  <Text style={styles.telemetryLabel}>Occupancy</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>{stats?.rating || 4.95}★</Text>
                  <Text style={styles.telemetryLabel}>Avg Rating</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>{stats?.viewsCount || 1840}</Text>
                  <Text style={styles.telemetryLabel}>Views</Text>
                </View>
              </View>
            </View>

            {/* Escrow Payouts Card */}
            <View style={styles.payoutLedgerCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color={Colors.textPrimary} />
                <Text style={styles.payoutCardTitle}>Verified UPI Payouts</Text>
              </View>
              <Text style={styles.payoutUpiText}>Primary: {profile?.upi_vpa || 'abdur@okaxis'} (Verified ✅)</Text>
              <Text style={styles.payoutNextText}>
                Next Release: ₹{(stats?.nextPayoutAmount || 12800).toLocaleString('en-IN')} scheduled for {stats?.nextPayoutDate || 'Sep 8'} (24h post check-in)
              </Text>
            </View>

            {/* iCal Calendar Health Card */}
            <TouchableOpacity
              style={[styles.payoutLedgerCard, { marginTop: 12 }]}
              onPress={() => setIsCalendarSyncOpen(true)}
              activeOpacity={0.88}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calendar size={18} color={Colors.textPrimary} />
                  <Text style={styles.payoutCardTitle}>iCal Calendar Sync Health</Text>
                </View>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedText}>Synced</Text>
                </View>
              </View>
              <Text style={styles.payoutUpiText}>Airbnb Feed: 6 dates blocked • Hilt Export: Live</Text>
              <Text style={styles.payoutNextText}>Tap to manage external iCal feeds →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 8-Step Add Property Modal */}
      <AddPropertyModal
        visible={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={() => {
          getProperties().then((data) => setProperties(data));
        }}
      />

      {/* 2-Way Calendar Sync Modal */}
      <CalendarSyncModal
        visible={isCalendarSyncOpen}
        propertyTitle={properties[0]?.title || 'Cedar Wood Homestead'}
        onClose={() => setIsCalendarSyncOpen(false)}
      />

      {/* Unified Identity Auth Modal */}
      <AuthModal
        visible={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          Alert.alert('Account Switched', `Logged in as ${user.full_name || user.email || 'Host'}`);
        }}
      />

      {/* Live Sandbox Aadhaar & DigiLocker KYC Modal */}
      <AadhaarKycModal
        visible={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onVerified={(result) => {
          setVerifiedKyc({ name: result.name, maskedAadhaar: result.maskedAadhaar });
          Alert.alert(
            'UIDAI KYC Verified',
            `Successfully verified Aadhaar for ${result.name || 'Host'}.\nDigiLocker certificate recorded.`
          );
        }}
        userType="host"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.pillInactive,
    borderRadius: 9999,
    padding: 4,
    marginBottom: 20,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: Colors.primaryBlack,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textWhite,
  },
  calendarSyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  calendarSyncLeft: {
    flex: 1,
    marginRight: 10,
  },
  syncTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  syncTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  calendarSyncTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  calendarSyncSub: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 15,
  },
  syncBtnSmall: {
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  syncBtnSmallText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addPropertySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  addPropertySmallText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookingsContainer: {
    marginTop: 6,
  },
  bookingCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 22,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingGuestName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  bookingStay: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginTop: 4,
  },
  bookingDates: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  payoutStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  payoutLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  payoutVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  bookingActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookingActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  insightsContainer: {
    marginTop: 6,
  },
  insightsCard: {
    backgroundColor: '#0F1419',
    borderRadius: 24,
    padding: 22,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightKicker: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  insightMainStat: {
    color: Colors.textWhite,
    fontSize: 32,
    fontWeight: '800',
  },
  insightStatSub: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: 10,
    marginTop: 16,
  },
  savingsBannerText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  telemetryVal: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '800',
  },
  telemetryLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  payoutLedgerCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  payoutCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  payoutUpiText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  payoutNextText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 4,
  },
  addPropertyInlineBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  addPropertyInlineText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBookingsCard: {
    backgroundColor: Colors.backgroundApp,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 10,
  },
  emptyBookingsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyBookingsSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
