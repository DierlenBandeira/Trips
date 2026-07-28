import { z } from "zod";

const nullableText = z.string().trim().max(500).nullable().optional();

export const createTripSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  currency: z.enum(["EUR", "BRL", "USD", "GBP"]).default("EUR"),
  travelersCount: z.int().positive().max(100).default(1),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
});

export const updateTripSchema = createTripSchema
  .omit({ slug: true })
  .partial()
  .extend({ regenerateShareToken: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0);

export const createStopSchema = z.object({
  position: z.int().nonnegative(),
  placeName: z.string().trim().min(1).max(200),
  country: nullableText,
  region: nullableText,
  formattedAddress: nullableText,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  nightlyCost: z.number().nonnegative().max(9_999_999_999.99).default(0),
  nights: z.int().nonnegative().max(3650).default(0),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const updateStopSchema = createStopSchema
  .omit({ position: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const reorderStopsSchema = z.object({
  stopIds: z.array(z.uuid()).min(1).max(500).refine(
    (ids) => new Set(ids).size === ids.length,
    "IDs duplicados não são permitidos.",
  ),
});
