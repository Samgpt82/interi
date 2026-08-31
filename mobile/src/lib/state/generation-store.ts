import { create } from 'zustand';

import type { DesignStyle, RedesignResponse, RoomType } from '@/lib/interi';

interface GenerationState {
  sourceImageDataUrl: string | null;
  sourceImageUri: string | null;
  style: DesignStyle;
  roomType: RoomType;
  direction: string;
  result: RedesignResponse | null;
  setSource: (dataUrl: string, uri: string) => void;
  setStyle: (style: DesignStyle) => void;
  setRoomType: (roomType: RoomType) => void;
  setDirection: (direction: string) => void;
  setResult: (result: RedesignResponse) => void;
  reset: () => void;
}

const initialState = {
  sourceImageDataUrl: null,
  sourceImageUri: null,
  style: 'warm-minimal' as DesignStyle,
  roomType: 'living-room' as RoomType,
  direction: '',
  result: null,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initialState,
  setSource: (sourceImageDataUrl, sourceImageUri) => set({ sourceImageDataUrl, sourceImageUri, result: null }),
  setStyle: (style) => set({ style }),
  setRoomType: (roomType) => set({ roomType }),
  setDirection: (direction) => set({ direction }),
  setResult: (result) => set({ result }),
  reset: () => set(initialState),
}));
