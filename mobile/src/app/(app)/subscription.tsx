import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Crown, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { useSession } from '@/lib/auth/use-session';
import { authorizeDesignGeneration, DESIGN_ACCESS_QUERY_KEY } from '@/lib/design-access';
import { COLORS } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';

const BENEFITS = [
  'Compose more rooms without the free-design limit',
  'Refine materials, lighting and furniture directions',
  'Keep every version together in your private studio',
] as const;

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const setAccessMode = useGenerationStore((state) => state.setAccessMode);
  const [notice, setNotice] = useState<string | null>(null);
  const subscriptionsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  const subscription = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error('Sign in before choosing a plan.');
      return authorizeDesignGeneration(session.user.id);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, result.designAccess);
      if (!result.accessGranted) {
        setNotice('Choose a plan whenever you’re ready.');
        return;
      }

      setAccessMode(result.accessMode);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (returnTo === 'generating') {
        router.replace('/generating');
      } else {
        router.back();
      }
    },
  });

  const close = () => {
    if (returnTo === 'generating') {
      router.replace('/style');
    } else {
      router.back();
    }
  };

  return (
    <Screen testID="subscription-screen">
      <View className="flex-1">
        <View className="flex-row items-center px-5 py-3">
          <Pressable
            testID="subscription-back-button"
            accessibilityRole="button"
            onPress={close}
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-60"
            style={{ borderColor: COLORS.line }}>
            <ArrowLeft size={20} color={COLORS.espresso} />
          </Pressable>
          <View className="ml-4"><Wordmark compact /></View>
          <View className="ml-auto rounded-full px-3 py-2" style={{ backgroundColor: '#FBE4DD' }}>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.coral }}>Membership</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}>
          <Animated.View entering={FadeInDown.duration(500)} className="mt-5 overflow-hidden rounded-[32px] px-6 pb-7 pt-6" style={{ backgroundColor: COLORS.espresso }}>
            <View className="flex-row items-start justify-between">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}>
                <Crown size={25} color={COLORS.white} strokeWidth={1.8} />
              </View>
              <View className="flex-row gap-2">
                {[1, 2, 3].map((item) => (
                  <View key={item} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,253,248,0.12)' }}>
                    <Check size={14} color={COLORS.sand} />
                  </View>
                ))}
              </View>
            </View>

            <Text className="mt-9 text-[38px] leading-[41px]" style={{ color: COLORS.white, fontFamily: 'Georgia', letterSpacing: -1.1 }}>
              Your first three rooms are complete.
            </Text>
            <Text className="mt-4 text-[15px] leading-6" style={{ color: COLORS.sand }}>
              Continue your studio with full access to new compositions and refinements.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} className="mt-5 rounded-[28px] border p-5" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
            <View className="flex-row items-center">
              <Sparkles size={19} color={COLORS.coral} />
              <Text className="ml-2 text-[11px] font-semibold uppercase tracking-[2.2px]" style={{ color: COLORS.coral }}>Interi full access</Text>
            </View>
            <View className="mt-5 gap-4">
              {BENEFITS.map((benefit) => (
                <View key={benefit} className="flex-row items-start">
                  <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#E8EDDF' }}>
                    <Check size={13} color={COLORS.oliveDark} strokeWidth={2.4} />
                  </View>
                  <Text className="ml-3 flex-1 text-sm leading-6" style={{ color: COLORS.espresso }}>{benefit}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(500)} className="mt-6">
            {subscriptionsSupported ? (
              <PrimaryButton
                label={subscription.isPending ? 'Opening plans…' : 'View subscription plans'}
                onPress={() => { setNotice(null); subscription.mutate(); }}
                loading={subscription.isPending}
                testID="view-subscription-plans-button"
              />
            ) : (
              <View testID="subscription-mobile-only" className="rounded-[22px] border px-5 py-4" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
                <Text className="text-center text-sm leading-5" style={{ color: COLORS.oliveDark }}>
                  Open Interi on iPhone or Android to choose a subscription plan.
                </Text>
              </View>
            )}

            <Pressable
              testID="subscription-not-now-button"
              accessibilityRole="button"
              disabled={subscription.isPending}
              onPress={close}
              className="mt-2 min-h-12 items-center justify-center active:opacity-60">
              <Text className="text-sm font-semibold" style={{ color: COLORS.oliveDark }}>Not now</Text>
            </Pressable>

            {notice ? <Text testID="subscription-notice" className="mt-2 text-center text-sm" style={{ color: COLORS.oliveDark }}>{notice}</Text> : null}
            {subscription.isError ? (
              <Text testID="subscription-purchase-error" className="mt-2 text-center text-sm" style={{ color: COLORS.coral }}>
                {subscription.error instanceof Error ? subscription.error.message : 'Unable to open subscription options.'}
              </Text>
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </Screen>
  );
}
