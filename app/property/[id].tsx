import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, MapPin, Star } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { getPropertyById, getWishlistIds, toggleWishlist } from '../../lib/supabase';
import { Property } from '../../types/database';
import { BookingModal } from '../../components/BookingModal';
import { EmptyState } from '../../components/EmptyState';
import { HillCoverModal } from '../../components/HillCoverModal';
import { ReviewsSection } from '../../components/ReviewsSection';
import { AuthModal } from '../../components/AuthModal';
import { Colors } from '../../constants/theme';

const { height } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id, checkIn, checkOut, guests } = useLocalSearchParams() as {
    id: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  };
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isHillCoverOpen, setIsHillCoverOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (id) {
      getPropertyById(id).then((data) => {
        if (!data) setNotFound(true);
        else setProperty(data);
      });
      getWishlistIds().then((ids) => setSaved(ids.has(id)));
    }
  }, [id]);

  const toggleSave = async () => {
    try {
      setSaved(await toggleWishlist(id));
    } catch {
      setIsAuthOpen(true);
    }
  };

  if (notFound) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <EmptyState
          title="Stay unavailable"
          description="This listing may have been removed."
          actionText="Back to explore"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: Colors.textSecondary }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.floatingTopBar}>
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={Colors.textWhite} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={toggleSave}
          accessibilityRole="button"
          accessibilityLabel={`${saved ? 'Remove from' : 'Save to'} wishlist`}
        >
          <Heart size={20} color={Colors.textWhite} fill={saved ? Colors.heartRed : 'transparent'} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrapper}>
          {property.images?.[0] ? (
            <Image source={{ uri: property.images[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]} />
          )}
        </View>

        <View style={styles.detailsCardWrapper}>
          <View style={styles.frostedCard}>
            <Text style={styles.propertyTitle}>{property.title}</Text>
            <View style={styles.locationRow}>
              <MapPin size={13} color="#9CA3AF" />
              <Text style={styles.locationText}>
                {property.town}, {property.state}
              </Text>
              {typeof property.rating === 'number' && (
                <View style={styles.ratingRow}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {Number(property.rating).toFixed(1)}
                    {property.reviews_count > 0 ? ` (${property.reviews_count})` : ''}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.specsRow}>
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>{property.bedrooms} beds</Text>
              </View>
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>{property.bathrooms} baths</Text>
              </View>
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>Up to {property.max_guests}</Text>
              </View>
            </View>

            {property.description ? (
              <Text style={styles.descriptionText}>{property.description}</Text>
            ) : null}

            {property.amenities && property.amenities.length > 0 && (
              <View style={styles.amenityWrap}>
                {property.amenities.slice(0, 8).map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.factsBox}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Check-in / out</Text>
                <Text style={styles.factValue}>
                  {property.check_in_time || '12:00'} / {property.check_out_time || '11:00'}
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Stay length</Text>
                <Text style={styles.factValue}>
                  {property.min_nights ?? 1}–{property.max_nights ?? 30} nights
                </Text>
              </View>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>Cancellation</Text>
                <Text style={styles.factValue}>
                  {(property.cancellation_policy || 'moderate')[0].toUpperCase() +
                    (property.cancellation_policy || 'moderate').slice(1)}
                </Text>
              </View>
              <View style={[styles.factRow, styles.factRowLast]}>
                <Text style={styles.factLabel}>Booking</Text>
                <Text style={styles.factValue}>
                  {property.instant_book === false ? 'Host confirms requests' : 'Instant Book'}
                </Text>
              </View>
              {property.cleaning_fee > 0 && (
                <Text style={styles.cleaningNote}>
                  + ₹{property.cleaning_fee.toLocaleString('en-IN')} cleaning fee per stay
                </Text>
              )}
            </View>

            {property.house_rules ? (
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>House rules</Text>
                <Text style={styles.rulesText}>{property.house_rules}</Text>
              </View>
            ) : null}

            {typeof property.latitude === 'number' && typeof property.longitude === 'number' && (
              <View style={styles.mapBox}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: property.latitude,
                    longitude: property.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  accessibilityLabel={`Map of ${property.town}`}
                >
                  <Marker
                    coordinate={{ latitude: property.latitude, longitude: property.longitude }}
                    tracksViewChanges={false}
                  >
                    <View style={styles.mapPin}>
                      <MapPin size={14} color={Colors.textWhite} />
                    </View>
                  </Marker>
                </MapView>
              </View>
            )}

            {property.host && (
              <View style={styles.hostCard}>
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>{property.host.full_name}</Text>
                  <Text style={styles.hostRole}>
                    {property.host.is_identity_verified ? 'Verified host' : 'Host'}
                    {property.host.location ? ` · ${property.host.location}` : ''}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.hillCoverBanner} onPress={() => setIsHillCoverOpen(true)}>
              <Text style={styles.hillCoverTitle}>HillCover protection included</Text>
              <Text style={styles.hillCoverLink}>Details</Text>
            </TouchableOpacity>

            <ReviewsSection propertyId={property.id} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.priceAmount}>₹{property.price_entire_villa.toLocaleString('en-IN')}</Text>
            <Text style={styles.pricePeriod}>per night</Text>
          </View>
          <TouchableOpacity
            style={styles.bookNowButton}
            onPress={() => setIsBookingOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Book ${property.title} at ₹${property.price_entire_villa} per night`}
          >
            <Text style={styles.bookNowText}>Book</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <BookingModal
        visible={isBookingOpen}
        property={property}
        initialCheckIn={typeof checkIn === 'string' && checkIn ? checkIn : null}
        initialCheckOut={typeof checkOut === 'string' && checkOut ? checkOut : null}
        initialGuests={guests ? parseInt(String(guests), 10) || 2 : 2}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => router.push('/(tabs)/trips')}
      />
      <HillCoverModal visible={isHillCoverOpen} onClose={() => setIsHillCoverOpen(false)} />
      <AuthModal visible={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={() => setSaved(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07100B' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  floatingTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  circleIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingBottom: 140 },
  heroWrapper: { width: '100%', height: height * 0.42 },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { backgroundColor: '#1F2937' },
  detailsCardWrapper: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0F1419',
  },
  frostedCard: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 36 },
  propertyTitle: { fontSize: 22, fontWeight: '800', color: Colors.textWhite },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locationText: { fontSize: 13, color: '#9CA3AF' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
  ratingText: { fontSize: 12, fontWeight: '700', color: Colors.textWhite },
  specsRow: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  specChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  specChipText: { color: Colors.textWhite, fontSize: 13, fontWeight: '600' },
  descriptionText: { color: '#D1D5DB', fontSize: 14, lineHeight: 21 },
  amenityWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  amenityChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityText: { color: '#E5E7EB', fontSize: 12 },
  factsBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  factRowLast: { borderBottomWidth: 0 },
  factLabel: { color: '#9CA3AF', fontSize: 12 },
  factValue: { color: Colors.textWhite, fontSize: 13, fontWeight: '700' },
  cleaningNote: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  rulesBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  rulesTitle: { color: Colors.textWhite, fontSize: 14, fontWeight: '700' },
  rulesText: { color: '#D1D5DB', fontSize: 13, lineHeight: 19, marginTop: 6 },
  mapBox: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  map: { width: '100%', height: 160 },
  mapPin: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },
  hostInfo: { flex: 1 },
  hostName: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
  hostRole: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  hillCoverBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },
  hillCoverTitle: { fontSize: 13, fontWeight: '700', color: Colors.textWhite },
  hillCoverLink: { fontSize: 12, fontWeight: '700', color: '#4ADE80' },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 20, 0.97)',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  priceAmount: { fontSize: 20, fontWeight: '800', color: Colors.textWhite },
  pricePeriod: { fontSize: 12, color: '#9CA3AF' },
  bookNowButton: { backgroundColor: '#2563EB', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 9999 },
  bookNowText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
