import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export type ViewMode = 'map' | 'cards' | 'grid';

interface TriViewSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function TriViewSwitcher({ currentMode, onModeChange }: TriViewSwitcherProps) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: 'map', label: 'Map' },
    { key: 'cards', label: 'Cards' },
    { key: 'grid', label: 'Grid' },
  ];

  return (
    <View style={styles.capsule}>
      {modes.map((item) => {
        const isActive = item.key === currentMode;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onModeChange(item.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: Colors.pillInactive,
    borderRadius: 9999,
    padding: 4,
    marginVertical: 10,
  },
  segment: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primaryBlack,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.textWhite,
  },
  labelInactive: {
    color: Colors.textPrimary,
  },
});
