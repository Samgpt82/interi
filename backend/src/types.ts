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

export const shoppingCountrySchema = z.enum(["SE", "GB"]);

export const redesignRoomRequestSchema = z.object({
  sourceImageDataUrl: z
    .string()
    .min(100)
    .max(16_000_000)
    .regex(/^data:image\/(png|jpe?g|webp);base64,/, "A valid room image is required"),
  style: roomStyleSchema,
  roomType: roomTypeSchema,
  shoppingCountry: shoppingCountrySchema.default("GB"),
  refinement: z.string().trim().max(500).optional(),
});

export type RoomStyle = z.infer<typeof roomStyleSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type ShoppingCountry = z.infer<typeof shoppingCountrySchema>;
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
  shoppingCountry: ShoppingCountry;
}

const projectImageDataSchema = z
  .string()
  .min(100)
  .max(16_000_000)
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, "A valid project image is required");

const projectImageReferenceSchema = z.union([projectImageDataSchema, z.string().url().max(2_000)]);

export const saveProjectRequestSchema = z.object({
  title: z.string().trim().min(1).max(80),
  sourceImageDataUrl: projectImageDataSchema,
  imageDataUrl: projectImageDataSchema,
  revisedPrompt: z.string().trim().min(1).max(2_000),
  items: z.array(designItemSchema).max(12),
  shoppingCountry: shoppingCountrySchema,
  style: roomStyleSchema,
  roomType: roomTypeSchema,
});

export const updateProjectRequestSchema = saveProjectRequestSchema.extend({
  sourceImageDataUrl: projectImageReferenceSchema,
  imageDataUrl: projectImageReferenceSchema,
});

export type SaveProjectRequest = z.infer<typeof saveProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;

export interface ProjectResponse {
  id: string;
  title: string;
  sourceImageUrl: string;
  imageUrl: string;
  revisedPrompt: string;
  items: DesignItem[];
  shoppingCountry: ShoppingCountry;
  style: RoomStyle;
  roomType: RoomType;
  createdAt: string;
  updatedAt: string;
}
