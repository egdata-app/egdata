import { z } from "zod";

export const technologyCategorySchema = z.enum([
  "engine",
  "graphics",
  "audio",
  "physics",
  "networking",
  "anti_cheat",
  "runtime",
  "framework",
  "middleware",
  "platform_service",
  "tooling",
  "file_format",
  "other",
]);

export const technologySourceSchema = z.strictObject({
  title: z.string().min(2).max(200),
  url: z.string().url().max(2_048),
  kind: z.enum(["official", "documentation", "repository", "secondary"]),
});

export const technologyProfileSchema = z.strictObject({
  displayName: z.string().min(2).max(120),
  summary: z.string().min(40).max(1_200),
  vendor: z.string().min(2).max(120).nullable(),
  category: technologyCategorySchema,
  officialUrl: z.string().url().max(2_048).nullable(),
  aliases: z.array(z.string().min(1).max(80)).max(12),
  confidence: z.enum(["medium", "high"]),
});

export const technologyResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("ready"),
    id: z.string().min(1).max(128),
    profile: technologyProfileSchema,
    sources: z.array(technologySourceSchema).min(2).max(8),
    generatedAt: z.string().datetime(),
    refreshAfter: z.string().datetime(),
    stale: z.boolean(),
  }),
  z.strictObject({
    status: z.literal("unresolved"),
    id: z.string().min(1).max(128),
    reason: z.enum(["ambiguous", "unknown", "insufficient_sources"]),
    generatedAt: z.string().datetime(),
    refreshAfter: z.string().datetime(),
    stale: z.boolean(),
  }),
  z.strictObject({
    status: z.literal("pending"),
    id: z.string().min(1).max(128),
    retryAfterMs: z.number().int().positive(),
  }),
  z.strictObject({
    status: z.literal("failed"),
    id: z.string().min(1).max(128),
    retryable: z.boolean(),
  }),
]);

export type TechnologyCategory = z.infer<typeof technologyCategorySchema>;
export type TechnologyResponse = z.infer<typeof technologyResponseSchema>;
