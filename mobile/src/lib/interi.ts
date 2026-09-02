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
  { id: 'scandinavian', label: 'Scandinavian', note: 'Light, clean and functional', color: '#C9C2B3' },
  { id: 'modern', label: 'Modern', note: 'Sleek, contemporary lines', color: '#77736E' },
  { id: 'minimalist', label: 'Minimalist', note: 'Purposeful and uncluttered', color: '#DED8CE' },
  { id: 'industrial', label: 'Industrial', note: 'Raw, tailored urban character', color: '#625E59' },
  { id: 'luxury', label: 'Luxury', note: 'Opulent, refined finishes', color: '#B49363' },
  { id: 'bohemian', label: 'Bohemian', note: 'Layered, eclectic and free-spirited', color: '#A66F50' },
] as const;

export const ROOM_TYPES = [
  { id: 'living-room', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'dining-room', label: 'Dining room' },
  { id: 'home-office', label: 'Home office' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'children-room', label: "Children's room" },
] as const;

export const SHOPPING_COUNTRIES = ['SE', 'GB'] as const;

export type DesignStyle = (typeof STYLES)[number]['id'];
export type RoomType = (typeof ROOM_TYPES)[number]['id'];
export type ShoppingCountry = (typeof SHOPPING_COUNTRIES)[number];

export type DesignAccessMode = 'free' | 'subscription';
export const SUBSCRIPTION_REQUIRED_ERROR_CODE = 'SUBSCRIPTION_REQUIRED';

export interface DesignAccessResponse {
  freeDesignLimit: number;
  freeDesignsUsed: number;
  freeDesignsRemaining: number;
}

export interface RedesignRequest {
  sourceImageDataUrl: string;
  style: DesignStyle;
  roomType: RoomType;
  shoppingCountry: ShoppingCountry;
  refinement?: string;
  accessMode: DesignAccessMode;
}

export type DesignInventoryRequest = Pick<
  RedesignRequest,
  'sourceImageDataUrl' | 'style' | 'roomType' | 'shoppingCountry'
>;

export interface DesignItemColor { name: string; hex: string }
export interface DesignItem {
  id: string;
  emoji: string;
  name: string;
  color: string;
  material: string;
  description: string;
  priceRange: string;
  searchTerms: string;
  colorOptions: DesignItemColor[];
  swapSuggestions: string[];
}

export interface RedesignResponse {
  imageDataUrl: string;
  revisedPrompt: string;
  items: DesignItem[];
  shoppingCountry: ShoppingCountry;
  designAccess?: DesignAccessResponse;
}

export interface FolderResponse {
  id: string;
  name: string;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolderSummary { id: string; name: string }
export interface ProjectVersionSummary { id: string; number: number; imageUrl: string; createdAt: string }
export interface ProjectVersionResponse extends ProjectVersionSummary {
  projectId: string;
  sourceImageUrl: string;
  revisedPrompt: string;
  items: DesignItem[];
  shoppingCountry: ShoppingCountry;
  style: DesignStyle;
  roomType: RoomType;
  baseVersionId: string | null;
  refinement: string | null;
}

export interface ProjectSummaryResponse {
  id: string;
  title: string;
  folder: ProjectFolderSummary | null;
  latestVersion: ProjectVersionSummary;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse extends ProjectSummaryResponse { versions: ProjectVersionResponse[] }
export type SavedDesign = ProjectSummaryResponse;

export interface ProjectVersionContent {
  sourceImageDataUrl: string;
  imageDataUrl: string;
  revisedPrompt: string;
  items: DesignItem[];
  shoppingCountry: ShoppingCountry;
  style: DesignStyle;
  roomType: RoomType;
}
export interface SaveProjectRequest extends ProjectVersionContent { title: string; folderId?: string | null }
export interface AppendProjectVersionRequest extends ProjectVersionContent { baseVersionId?: string; refinement?: string }
export interface UpdateProjectVersionItemsRequest { items: DesignItem[] }
export interface UpdateProjectRequest { title?: string; folderId?: string | null }
export interface CreateFolderRequest { name: string }
export type UpdateFolderRequest = CreateFolderRequest;
