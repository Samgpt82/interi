import { ThemeProvider, type Theme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useSession } from '@/lib/auth/use-session';
import { COLORS } from '@/lib/interi';
import { initializeRevenueCatUser } from '@/lib/revenuecat';
import { SavedDesignsProvider } from '@/lib/state/saved-designs-context';

export const unstable_settings = { initialRouteName: '(app)' };

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
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (!session?.user.id) return;
    void initializeRevenueCatUser(session.user.id).catch((error) => {
      console.warn('RevenueCat initialization failed', error);
    });
  }, [session?.user.id]);

  if (isLoading) {
    return (
      <View testID="session-loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.chalk }}>
        <ActivityIndicator color={COLORS.coral} />
        <Text style={{ marginTop: 12, color: COLORS.olive }}>Opening your studio…</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={interiTheme}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: COLORS.chalk } }}>
        <Stack.Protected guard={!!session?.user}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session?.user}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="verify-otp" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

function AppShell() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <View style={{ flex: 1, backgroundColor: COLORS.chalk }} onLayout={() => void SplashScreen.hideAsync()}>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </View>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SavedDesignsProvider>
        <AppShell />
      </SavedDesignsProvider>
    </QueryClientProvider>
  );
}
