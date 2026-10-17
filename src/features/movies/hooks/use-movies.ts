"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMovie,
  fetchMovies,
  removeMovie,
  setMovieWatched,
} from "../services/movies-api";
import type { Movie, MoviePage } from "../types";

const moviesQueryKey = ["movies"] as const;

export const useMovies = (q: string, page: number) => {
  const client = useQueryClient();
  const canRefresh = () =>
    client.isMutating({ mutationKey: moviesQueryKey }) === 0;
  const query = useQuery({
    queryKey: [...moviesQueryKey, { q, page }],
    queryFn: ({ signal }) => fetchMovies({ q, page }, signal),
    refetchOnWindowFocus: canRefresh,
    refetchOnReconnect: canRefresh,
  });
  const snapshot = async () => {
    await client.cancelQueries({ queryKey: moviesQueryKey });
    return {
      previous: client.getQueriesData<MoviePage>({ queryKey: moviesQueryKey }),
    };
  };
  const rollback = (
    _error: Error,
    _input: unknown,
    context?: Awaited<ReturnType<typeof snapshot>>,
  ) => {
    context?.previous.forEach(([key, data]) => client.setQueryData(key, data));
  };
  const updateCachedMovie = (id: string, changes: Partial<Movie>) =>
    client.setQueriesData<MoviePage>(
      { queryKey: moviesQueryKey },
      (data) =>
        data && {
          ...data,
          movies: data.movies.map((movie) =>
            movie.id === id ? { ...movie, ...changes } : movie,
          ),
        },
    );
  const refresh = () => client.invalidateQueries({ queryKey: moviesQueryKey });

  const create = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: addMovie,
    onMutate: () => client.cancelQueries({ queryKey: moviesQueryKey }),
    // Creation returns to page one. Other pages are refreshed when visited.
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: moviesQueryKey,
        refetchType: "none",
      });
      void client.refetchQueries({
        queryKey: [...moviesQueryKey, { q: "", page: 1 }],
        exact: true,
        type: "active",
      });
    },
    onError: () => {
      void refresh();
    },
  });
  const update = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: ({ id, watched }: { id: string; watched: boolean }) =>
      setMovieWatched(id, { watched }),
    onMutate: async ({ id, watched }) => {
      const context = await snapshot();
      updateCachedMovie(id, { watched });
      return context;
    },
    onError: rollback,
    onSuccess: (saved) => updateCachedMovie(saved.id, saved),
    onSettled: (_data, error) => {
      if (error) return refresh();
    },
  });
  const remove = useMutation({
    mutationKey: moviesQueryKey,
    mutationFn: removeMovie,
    onMutate: async (id: string) => {
      const context = await snapshot();
      client.setQueriesData<MoviePage>({ queryKey: moviesQueryKey }, (data) => {
        if (!data || !data.movies.some((movie) => movie.id === id)) return data;
        return {
          ...data,
          total: data.total - 1,
          movies: data.movies.filter((movie) => movie.id !== id),
        };
      });
      return context;
    },
    onError: rollback,
    onSettled: refresh,
  });
  return {
    query,
    create,
    update,
    remove,
    isSaving: create.isPending || update.isPending || remove.isPending,
  };
};
