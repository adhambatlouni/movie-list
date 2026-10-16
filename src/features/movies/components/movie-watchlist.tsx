"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMovies } from "../hooks/use-movies";
import {
  movieListSchema,
  MOVIES_PAGE_SIZE,
  type CreateMovieInput,
} from "../schemas/movie.schema";
import type { Movie } from "../types";
import { MovieSearch } from "./elements/movie-search";
import { MoviePagination } from "./elements/movie-pagination";
import { MoviePaginationSkeleton } from "./elements/movie-pagination-skeleton";
import { MovieItem } from "./elements/movie-item";
import { MovieListSkeleton } from "./elements/movie-list-skeleton";
import { AddMovieDialog } from "./overlays/add-movie-dialog";
import { DeleteMovieDialog } from "./overlays/delete-movie-dialog";

export const MovieWatchlist = () => {
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const parsedPage = movieListSchema.shape.page.safeParse(
    searchParams.get("page") ?? undefined,
  );
  const requestedPage = parsedPage.success ? parsedPage.data : 1;
  const { query, create, update, remove, isSaving } = useMovies(
    search.trim(),
    requestedPage,
  );
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const collectionHeading = useRef<HTMLHeadingElement>(null);
  const data = query.data;
  const page = data?.page ?? requestedPage;
  const pageCount = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / MOVIES_PAGE_SIZE),
  );

  useEffect(() => {
    if (data && !isSaving && data.page !== requestedPage) {
      const url = new URL(window.location.href);
      if (data.page === 1) url.searchParams.delete("page");
      else url.searchParams.set("page", String(data.page));
      window.history.replaceState(null, "", url);
    }
  }, [data, isSaving, requestedPage]);

  const setSearch = (value: string) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    url.searchParams.delete("page");
    window.history.replaceState(null, "", url);
  };
  const add = async (input: CreateMovieInput) => {
    await create.mutateAsync(input);
    setSearch("");
    toast.success(`Added "${input.title}" to your watchlist.`);
  };
  const toggle = async (movie: Movie) => {
    try {
      await update.mutateAsync({ id: movie.id, watched: !movie.watched });
      toast.success(
        `"${movie.title}" marked as ${movie.watched ? "unwatched" : "watched"}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't update the movie. Please try again.",
      );
    }
  };
  const deleteMovie = async (id: string) => {
    await remove.mutateAsync(id);
    toast.success("Movie removed from your watchlist.");
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Movie watchlist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep track of what you want to watch next.
          </p>
        </div>
        <Button
          ref={addTrigger}
          disabled={isSaving}
          onClick={() => setAdding(true)}
        >
          <Plus aria-hidden="true" />
          Add movie
        </Button>
      </div>
      <section aria-labelledby="collection-heading" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="collection-heading"
            ref={collectionHeading}
            tabIndex={-1}
            className="rounded text-lg font-semibold"
          >
            Your collection
          </h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {query.isFetching && !query.isPending ? (
              <>
                <Spinner />
                Refreshing...
              </>
            ) : (
              "Newest first"
            )}
          </span>
        </div>
        <MovieSearch value={search} onChange={setSearch} disabled={isSaving} />
        {query.isPending ? (
          <MoviePaginationSkeleton />
        ) : (
          data && (
            <MoviePagination
              page={page}
              pageCount={pageCount}
              total={data.total}
              searchParams={searchParams.toString()}
              disabled={isSaving}
            />
          )
        )}
        {query.isPending ? (
          <MovieListSkeleton />
        ) : !data ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h3 className="font-semibold">Couldn&apos;t load your movies</h3>
            <p role="alert" className="my-3 text-sm text-muted-foreground">
              {query.error?.message}
            </p>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => void query.refetch()}
            >
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            {query.isError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/20 p-4 text-sm text-destructive"
              >
                <p>
                  Couldn&apos;t refresh your collection. Showing the last loaded
                  movies.
                </p>
                <Button
                  variant="ghost"
                  disabled={isSaving || query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  Retry refresh
                </Button>
              </div>
            )}
            {data.movies.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center">
                <h3 className="font-semibold">
                  {search.trim()
                    ? "No movies match your search"
                    : "Your watchlist is empty."}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {search.trim()
                    ? "Try another title or clear your search."
                    : "Add a movie to get started."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  disabled={isSaving}
                  onClick={() =>
                    search.trim() ? setSearch("") : setAdding(true)
                  }
                >
                  {search.trim() ? "Clear search" : "Add your first movie"}
                </Button>
              </div>
            ) : (
              <ul
                aria-label="Movies"
                className="overflow-hidden rounded-xl border bg-card divide-y"
              >
                {data.movies.map((movie) => (
                  <MovieItem
                    key={movie.id}
                    movie={movie}
                    disabled={isSaving}
                    saving={
                      update.isPending && update.variables?.id === movie.id
                    }
                    onToggle={() => void toggle(movie)}
                    onDelete={(trigger) => {
                      deleteTrigger.current = trigger;
                      setSelected(movie);
                    }}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      <AddMovieDialog
        open={adding}
        pending={create.isPending}
        onAdd={add}
        onClose={() => setAdding(false)}
        onRestoreFocus={() => addTrigger.current?.focus()}
      />
      <DeleteMovieDialog
        movie={selected}
        pending={remove.isPending}
        onDelete={deleteMovie}
        onClose={() => setSelected(null)}
        onRestoreFocus={() =>
          (deleteTrigger.current?.isConnected
            ? deleteTrigger.current
            : collectionHeading.current
          )?.focus()
        }
      />
    </>
  );
};
