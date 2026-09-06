import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Utensils,
  Footprints,
  Car,
  Pill,
  CreditCard,
  Navigation,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface NearbyPlace {
  id: string;
  name: string;
  category: 'food' | 'trek' | 'taxi' | 'emergency' | 'atm';
  distance: string;
  travelTime: string;
  highlight: string;
}

interface NearbyRadarProps {
  valleyName: string;
}

export function NearbyRadar({ valleyName }: NearbyRadarProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const places: NearbyPlace[] = [
    {
      id: '1',
      name: 'Shringi Vatika Trout & Siddu',
      category: 'food',
      distance: '350m',
      travelTime: '5m walk',
      highlight: 'Fresh steamed walnut siddu with river trout.',
    },
    {
      id: '2',
      name: 'Choi Waterfall Forest Trail',
      category: 'trek',
      distance: '1.2 km',
      travelTime: '25m hike',
      highlight: 'Shaded pine forest walk to mountain pool.',
    },
    {
      id: '3',
      name: 'Jibhi 4x4 Mountain Taxi Stand',
      category: 'taxi',
      distance: '400m',
      travelTime: '6m walk',
      highlight: 'Jalori Pass shuttles & mountain drops.',
    },
    {
      id: '4',
      name: 'Primary Health Centre & Chemist',
      category: 'emergency',
      distance: '1.8 km',
      travelTime: '6m drive',
      highlight: 'Altitude sickness meds & oxygen cylinders.',
    },
    {
      id: '5',
      name: 'SBI Cash Point / ATM',
      category: 'atm',
      distance: '2.1 km',
      travelTime: '8m drive',
      highlight: 'Cash withdrawal point for village markets.',
    },
  ];

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'food', label: 'Food' },
    { id: 'trek', label: 'Hikes' },
    { id: 'taxi', label: 'Taxis' },
    { id: 'emergency', label: 'Medical' },
  ];

  const filteredPlaces = places.filter((p) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'emergency') return p.category === 'emergency' || p.category === 'atm';
    return p.category === selectedFilter;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return <Utensils size={14} color="#EA580C" />;
      case 'trek':
        return <Footprints size={14} color="#16A34A" />;
      case 'taxi':
        return <Car size={14} color="#2563EB" />;
      case 'emergency':
        return <Pill size={14} color="#DC2626" />;
      case 'atm':
        return <CreditCard size={14} color="#D97706" />;
      default:
        return <Navigation size={14} color={Colors.textWhite} />;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'food':
        return 'rgba(234, 88, 12, 0.15)';
      case 'trek':
        return 'rgba(22, 163, 74, 0.15)';
      case 'taxi':
        return 'rgba(37, 99, 235, 0.15)';
      case 'emergency':
        return 'rgba(220, 38, 38, 0.15)';
      case 'atm':
        return 'rgba(217, 119, 6, 0.15)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>PROXIMITY RADAR</Text>
          <Text style={styles.title}>Essentials Near Stay</Text>
        </View>
        <View style={styles.radarPill}>
          <View style={styles.greenPulse} />
          <Text style={styles.radarText}>Live</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(tab.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Clean Compact List */}
      <View style={styles.placesList}>
        {filteredPlaces.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.compactCard}
            onPress={() =>
              Alert.alert(
                place.name,
                `${place.highlight}\n\nDistance: ${place.distance} • ${place.travelTime}\nRegion: ${valleyName}`
              )
            }
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: getCategoryBg(place.category) }]}>
              {getCategoryIcon(place.category)}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <View style={styles.distanceBadge}>
                  <MapPin size={10} color="#9CA3AF" />
                  <Text style={styles.distanceText}>{place.distance}</Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={styles.placeHighlight} numberOfLines={1}>
                  {place.highlight}
                </Text>
                <View style={styles.timePill}>
                  <Clock size={10} color="#4ADE80" />
                  <Text style={styles.timePillText}>{place.travelTime}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textWhite,
    marginTop: 1,
  },
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  radarText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '700',
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: Colors.textWhite,
    borderColor: Colors.textWhite,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  filterChipTextActive: {
    color: Colors.primaryBlack,
  },
  placesList: {
    gap: 8,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textWhite,
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  placeHighlight: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    marginRight: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4ADE80',
  },
});
