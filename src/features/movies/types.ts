import type { Database } from "@/lib/supabase/database.types";

/** A persisted movie, as returned by the movies API. */
export type Movie = Database["public"]["Tables"]["movies"]["Row"];
