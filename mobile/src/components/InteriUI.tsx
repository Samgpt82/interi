import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/interi';

export function Screen({ children, testID }: { children: React.ReactNode; testID: string }) {
  return (
    <SafeAreaView testID={testID} edges={['top']} className="flex-1" style={{ backgroundColor: COLORS.chalk }}>
      {children}
    </SafeAreaView>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <View className="flex-row items-end justify-between">
      <Text style={{ color: COLORS.espresso, fontFamily: 'Georgia', fontSize: compact ? 27 : 34, letterSpacing: -1.2 }}>
        interi
      </Text>
      {!compact ? (
        <Text className="pb-1 text-[10px] uppercase tracking-[3px]" style={{ color: COLORS.olive }}>
          room study
        </Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  testID,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className="overflow-hidden rounded-full active:scale-[0.98]"
      style={{ opacity: disabled ? 0.45 : 1 }}>
      <LinearGradient colors={[COLORS.coral, '#E8583C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 58, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
        {loading ? <ActivityIndicator testID={`${testID}-loading`} color={COLORS.white} /> : <Text className="text-base font-semibold tracking-wide" style={{ color: COLORS.white }}>{label}</Text>}
        {!loading ? <ArrowRight size={18} color={COLORS.white} style={{ marginLeft: 10 }} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, label, onPress, testID }: { icon: LucideIcon; label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} className="min-h-12 flex-row items-center justify-center rounded-full border px-4 active:opacity-60" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
      <Icon size={17} color={COLORS.espresso} />
      <Text className="ml-2 text-sm font-medium" style={{ color: COLORS.espresso }}>{label}</Text>
    </Pressable>
  );
}
