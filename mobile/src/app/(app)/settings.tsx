import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Check, LocateFixed, MapPin, ShoppingBag } from '@/components/icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen, Wordmark } from '@/components/InteriUI';
import { COLORS, type ShoppingCountry } from '@/lib/interi';
import { SHOPPING_MARKETS } from '@/lib/retailers';
import { usePreferencesStore } from '@/lib/state/preferences-store';

export default function SettingsScreen() {
  const shoppingCountry = usePreferencesStore((state) => state.shoppingCountry);
  const countryPreference = usePreferencesStore((state) => state.countryPreference);
  const detectedCountry = usePreferencesStore((state) => state.detectedCountry);
  const countryDetectionMethod = usePreferencesStore((state) => state.countryDetectionMethod);
  const detectedRegionCode = usePreferencesStore((state) => state.detectedRegionCode);
  const setShoppingCountry = usePreferencesStore((state) => state.setShoppingCountry);
  const applyDetectedCountry = usePreferencesStore((state) => state.applyDetectedCountry);
  const selectedMarket = SHOPPING_MARKETS.find((market) => market.code === shoppingCountry) ?? SHOPPING_MARKETS[0]!;
  const detectedMarket = SHOPPING_MARKETS.find((market) => market.code === detectedCountry) ?? SHOPPING_MARKETS[0]!;
  const detectionSupported = countryDetectionMethod !== 'fallback';

  const selectCountry = (country: ShoppingCountry) => {
    setShoppingCountry(country);
    void Haptics.selectionAsync();
  };

  const selectAutomaticCountry = () => {
    applyDetectedCountry();
    void Haptics.selectionAsync();
  };

  const detectionNote = countryDetectionMethod === 'locale'
    ? 'Suggested from your device’s regional format.'
    : countryDetectionMethod === 'time-zone'
      ? 'Suggested from your device’s time zone.'
      : detectedRegionCode
        ? `${detectedRegionCode} is not supported yet, so UK shops are used for now.`
        : 'We could not match a supported region, so UK shops are used for now.';

  return (
    <Screen testID="settings-screen">
      <View className="flex-row items-center px-5 py-3">
        <Pressable
          testID="settings-back-button"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border active:opacity-60"
          style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          <ArrowLeft size={20} color={COLORS.espresso} />
        </Pressable>
        <View className="ml-4"><Wordmark compact /></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
        <View className="mt-8 max-w-[350px]">
          <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#F3E3C3' }}>
            <MapPin size={21} color="#A56C11" strokeWidth={1.8} />
          </View>
          <Text className="mt-5 text-[38px] leading-[42px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.2 }}>
            Shop closer to home.
          </Text>
          <Text className="mt-3 text-sm leading-6" style={{ color: COLORS.olive }}>
            Interi suggests a market from your device region. You can change it here whenever you like.
          </Text>
        </View>

        <Text className="mt-9 text-[10px] font-semibold uppercase tracking-[2.2px]" style={{ color: COLORS.olive }}>
          Location suggestion
        </Text>

        <Pressable
          testID="use-device-region-button"
          accessibilityRole="button"
          accessibilityState={{ selected: countryPreference === 'automatic' }}
          onPress={selectAutomaticCountry}
          className="mt-3 min-h-[112px] flex-row items-center rounded-[24px] border px-5 py-4 active:opacity-70"
          style={{
            borderColor: countryPreference === 'automatic' ? '#D6A251' : COLORS.line,
            backgroundColor: countryPreference === 'automatic' ? '#F8EEDB' : COLORS.paper,
          }}>
          <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: '#F3E3C3' }}>
            <LocateFixed size={19} color="#A56C11" strokeWidth={2} />
          </View>
          <View className="ml-4 flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>
                {detectionSupported ? `${detectedMarket.flag} ${detectedMarket.name}` : 'Use device region'}
              </Text>
              {countryPreference === 'automatic' ? (
                <View className="ml-2 rounded-full px-2 py-1" style={{ backgroundColor: '#EAD3A9' }}>
                  <Text className="text-[9px] font-bold uppercase tracking-[1.2px]" style={{ color: '#7A551B' }}>Automatic</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 text-xs leading-5" style={{ color: COLORS.olive }}>{detectionNote}</Text>
            <Text className="mt-1 text-[10px]" style={{ color: COLORS.olive }}>No precise location is collected.</Text>
          </View>
        </Pressable>

        <Text className="mt-8 text-[10px] font-semibold uppercase tracking-[2.2px]" style={{ color: COLORS.olive }}>
          Choose manually
        </Text>

        <View className="mt-3 overflow-hidden rounded-[26px] border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
          {SHOPPING_MARKETS.map((market, index) => {
            const selected = market.code === shoppingCountry;
            return (
              <Pressable
                key={market.code}
                testID={`shopping-country-${market.code.toLowerCase()}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => selectCountry(market.code)}
                className={`min-h-[82px] flex-row items-center px-5 py-4 active:opacity-65 ${index > 0 ? 'border-t' : ''}`}
                style={{ borderColor: COLORS.line, backgroundColor: selected ? '#F8F1E5' : COLORS.paper }}>
                <Text className="text-3xl">{market.flag}</Text>
                <View className="ml-4 flex-1">
                  <Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>{market.name}</Text>
                  <Text className="mt-1 text-xs" style={{ color: COLORS.olive }}>{market.currencyLabel}</Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: selected ? COLORS.coral : '#EEE7DB' }}>
                  {selected ? <Check size={17} color={COLORS.white} strokeWidth={2.5} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 flex-row rounded-[22px] border p-4" style={{ borderColor: COLORS.line, backgroundColor: '#EEE7DB' }}>
          <ShoppingBag size={18} color={COLORS.oliveDark} style={{ marginTop: 1 }} />
          <Text className="ml-3 flex-1 text-xs leading-5" style={{ color: COLORS.oliveDark }}>
            {selectedMarket.name} uses {selectedMarket.retailers.map((retailer) => retailer.name).join(', ')}. Saved designs keep the market they were created with.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
