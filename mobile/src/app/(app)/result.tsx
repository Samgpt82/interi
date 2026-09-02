import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Bookmark, Check, Download, Folder, Layers3, Plus, RefreshCw, Share2, ShoppingBag, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { DesignItems } from '@/components/DesignItems';
import { IconButton, PrimaryButton, Screen, Wordmark } from '@/components/InteriUI';
import { api } from '@/lib/api/api';
import { useSession } from '@/lib/auth/use-session';
import { authorizeDesignGeneration, DESIGN_ACCESS_QUERY_KEY } from '@/lib/design-access';
import { prepareImageForUpload, saveImageToLibrary, shareImage } from '@/lib/image-utils';
import { COLORS, ROOM_TYPES, STYLES, type DesignInventoryRequest, type DesignItem, type RedesignRequest, type RedesignResponse } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

const REFINEMENTS = ['Warmer light', 'More natural wood', 'Less furniture', 'Add statement art'];

export default function ResultScreen() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const sourceImageDataUrl = useGenerationStore((state) => state.sourceImageDataUrl);
  const style = useGenerationStore((state) => state.style);
  const roomType = useGenerationStore((state) => state.roomType);
  const result = useGenerationStore((state) => state.result);
  const projectId = useGenerationStore((state) => state.projectId);
  const projectTitle = useGenerationStore((state) => state.projectTitle);
  const versions = useGenerationStore((state) => state.versions);
  const activeVersionId = useGenerationStore((state) => state.activeVersionId);
  const activeVersionNumber = useGenerationStore((state) => state.activeVersionNumber);
  const dirty = useGenerationStore((state) => state.dirty);
  const pendingRefinement = useGenerationStore((state) => state.pendingRefinement);
  const setResult = useGenerationStore((state) => state.setResult);
  const setItems = useGenerationStore((state) => state.setItems);
  const loadProject = useGenerationStore((state) => state.loadProject);
  const selectVersion = useGenerationStore((state) => state.selectVersion);
  const addVersion = useGenerationStore((state) => state.addVersion);
  const reset = useGenerationStore((state) => state.reset);
  const { designs, folders, fetchProjectDetail, createProject, appendProjectVersion, createFolder, saving } = useSavedDesigns();
  const scrollRef = useRef<ScrollView | null>(null);
  const analyzedImageRef = useRef<string | null>(null);
  const [refinement, setRefinement] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [itemsSectionY, setItemsSectionY] = useState<number>(0);
  const [saveSheet, setSaveSheet] = useState<boolean>(false);
  const [creatingProject, setCreatingProject] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState<string>('');
  const [newProjectFolderId, setNewProjectFolderId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: async (request: RedesignRequest) => api.post<RedesignResponse>('/api/redesign', { ...request, sourceImageDataUrl: await prepareImageForUpload(request.sourceImageDataUrl) }),
    onSuccess: (data, variables) => {
      if (data.designAccess) queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, data.designAccess);
      setResult(data, { dirty: true, refinement: variables.refinement ?? null });
      setNotice('Refinement ready — save it as a new version.');
      setRefinement('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const { mutate: loadItems, isPending: itemsPending } = useMutation({
    mutationFn: (request: DesignInventoryRequest) => api.post<DesignItem[]>('/api/redesign/items', request),
    onSuccess: (items, request) => setItems(request.sourceImageDataUrl, items),
  });

  const refinementAccess = useMutation({
    mutationFn: async ({ instruction, baseImage }: { instruction: string; baseImage: string }) => {
      if (!session?.user.id) throw new Error('Sign in before refining a room.');
      const authorization = await authorizeDesignGeneration(session.user.id);
      return { ...authorization, instruction, baseImage };
    },
    onSuccess: ({ accessGranted, accessMode, designAccess, instruction, baseImage }) => {
      queryClient.setQueryData(DESIGN_ACCESS_QUERY_KEY, designAccess);
      if (!accessGranted) return;
      mutation.mutate({
        sourceImageDataUrl: baseImage,
        style,
        roomType,
        shoppingCountry: result?.shoppingCountry ?? 'GB',
        refinement: instruction,
        accessMode,
      });
    },
  });

  useEffect(() => {
    if (!result || result.items.length > 0 || !result.imageDataUrl.startsWith('data:image/')) return;
    if (analyzedImageRef.current === result.imageDataUrl) return;

    analyzedImageRef.current = result.imageDataUrl;
    loadItems({
      sourceImageDataUrl: result.imageDataUrl,
      style,
      roomType,
      shoppingCountry: result.shoppingCountry,
    });
  }, [loadItems, result, roomType, style]);

  const refinementPending = mutation.isPending || refinementAccess.isPending;
  const styleLabel = useMemo(() => STYLES.find((item) => item.id === style)?.label ?? style, [style]);
  const roomLabel = useMemo(() => ROOM_TYPES.find((item) => item.id === roomType)?.label ?? roomType, [roomType]);
  const selectedBase = useMemo(() => versions.find((version) => version.id === activeVersionId) ?? null, [activeVersionId, versions]);

  if (!sourceImageDataUrl || !result) return <Screen testID="result-missing-state"><View className="flex-1 justify-center px-6"><Text className="text-3xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Your next room starts with a photo.</Text><View className="mt-6"><PrimaryButton label="Create a design" onPress={() => router.replace('/')} testID="result-home-button" /></View></View></Screen>;

  const saveVersion = async () => {
    setNotice(null);
    try {
      if (projectId && dirty) {
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

  const closeSaveSheet = () => {
    if (saving || creatingFolder) return;
    setSaveSheet(false);
    setCreatingProject(false);
    setShowNewFolderInput(false);
    setNewFolderName('');
    setSaveError(null);
  };

  const openSaveSheet = () => {
    setNewProjectTitle(`${styleLabel} ${roomLabel.toLowerCase()}`);
    setNewProjectFolderId(null);
    setCreatingProject(false);
    setShowNewFolderInput(false);
    setNewFolderName('');
    setSaveError(null);
    setNotice(null);
    setSaveSheet(true);
  };

  const createNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    setSaveError(null);
    try {
      const folder = await createFolder(name);
      setNewProjectFolderId(folder.id);
      setNewFolderName('');
      setShowNewFolderInput(false);
      await Haptics.selectionAsync();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Unable to create this folder.');
    } finally {
      setCreatingFolder(false);
    }
  };

  const createNewProject = async () => {
    const title = newProjectTitle.trim();
    if (!title) return;
    setSaveError(null);
    setNotice(null);
    try {
      const project = await createProject({
        title,
        folderId: newProjectFolderId,
        sourceImageDataUrl,
        imageDataUrl: result.imageDataUrl,
        revisedPrompt: result.revisedPrompt,
        items: result.items,
        shoppingCountry: result.shoppingCountry,
        style,
        roomType,
      });
      loadProject(project, project.latestVersion.id);
      setSaveSheet(false);
      setCreatingProject(false);
      setNotice('Created project and saved as version 1.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Unable to create this project.');
    }
  };

  const saveToExistingProject = async (targetProjectId: string, title: string) => {
    setSaveError(null);
    setNotice(null);
    try {
      const version = await appendProjectVersion(targetProjectId, {
        sourceImageDataUrl,
        imageDataUrl: result.imageDataUrl,
        revisedPrompt: result.revisedPrompt,
        items: result.items,
        shoppingCountry: result.shoppingCountry,
        style,
        roomType,
      });
      const project = await fetchProjectDetail(targetProjectId);
      loadProject(project, version.id);
      setSaveSheet(false);
      setNotice(`Saved to ${title} as version ${version.number}.`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Unable to save to this project.');
    }
  };

  const exportImage = async () => {
    setExporting(true); setNotice(null);
    try { await saveImageToLibrary(result.imageDataUrl); setNotice(Platform.OS === 'web' ? 'Download started.' : 'Saved to your photo library.'); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : 'Unable to save the image.'); }
    finally { setExporting(false); }
  };

  const updateRefinement = (value: string) => { if (mutation.isError) mutation.reset(); if (refinementAccess.isError) refinementAccess.reset(); setNotice(null); setRefinement(value); };
  const runRefinement = (instruction: string) => {
    const baseImage = selectedBase?.imageUrl ?? result.imageDataUrl;
    setNotice(null);
    refinementAccess.mutate({ instruction, baseImage });
  };
  const submitRefinement = () => { const instruction = refinement.trim(); if (instruction) runRefinement(instruction); };
  const applyItemRefinement = (instruction: string) => { setRefinement(''); runRefinement(instruction); };
  const handleSave = () => { if (!projectId) openSaveSheet(); else void saveVersion(); };

  return (
    <Screen testID="result-screen">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 py-3"><Pressable testID="result-back-button" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line }}><ArrowLeft size={20} color={COLORS.espresso} /></Pressable><View className="ml-4"><Wordmark compact /></View><Pressable testID="new-design-button" onPress={() => { reset(); router.replace('/'); }} className="ml-auto min-h-11 justify-center rounded-full border px-4" style={{ borderColor: COLORS.line }}><Text className="text-xs font-semibold" style={{ color: COLORS.espresso }}>New room</Text></Pressable></View>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}>
          <View className="mt-4 flex-row items-end justify-between"><View><Text className="text-[10px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.coral }}>{projectTitle ?? 'The composition'}</Text><Text className="mt-1 text-[32px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{styleLabel}</Text></View><Text className="pb-1 text-xs capitalize" style={{ color: COLORS.olive }}>{roomLabel}</Text></View>

          {versions.length ? <ScrollView testID="version-history" horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 15, paddingRight: 20 }}>{versions.map((version) => <Pressable key={version.id} testID={`version-${version.number}-button`} disabled={refinementPending || dirty} onPress={() => { selectVersion(version.id); setNotice(null); }} className="min-h-11 min-w-16 items-center justify-center rounded-full border px-4" style={{ borderColor: activeVersionId === version.id ? COLORS.coral : COLORS.line, backgroundColor: activeVersionId === version.id ? '#FBE4DD' : COLORS.paper, opacity: refinementPending || dirty ? 0.45 : 1 }}><Text className="font-semibold" style={{ color: activeVersionId === version.id ? COLORS.coral : COLORS.espresso }}>v{version.number}</Text></Pressable>)}{dirty ? <View testID="unsaved-version-chip" className="min-h-11 justify-center rounded-full px-4" style={{ backgroundColor: COLORS.espresso }}><Text className="text-sm font-semibold" style={{ color: COLORS.white }}>Save this edit to switch versions</Text></View> : null}</ScrollView> : null}

          <View className="relative mt-5"><BeforeAfterSlider beforeUri={selectedBase?.sourceImageUrl ?? sourceImageDataUrl} afterUri={result.imageDataUrl} />{refinementPending ? <View testID="refinement-loading" className="absolute inset-0 items-center justify-center rounded-[28px] bg-black/45"><RefreshCw size={34} color={COLORS.white} /><Text className="mt-3 text-sm font-semibold" style={{ color: COLORS.white }}>{refinementAccess.isPending ? 'Checking access…' : 'Refining the composition…'}</Text></View> : null}<Pressable testID="view-design-items-button" accessibilityRole="button" onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, itemsSectionY - 12), animated: true })} className="absolute right-4 top-4 min-h-11 flex-row items-center rounded-full border border-white/50 bg-black/60 px-4"><ShoppingBag size={15} color={COLORS.white} /><Text className="ml-2 text-xs font-semibold" style={{ color: COLORS.white }}>{result.items?.length ? `${result.items.length} items · Shop` : 'View items'}</Text></Pressable></View>
          <Text testID="revised-prompt" numberOfLines={3} className="mt-4 text-sm italic leading-5" style={{ color: COLORS.olive }}>“{result.revisedPrompt}”</Text>
          <View onLayout={(event) => setItemsSectionY(event.nativeEvent.layout.y)}><DesignItems items={result.items ?? []} loading={refinementPending || itemsPending} shoppingCountry={result.shoppingCountry} onRefine={applyItemRefinement} /></View>
          <View className="mt-6 flex-row gap-3"><View className="flex-1"><IconButton icon={projectId && !dirty ? Check : Bookmark} label={refinementPending ? 'Refining…' : saving ? 'Saving…' : projectId ? (dirty ? 'Save new version' : `Saved v${activeVersionNumber ?? 1}`) : 'Save'} onPress={() => { if (!saving && !refinementPending) handleSave(); }} testID="save-design-button" /></View><View className="flex-1"><IconButton icon={Download} label={exporting ? 'Saving…' : 'Photos'} onPress={() => void exportImage()} testID="export-image-button" /></View><Pressable testID="share-design-button" onPress={() => void shareImage(result.imageDataUrl)} className="h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}><Share2 size={18} color={COLORS.espresso} /></Pressable></View>
          {notice ? <Text testID="result-notice" className="mt-3 text-sm" style={{ color: COLORS.oliveDark }}>{notice}</Text> : null}{mutation.isError ? <Text testID="refinement-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{mutation.error instanceof Error ? mutation.error.message : 'That refinement did not complete.'}</Text> : null}{refinementAccess.isError ? <Text testID="refinement-subscription-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{refinementAccess.error instanceof Error ? refinementAccess.error.message : 'Unable to open subscription options.'}</Text> : null}
          <View className="mt-9 border-t pt-7" style={{ borderTopColor: COLORS.line }}><Text className="text-[11px] font-semibold uppercase tracking-[2.5px]" style={{ color: COLORS.espresso }}>Refine {activeVersionNumber ? `version ${activeVersionNumber}` : 'the edit'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 13, paddingRight: 20 }}>{REFINEMENTS.map((item) => <Pressable key={item} testID={`refinement-${item.toLowerCase().replaceAll(' ', '-')}`} onPress={() => updateRefinement(item)} className="min-h-11 justify-center rounded-full border px-4" style={{ borderColor: refinement === item ? COLORS.coral : COLORS.line, backgroundColor: COLORS.paper }}><Text className="text-sm" style={{ color: refinement === item ? COLORS.coral : COLORS.espresso }}>{item}</Text></Pressable>)}</ScrollView><TextInput testID="refinement-input" value={refinement} onChangeText={updateRefinement} placeholder="Tell Interi what to adjust…" placeholderTextColor="#9B9185" multiline maxLength={220} className="mt-3 min-h-[92px] rounded-[22px] border p-4 text-base leading-6" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso, textAlignVertical: 'top' }} /><View className="mt-4"><PrimaryButton label="Refine this room" onPress={submitRefinement} disabled={!refinement.trim()} loading={refinementPending} testID="submit-refinement-button" /></View></View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={saveSheet} transparent animationType="fade" onRequestClose={closeSaveSheet}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View testID="save-project-sheet" className="flex-1 justify-end bg-black/35">
            <Pressable testID="close-save-backdrop" className="absolute inset-0" onPress={closeSaveSheet} />
            <View className="max-h-[82%] rounded-t-[32px] px-5 pb-10 pt-5" style={{ backgroundColor: COLORS.chalk }}>
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{creatingProject ? 'New project' : 'Save design'}</Text>
                  <Text className="mt-1 text-sm" style={{ color: COLORS.olive }}>{creatingProject ? 'Name it and choose a folder.' : 'Add it to a project, or start a new one.'}</Text>
                </View>
                <Pressable testID="close-save-sheet-button" disabled={saving || creatingFolder} onPress={closeSaveSheet} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line, opacity: saving || creatingFolder ? 0.45 : 1 }}><X size={18} color={COLORS.espresso} /></Pressable>
              </View>

              {creatingProject ? (
                <View testID="new-project-form" className="mt-6">
                  <Text className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.oliveDark }}>Project name</Text>
                  <TextInput
                    testID="new-project-title-input"
                    value={newProjectTitle}
                    onChangeText={setNewProjectTitle}
                    autoFocus
                    selectTextOnFocus
                    maxLength={80}
                    returnKeyType="done"
                    onSubmitEditing={() => { if (newProjectTitle.trim() && !saving) void createNewProject(); }}
                    placeholder="My room project"
                    placeholderTextColor="#9B9185"
                    className="mt-2 min-h-14 rounded-2xl border px-4 text-base"
                    style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso }}
                  />
                  <Text className="mt-5 text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.oliveDark }}>Folder</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 10, paddingRight: 20 }}>
                    {[{ id: null, name: 'Unfiled' }, ...folders].map((folder) => {
                      const selected = newProjectFolderId === folder.id;
                      return <Pressable key={folder.id ?? 'unfiled'} testID={`new-project-folder-${folder.id ?? 'unfiled'}`} disabled={creatingFolder} onPress={() => setNewProjectFolderId(folder.id)} className="min-h-11 flex-row items-center rounded-full border px-4" style={{ borderColor: selected ? COLORS.coral : COLORS.line, backgroundColor: selected ? '#FBE4DD' : COLORS.paper, opacity: creatingFolder ? 0.55 : 1 }}><Folder size={15} color={selected ? COLORS.coral : COLORS.oliveDark} /><Text className="ml-2 text-sm font-semibold" style={{ color: selected ? COLORS.coral : COLORS.espresso }}>{folder.name}</Text></Pressable>;
                    })}
                    <Pressable testID="show-new-folder-input-button" disabled={creatingFolder} onPress={() => { setShowNewFolderInput(true); setSaveError(null); }} className="min-h-11 flex-row items-center rounded-full border px-4" style={{ borderColor: COLORS.espresso, backgroundColor: COLORS.espresso, opacity: creatingFolder ? 0.55 : 1 }}><Plus size={15} color={COLORS.white} /><Text className="ml-2 text-sm font-semibold" style={{ color: COLORS.white }}>New folder</Text></Pressable>
                  </ScrollView>
                  {showNewFolderInput ? (
                    <View testID="new-folder-form" className="mt-3 flex-row items-center rounded-[20px] border p-1.5 pl-4" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
                      <Folder size={17} color={COLORS.oliveDark} />
                      <TextInput
                        testID="new-folder-name-input"
                        value={newFolderName}
                        onChangeText={setNewFolderName}
                        autoFocus
                        maxLength={60}
                        returnKeyType="done"
                        onSubmitEditing={() => void createNewFolder()}
                        placeholder="Folder name"
                        placeholderTextColor="#9B9185"
                        className="ml-2 min-h-11 flex-1 text-base"
                        style={{ color: COLORS.espresso }}
                      />
                      <Pressable testID="create-folder-button" disabled={!newFolderName.trim() || creatingFolder} onPress={() => void createNewFolder()} className="h-11 min-w-11 items-center justify-center rounded-2xl px-3" style={{ backgroundColor: COLORS.coral, opacity: !newFolderName.trim() || creatingFolder ? 0.45 : 1 }}>
                        {creatingFolder ? <Text className="text-xs font-semibold" style={{ color: COLORS.white }}>Adding…</Text> : <Check size={18} color={COLORS.white} />}
                      </Pressable>
                      <Pressable testID="cancel-new-folder-button" disabled={creatingFolder} onPress={() => { setShowNewFolderInput(false); setNewFolderName(''); setSaveError(null); }} className="ml-1 h-11 w-11 items-center justify-center rounded-2xl"><X size={17} color={COLORS.oliveDark} /></Pressable>
                    </View>
                  ) : null}
                  <View className="mt-6"><PrimaryButton label="Create project & save" onPress={() => void createNewProject()} disabled={!newProjectTitle.trim() || creatingFolder} loading={saving} testID="create-project-and-save-button" /></View>
                  <Pressable testID="back-to-project-list-button" disabled={saving || creatingFolder} onPress={() => { setCreatingProject(false); setShowNewFolderInput(false); setNewFolderName(''); }} className="mt-2 min-h-11 items-center justify-center"><Text className="text-sm font-semibold" style={{ color: COLORS.oliveDark }}>Back to projects</Text></Pressable>
                </View>
              ) : (
                <ScrollView testID="save-project-list" className="mt-5" style={{ maxHeight: 500 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <Pressable testID="create-new-project-button" disabled={saving} onPress={() => setCreatingProject(true)} className="mb-4 min-h-[74px] flex-row items-center rounded-[22px] border px-4" style={{ borderColor: COLORS.coral, backgroundColor: '#FBE4DD' }}>
                    <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}><Plus size={20} color={COLORS.white} /></View>
                    <View className="ml-3 flex-1"><Text className="text-base font-semibold" style={{ color: COLORS.espresso }}>Create new project</Text><Text className="mt-0.5 text-xs" style={{ color: COLORS.oliveDark }}>Start with this design as version 1</Text></View>
                  </Pressable>

                  {designs.length ? <Text className="mb-2 text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.oliveDark }}>Your projects</Text> : null}
                  {designs.map((project) => (
                    <Pressable key={project.id} testID={`save-to-project-${project.id}`} disabled={saving} onPress={() => void saveToExistingProject(project.id, project.title)} className="min-h-[76px] flex-row items-center border-b py-3" style={{ borderBottomColor: COLORS.line, opacity: saving ? 0.45 : 1 }}>
                      <Image source={{ uri: project.latestVersion.imageUrl }} className="h-14 w-14 rounded-2xl" />
                      <View className="ml-3 flex-1"><Text numberOfLines={1} className="text-base font-semibold" style={{ color: COLORS.espresso }}>{project.title}</Text><View className="mt-1 flex-row items-center"><Folder size={13} color={COLORS.olive} /><Text numberOfLines={1} className="ml-1 text-xs" style={{ color: COLORS.olive }}>{project.folder?.name ?? 'Unfiled'} · {project.versionCount} {project.versionCount === 1 ? 'version' : 'versions'}</Text></View></View>
                      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.paper }}><Layers3 size={17} color={COLORS.oliveDark} /></View>
                    </Pressable>
                  ))}
                  {!designs.length ? <View testID="empty-project-list" className="items-center px-6 py-8"><Folder size={28} color={COLORS.sand} /><Text className="mt-3 text-center text-sm" style={{ color: COLORS.olive }}>No projects yet. Create one to save your first design.</Text></View> : null}
                </ScrollView>
              )}
              {saveError ? <Text testID="save-project-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{saveError}</Text> : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
