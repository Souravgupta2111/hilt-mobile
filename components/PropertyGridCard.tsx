import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, ArrowUpRight, Bed } from 'lucide-react-native';
import { Property } from '../types/database';
import { Colors } from '../constants/theme';

interface PropertyGridCardProps {
  property: Property;
  onPress: () => void;
}

export function PropertyGridCard({ property, onPress }: PropertyGridCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image with Heart badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />

        <TouchableOpacity
          style={styles.heartBadge}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.8}
        >
          <Heart
            size={14}
            color={Colors.heartRed}
            fill={isFavorite ? Colors.heartRed : 'none'}
          />
        </TouchableOpacity>
      </View>

      {/* Price & Action Row */}
      <View style={styles.priceRow}>
        <Text style={styles.price} numberOfLines={1}>
          {formatPrice(property.price_entire_villa)}
        </Text>
        <View style={styles.arrowButton}>
          <ArrowUpRight size={14} color={Colors.textWhite} />
        </View>
      </View>

      {/* Footer Specs: Days on market & Bed count */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {property.days_on_market} Day On Market
        </Text>
        <View style={styles.bedCount}>
          <Bed size={12} color={Colors.textSecondary} />
          <Text style={styles.bedText}>{property.bedrooms} BEDS</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 22,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  arrowButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
