import { env } from "../env";
import {
  designInventorySchema,
  type DesignAccessResponse,
  type DesignInventoryRequest,
  type DesignItem,
  type RedesignRoomRequest,
  type RedesignRoomResult,
  type RoomStyle,
  type RoomType,
  type ShoppingCountry,
} from "../types";

const IMAGE_ATTEMPT_TIMEOUT_MS = 150_000;
const IMAGE_RETRY_DELAYS_MS = [1_000, 3_000];
const INVENTORY_ATTEMPT_TIMEOUT_MS = 60_000;
const INVENTORY_RETRY_DELAYS_MS: number[] = [];
const INVENTORY_MODEL = "gpt-5-mini";
const TRANSIENT_UPSTREAM_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const styleDescriptions: Record<RoomStyle, string> = {
  "warm-minimal":
    "warm minimalism with restrained forms, natural oak, soft plaster, tactile neutral textiles, and calm layered lighting",
  japandi:
    "refined Japandi design blending Japanese simplicity with Scandinavian warmth, low-profile furnishings, pale woods, and handcrafted texture",
  "modern-organic":
    "modern organic design with sculptural silhouettes, rounded forms, natural stone, warm wood, linen, and softly tonal colors",
  "mid-century":
    "elevated mid-century modern design with clean lines, walnut accents, iconic proportions, warm earth tones, and selective vintage character",
  "quiet-luxury":
    "quiet luxury with exceptional materials, tailored upholstery, subtle stone and metal details, elegant restraint, and sophisticated tonal layering",
  coastal:
    "upscale contemporary coastal design with airy natural textures, sun-washed neutrals, light woods, linen, and understated ocean-inspired accents",
  scandinavian:
    "light and functional Scandinavian design with pale woods, clean lines, soft neutral textiles, practical storage, and warm natural light",
  modern:
    "sleek contemporary modern design with crisp architectural lines, refined furniture, balanced contrast, and polished uncluttered finishes",
  minimalist:
    "calm minimalist design with purposeful furnishings, generous negative space, restrained colors, concealed storage, and impeccable proportions",
  industrial:
    "refined industrial design with raw concrete, blackened metal, aged wood, exposed details, urban character, and warm layered lighting",
  luxury:
    "opulent luxury design with statement lighting, rich stone, premium fabrics, elegant metal accents, bespoke furniture, and refined finishes",
  bohemian:
    "collected bohemian design with layered textiles, artisan objects, warm woods, natural fibers, expressive pattern, plants, and relaxed character",
};

const styleSummaryDetails: Record<RoomStyle, string> = {
  "warm-minimal": "soft neutral textiles, natural oak, and calm layered light",
  japandi: "low-profile forms, pale woods, and handcrafted texture",
  "modern-organic": "sculptural silhouettes, warm wood, linen, and natural stone",
  "mid-century": "tailored shapes, walnut accents, and warm earth tones",
  "quiet-luxury": "tailored upholstery, refined materials, and subtle tonal layers",
  coastal: "airy linens, light woods, and sun-washed natural tones",
  scandinavian: "clean lines, pale woods, practical storage, and warm light",
  modern: "crisp lines, balanced contrast, and polished uncluttered finishes",
  minimalist: "purposeful furnishings, restrained colour, and generous open space",
  industrial: "aged wood, blackened metal, raw texture, and warm layered lighting",
  luxury: "statement lighting, premium fabrics, rich stone, and elegant metal accents",
  bohemian: "layered textiles, artisan objects, warm woods, and expressive pattern",
};

const roomNames: Record<RoomType, string> = {
  "living-room": "living room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  "dining-room": "dining room",
  "home-office": "home office",
  bathroom: "bathroom",
  "children-room": "children's room",
};

const shoppingMarkets: Record<ShoppingCountry, { country: string; priceGuidance: string }> = {
  SE: {
    country: "Sweden",
    priceGuidance: "realistic broad Swedish price ranges in SEK, formatted like 3 000–7 000 kr",
  },
  GB: {
    country: "the United Kingdom",
    priceGuidance: "realistic broad UK price ranges in GBP, formatted like £300–£700",
  },
};

interface OpenAIImageEditResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: {
    message?: string;
  };
}

interface OpenAIInventoryResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

interface ImageGenerationOptions {
  idempotencyKey: string;
  timeoutMs?: number;
  retryDelaysMs?: number[];
}

export class RedesignServiceError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = "RedesignServiceError";
    this.code = code;
    this.retryable = retryable;
  }
}

const inventoryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "emoji",
          "name",
          "color",
          "material",
          "description",
          "priceRange",
          "searchTerms",
          "colorOptions",
          "swapSuggestions",
        ],
        properties: {
          id: { type: "string" },
          emoji: { type: "string" },
          name: { type: "string" },
          color: { type: "string" },
          material: { type: "string" },
          description: { type: "string" },
          priceRange: { type: "string" },
          searchTerms: { type: "string" },
          colorOptions: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "hex"],
              properties: {
                name: { type: "string" },
                hex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
              },
            },
          },
          swapSuggestions: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function normalizeRedesignError(error: unknown): RedesignServiceError {
  if (error instanceof RedesignServiceError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new RedesignServiceError(
      "The redesign is taking longer than expected. Please try again.",
      "IMAGE_SERVICE_TIMEOUT",
      true
    );
  }
  return new RedesignServiceError(
    "The image redesign service is temporarily unavailable. Please try again.",
    "IMAGE_SERVICE_UNAVAILABLE",
    true
  );
}

function normalizeInventoryError(error: unknown): RedesignServiceError {
  if (error instanceof RedesignServiceError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new RedesignServiceError(
      "Finding shopping details is taking longer than expected. Please try again.",
      "INVENTORY_SERVICE_TIMEOUT",
      true
    );
  }
  return new RedesignServiceError(
    "Shopping details are temporarily unavailable.",
    "INVENTORY_SERVICE_UNAVAILABLE",
    true
  );
}

function createInteriorPrompt(request: RedesignRoomRequest): string {
  const refinement = request.refinement
    ? `Honor this additional direction: ${request.refinement}.`
    : "";

  return [
    `Redesign this ${roomNames[request.roomType]} as a highly realistic, editorial-quality interior in ${styleDescriptions[request.style]}.`,
    "Preserve the room's architecture exactly: keep the existing floor plan, room dimensions, walls, ceiling geometry, windows, doors, openings, columns, fixed built-ins, and all structural elements in their original locations.",
    "Maintain the source image's camera position, perspective, focal length, composition, crop, and natural light direction.",
    "Transform only the interior design through coherent furniture, lighting fixtures, decor, surface finishes, textiles, and a sophisticated material palette appropriate to the room's function.",
    "Use believable scale, accurate geometry, physically plausible lighting and shadows, refined styling, and premium real-world materials. Avoid warped lines, duplicated objects, impossible reflections, visual clutter, text, logos, people, and architectural changes.",
    refinement,
    "The final result should look like a professionally photographed, buildable interior rather than a CGI concept.",
  ]
    .filter(Boolean)
    .join(" ");
}

function createDesignSummary(request: RedesignRoomRequest): string {
  return `A considered ${request.style.replaceAll("-", " ")} ${roomNames[request.roomType]} with ${styleSummaryDetails[request.style]}. The room's architecture and perspective remain intact while furniture, finishes, and lighting form a cohesive new composition.`;
}

function createImageEditForm(imageFile: File, prompt: string): FormData {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "auto");
  formData.append("quality", "low");
  formData.append("output_format", "jpeg");
  formData.append("output_compression", "82");
  formData.append("input_fidelity", "high");
  return formData;
}

async function readOpenAIResponse(response: Response): Promise<OpenAIImageEditResponse> {
  try {
    return (await response.json()) as OpenAIImageEditResponse;
  } catch {
    return {};
  }
}

async function requestImageEdit(
  imageFile: File,
  prompt: string,
  options: ImageGenerationOptions
): Promise<OpenAIImageEditResponse> {
  const retryDelays = options.retryDelaysMs ?? IMAGE_RETRY_DELAYS_MS;
  const timeoutMs = options.timeoutMs ?? IMAGE_ATTEMPT_TIMEOUT_MS;
  let lastError: RedesignServiceError | null = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Idempotency-Key": options.idempotencyKey,
        },
        body: createImageEditForm(imageFile, prompt),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const result = await readOpenAIResponse(response);

      if (response.ok) return result;

      const retryable = TRANSIENT_UPSTREAM_STATUSES.has(response.status);
      console.error("OpenAI image edit failed", {
        status: response.status,
        retryable,
        message: result.error?.message?.slice(0, 500),
      });
      lastError = new RedesignServiceError(
        retryable
          ? "The image redesign service is busy. Please try again shortly."
          : "The image redesign service could not complete this request.",
        retryable ? "IMAGE_SERVICE_BUSY" : "IMAGE_EDIT_REJECTED",
        retryable
      );
    } catch (error) {
      lastError = normalizeRedesignError(error);
      console.error("OpenAI image edit request failed", {
        attempt: attempt + 1,
        code: lastError.code,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (!lastError.retryable || attempt >= retryDelays.length) throw lastError;
    await wait(retryDelays[attempt]!);
  }

  throw lastError ?? normalizeRedesignError(null);
}

async function downloadGeneratedImage(url: string): Promise<string> {
  let lastError: RedesignServiceError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "image/png";
        const imageBytes = Buffer.from(await response.arrayBuffer());
        if (imageBytes.length > 0) {
          return `data:${contentType};base64,${imageBytes.toString("base64")}`;
        }
      }
      lastError = new RedesignServiceError(
        "The generated image could not be downloaded. Please try again.",
        "IMAGE_DOWNLOAD_FAILED",
        true
      );
    } catch (error) {
      lastError = normalizeRedesignError(error);
    }
    if (attempt === 0) await wait(800);
  }

  throw lastError ?? new RedesignServiceError(
    "The generated image could not be downloaded. Please try again.",
    "IMAGE_DOWNLOAD_FAILED",
    true
  );
}

