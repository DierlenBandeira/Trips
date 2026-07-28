import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url("SUPABASE_URL deve ser uma URL válida."),
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, "SUPABASE_SECRET_KEY é obrigatória."),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Configuração do servidor incompleta: ${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data;
}
