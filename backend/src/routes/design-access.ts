import { Hono, type Context } from "hono";

import type { AppEnv } from "../auth";
import { getDesignAccess } from "../lib/design-access";

const designAccessRouter = new Hono<AppEnv>();

function unauthorized(c: Context<AppEnv>) {
  return c.json({ error: { message: "Please sign in to create room designs.", code: "UNAUTHORIZED" } }, 401);
}

designAccessRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return unauthorized(c);

  return c.json({ data: await getDesignAccess(user.id) });
});

export { designAccessRouter };
