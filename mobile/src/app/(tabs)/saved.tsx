import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowUpRight, Bookmark, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { Screen, Wordmark } from '@/components/InteriUI';
import { COLORS, ROOM_TYPES, STYLES, type SavedDesign } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

export default function SavedScreen() {
  const { designs, hydrated, removeDesign } = useSavedDesigns();
  const setSource = useGenerationStore((state) => state.setSource);
  const setStyle = useGenerationStore((state) => state.setStyle);
  const setRoomType = useGenerationStore((state) => state.setRoomType);
  const setResult = useGenerationStore((state) => state.setResult);

  const openDesign = (design: SavedDesign) => {
    setSource(design.sourceImageDataUrl, design.sourceImageDataUrl);
    setStyle(design.style);
    setRoomType(design.roomType);
    setResult({ imageDataUrl: design.imageDataUrl, revisedPrompt: design.revisedPrompt, items: design.items ?? [], shoppingCountry: design.shoppingCountry ?? 'GB' });
    router.push('/result');
  };

  if (!hydrated) {
    return (
      <Screen testID="saved-loading-screen">
        <View className="flex-1 items-center justify-center"><ActivityIndicator testID="saved-loading-indicator" color={COLORS.coral} /></View>
      </Screen>
    );
  }

  return (
    <Screen testID="saved-screen">
      <FlatList
        data={designs}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={designs.length ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="mb-8">
            <Wordmark />
            <Text className="mt-9 text-[40px] leading-[43px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.4 }}>Rooms worth returning to.</Text>
            <Text className="mt-3 text-sm leading-5" style={{ color: COLORS.olive }}>Your private edit of considered spaces.</Text>
          </View>
        }
        ListEmptyComponent={
          <View testID="saved-empty-state" className="mt-8 flex-1 items-center justify-center rounded-[28px] border px-8 py-14" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#E8E0D3' }}><Bookmark size={25} color={COLORS.oliveDark} /></View>
            <Text className="mt-5 text-center text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Your collection is waiting.</Text>
            <Text className="mt-2 text-center text-sm leading-5" style={{ color: COLORS.olive }}>Save a finished composition and it will live here.</Text>
            <Pressable testID="empty-create-button" onPress={() => router.push('/')} className="mt-6 min-h-12 flex-row items-center justify-center rounded-full px-5" style={{ backgroundColor: COLORS.espresso }}>
              <Text className="text-sm font-semibold" style={{ color: COLORS.white }}>Create a room</Text><ArrowUpRight size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const styleLabel = STYLES.find((style) => style.id === item.style)?.label ?? item.style;
          const roomLabel = ROOM_TYPES.find((room) => room.id === item.roomType)?.label ?? item.roomType;
          return (
            <Pressable testID={`saved-design-${item.id}`} onPress={() => openDesign(item)} className="mb-4 flex-1 overflow-hidden rounded-[22px] border active:opacity-80" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
              <Image source={{ uri: item.imageDataUrl }} contentFit="cover" style={{ width: '100%', aspectRatio: 0.82 }} transition={200} />
              <View className="p-3">
                <Text className="text-base" numberOfLines={1} style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{styleLabel}</Text>
                <Text className="mt-1 text-[10px] uppercase tracking-[1.5px]" style={{ color: COLORS.olive }}>{roomLabel}</Text>
                <Pressable
                  testID={`delete-design-${item.id}`}
                  onPress={(event) => { event.stopPropagation(); void removeDesign(item.id); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  className="mt-3 h-10 w-10 items-center justify-center self-end rounded-full border"
                  style={{ borderColor: COLORS.line }}>
                  <Trash2 size={15} color={COLORS.olive} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
