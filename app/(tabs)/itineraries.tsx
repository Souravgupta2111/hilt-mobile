import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Share2,
  Utensils,
  Footprints,
  Eye,
  Heart,
  Calendar,
} from 'lucide-react-native';
import { getItineraries } from '../../lib/supabase';
import { Itinerary } from '../../types/database';
import { Colors } from '../../constants/theme';
import { AiConciergeModal } from '../../components/AiConciergeModal';

export default function ItinerariesScreen() {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [isAiOpen, setIsAiOpen] = useState(false);

  useEffect(() => {
    getItineraries().then((data) => setItineraries(data));
  }, []);

  const currentItinerary = itineraries[0];

  const handleShare = async () => {
    if (currentItinerary) {
      await Share.share({
        message: `Explore "${currentItinerary.title}" on Hilt - Slow Himalayan Living & Local Curations: https://hilt.travel/itinerary/${currentItinerary.id}`,
      });
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'food':
        return <Utensils size={14} color="#EA580C" />;
      case 'trek':
        return <Footprints size={14} color="#16A34A" />;
      case 'viewpoint':
      default:
        return <Eye size={14} color="#2563EB" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Sparkles size={13} color={Colors.primaryBlack} />
            <Text style={styles.badgeText}>GHUMNA PHIRNA</Text>
          </View>
          <Text style={styles.headerTitle}>Mountain Itineraries</Text>
        </View>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.aiPlanButton}
            onPress={() => setIsAiOpen(true)}
            activeOpacity={0.85}
          >
            <Sparkles size={14} color={Colors.textWhite} />
            <Text style={styles.aiPlanButtonText}>AI Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
            <Share2 size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentItinerary && (
          <View>
            {/* Featured Itinerary Hero Card */}
            <View style={styles.heroCard}>
              <Image
                source={{
                  uri:
                    currentItinerary.hero_image ||
                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay}>
                <View style={styles.regionTag}>
                  <MapPin size={12} color={Colors.textWhite} />
                  <Text style={styles.regionText}>{currentItinerary.region}</Text>
                </View>

                <Text style={styles.heroTitle}>{currentItinerary.title}</Text>
                <Text style={styles.heroSummary}>{currentItinerary.summary}</Text>

                <View style={styles.heroFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color={Colors.textWhite} />
                    <Text style={styles.heroMeta}>{currentItinerary.duration_days} Days Pace</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Heart size={14} color={Colors.heartRed} fill={Colors.heartRed} />
                    <Text style={styles.heroMeta}>{currentItinerary.likes_count} Curators</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Day Switcher Carousel */}
            <View style={styles.daySelectorRow}>
              {[1, 2, 3].map((day) => {
                const isActive = activeDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayPill, isActive && styles.dayPillActive]}
                    onPress={() => setActiveDay(day)}
                    activeOpacity={0.8}
                  >
                    <Calendar size={13} color={isActive ? Colors.textWhite : Colors.textSecondary} />
                    <Text style={[styles.dayText, isActive && styles.dayTextActive]}>
                      Day {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Day Items Timeline */}
            <Text style={styles.timelineTitle}>Day {activeDay} Schedule & Local Spots</Text>

            <View style={styles.timelineContainer}>
              {currentItinerary.items
                ?.filter((item) => item.day_number === activeDay)
                .map((item, index) => (
                  <View key={item.id} style={styles.timelineItem}>
                    {/* Time Dot & Line */}
                    <View style={styles.timelineLeft}>
                      <View style={styles.dot} />
                      {index < 2 && <View style={styles.verticalLine} />}
                    </View>

                    {/* Content Card */}
                    <View style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={styles.categoryBadge}>
                          {getCategoryIcon(item.category)}
                          <Text style={styles.categoryText}>
                            {item.category.toUpperCase()} • {item.time_of_day.toUpperCase()}
                          </Text>
                        </View>
                        {item.approx_cost > 0 && (
                          <Text style={styles.costText}>~₹{item.approx_cost}</Text>
                        )}
                      </View>

                      <Text style={styles.placeName}>{item.place_name}</Text>
                      <Text style={styles.placeDesc}>{item.description}</Text>

                      {item.insider_tip && (
                        <View style={styles.insiderBox}>
                          <Text style={styles.insiderLabel}>💡 Host Insider Tip:</Text>
                          <Text style={styles.insiderText}>{item.insider_tip}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Ghumna Phirna AI Concierge Modal */}
      <AiConciergeModal
        visible={isAiOpen}
        onClose={() => setIsAiOpen(false)}
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  aiPlanButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  shareButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  heroCard: {
    position: 'relative',
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    backgroundColor: 'rgba(7, 16, 11, 0.78)',
  },
  regionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  regionText: {
    fontSize: 11,
    color: Colors.textWhite,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: 4,
  },
  heroSummary: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
  heroFooter: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  heroMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textWhite,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 18,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: Colors.pillInactive,
  },
  dayPillActive: {
    backgroundColor: Colors.primaryBlack,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayTextActive: {
    color: Colors.textWhite,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
    marginRight: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryBlack,
    marginTop: 6,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  itemCard: {
    flex: 1,
    backgroundColor: Colors.backgroundApp,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  placeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  insiderBox: {
    backgroundColor: Colors.pillInactive,
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  insiderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  insiderText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});
