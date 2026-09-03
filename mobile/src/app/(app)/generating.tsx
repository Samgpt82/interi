import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Sparkles } from '@/components/icons';
import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { api, isApiError } from '@/lib/api/api';
import { DESIGN_ACCESS_QUERY_KEY, fetchDesignAccess } from '@/lib/design-access';
import { COLORS, SUBSCRIPTION_REQUIRED_ERROR_CODE, type RedesignRequest, type RedesignResponse } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { usePreferencesStore } from '@/lib/state/preferences-store';

export default function GeneratingScreen() {
  const queryClient = useQueryClient();
  const sourceImageDataUrl = useGenerationStore((state) => state.sourceImageDataUrl);
  const style = useGenerationStore((state) => state.style);
  const roomType = useGenerationStore((state) => state.roomType);
  const direction = useGenerationStore((state) => state.direction);
  const accessMode = useGenerationStore((state) => state.accessMode);
  const setResult = useGenerationStore((state) => state.setResult);
  const shoppingCountry = usePreferencesStore((state) => state.shoppingCountry);
  const preferencesHydrated = usePreferencesStore((state) => state.hydrated);
  const started = useRef<boolean>(false);
  const sweep = useSharedValue(-1);

  const { mutate, isError, isPending, error } = useMutation({
    mutationFn: (request: RedesignRequest) => api.post<RedesignResponse>('/api/redesign', request),
    onSuccess: (data) => {
      if (data.designAccess) queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, data.designAccess);
      setResult(data);
      router.replace('/result');
    },
    onError: async (caught) => {
      if (accessMode !== 'free') return;

      const subscriptionRequired = isApiError(caught) && caught.code === SUBSCRIPTION_REQUIRED_ERROR_CODE;
      if (subscriptionRequired) {
        await queryClient.invalidateQueries({ queryKey: DESIGN_ACCESS_QUERY_KEY });
        router.replace({ pathname: '/subscription', params: { returnTo: 'generating' } });
        return;
      }

      try {
        const latestAccess = await fetchDesignAccess();
        queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, latestAccess);
        if (latestAccess.freeDesignsRemaining === 0) {
          router.replace({ pathname: '/subscription', params: { returnTo: 'generating' } });
        }
      } catch {
        // Keep the original generation error visible when access cannot be rechecked.
      }
    },
  });

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    if (!started.current && sourceImageDataUrl && preferencesHydrated) {
      started.current = true;
      mutate({ sourceImageDataUrl, style, roomType, shoppingCountry, refinement: direction.trim() || undefined, accessMode });
    }
  }, [accessMode, direction, mutate, preferencesHydrated, roomType, shoppingCountry, sourceImageDataUrl, style, sweep]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sweep.value * 230 }] }));

  const retry = () => {
    if (!sourceImageDataUrl) return;
    mutate({ sourceImageDataUrl, style, roomType, shoppingCountry, refinement: direction.trim() || undefined, accessMode });
  };

  if (!sourceImageDataUrl) {
    return (
      <Screen testID="generating-missing-source">
        <View className="flex-1 justify-center px-6">
          <Text className="text-3xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>No room photo found.</Text>
          <View className="mt-6"><PrimaryButton label="Return to create" onPress={() => router.replace('/')} testID="return-home-button" /></View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="generating-screen">
      <View className="flex-1 px-6 pb-10 pt-4">
        <Wordmark compact />
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(700)} className="h-64 w-64 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
            <View className="h-36 w-36 items-center justify-center rounded-full" style={{ backgroundColor: '#E5DED0' }}>
              <Sparkles size={54} color={COLORS.coral} strokeWidth={1.25} />
            </View>
            <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 90 }, animatedStyle]}>
              <LinearGradient colors={['transparent', 'rgba(242,107,77,0.22)', 'transparent']} style={{ flex: 1 }} />
            </Animated.View>
          </Animated.View>

          <Text className="mt-10 text-center text-[34px] leading-[39px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>
            Composing your room
          </Text>
          <Text className="mt-3 max-w-[300px] text-center text-sm leading-6" style={{ color: COLORS.olive }}>
            Balancing light, material and proportion. This can take a quiet moment.
          </Text>
          <View testID="generation-loading-indicator" className="mt-8 flex-row gap-2">
            {[0, 1, 2, 3].map((item) => <View key={item} className="h-1.5 w-10 rounded-full" style={{ backgroundColor: item === 0 ? COLORS.coral : COLORS.line }} />)}
          </View>

          {isError ? (
            <View testID="generation-error" className="mt-8 w-full rounded-[22px] border p-5" style={{ borderColor: '#D9A393', backgroundColor: '#F7E8E1' }}>
              <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>The composition paused.</Text>
              <Text className="mt-1 text-sm leading-5" style={{ color: COLORS.olive }}>{error instanceof Error ? error.message : 'Please try once more.'}</Text>
              <View className="mt-4"><PrimaryButton label="Try again" onPress={retry} loading={isPending} testID="retry-generation-button" /></View>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
