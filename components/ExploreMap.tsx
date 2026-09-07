import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, ActivityIndicator } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react-native';
import type { Property } from '../types/database';
import { Colors } from '../constants/theme';

interface ExploreMapProps {
  visible: boolean;
  properties: Property[];
  onClose: () => void;
  onSelectProperty: (property: Property) => void;
}

/**
 * Real map over the search results. Pins carry live prices; tapping one opens
 * a compact preview card that routes to the property page.
 */
export function ExploreMap({ visible, properties, onClose, onSelectProperty }: ExploreMapProps) {
  const [selected, setSelected] = useState<Property | null>(null);
  const mapRef = useRef<MapView>(null);

  const initialRegion: Region = useMemo(() => {
    const pins = properties.filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    if (pins.length === 0) {
      return { latitude: 31.8, longitude: 77.4, latitudeDelta: 3.2, longitudeDelta: 3.2 };
    }
    const latSum = pins.reduce((a, p) => a + p.latitude, 0) / pins.length;
    const lonSum = pins.reduce((a, p) => a + p.longitude, 0) / pins.length;
    const lats = pins.map((p) => p.latitude);
    const lons = pins.map((p) => p.longitude);
    return {
      latitude: latSum,
      longitude: lonSum,
      latitudeDelta: Math.max(0.6, (Math.max(...lats) - Math.min(...lats)) * 1.6),
      longitudeDelta: Math.max(0.6, (Math.max(...lons) - Math.min(...lons)) * 1.6),
    };
  }, [properties]);

  if (!visible) return null;

  const pins = properties.filter((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close map"
          >
            <ChevronLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Map</Text>
          <View style={{ width: 36 }} />
        </View>

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          onPress={() => setSelected(null)}
        >
          {pins.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              onPress={() => setSelected(p)}
              tracksViewChanges={false}
            >
              <View style={[styles.pin, selected?.id === p.id && styles.pinSelected]}>
                <Text style={[styles.pinText, selected?.id === p.id && styles.pinTextSelected]}>
                  ₹{Math.round(p.price_entire_villa / 1000)}k
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {selected && (
          <View style={styles.previewCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.previewMeta} numberOfLines={1}>
                {selected.town} · ₹{selected.price_entire_villa.toLocaleString('en-IN')}/night
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => onSelectProperty(selected)}
              accessibilityRole="button"
              accessibilityLabel={`View ${selected.title}`}
            >
              <Text style={styles.viewText}>View</Text>
              <ChevronRight size={14} color={Colors.textWhite} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.pillInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  map: { flex: 1 },
  pin: {
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pinSelected: { backgroundColor: '#2563EB' },
  pinText: { color: Colors.textWhite, fontSize: 11, fontWeight: '700' },
  pinTextSelected: { color: Colors.textWhite },
  previewCard: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  previewMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  viewText: { color: Colors.textWhite, fontSize: 13, fontWeight: '700' },
});
