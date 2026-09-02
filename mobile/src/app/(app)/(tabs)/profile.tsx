import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowUpRight, Bookmark, Crown, LogOut, Mail, MapPin, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Screen, Wordmark } from '@/components/InteriUI';
import { authClient } from '@/lib/auth/auth-client';
import { useInvalidateSession, useSession } from '@/lib/auth/use-session';
import { authorizeDesignGeneration, DESIGN_ACCESS_QUERY_KEY, fetchDesignAccess, resetSubscriptionUserIfLoaded } from '@/lib/design-access';
import { COLORS } from '@/lib/interi';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { designs } = useSavedDesigns();
  const invalidateSession = useInvalidateSession();
  const email = session?.user.email ?? '';
  const initial = email.slice(0, 1).toUpperCase() || 'I';
  const designAccess = useQuery({
    queryKey: DESIGN_ACCESS_QUERY_KEY,
    queryFn: fetchDesignAccess,
    enabled: Boolean(session?.user.id),
    staleTime: 1000 * 15,
  });
  const subscription = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error('Sign in before choosing a plan.');
      return authorizeDesignGeneration(session.user.id);
    },
    onSuccess: (result) => queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, result.designAccess),
  });
  const freeDesignsRemaining = designAccess.data?.freeDesignsRemaining;
  const freeAllowanceActive = (freeDesignsRemaining ?? 0) > 0;
  const fullAccess = subscription.data?.accessMode === 'subscription' && subscription.data.accessGranted;
  const subscriptionsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  const signOut = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Unable to sign out.');
      await resetSubscriptionUserIfLoaded().catch((error: unknown) => console.warn('RevenueCat sign out failed', error));
      queryClient.removeQueries({ queryKey: DESIGN_ACCESS_QUERY_KEY });
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

        {subscriptionsSupported ? (
          <>
            <Text className="mt-9 text-[10px] font-semibold uppercase tracking-[2.2px]" style={{ color: COLORS.olive }}>Membership</Text>
            <Pressable
              testID="profile-subscription-button"
              accessibilityRole="button"
              accessibilityState={{ disabled: freeDesignsRemaining !== 0 || fullAccess || subscription.isPending }}
              disabled={freeDesignsRemaining !== 0 || fullAccess || subscription.isPending}
              onPress={() => subscription.mutate()}
              className="mt-3 min-h-[84px] flex-row items-center rounded-[24px] border px-5 active:opacity-65"
              style={{ borderColor: freeAllowanceActive || fullAccess ? '#B9C5A1' : '#E8A995', backgroundColor: freeAllowanceActive || fullAccess ? '#EEF1E7' : '#FBE9E2', opacity: designAccess.isPending ? 0.65 : 1 }}>
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: freeAllowanceActive || fullAccess ? COLORS.oliveDark : COLORS.coral }}>
                {freeAllowanceActive || fullAccess ? <ShieldCheck size={20} color={COLORS.white} /> : <Crown size={20} color={COLORS.white} />}
              </View>
              <View className="ml-4 flex-1">
                <Text testID="profile-design-access-status" className="text-base font-semibold" style={{ color: COLORS.espresso }}>
                  {fullAccess
                    ? 'Full access active'
                    : designAccess.isPending
                      ? 'Checking free designs…'
                      : freeAllowanceActive
                        ? `${freeDesignsRemaining} free ${freeDesignsRemaining === 1 ? 'design' : 'designs'} remaining`
                        : subscription.isPending
                          ? 'Opening plans…'
                          : 'Unlock full access'}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: COLORS.olive }}>
                  {fullAccess
                    ? 'Your plan is active on this account.'
                    : freeAllowanceActive
                      ? 'Subscriptions stay off until your free designs are complete.'
                      : 'Open the monthly and yearly plans.'}
                </Text>
              </View>
              {freeDesignsRemaining === 0 && !fullAccess ? <ArrowUpRight size={18} color={COLORS.coral} /> : null}
            </Pressable>
            {designAccess.isError ? (
              <Text testID="profile-design-access-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>
                {designAccess.error instanceof Error ? designAccess.error.message : 'Unable to check free designs.'}
              </Text>
            ) : null}
            {subscription.isError ? (
              <Text testID="profile-subscription-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>
                {subscription.error instanceof Error ? subscription.error.message : 'Unable to open subscription options.'}
              </Text>
            ) : null}
          </>
        ) : null}

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
