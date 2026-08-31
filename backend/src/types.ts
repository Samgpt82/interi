import { z } from "zod";

export const roomStyleSchema = z.enum([
  "warm-minimal",
  "japandi",
  "modern-organic",
  "mid-century",
  "quiet-luxury",
  "coastal",
  "scandinavian",
  "modern",
  "minimalist",
  "industrial",
  "luxury",
  "bohemian",
]);

export const roomTypeSchema = z.enum([
  "living-room",
  "bedroom",
  "kitchen",
  "dining-room",
  "home-office",
  "bathroom",
  "children-room",
]);

export const redesignRoomRequestSchema = z.object({
  sourceImageDataUrl: z
    .string()
    .min(100)
    .max(16_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/, "A valid room image is required"),
  style: roomStyleSchema,
  roomType: roomTypeSchema,
  refinement: z.string().trim().max(500).optional(),
});

export type RoomStyle = z.infer<typeof roomStyleSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type RedesignRoomRequest = z.infer<typeof redesignRoomRequestSchema>;

export const designItemColorSchema = z.object({
  name: z.string().min(1).max(40),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const designItemSchema = z.object({
  id: z.string().min(1).max(80),
  emoji: z.string().min(1).max(8),
  name: z.string().min(1).max(80),
  color: z.string().min(1).max(60),
  material: z.string().min(1).max(80),
  description: z.string().min(1).max(220),
  priceRange: z.string().min(1).max(40),
  searchTerms: z.string().min(1).max(140),
  colorOptions: z.array(designItemColorSchema).min(3).max(5),
  swapSuggestions: z.array(z.string().min(1).max(100)).length(3),
});

export const designInventorySchema = z.object({
  items: z.array(designItemSchema).min(4).max(7),
});

export type DesignItemColor = z.infer<typeof designItemColorSchema>;
export type DesignItem = z.infer<typeof designItemSchema>;

export interface RedesignRoomResult {
  imageDataUrl: string;
  revisedPrompt: string;
  items: DesignItem[];
}
