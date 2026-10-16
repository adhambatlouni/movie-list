"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMovie,
  fetchMovies,
  removeMovie,
  setMovieWatched,
} from "../services/movies-api";
import type { Movie } from "../types";

export const moviesQueryKey = ["movies"] as const;

export const useMovies = () => {
  const client = useQueryClient();
  const canRefresh = () =>
    client.isMutating({ mutationKey: moviesQueryKey }) === 0;
  const query = useQuery({
    queryKey: moviesQueryKey,
    queryFn: ({ signal }) => fetchMovies(signal),
    refetchOnWindowFocus: canRefresh,
    refetchOnReconnect: canRefresh,
  });
  const reconcile = (_data: unknown, error: Error | null) => {
    // A failed request may still have reached the database. Refetch after
    // rollback, or when no complete list has been loaded. Successful writes
    // already give us everything needed to update an existing list locally.
    if (error || client.getQueryData(moviesQueryKey) === undefined) {
      return client.invalidateQueries({
        queryKey: moviesQueryKey,
        exact: true,
      });
    }
  };

  const create = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: addMovie,
    onMutate: () => client.cancelQueries({ queryKey: moviesQueryKey }),
    onSuccess: (movie) => {
      client.setQueryData<Movie[]>(moviesQueryKey, (movies) =>
        movies
          ? [movie, ...movies.filter((existing) => existing.id !== movie.id)]
          : undefined,
      );
    },
    onSettled: reconcile,
  });

  const update = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: ({ id, watched }: { id: string; watched: boolean }) =>
      setMovieWatched(id, { watched }),
    onMutate: async ({ id, watched }) => {
      await client.cancelQueries({ queryKey: moviesQueryKey });
      const previous = client.getQueryData<Movie[]>(moviesQueryKey);
      client.setQueryData<Movie[]>(moviesQueryKey, (movies) =>
        movies?.map((movie) =>
          movie.id === id ? { ...movie, watched } : movie,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous)
        client.setQueryData(moviesQueryKey, context.previous);
    },
    onSuccess: (saved) => {
      client.setQueryData<Movie[]>(moviesQueryKey, (movies) =>
        movies?.map((movie) => (movie.id === saved.id ? saved : movie)),
      );
    },
    onSettled: reconcile,
  });

  const remove = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: removeMovie,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: moviesQueryKey });
      const previous = client.getQueryData<Movie[]>(moviesQueryKey);
      client.setQueryData<Movie[]>(moviesQueryKey, (movies) =>
        movies?.filter((movie) => movie.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous)
        client.setQueryData(moviesQueryKey, context.previous);
    },
    onSettled: reconcile,
  });

  // The page disables other writes while one is pending. This keeps optimistic
  // rollback predictable without a queue or concurrent snapshot management.
  const isSaving = create.isPending || update.isPending || remove.isPending;
  return { query, create, update, remove, isSaving };
};
