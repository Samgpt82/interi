import { create } from 'zustand';

import type { DesignStyle, RedesignResponse, RoomType } from '@/lib/interi';

interface GenerationState {
  sourceImageDataUrl: string | null;
  sourceImageUri: string | null;
  style: DesignStyle;
  roomType: RoomType;
  direction: string;
  result: RedesignResponse | null;
  projectId: string | null;
  setSource: (dataUrl: string, uri: string) => void;
  setStyle: (style: DesignStyle) => void;
  setRoomType: (roomType: RoomType) => void;
  setDirection: (direction: string) => void;
  setResult: (result: RedesignResponse) => void;
  setProjectId: (projectId: string | null) => void;
  reset: () => void;
}

const initialState = {
  sourceImageDataUrl: null,
  sourceImageUri: null,
  style: 'warm-minimal' as DesignStyle,
  roomType: 'living-room' as RoomType,
  direction: '',
  result: null,
  projectId: null,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,
  setSource: (sourceImageDataUrl, sourceImageUri) => set({ sourceImageDataUrl, sourceImageUri, result: null, projectId: null }),
  setStyle: (style) => set({ style }),
  setRoomType: (roomType) => set({ roomType }),
  setDirection: (direction) => set({ direction }),
  setResult: (result) => set({ result }),
  setProjectId: (projectId) => set({ projectId }),
  reset: () => set(initialState),
}));
