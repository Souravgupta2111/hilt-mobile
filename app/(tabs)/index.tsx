import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal, Map as MapIcon } from 'lucide-react-native';
import { CategoryPillBar } from '../../components/CategoryPillBar';
import { PropertyCard } from '../../components/PropertyCard';
import { PropertyCardSkeleton } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { FilterModal } from '../../components/FilterModal';
import { ExploreMap } from '../../components/ExploreMap';
import { AuthModal } from '../../components/AuthModal';
import {
  searchProperties,
  getCurrentUserProfile,
  getWishlistIds,
  toggleWishlist,
  type SearchParams,
} from '../../lib/supabase';
import { Property, Profile } from '../../types/database';
import { Colors } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLocale } from '../../lib/locale';
import { LOCALES } from '../../lib/i18n';

export default function ExploreScreen() {
  const router = useRouter();
  useLocale(); // re-render on language change
  const [params, setParams] = useState<SearchParams>({
    category: 'All',
    guests: 1,
    minBeds: 1,
    sort: 'recommended',
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');

  useEffect(() => {
    getCurrentUserProfile().then((u) => setCurrentUser(u));
    getWishlistIds().then(setSavedIds);
  }, []);

  const runSearch = useCallback(async (p: SearchParams) => {
    setIsLoading(true);
    try {
      setProperties(await searchProperties(p));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(params);
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await runSearch(params);
    setCurrentUser(await getCurrentUserProfile());
    setSavedIds(await getWishlistIds());
    setIsRefreshing(false);
  };

  const toggleSave = async (id: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const saved = await toggleWishlist(id);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch (e: any) {
      Alert.alert('Could not save', e.message || 'Try again.');
    }
  };

  const submitQuery = () => {
    const next = { ...params, query: draftQuery.trim() || undefined };
    setParams(next);
    runSearch(next);
  };

  const dateLabel =
    params.checkIn && params.checkOut
      ? `${new Date(params.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(
          params.checkOut
        ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : 'Dates';

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'H';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.userRow}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greetingText}>
              {currentUser ? `Hi, ${currentUser.full_name.split(' ')[0]}` : 'Explore stays'}
            </Text>
            <Text style={styles.locationText}>Himachal & Uttarakhand</Text>
          </View>
        </View>
        {!currentUser && (
          <TouchableOpacity style={styles.signInBtn} onPress={() => setIsAuthOpen(true)}>
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchCapsule}>
          <Search size={18} color="#71717A" />
          <TextInput
            style={styles.searchInput}
            value={draftQuery}
            onChangeText={setDraftQuery}
            onSubmitEditing={submitQuery}
            placeholder="Search town, valley, or stay"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            accessibilityLabel="Search stays by town, valley, or name"
          />
          <TouchableOpacity
            onPress={() => setIsFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open search and filters"
          >
            <SlidersHorizontal size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsMapOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open map"
          >
            <MapIcon size={18} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.pillRow}>
          <TouchableOpacity style={styles.quickPill} onPress={() => setIsFilterOpen(true)}>
            <Text style={[styles.quickText, params.checkIn && styles.quickTextActive]}>{dateLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => setIsFilterOpen(true)}>
            <Text style={[styles.quickText, (params.guests || 1) > 1 && styles.quickTextActive]}>
              {(params.guests || 1) > 1 ? `${params.guests} guests` : 'Guests'}
            </Text>
          </TouchableOpacity>
          {(params.minPrice || params.maxPrice) && (
            <View style={styles.quickPill}>
              <Text style={[styles.quickText, styles.quickTextActive]}>
                ₹{params.minPrice || '0'}–{params.maxPrice ? `₹${params.maxPrice}` : '∞'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <CategoryPillBar
        categories={['All', 'Home', 'Hotel', 'Apartment', 'Office']}
        selectedCategory={params.category || 'All'}
        onSelectCategory={(category) => {
          const next = { ...params, category };
          setParams(next);
          runSearch(next);
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('explore_section_title')}</Text>
          <Text style={styles.countText}>{!isLoading ? `${properties.length}` : ''}</Text>
        </View>

        {isLoading && (
          <View>
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </View>
        )}

        {!isLoading && properties.length === 0 && (
          <EmptyState
            title={t('common_no_results')}
            description={t('common_no_results_desc')}
            actionText={t('common_clear_search')}
            onAction={() => {
              const cleared: SearchParams = { category: 'All', guests: 1, minBeds: 1, sort: 'recommended' };
              setParams(cleared);
              setDraftQuery('');
              runSearch(cleared);
            }}
          />
        )}

        {!isLoading &&
          properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              saved={savedIds.has(property.id)}
              onToggleSave={() => toggleSave(property.id)}
              onPress={() =>
                router.push({
                  pathname: '/property/[id]',
                  params: {
                    id: property.id,
                    checkIn: params.checkIn || '',
                    checkOut: params.checkOut || '',
                    guests: String(params.guests || 1),
                  },
                })
              }
            />
          ))}
      </ScrollView>

      <FilterModal
        visible={isFilterOpen}
        initial={params}
        onClose={() => setIsFilterOpen(false)}
        onApply={(f) => {
          const next = { ...f, category: params.category };
          setParams(next);
          setDraftQuery(f.query || '');
          runSearch(next);
        }}
      />
      <AuthModal
        visible={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setCurrentUser(u)}
      />
      <ExploreMap
        visible={isMapOpen}
        properties={properties}
        onClose={() => setIsMapOpen(false)}
        onSelectProperty={(p) => {
          setIsMapOpen(false);
          router.push({ pathname: '/property/[id]', params: { id: p.id } });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 8,
    paddingBottom: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  greetingText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  locationText: { fontSize: 12, color: Colors.textSecondary },
  signInBtn: { backgroundColor: Colors.primaryBlack, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9999 },
  signInText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchSection: { paddingHorizontal: 20, marginTop: 6 },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.backgroundApp,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary, paddingVertical: 8 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickPill: { backgroundColor: Colors.pillInactive, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  quickText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  quickTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  countText: { fontSize: 13, color: Colors.textSecondary },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 130 },
});
