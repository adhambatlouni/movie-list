import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateMovieInput,
  UpdateMovieInput,
} from "../schemas/movie.schema";
import type { Movie } from "../types";

const columns = "id, title, notes, watched, created_at";

export const listMovies = async (): Promise<Movie[]> => {
  const { data, error } = await createSupabaseServerClient()
    .from("movies")
    .select(columns)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error("Failed to list movies.", { cause: error });
  return data;
};

export const createMovie = async (input: CreateMovieInput): Promise<Movie> => {
  const { data, error } = await createSupabaseServerClient()
    .from("movies")
    .insert({ title: input.title, notes: input.notes })
    .select(columns)
    .single();

  if (error) throw new Error("Failed to create movie.", { cause: error });
  return data;
};

export const updateMovie = async (
  id: string,
  input: UpdateMovieInput,
): Promise<Movie | null> => {
  const { data, error } = await createSupabaseServerClient()
    .from("movies")
    .update({ watched: input.watched })
    .eq("id", id)
    .select(columns)
    .maybeSingle();

  if (error) throw new Error("Failed to update movie.", { cause: error });
  return data;
};

export const deleteMovie = async (id: string): Promise<boolean> => {
  const { data, error } = await createSupabaseServerClient()
    .from("movies")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("Failed to delete movie.", { cause: error });
  return data !== null;
};
