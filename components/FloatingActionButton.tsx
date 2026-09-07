import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { Colors } from '../constants/theme';

export function FloatingActionButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  // Sits bottom-right, clear of the centered dock.
  const bottom = Math.max(insets.bottom + 8, 20) + 76;
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom, right: 20 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Plus size={24} color={Colors.textWhite} strokeWidth={2.6} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
});
