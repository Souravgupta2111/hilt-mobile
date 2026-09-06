import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, Star, Layers, Bed, Bath } from 'lucide-react-native';
import { Property } from '../types/database';
import { Colors } from '../constants/theme';

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
}

export function PropertyCard({ property, onPress }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}k`;
    }
    return `₹${price}`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Hero Image with Overlaid Badges */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Promo Pill (Top-Left) */}
        {property.discount_percentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>Off {property.discount_percentage}%</Text>
          </View>
        )}

        {/* Heart Favorite Toggle (Top-Right) */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.8}
        >
          <Heart
            size={18}
            color={isFavorite ? Colors.heartRed : Colors.textWhite}
            fill={isFavorite ? Colors.heartRed : 'rgba(0,0,0,0.25)'}
          />
        </TouchableOpacity>
      </View>

      {/* Details Row 1: Title & Price */}
      <View style={styles.titlePriceRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.title} numberOfLines={1}>
            {property.title}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {property.town}, {property.state}
          </Text>
        </View>
        <Text style={styles.price}>
          {formatPrice(property.price_entire_villa)}
        </Text>
      </View>

      {/* Details Row 2: Specs Pill Badges (Exact Mockup Layout) */}
      <View style={styles.specsRow}>
        <View style={styles.specChip}>
          <Layers size={13} color={Colors.textSecondary} />
          <Text style={styles.specText}>{property.floors} Floor</Text>
        </View>

        <View style={styles.specChip}>
          <Bed size={13} color={Colors.textSecondary} />
          <Text style={styles.specText}>{property.bedrooms} Bed</Text>
        </View>

        <View style={styles.specChip}>
          <Bath size={13} color={Colors.textSecondary} />
          <Text style={styles.specText}>{property.bathrooms} Bath</Text>
        </View>

        <View style={styles.specChip}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={[styles.specText, { fontWeight: '700', color: Colors.textPrimary }]}>
            {property.rating ? property.rating.toFixed(1) : '5.0'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 28,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  discountText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  location: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  price: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.pillInactive,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  specText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
