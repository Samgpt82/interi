import { ThemeProvider, type Theme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { COLORS } from '@/lib/interi';
import { SavedDesignsProvider } from '@/lib/state/saved-designs-context';

export const unstable_settings = { initialRouteName: '(tabs)' };

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
const interiTheme: Theme = {
  dark: false,
  colors: {
    primary: COLORS.coral,
    background: COLORS.chalk,
    card: COLORS.paper,
    text: COLORS.espresso,
    border: COLORS.line,
    notification: COLORS.coral,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export function RootLayoutNav() {
  return (
    <ThemeProvider value={interiTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.chalk } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="style" />
        <Stack.Screen name="generating" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [ready] = useState<boolean>(true);
  const handleLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SavedDesignsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <View style={{ flex: 1, backgroundColor: COLORS.chalk }} onLayout={handleLayout}>
              <StatusBar style="dark" />
              <RootLayoutNav />
            </View>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SavedDesignsProvider>
    </QueryClientProvider>
  );
}
