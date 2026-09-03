import { Prisma } from "@prisma/client";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";

import type { AppEnv } from "../auth";
import { prisma } from "../prisma";
import {
  appendProjectVersionRequestSchema,
  saveProjectRequestSchema,
  updateProjectRequestSchema,
  updateProjectVersionItemsRequestSchema,
  type DesignItem,
  type ProjectDetailResponse,
  type ProjectSummaryResponse,
  type ProjectVersionResponse,
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
  file: StoredFile;
}

type VersionRecord = {
  id: string;
  projectId: string;
  number: number;
  sourceImageUrl: string;
  imageUrl: string;
  revisedPrompt: string;
  itemsJson: string;
  shoppingCountry: string;
  style: string;
  roomType: string;
  baseVersionId: string | null;
  refinement: string | null;
  createdAt: Date;
};

type ProjectRecord = {
  id: string;
  title: string;
  folder: { id: string; name: string } | null;
  versions: VersionRecord[];
  _count: { versions: number };
  createdAt: Date;
  updatedAt: Date;
};

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
  return result.file;
}

async function deleteStoredFile(fileId: string) {
  const response = await fetch(`https://storage.vibecodeapp.com/v1/files/${fileId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Storage cleanup failed (${response.status})`);
}

async function cleanupStoredFiles(fileIds: string[]) {
  const uniqueFileIds = [...new Set(fileIds)];
  const results = await Promise.allSettled(uniqueFileIds.map(deleteStoredFile));
  for (const result of results) {
    if (result.status === "rejected") console.error("Stored image cleanup failed", result.reason);
  }
}

function serializeVersion(version: VersionRecord): ProjectVersionResponse {
  return {
    id: version.id,
    projectId: version.projectId,
    number: version.number,
    sourceImageUrl: version.sourceImageUrl,
    imageUrl: version.imageUrl,
    revisedPrompt: version.revisedPrompt,
    items: JSON.parse(version.itemsJson) as DesignItem[],
    shoppingCountry: version.shoppingCountry as ShoppingCountry,
    style: version.style as RoomStyle,
    roomType: version.roomType as RoomType,
    baseVersionId: version.baseVersionId,
    refinement: version.refinement,
    createdAt: version.createdAt.toISOString(),
  };
}

function serializeSummary(project: ProjectRecord): ProjectSummaryResponse {
  const latestVersion = project.versions[0];
  if (!latestVersion) throw new Error(`Project ${project.id} has no versions`);

  return {
    id: project.id,
    title: project.title,
    folder: project.folder,
    latestVersion: {
      id: latestVersion.id,
      number: latestVersion.number,
      imageUrl: latestVersion.imageUrl,
      createdAt: latestVersion.createdAt.toISOString(),
    },
    versionCount: project._count.versions,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function serializeDetail(project: ProjectRecord): ProjectDetailResponse {
  const versions = [...project.versions].sort((left, right) => left.number - right.number);
  const latestVersion = versions.at(-1);
  if (!latestVersion) throw new Error(`Project ${project.id} has no versions`);

  return {
    id: project.id,
    title: project.title,
    folder: project.folder,
    latestVersion: {
      id: latestVersion.id,
      number: latestVersion.number,
      imageUrl: latestVersion.imageUrl,
      createdAt: latestVersion.createdAt.toISOString(),
    },
    versionCount: project._count.versions,
    versions: versions.map(serializeVersion),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

async function folderBelongsToUser(folderId: string, userId: string) {
  return prisma.folder.findFirst({ where: { id: folderId, userId }, select: { id: true } });
}

async function findProjectByClientRequestId(clientRequestId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: clientRequestId, userId },
    include: {
      folder: { select: { id: true, name: true } },
      versions: { orderBy: { number: "asc" } },
      _count: { select: { versions: true } },
    },
  });
}

projectsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      folder: { select: { id: true, name: true } },
      versions: { orderBy: { number: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return c.json({ data: projects.map(serializeSummary) });
});

projectsRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const project = await prisma.project.findFirst({
    where: { id: c.req.param("id"), userId: user.id },
    include: {
      folder: { select: { id: true, name: true } },
      versions: { orderBy: { number: "asc" } },
      _count: { select: { versions: true } },
    },
  });
  if (!project) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  return c.json({ data: serializeDetail(project) });
});

projectsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const body = await c.req.json().catch(() => null);
  const parsed = saveProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid project.", code: "INVALID_REQUEST" } }, 400);
  }

  if (parsed.data.clientRequestId) {
    const existingRequest = await findProjectByClientRequestId(parsed.data.clientRequestId, user.id);
    if (existingRequest) return c.json({ data: serializeDetail(existingRequest) });
  }

  if (parsed.data.folderId && !(await folderBelongsToUser(parsed.data.folderId, user.id))) {
    return c.json({ error: { message: "Folder not found.", code: "INVALID_FOLDER" } }, 400);
  }

  let sourceFile: StoredFile | null = null;
  let generatedFile: StoredFile | null = null;
  try {
    const uploadTimestamp = Date.now();
    const [sourceUpload, generatedUpload] = await Promise.allSettled([
      uploadImage(parsed.data.sourceImageDataUrl, `interi-source-${uploadTimestamp}.jpg`),
      uploadImage(parsed.data.imageDataUrl, `interi-design-${uploadTimestamp}.jpg`),
    ]);
    if (sourceUpload.status === "fulfilled") sourceFile = sourceUpload.value;
    if (generatedUpload.status === "fulfilled") generatedFile = generatedUpload.value;
    if (sourceUpload.status === "rejected") throw sourceUpload.reason;
    if (generatedUpload.status === "rejected") throw generatedUpload.reason;

    const designData = {
      sourceImageUrl: sourceFile!.url,
      sourceImageFileId: sourceFile!.id,
      imageUrl: generatedFile!.url,
      imageFileId: generatedFile!.id,
      revisedPrompt: parsed.data.revisedPrompt,
      itemsJson: JSON.stringify(parsed.data.items),
      shoppingCountry: parsed.data.shoppingCountry,
      style: parsed.data.style,
      roomType: parsed.data.roomType,
    };

    const project = await prisma.project.create({
      data: {
        id: parsed.data.clientRequestId,
        userId: user.id,
        folderId: parsed.data.folderId ?? null,
        title: parsed.data.title,
        ...designData,
        versions: { create: { id: parsed.data.clientRequestId ? `${parsed.data.clientRequestId}-v1` : undefined, number: 1, ...designData } },
      },
      include: {
        folder: { select: { id: true, name: true } },
        versions: { orderBy: { number: "asc" } },
        _count: { select: { versions: true } },
      },
    });

    return c.json({ data: serializeDetail(project) }, 201);
  } catch (error) {
    await cleanupStoredFiles([sourceFile?.id, generatedFile?.id].filter((id): id is string => !!id));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && parsed.data.clientRequestId) {
      const existingRequest = await findProjectByClientRequestId(parsed.data.clientRequestId, user.id);
      if (existingRequest) return c.json({ data: serializeDetail(existingRequest) });
    }
    console.error("Project save failed", error);
    return c.json({ error: { message: "We could not save this project. Please try again.", code: "PROJECT_SAVE_FAILED" } }, 502);
  }
});

projectsRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const existing = await prisma.project.findFirst({ where: { id: c.req.param("id"), userId: user.id }, select: { id: true } });
  if (!existing) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid project update.", code: "INVALID_REQUEST" } }, 400);
  }

  if (parsed.data.folderId && !(await folderBelongsToUser(parsed.data.folderId, user.id))) {
    return c.json({ error: { message: "Folder not found.", code: "INVALID_FOLDER" } }, 400);
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.folderId !== undefined ? { folderId: parsed.data.folderId } : {}),
    },
    include: {
      folder: { select: { id: true, name: true } },
      versions: { orderBy: { number: "asc" } },
      _count: { select: { versions: true } },
    },
  });

  return c.json({ data: serializeDetail(project) });
});

