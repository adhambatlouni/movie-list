import type {
  CreateMovieInput,
  UpdateMovieInput,
} from "../schemas/movie.schema";
import type { Movie, MoviePage } from "../types";

type ValidationIssue = { path: string; message: string };

export class MovieApiError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "MovieApiError";
  }
}

const request = async <T>(path = "", options?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`/api/movies${path}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    // DOMException and cross-realm errors need not inherit this realm's Error.
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    )
      throw error;
    throw new MovieApiError(
      "Couldn’t connect. Check your connection and try again.",
    );
  }

  if (response.status === 204 && response.ok) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MovieApiError(
      body?.error?.message ?? "Couldn’t save your change. Please try again.",
      Array.isArray(body?.error?.issues) ? body.error.issues : [],
    );
  }
  if (body === null)
    throw new MovieApiError("Couldn’t read the response. Please try again.");
  return body as T;
};

export const fetchMovies = (
  params: { q: string; page: number },
  signal?: AbortSignal,
) => {
  const search = new URLSearchParams({
    q: params.q,
    page: String(params.page),
  });
  return request<MoviePage>(`?${search}`, { signal });
};

export const addMovie = (input: CreateMovieInput) => {
  return request<Movie>("", { method: "POST", body: JSON.stringify(input) });
};

export const setMovieWatched = (id: string, input: UpdateMovieInput) => {
  return request<Movie>(`/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

export const removeMovie = (id: string) => {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
};
