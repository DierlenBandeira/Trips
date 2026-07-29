import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url("SUPABASE_URL deve ser uma URL válida."),
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, "SUPABASE_SECRET_KEY é obrigatória."),
  GEOCODING_BASE_URL: z
    .url("GEOCODING_BASE_URL deve ser uma URL válida.")
    .default("https://photon.komoot.io"),
  ROUTING_BASE_URL: z
    .url("ROUTING_BASE_URL deve ser uma URL válida.")
    .default("https://router.project-osrm.org"),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    GEOCODING_BASE_URL: process.env.GEOCODING_BASE_URL,
    ROUTING_BASE_URL: process.env.ROUTING_BASE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Configuração do servidor incompleta: ${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data;
}
