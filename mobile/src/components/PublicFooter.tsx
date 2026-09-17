import { Link } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/lib/interi';

export function PublicFooter() {
  return (
    <View
      testID="website-footer"
      className="w-full border-t"
      style={{ borderColor: COLORS.line }}>
      <View
        className="w-full flex-row flex-wrap items-center justify-between gap-4 px-1 py-7"
        style={{ maxWidth: 1120, alignSelf: 'center' }}>
        <View className="flex-row items-baseline">
          <Text style={{ color: COLORS.espresso, fontFamily: 'Georgia', fontSize: 23, letterSpacing: -0.8 }}>
            interi
          </Text>
          <Text className="ml-3 text-[10px] uppercase tracking-[2px]" style={{ color: COLORS.olive }}>
            Thoughtful rooms, imagined
          </Text>
        </View>

        <View className="flex-row items-center gap-5">
          <Link href={'/support' as never} asChild>
            <Pressable
              testID="footer-support-link"
              accessibilityRole="link"
              className="min-h-11 justify-center px-2 active:opacity-60">
              <Text className="text-sm font-semibold" style={{ color: COLORS.espresso }}>
                Support
              </Text>
            </Pressable>
          </Link>
          <Text className="text-xs" style={{ color: COLORS.olive }}>
            © {new Date().getFullYear()} Interi
          </Text>
        </View>
      </View>
    </View>
  );
}
