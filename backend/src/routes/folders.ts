import { Prisma } from "@prisma/client";
import { Hono, type Context } from "hono";

import type { AppEnv } from "../auth";
import { prisma } from "../prisma";
import {
  createFolderRequestSchema,
  updateFolderRequestSchema,
  type FolderResponse,
} from "../types";

const foldersRouter = new Hono<AppEnv>();

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { message: "Please sign in to access your folders.", code: "UNAUTHORIZED" } }, 401);
}

function serializeFolder(folder: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { projects: number };
}): FolderResponse {
  return {
    id: folder.id,
    name: folder.name,
    projectCount: folder._count.projects,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

async function parseFolderBody(c: Context<AppEnv>, mode: "create" | "update") {
  const body = await c.req.json().catch(() => null);
  return (mode === "create" ? createFolderRequestSchema : updateFolderRequestSchema).safeParse(body);
}

foldersRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const folders = await prisma.folder.findMany({
    where: { userId: user.id },
    include: { _count: { select: { projects: true } } },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });

  return c.json({ data: folders.map(serializeFolder) });
});

foldersRouter.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const folder = await prisma.folder.findFirst({
    where: { id: c.req.param("id"), userId: user.id },
    include: { _count: { select: { projects: true } } },
  });
  if (!folder) return c.json({ error: { message: "Folder not found.", code: "NOT_FOUND" } }, 404);

  return c.json({ data: serializeFolder(folder) });
});

foldersRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const parsed = await parseFolderBody(c, "create");
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid folder.", code: "INVALID_REQUEST" } }, 400);
  }

  if (parsed.data.clientRequestId) {
    const existingRequest = await prisma.folder.findFirst({
      where: { userId: user.id, id: parsed.data.clientRequestId },
      include: { _count: { select: { projects: true } } },
    });
    if (existingRequest) return c.json({ data: serializeFolder(existingRequest) });
  }

  try {
    const folder = await prisma.folder.create({
      data: { id: parsed.data.clientRequestId, userId: user.id, name: parsed.data.name },
      include: { _count: { select: { projects: true } } },
    });
    return c.json({ data: serializeFolder(folder) }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (parsed.data.clientRequestId) {
        const existingRequest = await prisma.folder.findFirst({
          where: { userId: user.id, id: parsed.data.clientRequestId },
          include: { _count: { select: { projects: true } } },
        });
        if (existingRequest) return c.json({ data: serializeFolder(existingRequest) });
      }
      return c.json({ error: { message: "A folder with this name already exists.", code: "FOLDER_NAME_TAKEN" } }, 409);
    }
    throw error;
  }
});

foldersRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const existing = await prisma.folder.findFirst({ where: { id: c.req.param("id"), userId: user.id } });
  if (!existing) return c.json({ error: { message: "Folder not found.", code: "NOT_FOUND" } }, 404);

  const parsed = await parseFolderBody(c, "update");
  if (!parsed.success) {
    return c.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid folder.", code: "INVALID_REQUEST" } }, 400);
  }

  try {
    const folder = await prisma.folder.update({
      where: { id: existing.id },
      data: { name: parsed.data.name },
      include: { _count: { select: { projects: true } } },
    });
    return c.json({ data: serializeFolder(folder) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return c.json({ error: { message: "A folder with this name already exists.", code: "FOLDER_NAME_TAKEN" } }, 409);
    }
    throw error;
  }
});

foldersRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  const existing = await prisma.folder.findFirst({ where: { id: c.req.param("id"), userId: user.id } });
  if (!existing) return c.json({ error: { message: "Folder not found.", code: "NOT_FOUND" } }, 404);

  await prisma.$transaction([
    prisma.project.updateMany({ where: { folderId: existing.id, userId: user.id }, data: { folderId: null } }),
    prisma.folder.delete({ where: { id: existing.id } }),
  ]);

  return c.body(null, 204);
});

export { foldersRouter };
