import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  addMovie,
  fetchMovies,
  MovieApiError,
  removeMovie,
  setMovieWatched,
} from "./movies-api";
import type { Movie } from "../types";

const movie: Movie = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Arrival",
  notes: null,
  watched: false,
  created_at: "2026-10-15T12:00:00Z",
};

let fetchMock: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected request"));
});

describe("movie browser API client", () => {
  it("fetches the list without HTTP caching and forwards query cancellation", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ movies: [movie], total: 1, page: 2, pageSize: 5 }),
    );

    const controller = new AbortController();
    expect(
      await fetchMovies({ q: "Arrival", page: 2 }, controller.signal),
    ).toEqual({ movies: [movie], total: 1, page: 2, pageSize: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/movies?q=Arrival&page=2",
      expect.objectContaining({
        signal: controller.signal,
        cache: "no-store",
      }),
    );
  });

  it("sends creation JSON and returns the server-generated movie", async () => {
    fetchMock.mockResolvedValue(Response.json(movie, { status: 201 }));
    const input = { title: "Arrival", notes: null };
    expect(await addMovie(input)).toEqual(movie);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/movies",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
  });

  it("sends only watched status when updating a movie", async () => {
    const saved = { ...movie, watched: true };
    fetchMock.mockResolvedValue(Response.json(saved));
    expect(await setMovieWatched(movie.id, { watched: true })).toEqual(saved);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/movies/${movie.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ watched: true }),
      }),
    );
  });

  it("accepts an empty 204 deletion response without trying to parse JSON", async () => {
    const response = new Response(null, { status: 204 });
    const parse = jest.spyOn(response, "json");
    fetchMock.mockResolvedValue(response);
    await expect(removeMovie(movie.id)).resolves.toBeUndefined();
    expect(parse).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/movies/${movie.id}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("preserves validation messages and field paths for the form", async () => {
    const issues = [{ path: "title", message: "Title is required." }];
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { message: "Request validation failed.", issues } },
        { status: 400 },
      ),
    );

    await expect(addMovie({ title: "", notes: null })).rejects.toMatchObject({
      name: "MovieApiError",
      message: "Request validation failed.",
      issues,
    });
  });

  it.each([
    ["list", () => fetchMovies({ q: "", page: 1 })],
    ["create", () => addMovie({ title: "Arrival", notes: null })],
    ["update", () => setMovieWatched(movie.id, { watched: true })],
    ["delete", () => removeMovie(movie.id)],
  ])("turns %s network failures into a readable error", async (_name, call) => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(call()).rejects.toThrow(
      "Check your connection and try again.",
    );
  });

  it("preserves AbortError so cancelled queries are not reported as connection failures", async () => {
    const error = new DOMException("Request cancelled", "AbortError");
    fetchMock.mockRejectedValue(error);
    await expect(fetchMovies({ q: "", page: 1 })).rejects.toBe(error);
  });

  it("handles a non-JSON error response without exposing its contents", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Internal proxy details</html>", { status: 502 }),
    );

    await expect(fetchMovies({ q: "", page: 1 })).rejects.toEqual(
      new MovieApiError("Couldn't save your change. Please try again."),
    );
  });

  it("rejects an unreadable successful response", async () => {
    fetchMock.mockResolvedValue(new Response("not JSON", { status: 200 }));
    await expect(fetchMovies({ q: "", page: 1 })).rejects.toThrow(
      "Couldn't read the response. Please try again.",
    );
  });
});
