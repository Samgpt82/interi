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

export interface RedesignRoomResult {
  imageDataUrl: string;
  revisedPrompt: string;
}
