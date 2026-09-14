import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Crown, RefreshCw, Sparkles } from '@/components/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { useSession } from '@/lib/auth/use-session';
import { DESIGN_ACCESS_QUERY_KEY } from '@/lib/design-access';
import { COLORS } from '@/lib/interi';
import {
  usePurchaseSubscription,
  useRestoreSubscription,
  useSubscriptionOffering,
} from '@/lib/revenuecat';
import { useGenerationStore } from '@/lib/state/generation-store';

const BENEFITS = [
  'Unlimited room compositions',
  'Unlimited material and furniture refinements',
  'Every version saved in your private studio',
] as const;

function isAnnualPackage(subscriptionPackage: PurchasesPackage) {
  return subscriptionPackage.packageType === 'ANNUAL'
    || subscriptionPackage.product.subscriptionPeriod === 'P1Y'
    || /annual|year|12[_\-. ]?month/i.test(`${subscriptionPackage.identifier} ${subscriptionPackage.product.identifier}`);
}

function isMonthlyPackage(subscriptionPackage: PurchasesPackage) {
  if (isAnnualPackage(subscriptionPackage)) return false;
  return subscriptionPackage.packageType === 'MONTHLY'
    || subscriptionPackage.product.subscriptionPeriod === 'P1M'
    || /monthly|month/i.test(`${subscriptionPackage.identifier} ${subscriptionPackage.product.identifier}`);
}

function planName(subscriptionPackage: PurchasesPackage) {
  return isAnnualPackage(subscriptionPackage) ? 'Yearly' : 'Monthly';
}

function planCaption(subscriptionPackage: PurchasesPackage) {
  const { product } = subscriptionPackage;
  if (isAnnualPackage(subscriptionPackage)) {
    return product.pricePerMonthString
      ? `${product.priceString} billed yearly · ${product.pricePerMonthString}/month`
      : `${product.priceString} billed yearly`;
  }
  return `${product.priceString} billed monthly`;
}

