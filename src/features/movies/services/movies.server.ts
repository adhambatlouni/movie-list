import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CreateMovieInput,
  UpdateMovieInput,
} from "../schemas/movie.schema";
import type { Movie, MoviePage } from "../types";
import { MOVIES_PAGE_SIZE, type MovieListInput } from "../schemas/movie.schema";

const columns = "id, title, notes, watched, created_at";

export const listMovies = async ({
  q,
  page,
}: MovieListInput): Promise<MoviePage> => {
  const db = createSupabaseServerClient();
  // Escape regex characters so title search treats punctuation literally.
  const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let countQuery = db
    .from("movies")
    .select("id", { count: "exact", head: true });
  if (q) countQuery = countQuery.filter("title", "imatch", pattern);
  const { count, error: countError } = await countQuery;
  if (countError)
    throw new Error("Failed to count movies.", { cause: countError });

  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / MOVIES_PAGE_SIZE));
  page = Math.min(page, lastPage);
  if (total === 0)
    return { movies: [], total, page, pageSize: MOVIES_PAGE_SIZE };

  let query = db.from("movies").select(columns);
  if (q) query = query.filter("title", "imatch", pattern);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * MOVIES_PAGE_SIZE, page * MOVIES_PAGE_SIZE - 1);
  if (error) throw new Error("Failed to list movies.", { cause: error });
  return { movies: data, total, page, pageSize: MOVIES_PAGE_SIZE };
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
