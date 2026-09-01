import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Bookmark, Check, Folder, FolderPlus, MoreHorizontal, Trash2, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen, Wordmark } from '@/components/InteriUI';
import { COLORS, type ProjectSummaryResponse } from '@/lib/interi';
import { useGenerationStore } from '@/lib/state/generation-store';
import { useSavedDesigns } from '@/lib/state/saved-designs-context';

type FolderFilter = 'all' | 'unfiled' | string;
type Sheet = { kind: 'create-folder' } | { kind: 'project'; project: ProjectSummaryResponse } | { kind: 'delete-folder'; folderId: string; folderName: string } | null;

export default function SavedScreen() {
  const { designs, folders, hydrated, error, refresh, fetchProjectDetail, removeDesign, createFolder, removeFolder, moveProject } = useSavedDesigns();
  const loadProject = useGenerationStore((state) => state.loadProject);
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const visibleDesigns = useMemo(() => designs.filter((project) => filter === 'all' || (filter === 'unfiled' ? !project.folder : project.folder?.id === filter)), [designs, filter]);

  const openDesign = async (project: ProjectSummaryResponse) => {
    setActionError(null);
    setBusy(true);
    try {
      const detail = await fetchProjectDetail(project.id);
      loadProject(detail, detail.latestVersion.id);
      router.push('/result');
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to open this project.');
    } finally {
      setBusy(false);
    }
  };

  const submitFolder = async () => {
    if (!folderName.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      const folder = await createFolder(folderName);
      setFolderName('');
      setFilter(folder.id);
      setSheet(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to create this folder.');
    } finally { setBusy(false); }
  };

  const move = async (project: ProjectSummaryResponse, folderId: string | null) => {
    setBusy(true);
    setActionError(null);
    try {
      await moveProject(project.id, folderId);
      setSheet(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to move this project.');
    } finally { setBusy(false); }
  };

  const deleteProject = async (project: ProjectSummaryResponse) => {
    setBusy(true);
    setActionError(null);
    try {
      await removeDesign(project.id);
      setSheet(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to delete this project.');
    } finally { setBusy(false); }
  };

  const deleteFolder = async (id: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await removeFolder(id);
      if (filter === id) setFilter('unfiled');
      setSheet(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to delete this folder.');
    } finally { setBusy(false); }
  };

  if (!hydrated) return <Screen testID="saved-loading-screen"><View className="flex-1 items-center justify-center"><ActivityIndicator testID="saved-loading-indicator" color={COLORS.coral} /></View></Screen>;
  if (error) return (
    <Screen testID="saved-error-screen"><View className="flex-1 items-center justify-center px-8"><Bookmark size={28} color={COLORS.coral} /><Text className="mt-5 text-center text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Your projects are still safe.</Text><Text testID="saved-error-message" className="mt-3 text-center text-sm" style={{ color: COLORS.olive }}>{error}</Text><Pressable testID="retry-projects-button" onPress={() => void refresh()} className="mt-6 min-h-12 justify-center rounded-full px-6" style={{ backgroundColor: COLORS.espresso }}><Text className="font-semibold" style={{ color: COLORS.white }}>Try again</Text></Pressable></View></Screen>
  );

  const filterChip = (id: FolderFilter, label: string, count: number) => (
    <Pressable key={id} testID={`folder-filter-${id}`} onPress={() => setFilter(id)} className="min-h-11 flex-row items-center rounded-full border px-4" style={{ borderColor: filter === id ? COLORS.espresso : COLORS.line, backgroundColor: filter === id ? COLORS.espresso : COLORS.paper }}>
      <Text className="text-sm font-semibold" style={{ color: filter === id ? COLORS.white : COLORS.espresso }}>{label}</Text><Text className="ml-2 text-xs" style={{ color: filter === id ? COLORS.sand : COLORS.olive }}>{count}</Text>
    </Pressable>
  );

  return (
    <Screen testID="saved-screen">
      <FlatList
        testID="saved-project-list"
        data={visibleDesigns}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={visibleDesigns.length ? { gap: 12 } : undefined}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120, flexGrow: 1 }}
        ListHeaderComponent={<View className="mb-6"><Wordmark /><View className="mt-8 flex-row items-end"><View className="flex-1"><Text className="text-[38px] leading-[42px]" style={{ color: COLORS.espresso, fontFamily: 'Georgia', letterSpacing: -1.2 }}>Your room archive.</Text><Text className="mt-2 text-sm" style={{ color: COLORS.olive }}>Every idea, arranged your way.</Text></View><Pressable testID="create-folder-button" onPress={() => setSheet({ kind: 'create-folder' })} className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}><FolderPlus size={20} color={COLORS.white} /></Pressable></View>{actionError ? <Text testID="saved-action-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{actionError}</Text> : null}<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingTop: 20, paddingRight: 20 }}>{filterChip('all', 'All', designs.length)}{filterChip('unfiled', 'Unfiled', designs.filter((item) => !item.folder).length)}{folders.map((folder) => <View key={folder.id} className="flex-row items-center">{filterChip(folder.id, folder.name, folder.projectCount)}<Pressable testID={`folder-actions-${folder.id}`} onPress={() => setSheet({ kind: 'delete-folder', folderId: folder.id, folderName: folder.name })} className="ml-1 h-11 w-9 items-center justify-center"><MoreHorizontal size={17} color={COLORS.olive} /></Pressable></View>)}</ScrollView></View>}
        ListEmptyComponent={<View testID="saved-empty-state" className="mt-8 flex-1 items-center justify-center rounded-[28px] border px-8 py-14" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}><View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: '#E8E0D3' }}><Folder size={25} color={COLORS.oliveDark} /></View><Text className="mt-5 text-center text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{designs.length ? 'This folder is ready.' : 'Your collection is waiting.'}</Text><Text className="mt-2 text-center text-sm leading-5" style={{ color: COLORS.olive }}>{designs.length ? 'Move a project here whenever it belongs.' : 'Save a finished composition and it will live here.'}</Text></View>}
        renderItem={({ item }) => <Pressable testID={`saved-design-${item.id}`} disabled={busy} onPress={() => void openDesign(item)} className="mb-4 flex-1 overflow-hidden rounded-[22px] border active:opacity-80" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}><Image source={{ uri: item.latestVersion.imageUrl }} contentFit="cover" style={{ width: '100%', aspectRatio: 0.82 }} transition={200} /><View className="p-3"><View className="flex-row items-start"><Text className="flex-1 text-base" numberOfLines={1} style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{item.title}</Text><Pressable testID={`project-actions-${item.id}`} onPress={(event) => { event.stopPropagation(); setSheet({ kind: 'project', project: item }); }} className="h-9 w-9 items-center justify-center"><MoreHorizontal size={17} color={COLORS.olive} /></Pressable></View><View className="mt-2 flex-row items-center"><Text className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: '#EEE7DB', color: COLORS.oliveDark }}>v{item.latestVersion.number} · {item.versionCount} {item.versionCount === 1 ? 'version' : 'versions'}</Text></View></View></Pressable>}
      />

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <KeyboardAvoidingView
          testID="saved-action-sheet"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/35">
          <Pressable testID="close-sheet-backdrop" className="absolute inset-0" onPress={() => setSheet(null)} /><View className="rounded-t-[32px] px-5 pb-10 pt-5" style={{ backgroundColor: COLORS.chalk }}><View className="mb-5 flex-row items-center"><Text className="flex-1 text-2xl" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>{sheet?.kind === 'create-folder' ? 'New folder' : sheet?.kind === 'delete-folder' ? sheet.folderName : sheet?.kind === 'project' ? sheet.project.title : ''}</Text><Pressable testID="close-sheet-button" onPress={() => setSheet(null)} className="h-11 w-11 items-center justify-center rounded-full border" style={{ borderColor: COLORS.line }}><X size={18} color={COLORS.espresso} /></Pressable></View>
          {sheet?.kind === 'create-folder' ? <><TextInput testID="folder-name-input" value={folderName} onChangeText={setFolderName} autoFocus maxLength={80} placeholder="e.g. Living room ideas" placeholderTextColor={COLORS.olive} className="min-h-14 rounded-2xl border px-4 text-base" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, color: COLORS.espresso }} /><Pressable testID="submit-folder-button" disabled={!folderName.trim() || busy} onPress={() => void submitFolder()} className="mt-4 min-h-12 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.espresso }}><Text className="font-semibold" style={{ color: COLORS.white }}>{busy ? 'Creating…' : 'Create folder'}</Text></Pressable></> : null}
          {sheet?.kind === 'delete-folder' ? <><Text className="text-sm leading-5" style={{ color: COLORS.olive }}>Deleting this folder keeps its projects safe and moves them to Unfiled.</Text><Pressable testID="delete-folder-button" disabled={busy} onPress={() => void deleteFolder(sheet.folderId)} className="mt-5 min-h-12 flex-row items-center justify-center rounded-full" style={{ backgroundColor: COLORS.coral }}><Trash2 size={17} color={COLORS.white} /><Text className="ml-2 font-semibold" style={{ color: COLORS.white }}>{busy ? 'Deleting…' : 'Delete folder'}</Text></Pressable></> : null}
          {sheet?.kind === 'project' ? <><Text className="mb-3 text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: COLORS.olive }}>Move to</Text><ScrollView style={{ maxHeight: 260 }}>{[{ id: null, name: 'Unfiled' }, ...folders].map((folder) => { const selected = sheet.project.folder?.id === folder.id || (!sheet.project.folder && folder.id === null); return <Pressable key={folder.id ?? 'unfiled'} testID={`move-project-${folder.id ?? 'unfiled'}`} onPress={() => void move(sheet.project, folder.id)} className="min-h-14 flex-row items-center border-b px-2" style={{ borderBottomColor: COLORS.line }}><Folder size={18} color={COLORS.oliveDark} /><Text className="ml-3 flex-1 text-base" style={{ color: COLORS.espresso }}>{folder.name}</Text>{selected ? <Check size={18} color={COLORS.coral} /> : null}</Pressable>; })}</ScrollView><Pressable testID="delete-project-button" disabled={busy} onPress={() => void deleteProject(sheet.project)} className="mt-5 min-h-12 flex-row items-center justify-center rounded-full border" style={{ borderColor: COLORS.coral }}><Trash2 size={17} color={COLORS.coral} /><Text className="ml-2 font-semibold" style={{ color: COLORS.coral }}>Delete project</Text></Pressable></> : null}
          {actionError ? <Text testID="sheet-action-error" className="mt-3 text-sm" style={{ color: COLORS.coral }}>{actionError}</Text> : null}
        </View></KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
