import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const createSupabaseServerClient = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  // Validate when the client is used, so a build needs no database credentials.
  if (!url || !secretKey) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local before accessing the database.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS project URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS project URL.");
  }

  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY must be a secret key (sb_secret_...) from Supabase Settings > API Keys.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Every database read should reflect the latest persisted changes.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
};
