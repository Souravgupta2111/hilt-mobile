import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, Compass, Luggage, MessageCircle, User } from 'lucide-react-native';
import { Colors } from '../constants/theme';

interface FloatingBottomDockProps {
  activeTab: string;
  onSelectTab: (tabName: string) => void;
}

const { width } = Dimensions.get('window');

export function FloatingBottomDock({ activeTab, onSelectTab }: FloatingBottomDockProps) {
  const insets = useSafeAreaInsets();
  const dynamicBottom = Math.max(insets.bottom + 8, 20);

  const tabs = [
    { key: 'explore', icon: Home },
    { key: 'itineraries', icon: Compass },
    { key: 'trips', icon: Luggage },
    { key: 'messages', icon: MessageCircle },
    { key: 'profile', icon: User },
  ];

  return (
    <View style={[styles.outerContainer, { bottom: dynamicBottom }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="light" style={styles.dock}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.7}
            >
              <IconComp
                size={20}
                color={isActive ? Colors.textWhite : Colors.textSecondary}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    width: width * 0.86,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  tabItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: Colors.primaryBlack,
  },
});
