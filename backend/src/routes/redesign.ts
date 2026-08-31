import { Hono } from "hono";
import { env } from "../env";
import {
  designInventorySchema,
  redesignRoomRequestSchema,
  type DesignItem,
  type RedesignRoomRequest,
  type RedesignRoomResult,
  type RoomStyle,
  type RoomType,
} from "../types";

const redesignRouter = new Hono();

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

const roomNames: Record<RoomType, string> = {
  "living-room": "living room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  "dining-room": "dining room",
  "home-office": "home office",
  bathroom: "bathroom",
  "children-room": "children's room",
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

function dataUrlToFile(dataUrl: string): File | null {
  const match = dataUrl.match(
    /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\r\n]+)$/
  );
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2]?.replace(/\s/g, "");
  if (!mimeType || !base64) return null;

  try {
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0) return null;

    const extension = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpg" : mimeType.split("/")[1];
    return new File([bytes], `room.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}

async function readOpenAIResponse(response: Response): Promise<OpenAIImageEditResponse> {
  try {
    return (await response.json()) as OpenAIImageEditResponse;
  } catch {
    return {};
  }
}

function createImageEditForm(imageFile: File, prompt: string): FormData {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "auto");
  formData.append("quality", "high");
  formData.append("output_format", "jpeg");
  formData.append("output_compression", "85");
  formData.append("input_fidelity", "high");
  return formData;
}

async function requestImageEdit(imageFile: File, prompt: string): Promise<Response> {
  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: createImageEditForm(imageFile, prompt),
  });
}

function extractInventoryText(result: OpenAIInventoryResponse): string | undefined {
  if (result.output_text) return result.output_text;
  return result.output
    ?.flatMap((output) => output.content ?? [])
    .find((content) => content.type === "output_text" && content.text)
    ?.text;
}

async function identifyDesignItems(
  imageDataUrl: string,
  request: RedesignRoomRequest
): Promise<DesignItem[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.2",
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
                "Use short useful names, realistic broad UK price ranges such as £300–£700, retailer-friendly search terms, accessible color hex values, and exactly three genuinely different swap suggestions.",
                "The description should explain the item's placement or role in one short sentence. Choose one fitting emoji for each item.",
              ].join(" "),
            },
            { type: "input_image", image_url: imageDataUrl },
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
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("OpenAI inventory analysis failed", response.status, message.slice(0, 500));
    return [];
  }

  const result = (await response.json()) as OpenAIInventoryResponse;
  const text = extractInventoryText(result);
  if (!text) return [];

  try {
    const parsed = designInventorySchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("OpenAI inventory response failed validation", parsed.error.issues);
      return [];
    }
    return parsed.data.items;
  } catch (error) {
    console.error("OpenAI inventory response was invalid JSON", error);
    return [];
  }
}

redesignRouter.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { message: "Request body must be valid JSON", code: "INVALID_JSON" } },
      400
    );
  }

  const parsed = redesignRoomRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          message: parsed.error.issues[0]?.message ?? "Invalid redesign request",
          code: "INVALID_REQUEST",
        },
      },
      400
    );
  }

  const imageFile = dataUrlToFile(parsed.data.sourceImageDataUrl);
  if (!imageFile) {
    return c.json(
      { error: { message: "The room image could not be decoded", code: "INVALID_IMAGE" } },
      400
    );
  }

  const revisedPrompt = createInteriorPrompt(parsed.data);

  try {
    let response = await requestImageEdit(imageFile, revisedPrompt);
    let result = await readOpenAIResponse(response);

    if (response.status >= 500) {
      await Bun.sleep(600);
      response = await requestImageEdit(imageFile, revisedPrompt);
      result = await readOpenAIResponse(response);
    }

    if (!response.ok) {
      console.error("OpenAI image edit failed", response.status, result.error?.message);
      return c.json(
        {
          error: {
            message: "The image redesign service could not complete the request",
            code: "IMAGE_EDIT_FAILED",
          },
        },
        502
      );
    }

    const image = result.data?.[0];
    let imageDataUrl: string | undefined;

    if (image?.b64_json) {
      imageDataUrl = `data:image/jpeg;base64,${image.b64_json}`;
    } else if (image?.url) {
      const imageResponse = await fetch(image.url);
      if (imageResponse.ok) {
        const contentType = imageResponse.headers.get("content-type") ?? "image/png";
        const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
        imageDataUrl = `data:${contentType};base64,${imageBytes.toString("base64")}`;
      }
    }

    if (!imageDataUrl) {
      console.error("OpenAI image edit returned no usable image");
      return c.json(
        {
          error: {
            message: "The image redesign service returned an invalid result",
            code: "INVALID_IMAGE_RESULT",
          },
        },
        502
      );
    }

    const items = await identifyDesignItems(imageDataUrl, parsed.data);
    const data: RedesignRoomResult = { imageDataUrl, revisedPrompt, items };
    return c.json({ data });
  } catch (error) {
    console.error("Unexpected redesign error", error);
    return c.json(
      {
        error: {
          message: "The image redesign service is temporarily unavailable",
          code: "IMAGE_SERVICE_UNAVAILABLE",
        },
      },
      502
    );
  }
});

export { redesignRouter };
