export const COLORS = {
  chalk: '#F3EEE4',
  paper: '#FBF8F1',
  espresso: '#2A211C',
  olive: '#74745B',
  oliveDark: '#565742',
  coral: '#F26B4D',
  sand: '#D9CDBD',
  line: '#D8CFC2',
  white: '#FFFDF8',
} as const;

export const STYLES = [
  { id: 'warm-minimal', label: 'Warm minimal', note: 'Soft geometry, honest materials', color: '#D4C2A7' },
  { id: 'japandi', label: 'Japandi', note: 'Quiet craft, grounded calm', color: '#8A8A6A' },
  { id: 'modern-organic', label: 'Modern organic', note: 'Sculptural forms, natural texture', color: '#A78569' },
  { id: 'mid-century', label: 'Mid-century', note: 'Rich timber, tailored silhouettes', color: '#C8754F' },
  { id: 'quiet-luxury', label: 'Quiet luxury', note: 'Restrained, tactile, considered', color: '#6C655D' },
  { id: 'coastal', label: 'Coastal', note: 'Airy linen, sun-washed tones', color: '#8FA6A1' },
] as const;

export const ROOM_TYPES = [
  { id: 'living-room', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'dining-room', label: 'Dining room' },
  { id: 'home-office', label: 'Home office' },
  { id: 'bathroom', label: 'Bathroom' },
] as const;

export type DesignStyle = (typeof STYLES)[number]['id'];
export type RoomType = (typeof ROOM_TYPES)[number]['id'];

export interface RedesignRequest {
  sourceImageDataUrl: string;
  style: DesignStyle;
  roomType: RoomType;
  refinement?: string;
}

export interface RedesignResponse {
  imageDataUrl: string;
  revisedPrompt: string;
}

export interface SavedDesign {
  id: string;
  createdAt: string;
  sourceImageDataUrl: string;
  imageDataUrl: string;
  revisedPrompt: string;
  style: DesignStyle;
  roomType: RoomType;
}