projectsRouter.post("/:id/versions", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const project = await prisma.project.findFirst({ where: { id: c.req.param("id"), userId: user.id }, select: { id: true } });
  if (!project) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = appendProjectVersionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid project version.", code: "INVALID_REQUEST" } }, 400);
  }

  if (parsed.data.clientRequestId) {
    const existingRequest = await prisma.projectVersion.findFirst({
      where: { projectId: project.id, id: parsed.data.clientRequestId },
    });
    if (existingRequest) return c.json({ data: serializeVersion(existingRequest) });
  }

  if (parsed.data.baseVersionId) {
    const baseVersion = await prisma.projectVersion.findFirst({
      where: { id: parsed.data.baseVersionId, projectId: project.id, project: { userId: user.id } },
      select: { id: true },
    });
    if (!baseVersion) {
      return c.json({ error: { message: "Base version not found in this project.", code: "INVALID_BASE_VERSION" } }, 400);
    }
  }

  let sourceFile: StoredFile | null = null;
  let generatedFile: StoredFile | null = null;
  try {
    const uploadTimestamp = Date.now();
    const [sourceUpload, generatedUpload] = await Promise.allSettled([
      uploadImage(parsed.data.sourceImageDataUrl, `interi-source-${uploadTimestamp}.jpg`),
      uploadImage(parsed.data.imageDataUrl, `interi-design-${uploadTimestamp}.jpg`),
    ]);
    if (sourceUpload.status === "fulfilled") sourceFile = sourceUpload.value;
    if (generatedUpload.status === "fulfilled") generatedFile = generatedUpload.value;
    if (sourceUpload.status === "rejected") throw sourceUpload.reason;
    if (generatedUpload.status === "rejected") throw generatedUpload.reason;

    const versionId = parsed.data.clientRequestId ?? crypto.randomUUID();
    let createdVersion: VersionRecord | null = null;
    for (let attempt = 0; attempt < 3 && !createdVersion; attempt += 1) {
      try {
        createdVersion = await prisma.$transaction(async (tx) => {
          const latest = await tx.projectVersion.aggregate({ where: { projectId: project.id }, _max: { number: true } });
          const version = await tx.projectVersion.create({
            data: {
              id: versionId,
              projectId: project.id,
              number: (latest._max.number ?? 0) + 1,
              sourceImageUrl: sourceFile!.url,
              sourceImageFileId: sourceFile!.id,
              imageUrl: generatedFile!.url,
              imageFileId: generatedFile!.id,
              revisedPrompt: parsed.data.revisedPrompt,
              itemsJson: JSON.stringify(parsed.data.items),
              shoppingCountry: parsed.data.shoppingCountry,
              style: parsed.data.style,
              roomType: parsed.data.roomType,
              baseVersionId: parsed.data.baseVersionId ?? null,
              refinement: parsed.data.refinement ?? null,
            },
          });
          await tx.project.update({ where: { id: project.id }, data: { updatedAt: new Date() } });
          return version;
        });
      } catch (error) {
        const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
        const retriable = code === "P2002" || code === "P1008" || code === "P2028" || code === "P2034";
        if (!retriable) throw error;

        const committedVersion = await prisma.projectVersion.findUnique({ where: { id: versionId } }).catch(() => null);
        if (committedVersion) {
          createdVersion = committedVersion;
          break;
        }
        if (attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 75 * (attempt + 1)));
      }
    }

    if (!createdVersion) throw new Error("Version numbering failed");
    return c.json({ data: serializeVersion(createdVersion) }, 201);
  } catch (error) {
    await cleanupStoredFiles([sourceFile?.id, generatedFile?.id].filter((id): id is string => !!id));
    console.error("Project version save failed", error);
    return c.json({ error: { message: "We could not save this project version. Please try again.", code: "VERSION_SAVE_FAILED" } }, 502);
  }
});

projectsRouter.patch("/:id/versions/:versionId/items", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const version = await prisma.projectVersion.findFirst({
    where: {
      id: c.req.param("versionId"),
      projectId: c.req.param("id"),
      project: { userId: user.id },
    },
    select: { id: true },
  });
  if (!version) return c.json({ error: { message: "Project version not found.", code: "NOT_FOUND" } }, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateProjectVersionItemsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid design items.", code: "INVALID_REQUEST" } }, 400);
  }

  const updated = await prisma.projectVersion.update({
    where: { id: version.id },
    data: { itemsJson: JSON.stringify(parsed.data.items) },
  });

  return c.json({ data: serializeVersion(updated) });
});

projectsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const project = await prisma.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: { id: c.req.param("id"), userId: user.id },
      select: {
        id: true,
        sourceImageFileId: true,
        imageFileId: true,
        versions: { select: { sourceImageFileId: true, imageFileId: true } },
      },
    });
    if (!existing) return null;
    await tx.project.delete({ where: { id: existing.id } });
    return existing;
  });
  if (!project) return c.json({ error: { message: "Project not found.", code: "NOT_FOUND" } }, 404);

  await cleanupStoredFiles([
    project.sourceImageFileId,
    project.imageFileId,
    ...project.versions.flatMap((version) => [version.sourceImageFileId, version.imageFileId]),
  ]);
  return c.body(null, 204);
});

export { projectsRouter };
