import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Home, Compass, Plus, Luggage, User } from 'lucide-react-native';
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
    { key: 'action', icon: Plus, isAction: true },
    { key: 'trips', icon: Luggage },
    { key: 'profile', icon: User },
  ];

  return (
    <View style={[styles.outerContainer, { bottom: dynamicBottom }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="light" style={styles.dock}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComp = tab.icon;

          if (tab.isAction) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.actionButton}
                onPress={() => onSelectTab(tab.key)}
                activeOpacity={0.85}
              >
                <Plus size={22} color={Colors.textWhite} strokeWidth={2.6} />
              </TouchableOpacity>
            );
          }

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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    width: width * 0.84,
    maxWidth: 360,
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
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBlack,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});
