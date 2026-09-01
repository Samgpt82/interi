import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { AppEnv } from "../auth";
import { prisma } from "../prisma";
import {
  saveProjectRequestSchema,
  updateProjectRequestSchema,
  type DesignItem,
  type ProjectResponse,
  type RoomStyle,
  type RoomType,
  type ShoppingCountry,
} from "../types";

const projectsRouter = new Hono<AppEnv>();

projectsRouter.use(
  "*",
  bodyLimit({
    maxSize: 34 * 1024 * 1024,
    onError: (c) => c.json({ error: { message: "Project images are too large.", code: "PAYLOAD_TOO_LARGE" } }, 413),
  }),
);

interface StoredFile {
  id: string;
  url: string;
}

interface StorageUploadResponse {
  file: {
    id: string;
    url: string;
  };
}

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { message: "Please sign in to access your projects.", code: "UNAUTHORIZED" } }, 401);
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");
  return { contentType: match[1]!, bytes: Buffer.from(match[2]!, "base64") };
}

async function uploadImage(dataUrl: string, filename: string): Promise<StoredFile> {
  const { contentType, bytes } = parseDataUrl(dataUrl);
  const formData = new FormData();
  formData.append("file", new File([bytes], filename, { type: contentType }));

  const response = await fetch("https://storage.vibecodeapp.com/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => null)) as StorageUploadResponse | { error?: string } | null;
  if (!response.ok || !result || !("file" in result)) {
    throw new Error(result && "error" in result ? result.error ?? "Image upload failed" : "Image upload failed");
  }
  return { id: result.file.id, url: result.file.url };
}

async function deleteStoredFile(fileId: string) {
  const response = await fetch(`https://storage.vibecodeapp.com/v1/files/${fileId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Storage cleanup failed (${response.status})`);
}

async function cleanupStoredFiles(fileIds: string[]) {
  const results = await Promise.allSettled(fileIds.map(deleteStoredFile));
  for (const result of results) {
    if (result.status === "rejected") console.error("Stored image cleanup failed", result.reason);
  }
}

function serializeProject(project: {
  id: string;
  title: string;
  sourceImageUrl: string;
  imageUrl: string;
  revisedPrompt: string;
  itemsJson: string;
  shoppingCountry: string;
  style: string;
  roomType: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectResponse {
  return {
    id: project.id,
    title: project.title,
    sourceImageUrl: project.sourceImageUrl,
    imageUrl: project.imageUrl,
    revisedPrompt: project.revisedPrompt,
    items: JSON.parse(project.itemsJson) as DesignItem[],
    shoppingCountry: project.shoppingCountry as ShoppingCountry,
    style: project.style as RoomStyle,
    roomType: project.roomType as RoomType,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

async function readProjectBody(c: Context<AppEnv>, mode: "create" | "update") {
  const body = await c.req.json().catch(() => null);
  return mode === "create" ? saveProjectRequestSchema.safeParse(body) : updateProjectRequestSchema.safeParse(body);
}

projectsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return c.json({ data: projects.map(serializeProject) });
});

projectsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const project = await prisma.project.findFirst({ where: { id: c.req.param("id"), userId: user.id } });
  if (!project) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);
  return c.json({ data: serializeProject(project) });
});

projectsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const parsed = await readProjectBody(c, "create");
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid project.", code: "INVALID_REQUEST" } }, 400);
  }

  let sourceFile: StoredFile | null = null;
  let generatedFile: StoredFile | null = null;
  try {
    sourceFile = await uploadImage(parsed.data.sourceImageDataUrl, `interi-source-${Date.now()}.jpg`);
    generatedFile = await uploadImage(parsed.data.imageDataUrl, `interi-design-${Date.now()}.jpg`);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        style: parsed.data.style,
        roomType: parsed.data.roomType,
        shoppingCountry: parsed.data.shoppingCountry,
        revisedPrompt: parsed.data.revisedPrompt,
        itemsJson: JSON.stringify(parsed.data.items),
        sourceImageUrl: sourceFile.url,
        sourceImageFileId: sourceFile.id,
        imageUrl: generatedFile.url,
        imageFileId: generatedFile.id,
      },
    });
    return c.json({ data: serializeProject(project) }, 201);
  } catch (error) {
    await cleanupStoredFiles([sourceFile?.id, generatedFile?.id].filter((id): id is string => !!id));
    console.error("Project save failed", error);
    return c.json({ error: { message: "We could not save this project. Please try again.", code: "PROJECT_SAVE_FAILED" } }, 502);
  }
});

projectsRouter.put("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const existing = await prisma.project.findFirst({ where: { id: c.req.param("id"), userId: user.id } });
  if (!existing) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  const parsed = await readProjectBody(c, "update");
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid project.", code: "INVALID_REQUEST" } }, 400);
  }

  if (!parsed.data.sourceImageDataUrl.startsWith("data:") && parsed.data.sourceImageDataUrl !== existing.sourceImageUrl) {
    return c.json({ error: { message: "Invalid source image reference.", code: "INVALID_IMAGE" } }, 400);
  }
  if (!parsed.data.imageDataUrl.startsWith("data:") && parsed.data.imageDataUrl !== existing.imageUrl) {
    return c.json({ error: { message: "Invalid generated image reference.", code: "INVALID_IMAGE" } }, 400);
  }

  let sourceFile: StoredFile | null = null;
  let generatedFile: StoredFile | null = null;
  try {
    if (parsed.data.sourceImageDataUrl.startsWith("data:")) {
      sourceFile = await uploadImage(parsed.data.sourceImageDataUrl, `interi-source-${Date.now()}.jpg`);
    }
    if (parsed.data.imageDataUrl.startsWith("data:")) {
      generatedFile = await uploadImage(parsed.data.imageDataUrl, `interi-design-${Date.now()}.jpg`);
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        style: parsed.data.style,
        roomType: parsed.data.roomType,
        shoppingCountry: parsed.data.shoppingCountry,
        revisedPrompt: parsed.data.revisedPrompt,
        itemsJson: JSON.stringify(parsed.data.items),
        sourceImageUrl: sourceFile?.url ?? existing.sourceImageUrl,
        sourceImageFileId: sourceFile?.id ?? existing.sourceImageFileId,
        imageUrl: generatedFile?.url ?? existing.imageUrl,
        imageFileId: generatedFile?.id ?? existing.imageFileId,
      },
    });
    await cleanupStoredFiles([
      ...(sourceFile ? [existing.sourceImageFileId] : []),
      ...(generatedFile ? [existing.imageFileId] : []),
    ]);
    return c.json({ data: serializeProject(project) });
  } catch (error) {
    await cleanupStoredFiles([sourceFile?.id, generatedFile?.id].filter((id): id is string => !!id));
    console.error("Project update failed", error);
    return c.json({ error: { message: "We could not update this project. Please try again.", code: "PROJECT_UPDATE_FAILED" } }, 502);
  }
});

projectsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const project = await prisma.project.findFirst({ where: { id: c.req.param("id"), userId: user.id } });
  if (!project) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  await prisma.project.delete({ where: { id: project.id } });
  await cleanupStoredFiles([project.sourceImageFileId, project.imageFileId]);
  return c.body(null, 204);
});

export { projectsRouter };
