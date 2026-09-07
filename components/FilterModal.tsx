import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Minus, Plus, Search } from 'lucide-react-native';
import { Colors } from '../constants/theme';
import { CalendarRangePicker } from './CalendarRangePicker';
import type { SearchParams } from '../lib/supabase';

export type { SearchParams };

interface FilterModalProps {
  visible: boolean;
  initial: SearchParams;
  onClose: () => void;
  onApply: (filters: SearchParams) => void;
}

const SORTS: Array<{ id: NonNullable<SearchParams['sort']>; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
];

export function FilterModal({ visible, initial, onClose, onApply }: FilterModalProps) {
  const [query, setQuery] = useState(initial.query || '');
  const [checkIn, setCheckIn] = useState<string | null>(initial.checkIn || null);
  const [checkOut, setCheckOut] = useState<string | null>(initial.checkOut || null);
  const [guests, setGuests] = useState(initial.guests || 1);
  const [minPrice, setMinPrice] = useState(initial.minPrice ? String(initial.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ? String(initial.maxPrice) : '');
  const [beds, setBeds] = useState(initial.minBeds || 1);
  const [powerBackup, setPowerBackup] = useState(!!initial.powerBackup);
  const [highSpeedWifi, setHighSpeedWifi] = useState(!!initial.highSpeedWifi);
  const [sort, setSort] = useState<NonNullable<SearchParams['sort']>>(initial.sort || 'recommended');

  const reset = () => {
    setQuery('');
    setCheckIn(null);
    setCheckOut(null);
    setGuests(1);
    setMinPrice('');
    setMaxPrice('');
    setBeds(1);
    setPowerBackup(false);
    setHighSpeedWifi(false);
    setSort('recommended');
  };

  const apply = () => {
    onApply({
      query: query.trim() || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkIn && checkOut ? checkOut : undefined,
      guests,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      minBeds: beds,
      powerBackup,
      highSpeedWifi,
      sort,
    });
    onClose();
  };

  const nights =
    checkIn && checkOut
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerAction}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search & filters</Text>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.headerAction}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Destination</Text>
          <View style={styles.searchRow}>
            <Search size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Town, valley, or stay name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Dates</Text>
            {nights > 0 && <Text style={styles.hint}>{nights} night{nights > 1 ? 's' : ''}</Text>}
          </View>
          <CalendarRangePicker
            bookedRanges={[]}
            blockedDates={[]}
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />
          {(checkIn || checkOut) && (
            <TouchableOpacity
              onPress={() => {
                setCheckIn(null);
                setCheckOut(null);
              }}
            >
              <Text style={styles.clearDates}>Clear dates</Text>
            </TouchableOpacity>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Guests</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.btn} onPress={() => setGuests(Math.max(1, guests - 1))}>
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.val}>{guests}</Text>
              <TouchableOpacity style={styles.btn} onPress={() => setGuests(Math.min(16, guests + 1))}>
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Bedrooms</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.btn} onPress={() => setBeds(Math.max(1, beds - 1))}>
                <Minus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.val}>{beds}+</Text>
              <TouchableOpacity style={styles.btn} onPress={() => setBeds(Math.min(10, beds + 1))}>
                <Plus size={14} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Price per night (₹)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.priceInput]}
              value={minPrice}
              onChangeText={(t) => setMinPrice(t.replace(/[^0-9]/g, ''))}
              placeholder="Min"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.dash}>–</Text>
            <TextInput
              style={[styles.priceInput]}
              value={maxPrice}
              onChangeText={(t) => setMaxPrice(t.replace(/[^0-9]/g, ''))}
              placeholder="Max"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Essentials</Text>
          <View style={styles.chipWrap}>
            <TouchableOpacity
              style={[styles.chip, powerBackup && styles.chipActive]}
              onPress={() => setPowerBackup(!powerBackup)}
            >
              <Text style={[styles.chipText, powerBackup && styles.chipTextActive]}>Power backup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, highSpeedWifi && styles.chipActive]}
              onPress={() => setHighSpeedWifi(!highSpeedWifi)}
            >
              <Text style={[styles.chipText, highSpeedWifi && styles.chipTextActive]}>Fast Wi-Fi</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Sort</Text>
          <View style={styles.sortList}>
            {SORTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sortRow, sort === s.id && styles.sortRowActive]}
                onPress={() => setSort(s.id)}
              >
                <Text style={[styles.sortText, sort === s.id && styles.sortTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.applyButton} onPress={apply}>
            <Text style={styles.applyText}>Show stays</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.surfaceLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerAction: { fontSize: 15, color: Colors.textSecondary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 12 },
  label: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  hint: { fontSize: 13, color: Colors.textSecondary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  clearDates: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textDecorationLine: 'underline', marginTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, minWidth: 34, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1,
    backgroundColor: Colors.pillInactive,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dash: { fontSize: 16, color: Colors.textMuted },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9999, backgroundColor: Colors.pillInactive },
  chipActive: { backgroundColor: Colors.primaryBlack },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: Colors.textWhite },
  sortList: { gap: 8 },
  sortRow: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: Colors.pillInactive },
  sortRowActive: { backgroundColor: Colors.primaryBlack },
  sortText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  sortTextActive: { color: Colors.textWhite },
  bottomBar: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  applyButton: { backgroundColor: Colors.primaryBlack, borderRadius: 9999, paddingVertical: 16, alignItems: 'center' },
  applyText: { color: Colors.textWhite, fontSize: 15, fontWeight: '700' },
});
