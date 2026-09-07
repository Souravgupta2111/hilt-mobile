import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary, track } from '../lib/observability';
import { registerPushToken } from '../lib/push';
import { initLocale } from '../lib/locale';
import { initDeepLinks } from '../lib/deeplinks';

initLocale();

export default function RootLayout() {
  useEffect(() => {
    track('app_open');
    registerPushToken();
    return initDeepLinks();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FFFFFF' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="property/[id]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </ErrorBoundary>
    </>
  );
}
