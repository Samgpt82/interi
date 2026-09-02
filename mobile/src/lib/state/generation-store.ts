import { create } from 'zustand';

import type { DesignAccessMode, DesignStyle, ProjectDetailResponse, ProjectVersionResponse, RedesignResponse, RoomType } from '@/lib/interi';

interface GenerationState {
  sourceImageDataUrl: string | null;
  sourceImageUri: string | null;
  style: DesignStyle;
  roomType: RoomType;
  direction: string;
  accessMode: DesignAccessMode;
  result: RedesignResponse | null;
  projectId: string | null;
  projectTitle: string | null;
  projectFolderId: string | null;
  versions: ProjectVersionResponse[];
  activeVersionId: string | null;
  activeVersionNumber: number | null;
  dirty: boolean;
  pendingRefinement: string | null;
  setSource: (dataUrl: string, uri: string) => void;
  setStyle: (style: DesignStyle) => void;
  setRoomType: (roomType: RoomType) => void;
  setDirection: (direction: string) => void;
  setAccessMode: (accessMode: DesignAccessMode) => void;
  setResult: (result: RedesignResponse, options?: { dirty?: boolean; refinement?: string | null }) => void;
  setProjectId: (projectId: string | null) => void;
  setProjectFolderId: (folderId: string | null) => void;
  loadProject: (project: ProjectDetailResponse, versionId?: string) => void;
  selectVersion: (versionId: string) => void;
  addVersion: (version: ProjectVersionResponse) => void;
  markClean: () => void;
  reset: () => void;
}

const initialState = {
  sourceImageDataUrl: null,
  sourceImageUri: null,
  style: 'warm-minimal' as DesignStyle,
  roomType: 'living-room' as RoomType,
  direction: '',
  accessMode: 'free' as DesignAccessMode,
  result: null,
  projectId: null,
  projectTitle: null,
  projectFolderId: null,
  versions: [] as ProjectVersionResponse[],
  activeVersionId: null,
  activeVersionNumber: null,
  dirty: false,
  pendingRefinement: null,
};

function resultFromVersion(version: ProjectVersionResponse): RedesignResponse {
  return { imageDataUrl: version.imageUrl, revisedPrompt: version.revisedPrompt, items: version.items, shoppingCountry: version.shoppingCountry };
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  ...initialState,
  setSource: (sourceImageDataUrl, sourceImageUri) => set({ ...initialState, sourceImageDataUrl, sourceImageUri }),
  setStyle: (style) => set({ style }),
  setRoomType: (roomType) => set({ roomType }),
  setDirection: (direction) => set({ direction }),
  setAccessMode: (accessMode) => set({ accessMode }),
  setResult: (result, options) => set({ result, dirty: options?.dirty ?? get().dirty, pendingRefinement: options?.refinement ?? null }),
  setProjectId: (projectId) => set({ projectId }),
  setProjectFolderId: (projectFolderId) => set({ projectFolderId }),
  loadProject: (project, versionId) => {
    const selected = project.versions.find((version) => version.id === versionId) ?? project.versions.at(-1);
    if (!selected) return;
    set({
      sourceImageDataUrl: selected.sourceImageUrl,
      sourceImageUri: selected.sourceImageUrl,
      style: selected.style,
      roomType: selected.roomType,
      direction: '',
      result: resultFromVersion(selected),
      projectId: project.id,
      projectTitle: project.title,
      projectFolderId: project.folder?.id ?? null,
      versions: project.versions,
      activeVersionId: selected.id,
      activeVersionNumber: selected.number,
      dirty: false,
      pendingRefinement: null,
    });
  },
  selectVersion: (versionId) => {
    const version = get().versions.find((item) => item.id === versionId);
    if (!version) return;
    set({
      sourceImageDataUrl: version.sourceImageUrl,
      sourceImageUri: version.sourceImageUrl,
      style: version.style,
      roomType: version.roomType,
      result: resultFromVersion(version),
      activeVersionId: version.id,
      activeVersionNumber: version.number,
      dirty: false,
      pendingRefinement: null,
    });
  },
  addVersion: (version) => set((state) => ({
    versions: [...state.versions, version].sort((a, b) => a.number - b.number),
    sourceImageDataUrl: version.sourceImageUrl,
    sourceImageUri: version.sourceImageUrl,
    result: resultFromVersion(version),
    activeVersionId: version.id,
    activeVersionNumber: version.number,
    dirty: false,
    pendingRefinement: null,
  })),
  markClean: () => set({ dirty: false, pendingRefinement: null }),
  reset: () => set(initialState),
}));
