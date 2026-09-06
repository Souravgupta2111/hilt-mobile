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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  MoreVertical,
  Heart,
  Bed,
  Bath,
  Utensils,
  Phone,
  MessageCircle,
  ShieldCheck,
  Zap,
  Wifi,
  MapPin,
  Star,
} from 'lucide-react-native';
import { getPropertyById } from '../../lib/supabase';
import { Property } from '../../types/database';
import { BookingModal } from '../../components/BookingModal';
import { AadhaarBadge } from '../../components/AadhaarBadge';
import { NearbyRadar } from '../../components/NearbyRadar';
import { HillCoverModal } from '../../components/HillCoverModal';
import { Colors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isHillCoverOpen, setIsHillCoverOpen] = useState(false);
  const [readMore, setReadMore] = useState(false);

  useEffect(() => {
    if (id) {
      getPropertyById(id).then((data) => setProperty(data));
    }
  }, [id]);

  if (!property) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: Colors.textSecondary }}>Loading stay details...</Text>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <View style={styles.container}>
      {/* Top Floating Controls */}
      <SafeAreaView style={styles.floatingTopBar}>
        <TouchableOpacity
          style={styles.circleIconButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ChevronLeft size={22} color={Colors.textWhite} />
        </TouchableOpacity>

        <Text style={styles.detailScreenTitle}>Detail</Text>

        <TouchableOpacity style={styles.circleIconButton} activeOpacity={0.8}>
          <MoreVertical size={20} color={Colors.textWhite} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Photo Section (Full Bleed Top ~55%) */}
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: property.images[0] }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Overlaid Title & Review Stack (Ditto Mockup Exact) */}
          <View style={styles.heroOverlayContent}>
            <Text style={styles.heroTitleTag}>{property.tagline || 'The home book apartment'}</Text>

            <View style={styles.reviewStackRow}>
              {/* Stacked Avatars */}
              <View style={styles.avatarStack}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }}
                  style={[styles.smallAvatar, { left: 0 }]}
                />
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' }}
                  style={[styles.smallAvatar, { left: 16 }]}
                />
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' }}
                  style={[styles.smallAvatar, { left: 32 }]}
                />
              </View>

              <Text style={styles.reviewCountText}>+{property.reviews_count || 24} Review</Text>
            </View>
          </View>
        </View>

        {/* Frosted Glass Details Card (Ditto Mockup Exact) */}
        <View style={styles.detailsCardWrapper}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 75 : 95}
            tint="dark"
            style={styles.frostedCard}
          >
            {/* Title & Heart Row */}
            <View style={styles.titleHeartRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.propertyTitle}>{property.title}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={13} color="#9CA3AF" />
                  <Text style={styles.locationText}>
                    {property.town}, {property.state} • {property.altitude_meters}m
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.heartCircle}
                onPress={() => setIsFavorite(!isFavorite)}
                activeOpacity={0.8}
              >
                <Heart
                  size={20}
                  color={Colors.heartRed}
                  fill={isFavorite ? Colors.heartRed : 'none'}
                />
              </TouchableOpacity>
            </View>

            {/* Specs Row: Bed / Bath / Kitchen */}
            <View style={styles.specsRow}>
              <View style={styles.specChip}>
                <Bed size={15} color={Colors.textWhite} />
                <Text style={styles.specChipText}>Bed  {property.bedrooms}</Text>
              </View>

              <View style={styles.specChip}>
                <Bath size={15} color={Colors.textWhite} />
                <Text style={styles.specChipText}>Bath  {property.bathrooms}</Text>
              </View>

              <View style={styles.specChip}>
                <Utensils size={15} color={Colors.textWhite} />
                <Text style={styles.specChipText}>Kitchen</Text>
              </View>
            </View>

            {/* Mountain Telemetry Badges */}
            <View style={styles.telemetryRow}>
              <View style={styles.telemetryBadge}>
                <Zap size={13} color={Colors.textWhite} />
                <Text style={styles.telemetryText}>{property.power_backup}</Text>
              </View>
              <View style={styles.telemetryBadge}>
                <Wifi size={13} color={Colors.textWhite} />
                <Text style={styles.telemetryText}>{property.wifi_speed_mbps} Mbps Fiber</Text>
              </View>
            </View>

            {/* Description Snippet */}
            <Text style={styles.descriptionText} numberOfLines={readMore ? undefined : 3}>
              {property.description}
            </Text>
            <TouchableOpacity onPress={() => setReadMore(!readMore)}>
              <Text style={styles.readMoreText}>
                {readMore ? 'Show Less' : 'Read More...'}
              </Text>
            </TouchableOpacity>

            {/* Host Card (Ditto Mockup Exact) */}
            <View style={styles.hostCard}>
              <Image
                source={{
                  uri:
                    property.host?.avatar_url ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
                }}
                style={styles.hostAvatar}
              />
              <View style={styles.hostInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.hostName}>{property.host?.full_name || 'Abdur rob'}</Text>
                  <ShieldCheck size={14} color="#4ADE80" />
                </View>
                <Text style={styles.hostRole}>Real Estate Agent & Mountain Host</Text>
              </View>

              <View style={styles.hostActions}>
                <TouchableOpacity style={styles.contactCircle} activeOpacity={0.8}>
                  <Phone size={16} color={Colors.textWhite} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactCircle} activeOpacity={0.8}>
                  <MessageCircle size={16} color={Colors.textWhite} />
                </TouchableOpacity>
              </View>
            </View>

            {/* HillCover™ Assurance Card */}
            <TouchableOpacity
              style={styles.hillCoverBanner}
              onPress={() => setIsHillCoverOpen(true)}
              activeOpacity={0.88}
            >
              <View style={styles.hillCoverLeft}>
                <View style={styles.shieldPill}>
                  <ShieldCheck size={13} color="#22C55E" />
                  <Text style={styles.shieldPillText}>Hilt HillCover™</Text>
                </View>
                <Text style={styles.hillCoverTitle}>
                  100% Landslide & Roadblock Escrow Protection
                </Text>
                <Text style={styles.hillCoverSub}>
                  Pass closure refund guarantee • 98% Smart Escrow released 24h post check-in.
                </Text>
              </View>
              <Text style={styles.hillCoverLink}>View details →</Text>
            </TouchableOpacity>

            {/* Proximity Radar: Near This Stay */}
            <NearbyRadar valleyName={property.valley || 'Tirthan Valley'} />
          </BlurView>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar (Ditto Mockup Exact) */}
      <SafeAreaView style={styles.bottomBarWrapper}>
        <View style={styles.bottomBar}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>
              {formatPrice(property.price_entire_villa)}
            </Text>
            <Text style={styles.pricePeriod}>/per Night</Text>
          </View>

          <TouchableOpacity
            style={styles.bookNowButton}
            onPress={() => setIsBookingOpen(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.bookNowText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Dual Booking Sheet Modal */}
      <BookingModal
        visible={isBookingOpen}
        property={property}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => {
          router.push('/(tabs)/trips');
        }}
      />

      {/* HillCover Details Modal */}
      <HillCoverModal
        visible={isHillCoverOpen}
        onClose={() => setIsHillCoverOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07100B',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  circleIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScreenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  heroWrapper: {
    position: 'relative',
    width: '100%',
    height: height * 0.52,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayContent: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
  },
  heroTitleTag: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textWhite,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom: 8,
  },
  reviewStackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarStack: {
    position: 'relative',
    width: 60,
    height: 26,
  },
  smallAvatar: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  reviewCountText: {
    fontSize: 13,
    color: Colors.textWhite,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailsCardWrapper: {
    marginTop: -28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  frostedCard: {
    backgroundColor: 'rgba(15, 20, 25, 0.78)',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 40,
  },
  titleHeartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  propertyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  heartCircle: {
    padding: 6,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  specChipText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  telemetryText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  readMoreText: {
    color: Colors.textWhite,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 24,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hostAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  hostRole: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  hostActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 15, 20, 0.95)',
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textWhite,
  },
  pricePeriod: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  bookNowButton: {
    backgroundColor: '#2563EB', // Blue / vibrant pill matching mockup Book Now
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  bookNowText: {
    color: Colors.textWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  hillCoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  hillCoverLeft: {
    flex: 1,
    marginRight: 10,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  shieldPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ADE80',
    letterSpacing: 0.5,
  },
  hillCoverTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  hillCoverSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 15,
  },
  hillCoverLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4ADE80',
  },
});
