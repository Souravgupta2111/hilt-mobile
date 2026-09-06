import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';

interface SkeletonLoaderProps {
  width: number | `${number}%` | 'auto';
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width,
  height,
  borderRadius = 12,
  style,
}: SkeletonLoaderProps) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader width="100%" height={230} borderRadius={22} />
      <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLoader width={180} height={20} borderRadius={6} />
        <SkeletonLoader width={70} height={20} borderRadius={6} />
      </View>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        <SkeletonLoader width={65} height={26} borderRadius={8} />
        <SkeletonLoader width={65} height={26} borderRadius={8} />
        <SkeletonLoader width={55} height={26} borderRadius={8} />
        <SkeletonLoader width={55} height={26} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  cardContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 28,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
});
