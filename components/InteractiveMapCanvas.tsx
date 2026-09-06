import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Hand, Layers, Star, Bed, Bath, X } from 'lucide-react-native';
import { Property } from '../types/database';
import { Colors } from '../constants/theme';

interface InteractiveMapCanvasProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
}

const { width } = Dimensions.get('window');

export function InteractiveMapCanvas({
  properties,
  onSelectProperty,
}: InteractiveMapCanvasProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    properties[0] || null
  );

  // Teardrop pin positions distributed across canvas
  const pinPositions = [
    { top: '15%', left: '46%' },
    { top: '28%', left: '12%' },
    { top: '28%', left: '48%' },
    { top: '28%', left: '72%' },
    { top: '48%', left: '30%' },
    { top: '42%', left: '72%' },
    { top: '56%', left: '16%' },
    { top: '58%', left: '48%' },
    { top: '60%', left: '74%' },
    { top: '70%', left: '30%' },
  ];

  const formatPriceShort = (price: number) => {
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    }
    if (price >= 1000) {
      return `₹${Math.round(price / 1000)}k`;
    }
    return `₹${price}`;
  };

  return (
    <View style={styles.container}>
      {/* Topographic Map Canvas Background */}
      <View style={styles.mapBackground}>
        {/* Simulated Map Streets & Topography Grid Lines */}
        <View style={styles.streetHorizontal1} />
        <View style={styles.streetHorizontal2} />
        <View style={styles.streetHorizontal3} />
        <View style={styles.streetVertical1} />
        <View style={styles.streetVertical2} />
        <View style={styles.streetDiagonal} />

        {/* Locality Labels */}
        <Text style={[styles.localityLabel, { top: '35%', left: '50%' }]}>
          13th St
        </Text>
        <Text style={[styles.localityLabel, { top: '50%', left: '45%' }]}>
          TIRTHAN VALLEY
        </Text>
        <Text style={[styles.localityDistrict, { top: '65%', left: '45%' }]}>
          JIBHI RIDGE
        </Text>
        <Text style={[styles.localityLabel, { top: '75%', left: '60%' }]}>
          Pine Forest Trail
        </Text>

        {/* Teardrop Price Bubble Pins */}
        {properties.map((prop, index) => {
          const pos = pinPositions[index % pinPositions.length];
          const isSelected = selectedProperty?.id === prop.id;

          return (
            <TouchableOpacity
              key={prop.id}
              style={[
                styles.pinContainer,
                { top: pos.top as any, left: pos.left as any },
                isSelected && styles.pinSelected,
              ]}
              onPress={() => setSelectedProperty(prop)}
              activeOpacity={0.85}
            >
              <View style={[styles.pinBubble, isSelected && styles.pinBubbleSelected]}>
                <Text style={styles.pinText}>
                  {formatPriceShort(prop.price_entire_villa)}
                </Text>
              </View>
              {/* Teardrop Triangle Tail */}
              <View style={[styles.pinTail, isSelected && styles.pinTailSelected]} />
            </TouchableOpacity>
          );
        })}

        {/* Left Floating Controls (Hand / Layers) */}
        <View style={styles.leftControls}>
          <TouchableOpacity style={styles.controlButton} activeOpacity={0.8}>
            <Hand size={18} color={Colors.textWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} activeOpacity={0.8}>
            <Layers size={18} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Property Preview Card (Floats above bottom dock) */}
      {selectedProperty && (
        <TouchableOpacity
          style={styles.previewCard}
          onPress={() => onSelectProperty(selectedProperty)}
          activeOpacity={0.95}
        >
          <Image
            source={{ uri: selectedProperty.images[0] }}
            style={styles.previewImage}
          />
          <View style={styles.previewDetails}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedProperty.title}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedProperty(null)}
                style={{ padding: 4 }}
              >
                <X size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.previewLocation} numberOfLines={1}>
              {selectedProperty.town}, {selectedProperty.valley} • {selectedProperty.altitude_meters}m
            </Text>

            <View style={styles.previewSpecs}>
              <View style={styles.miniChip}>
                <Bed size={12} color={Colors.textSecondary} />
                <Text style={styles.miniChipText}>{selectedProperty.bedrooms} Bed</Text>
              </View>
              <View style={styles.miniChip}>
                <Bath size={12} color={Colors.textSecondary} />
                <Text style={styles.miniChipText}>{selectedProperty.bathrooms} Bath</Text>
              </View>
              <View style={styles.miniChip}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={[styles.miniChipText, { fontWeight: '700' }]}>
                  {selectedProperty.rating}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.previewPrice}>
                ₹{selectedProperty.price_entire_villa.toLocaleString('en-IN')}{' '}
                <Text style={{ fontSize: 11, fontWeight: '400', color: Colors.textSecondary }}>
                  /night
                </Text>
              </Text>
              <View style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Stay</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    minHeight: 520,
  },
  mapBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F3F4F1',
    overflow: 'hidden',
  },
  streetHorizontal1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-6deg' }],
  },
  streetHorizontal2: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '4deg' }],
  },
  streetHorizontal3: {
    position: 'absolute',
    top: '72%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
  },
  streetVertical1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '32%',
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  streetVertical2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '68%',
    width: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '8deg' }],
  },
  streetDiagonal: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '15%',
    width: 18,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '38deg' }],
  },
  localityLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  localityDistrict: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.2,
  },
  pinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  pinSelected: {
    zIndex: 20,
    transform: [{ scale: 1.15 }],
  },
  pinBubble: {
    backgroundColor: Colors.greenVibrant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  pinBubbleSelected: {
    backgroundColor: Colors.primaryBlack,
  },
  pinText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.greenVibrant,
    marginTop: -1,
  },
  pinTailSelected: {
    borderTopColor: Colors.primaryBlack,
  },
  leftControls: {
    position: 'absolute',
    left: 16,
    bottom: 140,
    gap: 10,
    zIndex: 15,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  previewCard: {
    position: 'absolute',
    bottom: 95,
    left: 16,
    right: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 24,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    zIndex: 30,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 18,
  },
  previewDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  previewLocation: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  previewSpecs: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.pillInactive,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  miniChipText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  previewPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  viewButton: {
    backgroundColor: Colors.primaryBlack,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  viewButtonText: {
    color: Colors.textWhite,
    fontSize: 11,
    fontWeight: '600',
  },
});
