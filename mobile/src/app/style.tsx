import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { COLORS, ROOM_TYPES, STYLES, type DesignStyle, type RoomType } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';

export default function StyleScreen() {
  const style = useGenerationStore((state) => state.style);
  const roomType = useGenerationStore((state) => state.roomType);
  const direction = useGenerationStore((state) => state.direction);
  const sourceImageDataUrl = useGenerationStore((state) => state.sourceImageDataUrl);
  const setStyle = useGenerationStore((state) => state.setStyle);
  const setRoomType = useGenerationStore((state) => state.setRoomType);
  const setDirection = useGenerationStore((state) => state.setDirection);

  const selectStyle = (value: DesignStyle) => {
    setStyle(value);
    void Haptics.selectionAsync();
  };

  const selectRoom = (value: RoomType) => {
    setRoomType(value);
    void Haptics.selectionAsync();
  };

  return (
    <Screen testID="style-screen">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 py-3">
          <Pressable testID="style-back-button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border active:opacity-60" style={{ borderColor: COLORS.line }}>
            <ArrowLeft size={20} color={COLORS.espresso} />
          </Pressable>
          <View className="ml-4"><Wordmark compact /></View>
          <Text className="ml-auto text-[10px] uppercase tracking-[2px]" style={{ color: COLORS.olive }}>01 / Direction</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          <Text className="mt-5 text-[36px] leading-[40px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.2 }}>What should this room feel like?</Text>
          <Text className="mt-3 text-sm leading-5" style={{ color: COLORS.olive }}>Select one design language. We’ll preserve the room’s bones.</Text>

          <View className="mt-7 flex-row flex-wrap justify-between gap-y-3">
            {STYLES.map((item, index) => {
              const selected = style === item.id;
              return (
                <Pressable
                  key={item.id}
                  testID={`style-${item.id}`}
                  onPress={() => selectStyle(item.id)}
                  className="overflow-hidden rounded-[22px] border p-4 active:scale-[0.98]"
                  style={{ width: '48.5%', minHeight: 148, borderColor: selected ? COLORS.espresso : COLORS.line, backgroundColor: selected ? COLORS.espresso : COLORS.paper }}>
                  <View className="flex-row items-start justify-between">
                    <View className="h-9 w-9 rounded-full" style={{ backgroundColor: item.color }} />
                    <Text className="text-[10px] tracking-[2px]" style={{ color: selected ? COLORS.sand : COLORS.olive }}>0{index + 1}</Text>
                  </View>
                  <Text className="mt-5 text-lg" style={{ color: selected ? COLORS.white : COLORS.espresso, fontFamily: 'Georgia' }}>{item.label}</Text>
                  <Text className="mt-1 text-[11px] leading-4" style={{ color: selected ? COLORS.sand : COLORS.olive }}>{item.note}</Text>
                  {selected ? <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}><Check size={14} color={COLORS.white} /></View> : null}
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-9 text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.espresso }}>Room type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 12, paddingRight: 20 }}>
            {ROOM_TYPES.map((item) => {
              const selected = roomType === item.id;
              return (
                <Pressable key={item.id} testID={`room-${item.id}`} onPress={() => selectRoom(item.id)} className="min-h-11 justify-center rounded-full border px-4 active:opacity-70" style={{ borderColor: selected ? COLORS.oliveDark : COLORS.line, backgroundColor: selected ? COLORS.oliveDark : COLORS.paper }}>
                  <Text className="text-sm" style={{ color: selected ? COLORS.white : COLORS.espresso }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text className="mt-8 text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.espresso }}>Art direction <Text style={{ color: COLORS.olive }}>— optional</Text></Text>
          <TextInput
            testID="direction-input"
            value={direction}
            onChangeText={setDirection}
            placeholder="E.g. keep the vintage armchair, add warmer light…"
            placeholderTextColor="#9B9185"
            multiline
            maxLength={240}
            className="mt-3 min-h-[112px] rounded-[22px] border p-4 text-base leading-6"
            style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso, textAlignVertical: 'top' }}
          />

          <View className="mt-6">
            <PrimaryButton label="Compose my room" onPress={() => router.push('/generating')} disabled={!sourceImageDataUrl} testID="generate-button" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
