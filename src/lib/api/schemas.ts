import { z } from "zod";

const nullableText = z.string().trim().max(500).nullable().optional();
const tripNameSchema = z.string().trim().min(1).max(200);
const currencySchema = z.enum(["EUR", "BRL", "USD", "GBP"]);
const travelersCountSchema = z.int().positive().max(100);
const visibilitySchema = z.enum(["private", "unlisted", "public"]);
const placeNameSchema = z.string().trim().min(1).max(200);
const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const nightlyCostSchema = z
  .number()
  .nonnegative()
  .max(9_999_999_999.99);
const nightsSchema = z.int().nonnegative().max(3650);
const notesSchema = z.string().trim().max(5000).nullable().optional();

export const createTripSchema = z.object({
  name: tripNameSchema,
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  currency: currencySchema.default("EUR"),
  travelersCount: travelersCountSchema.default(1),
  visibility: visibilitySchema.default("private"),
});

export const updateTripSchema = z
  .object({
    name: tripNameSchema.optional(),
    currency: currencySchema.optional(),
    travelersCount: travelersCountSchema.optional(),
    visibility: visibilitySchema.optional(),
  })
  .extend({ regenerateShareToken: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0);

export const createStopSchema = z.object({
  position: z.int().min(0).max(49),
  placeName: placeNameSchema,
  country: nullableText,
  region: nullableText,
  formattedAddress: nullableText,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  nightlyCost: nightlyCostSchema.default(0),
  nights: nightsSchema.default(0),
  notes: notesSchema,
});

export const updateStopSchema = z
  .object({
    placeName: placeNameSchema.optional(),
    country: nullableText,
    region: nullableText,
    formattedAddress: nullableText,
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    nightlyCost: nightlyCostSchema.optional(),
    nights: nightsSchema.optional(),
    notes: notesSchema,
  })
  .refine((value) => Object.keys(value).length > 0);

export const reorderStopsSchema = z.object({
  stopIds: z.array(z.uuid()).min(1).max(50).refine(
    (ids) => new Set(ids).size === ids.length,
    "IDs duplicados não são permitidos.",
  ),
});