export async function generateRedesign(
  request: RedesignRoomRequest,
  imageFile: File,
  designAccess: DesignAccessResponse,
  options: ImageGenerationOptions
): Promise<RedesignRoomResult> {
  const result = await requestImageEdit(imageFile, createInteriorPrompt(request), options);
  const image = result.data?.[0];
  const imageDataUrl = image?.b64_json
    ? `data:image/jpeg;base64,${image.b64_json}`
    : image?.url
      ? await downloadGeneratedImage(image.url)
      : null;

  if (!imageDataUrl) {
    console.error("OpenAI image edit returned no usable image");
    throw new RedesignServiceError(
      "The image redesign service returned an invalid result. Please try again.",
      "INVALID_IMAGE_RESULT",
      true
    );
  }

  return {
    imageDataUrl,
    revisedPrompt: createDesignSummary(request),
    items: [],
    shoppingCountry: request.shoppingCountry,
    designAccess,
  };
}

function extractInventoryText(result: OpenAIInventoryResponse): string | undefined {
  if (result.output_text) return result.output_text;
  return result.output
    ?.flatMap((output) => output.content ?? [])
    .find((content) => content.type === "output_text" && content.text)
    ?.text;
}

async function requestInventory(request: DesignInventoryRequest): Promise<OpenAIInventoryResponse> {
  const market = shoppingMarkets[request.shoppingCountry];
  const requestBody = JSON.stringify({
    model: INVENTORY_MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Create a concise shopping inventory for the main visible furniture, lighting, textiles, and decor in this redesigned ${roomNames[request.roomType]}.`,
              `The design style is ${styleDescriptions[request.style]}.`,
              "Return 4 to 7 distinct, prominent items. Describe what is actually visible, without claiming an exact brand or model.",
              `The user shops in ${market.country}. Use short useful names, ${market.priceGuidance}, retailer-friendly search terms suitable for that market, accessible color hex values, and exactly three genuinely different swap suggestions.`,
              "The description should explain the item's placement or role in one short sentence. Choose one fitting emoji for each item.",
            ].join(" "),
          },
          { type: "input_image", image_url: request.sourceImageDataUrl, detail: "low" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "design_inventory",
        strict: true,
        schema: inventoryJsonSchema,
      },
    },
  });
  let lastError: RedesignServiceError | null = null;

  for (let attempt = 0; attempt <= INVENTORY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
        signal: AbortSignal.timeout(INVENTORY_ATTEMPT_TIMEOUT_MS),
      });

      if (response.ok) return (await response.json()) as OpenAIInventoryResponse;

      const message = await response.text();
      const retryable = TRANSIENT_UPSTREAM_STATUSES.has(response.status);
      console.error("OpenAI inventory analysis failed", response.status, message.slice(0, 500));
      lastError = new RedesignServiceError(
        "Shopping details are temporarily unavailable.",
        retryable ? "INVENTORY_SERVICE_BUSY" : "INVENTORY_SERVICE_REJECTED",
        retryable
      );
    } catch (error) {
      lastError = normalizeInventoryError(error);
      console.error("OpenAI inventory request failed", error);
    }

    if (!lastError.retryable || attempt >= INVENTORY_RETRY_DELAYS_MS.length) throw lastError;
    await wait(INVENTORY_RETRY_DELAYS_MS[attempt]!);
  }

  throw lastError ?? normalizeRedesignError(null);
}

export async function identifyDesignItems(request: DesignInventoryRequest): Promise<DesignItem[]> {
  const result = await requestInventory(request);
  const text = extractInventoryText(result);
  if (!text) {
    console.error("OpenAI inventory response contained no output text");
    throw new RedesignServiceError(
      "Shopping details are temporarily unavailable.",
      "INVALID_INVENTORY_RESULT",
      true
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    console.error("OpenAI inventory response was invalid JSON", error);
    throw new RedesignServiceError(
      "Shopping details are temporarily unavailable.",
      "INVALID_INVENTORY_RESULT",
      true
    );
  }

  const parsed = designInventorySchema.safeParse(json);
  if (!parsed.success) {
    console.error("OpenAI inventory response failed validation", parsed.error.issues);
    throw new RedesignServiceError(
      "Shopping details are temporarily unavailable.",
      "INVALID_INVENTORY_RESULT",
      true
    );
  }
  return parsed.data.items;
}
