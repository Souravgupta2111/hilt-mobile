import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

interface CategoryPillBarProps {
  categories?: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPillBar({
  categories = ['Home', 'Hotel', 'Apartment', 'Office'],
  selectedCategory,
  onSelectCategory,
}: CategoryPillBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((cat) => {
        const isActive = cat === selectedCategory;
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            onPress={() => onSelectCategory(cat)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pill: {
    height: 40,
    paddingHorizontal: 22,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primaryBlack,
  },
  pillInactive: {
    backgroundColor: Colors.pillInactive,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  pillTextActive: {
    color: Colors.textWhite,
  },
  pillTextInactive: {
    color: Colors.textPrimary,
  },
});
