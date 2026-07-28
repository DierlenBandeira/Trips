"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Configuração pública do Supabase ausente.");
  }

  return createClient<Database>(url, key);
}
