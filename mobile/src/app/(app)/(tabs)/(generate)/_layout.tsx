import { Stack } from 'expo-router';
import React from 'react';

import { COLORS } from '@/lib/interi';

export default function GenerateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.chalk } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="style" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
