import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { FloatingBottomDock } from '../../components/FloatingBottomDock';
import { ActionLauncherModal } from '../../components/ActionLauncherModal';
import { AddPropertyModal } from '../../components/AddPropertyModal';
import { AiConciergeModal } from '../../components/AiConciergeModal';

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isActionLauncherOpen, setIsActionLauncherOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAiConciergeOpen, setIsAiConciergeOpen] = useState(false);

  const getActiveTab = () => {
    if (pathname.includes('itineraries')) return 'itineraries';
    if (pathname.includes('trips')) return 'trips';
    if (pathname.includes('profile')) return 'profile';
    return 'explore';
  };

  const handleSelectTab = (tabName: string) => {
    if (tabName === 'explore') {
      router.push('/(tabs)');
    } else if (tabName === 'itineraries') {
      router.push('/(tabs)/itineraries');
    } else if (tabName === 'action') {
      setIsActionLauncherOpen(true);
    } else if (tabName === 'trips') {
      router.push('/(tabs)/trips');
    } else if (tabName === 'profile') {
      router.push('/(tabs)/profile');
    }
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Custom FloatingBottomDock
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="itineraries" />
        <Tabs.Screen name="trips" />
        <Tabs.Screen name="profile" />
      </Tabs>

      {/* Floating Glassmorphic Bottom Dock */}
      <FloatingBottomDock
        activeTab={getActiveTab()}
        onSelectTab={handleSelectTab}
      />

      {/* Center Action Launcher Sheet */}
      <ActionLauncherModal
        visible={isActionLauncherOpen}
        onClose={() => setIsActionLauncherOpen(false)}
        onSelectListProperty={() => setIsAddPropertyOpen(true)}
        onSelectCreateItinerary={() => router.push('/(tabs)/itineraries')}
        onSelectAiConcierge={() => setIsAiConciergeOpen(true)}
      />

      {/* 8-Step Add Property Wizard */}
      <AddPropertyModal
        visible={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        onSuccess={() => router.push('/(tabs)/profile')}
      />

      {/* Ghumna Phirna AI Concierge Modal */}
      <AiConciergeModal
        visible={isAiConciergeOpen}
        onClose={() => setIsAiConciergeOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
});
