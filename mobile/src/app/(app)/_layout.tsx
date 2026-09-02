import { Stack } from 'expo-router';
import React from 'react';

import { COLORS } from '@/lib/interi';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.chalk } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="style" />
      <Stack.Screen name="generating" options={{ gestureEnabled: false }} />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="result" />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