function savingsPercent(monthly: PurchasesPackage | undefined, annual: PurchasesPackage | undefined) {
  if (!monthly || !annual || monthly.product.price <= 0) return null;
  const savings = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
  return savings > 0 ? savings : null;
}

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const setAccessMode = useGenerationStore((state) => state.setAccessMode);
  const setResumeRefinementAfterSubscription = useGenerationStore((state) => state.setResumeRefinementAfterSubscription);
  const [selectedPackageID, setSelectedPackageID] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const subscriptionsSupported = Platform.OS === 'ios' || Platform.OS === 'android';
  const offering = useSubscriptionOffering(session?.user.id);
  const purchase = usePurchaseSubscription(session?.user.id);
  const restore = useRestoreSubscription(session?.user.id);

  const packages = useMemo(() => {
    const availablePackages = offering.data?.availablePackages ?? [];
    const annual = offering.data?.annual ?? availablePackages.find(isAnnualPackage);
    const monthly = offering.data?.monthly ?? availablePackages.find(isMonthlyPackage);
    return [annual, monthly]
      .filter((item): item is PurchasesPackage => Boolean(item))
      .filter((item, index, items) => items.findIndex((candidate) => candidate.identifier === item.identifier) === index);
  }, [offering.data]);

  const annualPackage = packages.find(isAnnualPackage);
  const monthlyPackage = packages.find(isMonthlyPackage);
  const annualSavings = savingsPercent(monthlyPackage, annualPackage);
  const selectedPackage = packages.find((item) => item.identifier === selectedPackageID) ?? packages[0];
  const isBusy = purchase.isPending || restore.isPending;

  useEffect(() => {
    if (!selectedPackageID && packages[0]) setSelectedPackageID(packages[0].identifier);
  }, [packages, selectedPackageID]);

  const close = () => {
    router.back();
  };

  const finishSubscription = () => {
    void queryClient.invalidateQueries({ queryKey: DESIGN_ACCESS_QUERY_KEY });
    setAccessMode('subscription');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (returnTo === 'generating') {
      router.replace('/generating');
    } else {
      if (returnTo === 'result') setResumeRefinementAfterSubscription(true);
      router.back();
    }
  };

  const choosePackage = (subscriptionPackage: PurchasesPackage) => {
    setSelectedPackageID(subscriptionPackage.identifier);
    setNotice(null);
    purchase.reset();
    void Haptics.selectionAsync();
  };

  const buySelectedPlan = async () => {
    if (!selectedPackage) return;
    setNotice(null);
    purchase.reset();
    restore.reset();
    try {
      const result = await purchase.mutateAsync(selectedPackage);
      if (result.cancelled) {
        setNotice('No charge was made. Your plan is still waiting here.');
        return;
      }
      if (result.accessGranted) finishSubscription();
    } catch {
      // The mutation exposes the friendly RevenueCat error below.
    }
  };

  const restorePurchases = async () => {
    setNotice(null);
    purchase.reset();
    restore.reset();
    try {
      const result = await restore.mutateAsync();
      if (result.accessGranted) {
        finishSubscription();
      } else {
        setNotice('We couldn’t find an active subscription for this store account.');
      }
    } catch {
      // The mutation exposes the friendly RevenueCat error below.
    }
  };

  const error = purchase.error ?? restore.error;

  return (
    <Screen testID="subscription-screen">
      <View className="flex-1">
        <View className="flex-row items-center px-5 py-3">
          <Pressable
            testID="subscription-back-button"
            accessibilityRole="button"
            disabled={isBusy}
            onPress={close}
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-60"
            style={{ borderColor: COLORS.line, opacity: isBusy ? 0.45 : 1 }}>
            <ArrowLeft size={20} color={COLORS.espresso} />
          </Pressable>
          <View className="ml-4"><Wordmark compact /></View>
          <View className="ml-auto rounded-full px-3 py-2" style={{ backgroundColor: '#FBE4DD' }}>
            <Text className="text-[10px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.coral }}>Full access</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
          <Animated.View entering={FadeInDown.duration(450)} className="mt-3 overflow-hidden rounded-[32px] px-6 pb-6 pt-6" style={{ backgroundColor: COLORS.espresso }}>
            <View className="flex-row items-center justify-between">
              <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}>
                <Crown size={25} color={COLORS.white} strokeWidth={1.8} />
              </View>
              <View className="rounded-full px-3 py-2" style={{ backgroundColor: 'rgba(255,253,248,0.11)' }}>
                <Text className="text-[9px] font-semibold uppercase tracking-[1.6px]" style={{ color: COLORS.sand }}>Interi studio</Text>
              </View>
            </View>
            <Text className="mt-7 text-[36px] leading-[39px]" style={{ color: COLORS.white, fontFamily: 'Georgia', letterSpacing: -1.1 }}>
              Make every room possible.
            </Text>
            <Text className="mt-3 text-[14px] leading-[22px]" style={{ color: COLORS.sand }}>
              Design, refine and keep exploring without limits.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(450)} className="mt-5">
            <View className="mb-3 flex-row items-center">
              <Sparkles size={17} color={COLORS.coral} />
              <Text className="ml-2 text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.coral }}>Choose your plan</Text>
            </View>

            {!subscriptionsSupported ? (
              <View testID="subscription-mobile-only" className="rounded-[24px] border px-5 py-5" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
                <Text className="text-center text-sm leading-5" style={{ color: COLORS.oliveDark }}>
                  Open Interi on iPhone or Android to choose a subscription plan.
                </Text>
              </View>
            ) : offering.isPending ? (
              <View testID="subscription-plans-loading" className="min-h-32 items-center justify-center rounded-[24px] border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
                <ActivityIndicator color={COLORS.coral} />
                <Text className="mt-3 text-sm" style={{ color: COLORS.olive }}>Preparing your plans…</Text>
              </View>
            ) : offering.isError ? (
              <View testID="subscription-plans-error" className="items-center rounded-[24px] border px-5 py-5" style={{ borderColor: '#E8A995', backgroundColor: '#FBE9E2' }}>
                <Text className="text-center text-sm leading-5" style={{ color: COLORS.espresso }}>
                  {offering.error instanceof Error ? offering.error.message : 'Unable to load subscription plans.'}
                </Text>
                <Pressable
                  testID="retry-subscription-plans-button"
                  accessibilityRole="button"
                  onPress={() => void offering.refetch()}
                  className="mt-3 min-h-11 flex-row items-center justify-center rounded-full px-5 active:opacity-60"
                  style={{ backgroundColor: COLORS.espresso }}>
                  <RefreshCw size={15} color={COLORS.white} />
                  <Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.white }}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View className="gap-3">
                {packages.map((subscriptionPackage) => {
                  const selected = subscriptionPackage.identifier === selectedPackage?.identifier;
                  const annual = isAnnualPackage(subscriptionPackage);
                  return (
                    <Pressable
                      key={subscriptionPackage.identifier}
                      testID={`subscription-plan-${annual ? 'yearly' : 'monthly'}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      disabled={isBusy}
                      onPress={() => choosePackage(subscriptionPackage)}
                      className="overflow-hidden rounded-[24px] border px-5 py-4 active:scale-[0.99]"
                      style={{
                        borderColor: selected ? COLORS.espresso : COLORS.line,
                        borderWidth: selected ? 2 : 1,
                        backgroundColor: selected ? '#EEE7DB' : COLORS.paper,
                        opacity: isBusy ? 0.65 : 1,
                      }}>
                      <View className="flex-row items-center">
                        <View
                          className="h-7 w-7 items-center justify-center rounded-full border"
                          style={{ borderColor: selected ? COLORS.espresso : '#BDB4A7', backgroundColor: selected ? COLORS.espresso : 'transparent' }}>
                          {selected ? <Check size={15} color={COLORS.white} strokeWidth={2.6} /> : null}
                        </View>
                        <View className="ml-3 flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{planName(subscriptionPackage)}</Text>
                            {annual ? (
                              <View className="ml-2 rounded-full px-2.5 py-1" style={{ backgroundColor: COLORS.coral }}>
                                <Text className="text-[9px] font-bold uppercase tracking-[1px]" style={{ color: COLORS.white }}>
                                  {annualSavings ? `Save ${annualSavings}%` : 'Best value'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text className="mt-1 text-xs leading-5" style={{ color: COLORS.oliveDark }}>{planCaption(subscriptionPackage)}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(450)} className="mt-5 rounded-[24px] border px-5 py-4" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
            <View className="gap-3">
              {BENEFITS.map((benefit) => (
                <View key={benefit} className="flex-row items-center">
                  <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#E8EDDF' }}>
                    <Check size={13} color={COLORS.oliveDark} strokeWidth={2.4} />
                  </View>
                  <Text className="ml-3 flex-1 text-[13px] leading-5" style={{ color: COLORS.espresso }}>{benefit}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {subscriptionsSupported ? (
            <Animated.View entering={FadeInDown.delay(200).duration(450)} className="mt-5">
              {!offering.isError ? (
                <PrimaryButton
                  label={purchase.isPending ? 'Confirming with the store…' : selectedPackage ? `Continue with ${planName(selectedPackage)}` : 'Choose a plan'}
                  onPress={() => void buySelectedPlan()}
                  disabled={!selectedPackage || restore.isPending}
                  loading={purchase.isPending}
                  testID="purchase-subscription-button"
                />
              ) : null}

              <Pressable
                testID="restore-purchases-button"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => void restorePurchases()}
                className="mt-2 min-h-12 flex-row items-center justify-center active:opacity-60"
                style={{ opacity: isBusy ? 0.45 : 1 }}>
                {restore.isPending ? <ActivityIndicator size="small" color={COLORS.oliveDark} /> : null}
                <Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.oliveDark }}>
                  {restore.isPending ? 'Restoring purchases…' : 'Restore purchases'}
                </Text>
              </Pressable>

              <Text className="mt-1 px-3 text-center text-[10px] leading-4" style={{ color: COLORS.olive }}>
                Payment is charged to your store account. Subscription renews automatically unless cancelled before renewal.
              </Text>
            </Animated.View>
          ) : null}

          {notice ? <Text testID="subscription-notice" className="mt-3 text-center text-sm leading-5" style={{ color: COLORS.oliveDark }}>{notice}</Text> : null}
          {error ? (
            <Text testID="subscription-purchase-error" className="mt-3 text-center text-sm leading-5" style={{ color: COLORS.coral }}>
              {error instanceof Error ? error.message : 'Unable to complete your subscription right now.'}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}
