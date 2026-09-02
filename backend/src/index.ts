import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth, type AppEnv } from "./auth";
import { env } from "./env";
import { designAccessRouter } from "./routes/design-access";
import { foldersRouter } from "./routes/folders";
import { projectsRouter } from "./routes/projects";
import { redesignRouter } from "./routes/redesign";
import { sampleRouter } from "./routes/sample";
import { logger } from "hono/logger";

const app = new Hono<AppEnv>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^vibecode:\/\//,
  /^exp:\/\//,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Resolve the authenticated user for every app request.
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/design-access", designAccessRouter);
app.route("/api/redesign", redesignRouter);
app.route("/api/folders", foldersRouter);
app.route("/api/projects", projectsRouter);

const port = Number(env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
