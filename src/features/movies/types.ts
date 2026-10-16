import type { Database } from "@/lib/supabase/database.types";

export type Movie = Database["public"]["Tables"]["movies"]["Row"];

export type MoviePage = {
  movies: Movie[];
  total: number;
  page: number;
  pageSize: number;
};
