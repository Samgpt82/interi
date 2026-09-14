import { z } from "zod";

/**
 * Environment variable schema using Zod
 * This ensures all required environment variables are present and valid
 */
const envSchema = z
  .object({
    // Server Configuration
    PORT: z.string().optional().default("3000"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Application services
    BACKEND_URL: z.string().url("BACKEND_URL must be a valid URL"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

    // Transactional email
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),

    // AI services
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

    // Subscription verification
    REVENUECAT_SECRET_API_KEY: z.string().min(1).optional(),
    REVENUECAT_ENTITLEMENT_ID: z.string().min(1).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== "production") {
      return;
    }

    if (!values.BACKEND_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["BACKEND_URL"],
        message: "BACKEND_URL must use HTTPS in production",
      });
    }

    let databaseUrl: URL | null = null;
    let directUrl: URL | null = null;

    try {
      databaseUrl = new URL(values.DATABASE_URL);
      if (databaseUrl.protocol !== "postgresql:") {
        throw new Error("invalid protocol");
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must be a valid PostgreSQL URL in production",
      });
    }

    try {
      directUrl = new URL(values.DIRECT_URL);
      if (directUrl.protocol !== "postgresql:") {
        throw new Error("invalid protocol");
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["DIRECT_URL"],
        message: "DIRECT_URL must be a valid PostgreSQL URL in production",
      });
    }

    if (databaseUrl && directUrl) {
      const normalizeHost = (hostname: string) => hostname.replace("-pooler.", ".");
      const databaseSchema = databaseUrl.searchParams.get("schema") ?? "public";
      const directSchema = directUrl.searchParams.get("schema") ?? "public";
      const targetsSameDatabase =
        normalizeHost(databaseUrl.hostname) === normalizeHost(directUrl.hostname) &&
        databaseUrl.username === directUrl.username &&
        databaseUrl.pathname === directUrl.pathname &&
        databaseSchema === directSchema;

      if (!targetsSameDatabase) {
        ctx.addIssue({
          code: "custom",
          path: ["DIRECT_URL"],
          message: "DIRECT_URL must target the same PostgreSQL database as DATABASE_URL",
        });
      }
    }

    for (const key of [
      "REVENUECAT_SECRET_API_KEY",
      "REVENUECAT_ENTITLEMENT_ID",
    ] as const) {
      if (!values[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((err: any) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\nPlease check your .env file and ensure all required variables are set.");
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 */
export const env = validateEnv();

/**
 * Type of the validated environment variables
 */
export type Env = z.infer<typeof envSchema>;
