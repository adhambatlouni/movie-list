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

export const fetchMovies = async (
  params: { q: string; page: number },
  signal?: AbortSignal,
): Promise<MoviePage> => {
  const search = new URLSearchParams({
    q: params.q,
    page: String(params.page),
  });

  let response: Response;
  try {
    response = await fetch(`/api/movies?${search}`, {
      method: "GET",
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new MovieApiError(
      "Couldn’t connect. Check your connection and try again.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MovieApiError(
      body?.error?.message ?? "Couldn’t save your change. Please try again.",
      Array.isArray(body?.error?.issues) ? body.error.issues : [],
    );
  }

  if (body === null) {
    throw new MovieApiError("Couldn’t read the response. Please try again.");
  }

  return body as MoviePage;
};

export const addMovie = async (input: CreateMovieInput): Promise<Movie> => {
  let response: Response;
  try {
    response = await fetch("/api/movies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new MovieApiError(
      "Couldn’t connect. Check your connection and try again.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MovieApiError(
      body?.error?.message ?? "Couldn’t save your change. Please try again.",
      Array.isArray(body?.error?.issues) ? body.error.issues : [],
    );
  }

  if (body === null) {
    throw new MovieApiError("Couldn’t read the response. Please try again.");
  }

  return body as Movie;
};

export const setMovieWatched = async (
  id: string,
  input: UpdateMovieInput,
): Promise<Movie> => {
  let response: Response;
  try {
    response = await fetch(`/api/movies/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new MovieApiError(
      "Couldn’t connect. Check your connection and try again.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MovieApiError(
      body?.error?.message ?? "Couldn’t save your change. Please try again.",
      Array.isArray(body?.error?.issues) ? body.error.issues : [],
    );
  }

  if (body === null) {
    throw new MovieApiError("Couldn’t read the response. Please try again.");
  }

  return body as Movie;
};

export const removeMovie = async (id: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(`/api/movies/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new MovieApiError(
      "Couldn’t connect. Check your connection and try again.",
    );
  }

  if (response.status === 204) return;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MovieApiError(
      body?.error?.message ?? "Couldn’t save your change. Please try again.",
      Array.isArray(body?.error?.issues) ? body.error.issues : [],
    );
  }

  if (body === null) {
    throw new MovieApiError("Couldn’t read the response. Please try again.");
  }
};
