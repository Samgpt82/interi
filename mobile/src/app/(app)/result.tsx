import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Bookmark, Check, Download, Folder, RefreshCw, Share2, ShoppingBag, X } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { DesignItems } from '@/components/DesignItems';
import { IconButton, PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { api } from '@/lib/api/api';
import { prepareImageForUpload, saveImageToLibrary, shareImage } from '@/lib/image-utils';
import { COLORS, ROOM_TYPES, STYLES, type RedesignRequest, type RedesignResponse } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

const REFINEMENTS = ['Warmer light', 'More natural wood', 'Less furniture', 'Add statement art'];

export default function ResultScreen() {
  const sourceImageDataUrl = useGenerationStore((state) => state.sourceImageDataUrl);
  const style = useGenerationStore((state) => state.style);
  const roomType = useGenerationStore((state) => state.roomType);
  const result = useGenerationStore((state) => state.result);
  const projectId = useGenerationStore((state) => state.projectId);
  const projectTitle = useGenerationStore((state) => state.projectTitle);
  const projectFolderId = useGenerationStore((state) => state.projectFolderId);
  const versions = useGenerationStore((state) => state.versions);
  const activeVersionId = useGenerationStore((state) => state.activeVersionId);
  const activeVersionNumber = useGenerationStore((state) => state.activeVersionNumber);
  const dirty = useGenerationStore((state) => state.dirty);
  const pendingRefinement = useGenerationStore((state) => state.pendingRefinement);
  const setResult = useGenerationStore((state) => state.setResult);
  const loadProject = useGenerationStore((state) => state.loadProject);
  const selectVersion = useGenerationStore((state) => state.selectVersion);
  const addVersion = useGenerationStore((state) => state.addVersion);
  const reset = useGenerationStore((state) => state.reset);
  const { folders, createProject, appendProjectVersion, saving } = useSavedDesigns();
  const scrollRef = useRef<ScrollView | null>(null);
  const [refinement, setRefinement] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [itemsSectionY, setItemsSectionY] = useState<number>(0);
  const [folderSheet, setFolderSheet] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: async (request: RedesignRequest) => api.post<RedesignResponse>('/api/redesign', { ...request, sourceImageDataUrl: await prepareImageForUpload(request.sourceImageDataUrl) }),
    onSuccess: (data, variables) => {
      setResult(data, { dirty: true, refinement: variables.refinement ?? null });
      setNotice('Refinement ready — save it as a new version.');
      setRefinement('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const styleLabel = useMemo(() => STYLES.find((item) => item.id === style)?.label ?? style, [style]);
  const roomLabel = useMemo(() => ROOM_TYPES.find((item) => item.id === roomType)?.label ?? roomType, [roomType]);
  const selectedBase = useMemo(() => versions.find((version) => version.id === activeVersionId) ?? null, [activeVersionId, versions]);

  if (!sourceImageDataUrl || !result) return <Screen testID="result-missing-state"><View className="flex-1 justify-center px-6"><Text className="text-3xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Your next room starts with a photo.</Text><View className="mt-6"><PrimaryButton label="Create a design" onPress={() => router.replace('/')} testID="result-home-button" /></View></View></Screen>;

  const saveVersion = async (folderId?: string | null) => {
    setNotice(null);
    try {
      if (!projectId) {
        const project = await createProject({
          title: `${styleLabel} ${roomLabel.toLowerCase()}`,
          folderId: folderId ?? null,
          sourceImageDataUrl,
          imageDataUrl: result.imageDataUrl,
          revisedPrompt: result.revisedPrompt,
          items: result.items,
          shoppingCountry: result.shoppingCountry,
          style,
          roomType,
        });
        loadProject(project, project.latestVersion.id);
        setFolderSheet(false);
        setNotice('Saved as version 1.');
      } else if (dirty) {
        const version = await appendProjectVersion(projectId, {
          sourceImageDataUrl: selectedBase?.imageUrl ?? sourceImageDataUrl,
          imageDataUrl: result.imageDataUrl,
          revisedPrompt: result.revisedPrompt,
          items: result.items,
          shoppingCountry: result.shoppingCountry,
          style,
          roomType,
          baseVersionId: activeVersionId ?? undefined,
          refinement: pendingRefinement ?? undefined,
        });
        addVersion(version);
        setNotice(`Saved as version ${version.number}.`);
      } else {
        setNotice(`Version ${activeVersionNumber ?? 1} is already saved.`);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : 'Unable to save this project.');
    }
  };

  const exportImage = async () => {
    setExporting(true); setNotice(null);
    try { await saveImageToLibrary(result.imageDataUrl); setNotice(Platform.OS === 'web' ? 'Download started.' : 'Saved to your photo library.'); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : 'Unable to save the image.'); }
    finally { setExporting(false); }
  };

  const updateRefinement = (value: string) => { if (mutation.isError) mutation.reset(); setNotice(null); setRefinement(value); };
  const runRefinement = (instruction: string) => {
    const baseImage = selectedBase?.imageUrl ?? result.imageDataUrl;
    setNotice(null);
    mutation.mutate({ sourceImageDataUrl: baseImage, style, roomType, shoppingCountry: result.shoppingCountry, refinement: instruction });
  };
  const submitRefinement = () => { const instruction = refinement.trim(); if (instruction) runRefinement(instruction); };
  const applyItemRefinement = (instruction: string) => { setRefinement(''); runRefinement(instruction); };
  const handleSave = () => { if (!projectId) setFolderSheet(true); else void saveVersion(projectFolderId); };

  return (
    <Screen testID="result-screen">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 py-3"><Pressable testID="result-back-button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line }}><ArrowLeft size={20} color={COLORS.espresso} /></Pressable><View className="ml-4"><Wordmark compact /></View><Pressable testID="new-design-button" onPress={() => { reset(); router.replace('/'); }} className="ml-auto min-h-11 justify-center rounded-full border px-4" style={{ borderColor: COLORS.line }}><Text className="text-xs font-semibold" style={{ color: COLORS.espresso }}>New room</Text></Pressable></View>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
          <View className="mt-4 flex-row items-end justify-between"><View><Text className="text-[10px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.coral }}>{projectTitle ?? 'The composition'}</Text><Text className="mt-1 text-[32px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{styleLabel}</Text></View><Text className="pb-1 text-xs capitalize" style={{ color: COLORS.olive }}>{roomLabel}</Text></View>

          {versions.length ? <ScrollView testID="version-history" horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 15, paddingRight: 20 }}>{versions.map((version) => <Pressable key={version.id} testID={`version-${version.number}-button`} disabled={mutation.isPending || dirty} onPress={() => { selectVersion(version.id); setNotice(null); }} className="min-h-11 min-w-16 items-center justify-center rounded-full border px-4" style={{ borderColor: activeVersionId === version.id ? COLORS.coral : COLORS.line, backgroundColor: activeVersionId === version.id ? '#FBE4DD' : COLORS.paper, opacity: mutation.isPending || dirty ? 0.45 : 1 }}><Text className="font-semibold" style={{ color: activeVersionId === version.id ? COLORS.coral : COLORS.espresso }}>v{version.number}</Text></Pressable>)}{dirty ? <View testID="unsaved-version-chip" className="min-h-11 justify-center rounded-full px-4" style={{ backgroundColor: COLORS.espresso }}><Text className="text-sm font-semibold" style={{ color: COLORS.white }}>Save this edit to switch versions</Text></View> : null}</ScrollView> : null}

          <View className="relative mt-5"><BeforeAfterSlider beforeUri={selectedBase?.sourceImageUrl ?? sourceImageDataUrl} afterUri={result.imageDataUrl} />{mutation.isPending ? <View testID="refinement-loading" className="absolute inset-0 items-center justify-center rounded-[28px] bg-black/45"><RefreshCw size={34} color={COLORS.white} /><Text className="mt-3 text-sm font-semibold" style={{ color: COLORS.white }}>Refining the composition…</Text></View> : null}<Pressable testID="view-design-items-button" accessibilityRole="button" onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, itemsSectionY - 12), animated: true })} className="absolute right-4 top-4 min-h-11 flex-row items-center rounded-full border border-white/50 bg-black/60 px-4"><ShoppingBag size={15} color={COLORS.white} /><Text className="ml-2 text-xs font-semibold" style={{ color: COLORS.white }}>{result.items?.length ? `${result.items.length} items · Shop` : 'View items'}</Text></Pressable></View>
          <Text testID="revised-prompt" numberOfLines={3} className="mt-4 text-sm italic leading-5" style={{ color: COLORS.olive }}>“{result.revisedPrompt}”</Text>
          <View onLayout={(event) => setItemsSectionY(event.nativeEvent.layout.y)}><DesignItems items={result.items ?? []} loading={mutation.isPending} shoppingCountry={result.shoppingCountry} onRefine={applyItemRefinement} /></View>
          <View className="mt-6 flex-row gap-3"><View className="flex-1"><IconButton icon={projectId && !dirty ? Check : Bookmark} label={mutation.isPending ? 'Refining…' : saving ? 'Saving…' : projectId ? (dirty ? 'Save new version' : `Saved v${activeVersionNumber ?? 1}`) : 'Save'} onPress={() => { if (!saving && !mutation.isPending) handleSave(); }} testID="save-design-button" /></View><View className="flex-1"><IconButton icon={Download} label={exporting ? 'Saving…' : 'Photos'} onPress={() => void exportImage()} testID="export-image-button" /></View><Pressable testID="share-design-button" onPress={() => void shareImage(result.imageDataUrl)} className="h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}><Share2 size={18} color={COLORS.espresso} /></Pressable></View>
          {notice ? <Text testID="result-notice" className="mt-3 text-sm" style={{ color: COLORS.oliveDark }}>{notice}</Text> : null}{mutation.isError ? <Text testID="refinement-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{mutation.error instanceof Error ? mutation.error.message : 'That refinement did not complete.'}</Text> : null}
          <View className="mt-9 border-t pt-7" style={{ borderTopColor: COLORS.line }}><Text className="text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.espresso }}>Refine {activeVersionNumber ? `version ${activeVersionNumber}` : 'the edit'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 13, paddingRight: 20 }}>{REFINEMENTS.map((item) => <Pressable key={item} testID={`refinement-${item.toLowerCase().replaceAll(' ', '-')}`} onPress={() => updateRefinement(item)} className="min-h-11 justify-center rounded-full border px-4" style={{ borderColor: refinement === item ? COLORS.coral : COLORS.line, backgroundColor: COLORS.paper }}><Text className="text-sm" style={{ color: refinement === item ? COLORS.coral : COLORS.espresso }}>{item}</Text></Pressable>)}</ScrollView><TextInput testID="refinement-input" value={refinement} onChangeText={updateRefinement} placeholder="Tell Interi what to adjust…" placeholderTextColor="#9B9185" multiline maxLength={220} className="mt-3 min-h-[92px] rounded-[22px] border p-4 text-base leading-6" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso, textAlignVertical: 'top' }} /><View className="mt-4"><PrimaryButton label="Refine this room" onPress={submitRefinement} disabled={!refinement.trim()} loading={mutation.isPending} testID="submit-refinement-button" /></View></View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={folderSheet} transparent animationType="fade" onRequestClose={() => setFolderSheet(false)}><View testID="save-folder-sheet" className="flex-1 justify-end bg-black/35"><Pressable testID="close-folder-backdrop" className="absolute inset-0" onPress={() => setFolderSheet(false)} /><View className="rounded-t-[32px] px-5 pb-10 pt-5" style={{ backgroundColor: COLORS.chalk }}><View className="flex-row items-center"><View className="flex-1"><Text className="text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Save version 1</Text><Text className="mt-1 text-sm" style={{ color: COLORS.olive }}>Choose where this project belongs.</Text></View><Pressable testID="close-folder-sheet-button" onPress={() => setFolderSheet(false)} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line }}><X size={18} color={COLORS.espresso} /></Pressable></View><ScrollView className="mt-5" style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>{[{ id: null, name: 'Unfiled' }, ...folders].map((folder) => <Pressable key={folder.id ?? 'unfiled'} testID={`save-to-folder-${folder.id ?? 'unfiled'}`} disabled={saving} onPress={() => void saveVersion(folder.id)} className="min-h-14 flex-row items-center border-b px-2" style={{ borderBottomColor: COLORS.line }}><Folder size={18} color={COLORS.oliveDark} /><Text className="ml-3 flex-1 text-base" style={{ color: COLORS.espresso }}>{folder.name}</Text></Pressable>)}</ScrollView></View></View></Modal>
    </Screen>
  );
}
