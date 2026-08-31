import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Bookmark, Check, Download, RefreshCw, Share2 } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { DesignItems } from '@/components/DesignItems';
import { IconButton, PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { api } from '@/lib/api/api';
import { prepareImageForUpload, saveImageToLibrary, shareImage } from '@/lib/image-utils';
import { COLORS, ROOM_TYPES, STYLES, type RedesignRequest, type RedesignResponse, type SavedDesign } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

const REFINEMENTS = ['Warmer light', 'More natural wood', 'Less furniture', 'Add statement art'];

export default function ResultScreen() {
  const sourceImageDataUrl = useGenerationStore((state) => state.sourceImageDataUrl);
  const style = useGenerationStore((state) => state.style);
  const roomType = useGenerationStore((state) => state.roomType);
  const result = useGenerationStore((state) => state.result);
  const setResult = useGenerationStore((state) => state.setResult);
  const reset = useGenerationStore((state) => state.reset);
  const { saveDesign, isSaved } = useSavedDesigns();
  const designId = useRef<string>(`interi-${Date.now()}`);
  const [view, setView] = useState<'before' | 'after'>('after');
  const [refinement, setRefinement] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: async (request: RedesignRequest) => {
      const preparedImage = await prepareImageForUpload(request.sourceImageDataUrl);
      return api.post<RedesignResponse>('/api/redesign', { ...request, sourceImageDataUrl: preparedImage });
    },
    onSuccess: (data) => {
      setResult(data);
      setView('after');
      setNotice('Your refinement is ready.');
      setRefinement('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const styleLabel = useMemo(() => STYLES.find((item) => item.id === style)?.label ?? style, [style]);
  const roomLabel = useMemo(() => ROOM_TYPES.find((item) => item.id === roomType)?.label ?? roomType, [roomType]);
  const saved = isSaved(designId.current);

  if (!sourceImageDataUrl || !result) {
    return (
      <Screen testID="result-missing-state">
        <View className="flex-1 justify-center px-6">
          <Text className="text-3xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Your next room starts with a photo.</Text>
          <View className="mt-6"><PrimaryButton label="Create a design" onPress={() => router.replace('/')} testID="result-home-button" /></View>
        </View>
      </Screen>
    );
  }

  const currentImage = view === 'after' ? result.imageDataUrl : sourceImageDataUrl;

  const saveToInteri = async () => {
    const design: SavedDesign = {
      id: designId.current,
      createdAt: new Date().toISOString(),
      sourceImageDataUrl,
      imageDataUrl: result.imageDataUrl,
      revisedPrompt: result.revisedPrompt,
      items: result.items,
      style,
      roomType,
    };
    await saveDesign(design);
    setNotice('Saved to your Interi collection.');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const exportImage = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await saveImageToLibrary(result.imageDataUrl);
      setNotice(Platform.OS === 'web' ? 'Download started.' : 'Saved to your photo library.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save the image.');
    } finally {
      setExporting(false);
    }
  };

  const updateRefinement = (value: string) => {
    if (mutation.isError) mutation.reset();
    setNotice(null);
    setRefinement(value);
  };

  const submitRefinement = () => {
    if (!refinement.trim()) return;
    setNotice(null);
    mutation.mutate({ sourceImageDataUrl: result.imageDataUrl, style, roomType, refinement: refinement.trim() });
  };

  const applyItemRefinement = (instruction: string) => {
    setNotice(null);
    setRefinement('');
    mutation.mutate({ sourceImageDataUrl: result.imageDataUrl, style, roomType, refinement: instruction });
  };

  return (
    <Screen testID="result-screen">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 py-3">
          <Pressable testID="result-back-button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line }}><ArrowLeft size={20} color={COLORS.espresso} /></Pressable>
          <View className="ml-4"><Wordmark compact /></View>
          <Pressable
            testID="new-design-button"
            onPress={() => { reset(); router.replace('/'); }}
            className="ml-auto min-h-11 justify-center rounded-full border px-4"
            style={{ borderColor: COLORS.line }}>
            <Text className="text-xs font-semibold" style={{ color: COLORS.espresso }}>New room</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
          <View className="mt-4 flex-row items-end justify-between">
            <View>
              <Text className="text-[10px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.coral }}>The composition</Text>
              <Text className="mt-1 text-[32px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{styleLabel}</Text>
            </View>
            <Text className="pb-1 text-xs capitalize" style={{ color: COLORS.olive }}>{roomLabel}</Text>
          </View>

          <View className="mt-5 overflow-hidden rounded-[28px]" style={{ height: 430, backgroundColor: COLORS.sand }}>
            <Image testID="result-image" source={{ uri: currentImage }} contentFit="cover" style={{ width: '100%', height: '100%' }} transition={300} />
            {mutation.isPending ? <View testID="refinement-loading" className="absolute inset-0 items-center justify-center bg-black/45"><RefreshCw size={34} color={COLORS.white} /><Text className="mt-3 text-sm font-semibold" style={{ color: COLORS.white }}>Refining the composition…</Text></View> : null}
            <View className="absolute bottom-4 left-4 flex-row rounded-full bg-black/55 p-1">
              {(['before', 'after'] as const).map((option) => (
                <Pressable key={option} testID={`show-${option}-button`} onPress={() => setView(option)} className="min-h-10 min-w-[82px] items-center justify-center rounded-full px-4" style={{ backgroundColor: view === option ? COLORS.paper : 'transparent' }}>
                  <Text className="text-xs font-semibold capitalize" style={{ color: view === option ? COLORS.espresso : COLORS.white }}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text testID="revised-prompt" className="mt-4 text-sm italic leading-5" style={{ color: COLORS.olive }}>“{result.revisedPrompt}”</Text>

          <DesignItems items={result.items ?? []} loading={mutation.isPending} onRefine={applyItemRefinement} />

          <View className="mt-6 flex-row gap-3">
            <View className="flex-1"><IconButton icon={saved ? Check : Bookmark} label={saved ? 'Saved' : 'Save'} onPress={() => void saveToInteri()} testID="save-design-button" /></View>
            <View className="flex-1"><IconButton icon={Download} label={exporting ? 'Saving…' : 'Photos'} onPress={() => void exportImage()} testID="export-image-button" /></View>
            <Pressable testID="share-design-button" onPress={() => void shareImage(result.imageDataUrl)} className="h-12 w-12 items-center justify-center rounded-full border active:opacity-60" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}><Share2 size={18} color={COLORS.espresso} /></Pressable>
          </View>

          {notice ? <Text testID="result-notice" className="mt-3 text-sm" style={{ color: COLORS.oliveDark }}>{notice}</Text> : null}
          {mutation.isError ? <Text testID="refinement-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{mutation.error instanceof Error ? mutation.error.message : 'That refinement didn’t complete. Please try again.'}</Text> : null}

          <View className="mt-9 border-t pt-7" style={{ borderTopColor: COLORS.line }}>
            <Text className="text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.espresso }}>Refine the edit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 13, paddingRight: 20 }}>
              {REFINEMENTS.map((item) => (
                <Pressable key={item} testID={`refinement-${item.toLowerCase().replaceAll(' ', '-')}`} onPress={() => updateRefinement(item)} className="min-h-11 justify-center rounded-full border px-4" style={{ borderColor: refinement === item ? COLORS.coral : COLORS.line, backgroundColor: COLORS.paper }}>
                  <Text className="text-sm" style={{ color: refinement === item ? COLORS.coral : COLORS.espresso }}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              testID="refinement-input"
              value={refinement}
              onChangeText={updateRefinement}
              placeholder="Tell Interi what to adjust…"
              placeholderTextColor="#9B9185"
              multiline
              maxLength={220}
              className="mt-3 min-h-[92px] rounded-[22px] border p-4 text-base leading-6"
              style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso, textAlignVertical: 'top' }}
            />
            <View className="mt-4"><PrimaryButton label="Refine this room" onPress={submitRefinement} disabled={!refinement.trim()} loading={mutation.isPending} testID="submit-refinement-button" /></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
