import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { Plus, Trash2, ShieldCheck, FileText, Umbrella } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getOrCreateConversation } from '../../lib/chat';
import {
  getCurrentUserProfile,
  getHostProperties,
  getHostBookings,
  getHostStats,
  getHostPayouts,
  approveBooking,
  declineBooking,
  getHostReviewedBookingIds,
  getGuestReviews,
  type HostPayoutRow,
  signOut,
  deleteCurrentUserAccount,
} from '../../lib/supabase';
import { LegalModal, type LegalDoc } from '../../components/LegalModal';
import { ReviewGuestModal } from '../../components/ReviewGuestModal';
import { requestPush } from '../../lib/push';
import { Profile, Property, Booking } from '../../types/database';
import { PropertyGridCard } from '../../components/PropertyGridCard';
import { PayoutSettingsModal } from '../../components/PayoutSettingsModal';
import { AddPropertyModal } from '../../components/AddPropertyModal';
import { CalendarSyncModal } from '../../components/CalendarSyncModal';
import { AvailabilityManager } from '../../components/AvailabilityManager';
import { SafetyQueue } from '../../components/SafetyQueue';
import { AuthModal } from '../../components/AuthModal';
import { EmptyState } from '../../components/EmptyState';
import { Colors } from '../../constants/theme';
import { t, LOCALES, type Locale } from '../../lib/i18n';
import { useLocale } from '../../lib/locale';
import { getWishlist, toggleWishlist } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const [locale, setLocaleState] = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getHostStats>> | null>(null);
  const [payouts, setPayouts] = useState<HostPayoutRow[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [guestReviews, setGuestReviews] = useState<any[]>([]);
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null);
  const [saved, setSaved] = useState<Property[]>([]);
  const [activeSegment, setActiveSegment] = useState<'Listing' | 'Bookings' | 'Saved' | 'Insights'>('Listing');
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [availabilityFor, setAvailabilityFor] = useState<Property | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently erase your profile, saved stays, and all personal data in accordance with the DPDP Act 2023 and Apple Guideline 5.1.1(v). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteCurrentUserAccount();
              Alert.alert('Account Deleted', 'Your account and personal data have been permanently erased.');
              await load();
            } catch (err: any) {
              Alert.alert(
                'Deletion Failed',
                err.message || 'Could not delete account. Please try again or contact privacy@hilt.travel.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const load = useCallback(async () => {
    const p = await getCurrentUserProfile();
    setProfile(p);
    if (p) {
      const [props, bookings, s, wishlist, ledger, reviewed, received] = await Promise.all([
        getHostProperties(p.id),
        getHostBookings(p.id),
        getHostStats(p.id),
        getWishlist(),
        getHostPayouts(p.id),
        getHostReviewedBookingIds(p.id),
        getGuestReviews(p.id),
      ]);
      setProperties(props);
      setHostBookings(bookings);
      setStats(s);
      setSaved(wishlist);
      setPayouts(ledger);
      setReviewedIds(reviewed);
      setGuestReviews(received);
    } else {
      setProperties([]);
      setHostBookings([]);
      setStats(null);
      setSaved([]);
      setPayouts([]);
      setReviewedIds(new Set());
      setGuestReviews([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <EmptyState
            title="You're logged out"
            description="Sign in to manage listings, bookings, and payouts."
            actionText="Sign in"
            onAction={() => setIsAuthOpen(true)}
          />
          <AuthModal
            visible={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onSuccess={() => load()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            load();
          }}
        >
          <Text style={styles.signOut}>Log out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.full_name}</Text>
            <Text style={styles.profileEmail}>{profile.email || profile.phone || profile.role}</Text>
          </View>
        </View>

        <View style={styles.localeRow}>
          {LOCALES.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.localeChip, locale === l && styles.localeChipActive]}
              onPress={() => setLocaleState(l as Locale)}
              accessibilityRole="button"
              accessibilityLabel={`Language ${l}`}
            >
              <Text style={[styles.localeText, locale === l && styles.localeTextActive]}>
                {l === 'en' ? 'English' : 'हिन्दी'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Number(profile.rating || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.reviews_count}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.bookingsCount ?? 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
        </View>

        {guestReviews.length > 0 && (
          <View style={styles.hostSayBox}>
            <Text style={styles.subSectionTitle}>What hosts say</Text>
            {guestReviews.slice(0, 3).map((r) => (
              <View key={r.id} style={styles.hostSayCard}>
                <Text style={styles.hostSayMeta}>
                  ★ {r.rating} · {r.host?.full_name || 'Host'}
                </Text>
                <Text style={styles.hostSayText} numberOfLines={3}>
                  {r.comment}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.segmentedContainer}>
          {(['Listing', 'Bookings', 'Saved', 'Insights'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.segmentPill, activeSegment === s && styles.segmentPillActive]}
              onPress={() => setActiveSegment(s)}
            >
              <Text style={[styles.segmentText, activeSegment === s && styles.segmentTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSegment === 'Listing' && (
          <View>
            <View style={styles.actionHeaderRow}>
              <Text style={styles.subSectionTitle}>Your listings</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddPropertyOpen(true)}>
                <Plus size={14} color={Colors.textWhite} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {properties.length === 0 ? (
              <EmptyState
                title="No listings"
                description="Publish your first stay to start receiving bookings."
                actionText="Add property"
                onAction={() => setIsAddPropertyOpen(true)}
              />
            ) : (
              <View style={styles.gridContainer}>
                {properties.map((property) => (
                  <PropertyGridCard key={property.id} property={property} onPress={() => {}} />
                ))}
              </View>
            )}
            {properties.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.subSectionTitle}>Availability</Text>
                {properties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    style={styles.availRow}
                    onPress={() => setAvailabilityFor(property)}
                  >
                    <Text style={styles.availTitle} numberOfLines={1}>
                      {property.title}
                    </Text>
                    <Text style={styles.availLink}>Manage dates</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {properties.length > 0 && (
              <TouchableOpacity style={styles.syncRow} onPress={() => setIsCalendarSyncOpen(true)}>
                <Text style={styles.syncText}>Calendar sync</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeSegment === 'Bookings' && (
          <View>
            <Text style={styles.subSectionTitle}>Reservations</Text>
            {hostBookings.length === 0 ? (
              <EmptyState title="No reservations" description="New guest bookings will appear here." />
            ) : (
              hostBookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <Text style={styles.bookingGuest}>{b.property?.title || 'Stay'}</Text>
                  <Text style={styles.bookingDates}>
                    {b.check_in} → {b.check_out} · {b.guests_count} guests · {b.status}
                  </Text>
                  <Text style={styles.payoutVal}>
                    ₹{(b.subtotal - b.platform_fee).toLocaleString('en-IN')} net
                  </Text>
                  <Text style={styles.feeLine}>
                    ₹{b.subtotal.toLocaleString('en-IN')} − ₹{b.platform_fee.toLocaleString('en-IN')} Hilt fee (2%)
                  </Text>
                  {b.status === 'completed' && !reviewedIds.has(b.id) && (
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => setReviewTarget(b)}>
                      <Text style={styles.reviewBtnText}>Review guest</Text>
                    </TouchableOpacity>
                  )}
                  {b.status === 'pending' && (
                    <View style={styles.decisionRow}>
                      <TouchableOpacity
                        style={[styles.decisionBtn, styles.approveBtn]}
                        onPress={async () => {
                          try {
                            await approveBooking(b);
                            requestPush('booking_decided', { booking_id: b.id }).catch(() => {});
                            Alert.alert('Confirmed', 'The guest has been notified.');
                            load();
                          } catch (e: any) {
                            Alert.alert('Could not confirm', e.message || 'Try again.');
                          }
                        }}
                      >
                        <Text style={styles.approveText}>Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.decisionBtn, styles.declineBtn]}
                        onPress={() => {
                          Alert.alert(
                            'Decline request?',
                            'The guest gets a full refund and the dates reopen.',
                            [
                              { text: 'Keep', style: 'cancel' },
                              {
                                text: 'Decline',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await declineBooking(b);
                                    requestPush('booking_decided', { booking_id: b.id }).catch(() => {});
                                    load();
                                  } catch (e: any) {
                                    Alert.alert('Could not decline', e.message || 'Try again.');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={async () => {
                      try {
                        const convo = await getOrCreateConversation(b);
                        router.push({ pathname: '/(tabs)/messages', params: { conversationId: convo.id } });
                      } catch (e: any) {
                        Alert.alert('Chat unavailable', e.message || 'Try again.');
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.chatBtnText}>Chat with guest</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeSegment === 'Saved' && (
          <View>
            <Text style={styles.subSectionTitle}>Saved stays</Text>
            {saved.length === 0 ? (
              <EmptyState
                title="Nothing saved"
                description="Tap the heart on any stay to keep it here."
                actionText="Explore stays"
                onAction={() => router.push('/(tabs)')}
              />
            ) : (
              <View style={styles.gridContainer}>
                {saved.map((property) => (
                  <PropertyGridCard
                    key={property.id}
                    property={property}
                    saved
                    onToggleSave={async () => {
                      await toggleWishlist(property.id);
                      load();
                    }}
                    onPress={() =>
                      router.push({ pathname: '/property/[id]', params: { id: property.id } })
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {activeSegment === 'Insights' && (
          <View>
            {!profile.is_identity_verified && properties.length > 0 && (
              <View style={styles.kycBanner}>
                <Text style={styles.kycBannerText}>
                  Verify your identity to receive payouts. Scheduled payouts wait until you do.
                </Text>
              </View>
            )}
            <SafetyQueue hostId={profile.id} />
            <View style={styles.insightsCard}>
              <Text style={styles.insightMainStat}>
                ₹{(stats?.grossEarnings || 0).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.insightStatSub}>Gross booking volume</Text>
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>{stats?.occupancyPercent ?? 0}%</Text>
                  <Text style={styles.telemetryLabel}>Occupancy</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>{stats?.bookingsCount ?? 0}</Text>
                  <Text style={styles.telemetryLabel}>Bookings</Text>
                </View>
                <View style={styles.telemetryBox}>
                  <Text style={styles.telemetryVal}>
                    {stats?.nextPayoutAmount ? `₹${stats.nextPayoutAmount.toLocaleString('en-IN')}` : '—'}
                  </Text>
                  <Text style={styles.telemetryLabel}>Next payout</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.payoutRow} onPress={() => setIsPayoutOpen(true)}>
                <View>
                  <Text style={styles.payoutLabel}>Payout destination</Text>
                  <Text style={styles.payoutNextText}>
                    {profile.payout_method === 'bank'
                      ? profile.bank_account_number
                        ? `•••• ${profile.bank_account_number.slice(-4)} · ${profile.bank_ifsc || ''}`
                        : 'Bank not connected'
                      : profile.upi_vpa || 'UPI not connected'}
                  </Text>
                </View>
                <Text style={styles.payoutEdit}>Edit</Text>
              </TouchableOpacity>
            </View>

            {payouts.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.subSectionTitle}>Payout history</Text>
                {payouts.map((pay) => (
                  <View key={pay.id} style={styles.payoutCard}>
                    <View style={styles.payoutCardRow}>
                      <Text style={styles.payoutCardTitle} numberOfLines={1}>
                        {pay.booking?.property?.title || 'Booking'}
                      </Text>
                      <Text style={styles.payoutCardAmount}>
                        ₹{pay.net_payout.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.payoutCardRow}>
                      <Text style={styles.payoutCardSub}>
                        {pay.booking ? `${pay.booking.check_in} → ${pay.booking.check_out}` : ''} · fee ₹
                        {pay.platform_fee.toLocaleString('en-IN')}
                      </Text>
                      <Text
                        style={[
                          styles.payoutStatus,
                          pay.payout_status === 'completed' && styles.payoutStatusDone,
                          pay.payout_status === 'failed' && styles.payoutStatusFailed,
                        ]}
                      >
                        {pay.payout_status === 'scheduled' ? 'On the way' : pay.payout_status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.legalSection}>
          <Text style={styles.subSectionTitle}>Legal & Account</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setLegalDoc('privacy')}
            activeOpacity={0.7}
          >
            <ShieldCheck size={18} color={Colors.textPrimary} />
            <Text style={styles.menuRowText}>Privacy Policy (DPDP Act 2023)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setLegalDoc('terms')}
            activeOpacity={0.7}
          >
            <FileText size={18} color={Colors.textPrimary} />
            <Text style={styles.menuRowText}>Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setLegalDoc('hillcover')}
            activeOpacity={0.7}
          >
            <Umbrella size={18} color={Colors.textPrimary} />
            <Text style={styles.menuRowText}>24-Hour Escrow Protection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setLegalDoc('cancellation')}
            activeOpacity={0.7}
          >
            <FileText size={18} color={Colors.textPrimary} />
            <Text style={styles.menuRowText}>Cancellation & Refund Policy</Text>
          </TouchableOpacity>

          <View style={styles.dangerDivider} />

          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color="#DC2626" />
            <Text style={styles.deleteAccountText}>
              {isDeleting ? 'Deleting account...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.deleteSubtext}>
            Permanently erases profile, saved items, and personal data (Apple Guideline 5.1.1(v) & DPDP Act 2023).
          </Text>
        </View>
      </ScrollView>

      <ReviewGuestModal
        visible={!!reviewTarget}
        booking={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={() => load()}
      />
      <PayoutSettingsModal
        visible={isPayoutOpen}
        profile={profile}
        onClose={() => setIsPayoutOpen(false)}
        onSaved={() => load()}
      />
      <AddPropertyModal
        visible={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={() => load()}
      />
      <CalendarSyncModal
        visible={isCalendarSyncOpen}
        propertyId={properties[0]?.id || ''}
        propertyTitle={properties[0]?.title || ''}
        onClose={() => setIsCalendarSyncOpen(false)}
      />
      {availabilityFor && (
        <AvailabilityManager
          visible={!!availabilityFor}
          propertyId={availabilityFor.id}
          propertyTitle={availabilityFor.title}
          hostId={profile.id}
          onClose={() => setAvailabilityFor(null)}
        />
      )}
      <AuthModal visible={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={() => load()} />
      {legalDoc && (
        <LegalModal visible onClose={() => setLegalDoc(null)} initialDoc={legalDoc} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  signOut: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 18 },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileInfo: { flex: 1, marginLeft: 12 },
  localeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  localeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9999, backgroundColor: Colors.pillInactive },
  localeChipActive: { backgroundColor: Colors.primaryBlack },
  localeText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  localeTextActive: { color: Colors.textWhite },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.backgroundApp,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  segmentedContainer: { flexDirection: 'row', backgroundColor: Colors.pillInactive, borderRadius: 9999, padding: 4, marginBottom: 18 },
  segmentPill: { flex: 1, paddingVertical: 10, borderRadius: 9999, alignItems: 'center' },
  segmentPillActive: { backgroundColor: Colors.primaryBlack },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.textWhite },
  actionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryBlack, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999 },
  addBtnText: { color: Colors.textWhite, fontSize: 12, fontWeight: '700' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  syncRow: { paddingVertical: 12, alignItems: 'center' },
  syncText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textDecorationLine: 'underline' },
  bookingCard: { backgroundColor: Colors.backgroundApp, borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  bookingGuest: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  bookingDates: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  payoutVal: { fontSize: 13, fontWeight: '700', color: '#15803D', marginTop: 8 },
  feeLine: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  hostSayBox: { marginBottom: 18 },
  hostSayCard: { backgroundColor: Colors.backgroundApp, borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  hostSayMeta: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  hostSayText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
  reviewBtn: { backgroundColor: Colors.pillInactive, borderRadius: 9999, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  reviewBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  decisionBtn: { flex: 1, borderRadius: 9999, paddingVertical: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: '#15803D' },
  approveText: { color: Colors.textWhite, fontSize: 13, fontWeight: '700' },
  declineBtn: { backgroundColor: Colors.pillInactive },
  declineText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  payoutLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  payoutEdit: { color: Colors.textWhite, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  historySection: { marginTop: 18 },
  payoutCard: { backgroundColor: Colors.backgroundApp, borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  payoutCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  payoutCardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  payoutCardAmount: { fontSize: 14, fontWeight: '800', color: '#15803D' },
  payoutCardSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  payoutStatus: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 4 },
  payoutStatusDone: { color: '#15803D' },
  payoutStatusFailed: { color: '#B91C1C' },
  kycBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, marginBottom: 12 },
  kycBannerText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  chatBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: 9999,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  chatBtnText: { color: Colors.textWhite, fontSize: 13, fontWeight: '700' },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  availTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginRight: 10 },
  availLink: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textDecorationLine: 'underline' },
  insightsCard: { backgroundColor: '#0F1419', borderRadius: 22, padding: 20 },
  insightMainStat: { color: Colors.textWhite, fontSize: 30, fontWeight: '800' },
  insightStatSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
  telemetryGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  telemetryBox: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 10, alignItems: 'center' },
  telemetryVal: { color: Colors.textWhite, fontSize: 14, fontWeight: '800' },
  telemetryLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  payoutNextText: { color: '#4ADE80', fontSize: 12, fontWeight: '600', marginTop: 12 },
  legalSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: '#FEE2E2',
    marginVertical: 18,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 13,
  },
  deleteAccountText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
