import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface AadhaarBadgeProps {
  label?: string;
  size?: 'small' | 'medium';
}

export function AadhaarBadge({ label = 'Aadhaar Verified', size = 'small' }: AadhaarBadgeProps) {
  const isSmall = size === 'small';
  return (
    <View style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}>
      <ShieldCheck size={isSmall ? 13 : 16} color="#15803D" />
      <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7', // soft green tint
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 9999,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
  },
  text: {
    fontWeight: '700',
    color: '#15803D',
  },
  textSmall: {
    fontSize: 11,
  },
  textMedium: {
    fontSize: 13,
  },
});
