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

export const FREE_DESIGN_LIMIT = 3;
export const SUBSCRIPTION_REQUIRED_ERROR_CODE = "SUBSCRIPTION_REQUIRED";

export const designAccessModeSchema = z.enum(["free", "subscription"]);

export const designAccessResponseSchema = z.object({
  freeDesignLimit: z.number().int().positive(),
  freeDesignsUsed: z.number().int().nonnegative(),
  freeDesignsRemaining: z.number().int().nonnegative(),
});

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
  accessMode: designAccessModeSchema.default("free"),
});

export type RoomStyle = z.infer<typeof roomStyleSchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;
export type ShoppingCountry = z.infer<typeof shoppingCountrySchema>;
export type DesignAccessMode = z.infer<typeof designAccessModeSchema>;
export type DesignAccessResponse = z.infer<typeof designAccessResponseSchema>;
export const designInventoryRequestSchema = redesignRoomRequestSchema.pick({
  sourceImageDataUrl: true,
  style: true,
  roomType: true,
  shoppingCountry: true,
});

export type RedesignRoomRequest = z.infer<typeof redesignRoomRequestSchema>;
export type DesignInventoryRequest = z.infer<typeof designInventoryRequestSchema>;

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
  designAccess: DesignAccessResponse;
}

export const projectImageDataSchema = z
  .string()
  .min(100)
  .max(16_000_000)
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, "A valid project image is required");

export const folderNameSchema = z.string().trim().min(1).max(80);

export const createFolderRequestSchema = z.object({
  name: folderNameSchema,
});

export const updateFolderRequestSchema = createFolderRequestSchema;

export const folderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectVersionContentSchema = z.object({
  sourceImageDataUrl: projectImageDataSchema,
  imageDataUrl: projectImageDataSchema,
  revisedPrompt: z.string().trim().min(1).max(2_000),
  items: z.array(designItemSchema).max(12),
  shoppingCountry: shoppingCountrySchema,
  style: roomStyleSchema,
  roomType: roomTypeSchema,
});

export const saveProjectRequestSchema = projectVersionContentSchema.extend({
  title: z.string().trim().min(1).max(80),
  folderId: z.string().min(1).nullable().optional(),
});

export const updateProjectRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    folderId: z.string().min(1).nullable().optional(),
  })
  .refine((value) => value.title !== undefined || value.folderId !== undefined, {
    message: "A title or folder must be provided.",
  });

export const appendProjectVersionRequestSchema = projectVersionContentSchema.extend({
  baseVersionId: z.string().min(1).optional(),
  refinement: z.string().trim().min(1).max(500).optional(),
});

export const updateProjectVersionItemsRequestSchema = designInventorySchema;

export const projectFolderSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const projectVersionResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  number: z.number().int().positive(),
  sourceImageUrl: z.string(),
  imageUrl: z.string(),
  revisedPrompt: z.string(),
  items: z.array(designItemSchema),
  shoppingCountry: shoppingCountrySchema,
  style: roomStyleSchema,
  roomType: roomTypeSchema,
  baseVersionId: z.string().nullable(),
  refinement: z.string().nullable(),
  createdAt: z.string(),
});

export const projectVersionSummarySchema = projectVersionResponseSchema.pick({
  id: true,
  number: true,
  imageUrl: true,
  createdAt: true,
});

export const projectSummaryResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  folder: projectFolderSummarySchema.nullable(),
  latestVersion: projectVersionSummarySchema,
  versionCount: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectDetailResponseSchema = projectSummaryResponseSchema.extend({
  versions: z.array(projectVersionResponseSchema),
});

export type CreateFolderRequest = z.infer<typeof createFolderRequestSchema>;
export type UpdateFolderRequest = z.infer<typeof updateFolderRequestSchema>;
export type FolderResponse = z.infer<typeof folderResponseSchema>;
export type ProjectVersionContent = z.infer<typeof projectVersionContentSchema>;
export type SaveProjectRequest = z.infer<typeof saveProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectRequestSchema>;
export type AppendProjectVersionRequest = z.infer<typeof appendProjectVersionRequestSchema>;
export type UpdateProjectVersionItemsRequest = z.infer<typeof updateProjectVersionItemsRequestSchema>;
export type ProjectFolderSummary = z.infer<typeof projectFolderSummarySchema>;
export type ProjectVersionResponse = z.infer<typeof projectVersionResponseSchema>;
export type ProjectVersionSummary = z.infer<typeof projectVersionSummarySchema>;
export type ProjectSummaryResponse = z.infer<typeof projectSummaryResponseSchema>;
export type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;
