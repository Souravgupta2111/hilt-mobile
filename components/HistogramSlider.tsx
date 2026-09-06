import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface HistogramSliderProps {
  title: string;
  minLabel?: string;
  maxLabel?: string;
  bars?: number[];
  unit?: string;
}

export function HistogramSlider({
  title,
  minLabel = '₹0',
  maxLabel = '₹50k+',
  bars = [15, 25, 45, 60, 30, 75, 90, 100, 80, 65, 40, 85, 95, 70, 50, 30, 20, 15, 10],
  unit = '',
}: HistogramSliderProps) {
  const [minVal, setMinVal] = useState(minLabel);
  const [maxVal, setMaxVal] = useState(maxLabel);
  const [activeRange, setActiveRange] = useState({ startIdx: 2, endIdx: 15 });

  const maxBarHeight = 54;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.manualText}>Enter Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Histogram Bar Chart */}
      <View style={styles.barsContainer}>
        {bars.map((heightPct, idx) => {
          const isSelected = idx >= activeRange.startIdx && idx <= activeRange.endIdx;
          const barHeight = (heightPct / 100) * maxBarHeight;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.bar,
                {
                  height: Math.max(barHeight, 6),
                  backgroundColor: isSelected ? Colors.greenDensity : '#E2E8F0',
                },
              ]}
              onPress={() => {
                if (idx < activeRange.endIdx) {
                  setActiveRange({ ...activeRange, startIdx: idx });
                }
              }}
              activeOpacity={0.7}
            />
          );
        })}
      </View>

      {/* Dual Slider Track & Thumbs */}
      <View style={styles.trackContainer}>
        <View style={styles.baseTrack} />
        {/* Selected Range Highlight Track */}
        <View
          style={[
            styles.activeTrack,
            {
              left: `${(activeRange.startIdx / bars.length) * 100}%`,
              width: `${((activeRange.endIdx - activeRange.startIdx) / bars.length) * 100}%`,
            },
          ]}
        />

        {/* Left Thumb */}
        <View
          style={[
            styles.thumb,
            { left: `${(activeRange.startIdx / bars.length) * 100}%` },
          ]}
        >
          <ChevronLeft size={12} color={Colors.textSecondary} />
        </View>

        {/* Right Thumb */}
        <View
          style={[
            styles.thumb,
            { left: `${(activeRange.endIdx / bars.length) * 100 - 4}%` },
          ]}
        >
          <ChevronRight size={12} color={Colors.textSecondary} />
        </View>
      </View>

      {/* Min & Max Pill Badges */}
      <View style={styles.badgeRow}>
        <View style={styles.pillBadge}>
          <Text style={styles.pillBadgeText}>{minVal}</Text>
        </View>
        <View style={styles.pillBadge}>
          <Text style={styles.pillBadgeText}>{maxVal}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  manualText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  bar: {
    width: 9,
    borderRadius: 4,
  },
  trackContainer: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  baseTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    width: '100%',
  },
  activeTrack: {
    position: 'absolute',
    height: 4,
    backgroundColor: Colors.greenDensity,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  pillBadge: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceLight,
    minWidth: 90,
    alignItems: 'center',
  },
  pillBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
