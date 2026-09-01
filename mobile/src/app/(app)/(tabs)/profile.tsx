import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowUpRight, Bookmark, LogOut, Mail, MapPin, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen, Wordmark } from '@/components/InteriUI';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession, useSession } from '@/lib/auth/use-session';
import { COLORS } from '@/lib/interi';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

export default function ProfileScreen() {
  const { data: session } = useSession();
  const { designs } = useSavedDesigns();
  const invalidateSession = useInvalidateSession();
  const email = session?.user.email ?? '';
  const initial = email.slice(0, 1).toUpperCase() || 'I';

  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Unable to sign out.');
      await invalidateSession();
    },
  });

  return (
    <Screen testID="profile-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 124 }}>
        <Wordmark />

        <View className="mt-9 overflow-hidden rounded-[30px] border p-6" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.espresso }}>
              <Text className="text-2xl" style={{ color: COLORS.white, fontFamily: 'Georgia' }}>{initial}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.coral }}>Your studio</Text>
              <Text numberOfLines={1} className="mt-1 text-lg font-semibold" style={{ color: COLORS.espresso }}>{email}</Text>
            </View>
          </View>

          <View className="mt-6 flex-row rounded-[22px] p-4" style={{ backgroundColor: '#EEE7DB' }}>
            <View className="flex-1 border-r" style={{ borderRightColor: COLORS.line }}>
              <Text className="text-3xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{designs.length}</Text>
              <Text className="mt-1 text-[10px] uppercase tracking-[1.5px]" style={{ color: COLORS.olive }}>Projects</Text>
            </View>
            <View className="flex-1 pl-5">
              <View className="flex-row items-center"><ShieldCheck size={17} color={COLORS.oliveDark} /><Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.espresso }}>Private</Text></View>
              <Text className="mt-1 text-[10px] uppercase tracking-[1.5px]" style={{ color: COLORS.olive }}>Account storage</Text>
            </View>
          </View>
        </View>

        <Text className="mt-9 text-[10px] font-semibold uppercase tracking-[2.2px]" style={{ color: COLORS.olive }}>Studio</Text>
        <View className="mt-3 overflow-hidden rounded-[24px] border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          <Pressable testID="profile-projects-button" onPress={() => router.push('/saved')} className="min-h-[76px] flex-row items-center px-5 active:opacity-65">
            <Bookmark size={20} color={COLORS.espresso} />
            <View className="ml-4 flex-1"><Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>My projects</Text><Text className="mt-1 text-xs" style={{ color: COLORS.olive }}>Return to your saved rooms</Text></View>
            <ArrowUpRight size={18} color={COLORS.olive} />
          </Pressable>
          <Pressable testID="profile-settings-button" onPress={() => router.push('/settings')} className="min-h-[76px] flex-row items-center border-t px-5 active:opacity-65" style={{ borderTopColor: COLORS.line }}>
            <MapPin size={20} color={COLORS.espresso} />
            <View className="ml-4 flex-1"><Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>Shopping region</Text><Text className="mt-1 text-xs" style={{ color: COLORS.olive }}>Choose the shops Interi suggests</Text></View>
            <ArrowUpRight size={18} color={COLORS.olive} />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center rounded-[20px] border px-4 py-4" style={{ borderColor: COLORS.line }}>
          <Mail size={17} color={COLORS.olive} />
          <Text className="ml-3 flex-1 text-xs leading-5" style={{ color: COLORS.olive }}>Email sign-in keeps your account password-free and secure.</Text>
        </View>

        <Pressable testID="sign-out-button" disabled={signOut.isPending} onPress={() => signOut.mutate()} className="mt-8 min-h-12 flex-row items-center justify-center rounded-full border active:opacity-60" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          <LogOut size={17} color={COLORS.coral} />
          <Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.coral }}>{signOut.isPending ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
        {signOut.isError ? <Text testID="sign-out-error" className="mt-3 text-center text-sm" style={{ color: COLORS.coral }}>{signOut.error instanceof Error ? signOut.error.message : 'Unable to sign out.'}</Text> : null}
      </ScrollView>
    </Screen>
  );
}
