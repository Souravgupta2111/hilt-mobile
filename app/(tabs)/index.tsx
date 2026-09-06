import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal, Bell, MapPin, X, Sparkles } from 'lucide-react-native';
import { CategoryPillBar } from '../../components/CategoryPillBar';
import { PropertyCard } from '../../components/PropertyCard';
import { PropertyCardSkeleton } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { FilterModal, FilterState } from '../../components/FilterModal';
import { getProperties, getCurrentUserProfile } from '../../lib/supabase';
import { Property, Profile } from '../../types/database';
import { Colors } from '../../constants/theme';

export default function ExploreScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Home');
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);

  useEffect(() => {
    getCurrentUserProfile().then((u) => setCurrentUser(u));
  }, []);

  const loadProperties = async (cat: string, filters?: FilterState | null) => {
    setIsLoading(true);
    let data = await getProperties(cat);
    const active = filters !== undefined ? filters : activeFilters;

    if (active) {
      if (active.bedCount > 1) {
        data = data.filter((p) => p.bedrooms >= active.bedCount);
      }
      if (active.powerBackup) {
        data = data.filter((p) => p.power_backup && p.power_backup !== 'None');
      }
      if (active.highSpeedWifi) {
        data = data.filter((p) => p.wifi_speed_mbps >= 50);
      }
    }

    setProperties(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProperties(selectedCategory, activeFilters);
  }, [selectedCategory, activeFilters]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadProperties(selectedCategory, activeFilters);
    setIsRefreshing(false);
  };

  const handleSelectProperty = (prop: Property) => {
    router.push({
      pathname: '/property/[id]',
      params: { id: prop.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.userProfileRow}>
          <Image
            source={{
              uri:
                currentUser?.avatar_url ||
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
            }}
            style={styles.avatar}
          />
          <View style={styles.userTextCol}>
            <Text style={styles.greetingText}>
              Hi {currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'Explorer'}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={11} color={Colors.textSecondary} />
              <Text style={styles.locationText}>
                {currentUser?.location || 'Himachal Pradesh'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification Bell Button */}
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
          <Bell size={18} color={Colors.textPrimary} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* Search & Filter Capsule Bar */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchCapsule}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.9}
        >
          <Search size={18} color="#71717A" />
          <View style={styles.searchTextCol}>
            <Text style={styles.searchTitle}>Find Your New</Text>
            <Text style={styles.searchPlaceholder}>Properties & More</Text>
          </View>
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setIsFilterModalOpen(true)}
          >
            <SlidersHorizontal size={18} color={activeFilters ? Colors.primaryBlack : Colors.textPrimary} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Active Mountain Filter Pills */}
      {activeFilters && (activeFilters.selectedSeason || activeFilters.selectedLandmark || activeFilters.powerBackup || activeFilters.highSpeedWifi) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeFiltersRow}
        >
          {activeFilters.selectedSeason && (
            <View style={styles.activeFilterChip}>
              <Sparkles size={12} color={Colors.primaryBlack} />
              <Text style={styles.activeFilterText}>
                Season: {activeFilters.selectedSeason.charAt(0).toUpperCase() + activeFilters.selectedSeason.slice(1)}
              </Text>
              <TouchableOpacity onPress={() => setActiveFilters({ ...activeFilters, selectedSeason: null })}>
                <X size={12} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {activeFilters.selectedLandmark && (
            <View style={styles.activeFilterChip}>
              <MapPin size={12} color="#2563EB" />
              <Text style={styles.activeFilterText}>
                Near {activeFilters.selectedLandmark} (≤ {activeFilters.radiusMinutes}m)
              </Text>
              <TouchableOpacity onPress={() => setActiveFilters({ ...activeFilters, selectedLandmark: null })}>
                <X size={12} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {activeFilters.powerBackup && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>⚡ 100% Backup</Text>
              <TouchableOpacity onPress={() => setActiveFilters({ ...activeFilters, powerBackup: false })}>
                <X size={12} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {activeFilters.highSpeedWifi && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>📶 &gt;50Mbps Fiber</Text>
              <TouchableOpacity onPress={() => setActiveFilters({ ...activeFilters, highSpeedWifi: false })}>
                <X size={12} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.clearAllFiltersBtn}
            onPress={() => setActiveFilters(null)}
          >
            <Text style={styles.clearAllFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Horizontal Category Carousel */}
      <CategoryPillBar
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />

      {/* Main Content Area: Clean Vertical Card Feed */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primaryBlack} />
        }
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Properties</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* Skeletal Loading State */}
        {isLoading && (
          <View>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </View>
        )}

        {/* Empty State */}
        {!isLoading && properties.length === 0 && (
          <EmptyState
            title="No Stays Found"
            description={`We couldn't find any stays in "${selectedCategory}". Try exploring other mountain categories.`}
            actionText="Show All Stays"
            onAction={() => setSelectedCategory('Home')}
          />
        )}

        {/* Cards View (Clean Vertical Feed) */}
        {!isLoading && (
          <View>
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onPress={() => handleSelectProperty(property)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal Sheet */}
      <FilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(filters) => {
          setActiveFilters(filters);
          loadProperties(selectedCategory, filters);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 10,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  userTextCol: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.heartRed,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 6,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundApp,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchPlaceholder: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  filterIconButton: {
    padding: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearAllFiltersText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
