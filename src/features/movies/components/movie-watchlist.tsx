"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MovieSearch } from "./elements/movie-search";
import {
  ArrowDown,
  ArrowUpRight,
  Clapperboard,
  Film,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMovies } from "../hooks/use-movies";
import type { CreateMovieInput } from "../schemas/movie.schema";
import type { Movie } from "../types";
import { AddMovieForm } from "./elements/add-movie-form";
import { DeleteMovieDialog } from "./overlays/delete-movie-dialog";
import { MovieItem } from "./elements/movie-item";
import { MovieListSkeleton } from "./elements/movie-list-skeleton";

export const MovieWatchlist = () => {
  const { query, create, update, remove, isSaving } = useMovies();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const setSearch = (value: string) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };
  const [selected, setSelected] = useState<Movie | null>(null);
  const deleteTrigger = useRef<HTMLButtonElement | null>(null);
  const collectionHeading = useRef<HTMLHeadingElement>(null);
  const movies = query.data;
  const filteredMovies = movies?.filter((movie) =>
    movie.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const watched = movies?.filter((movie) => movie.watched).length ?? 0;

  const add = async (input: CreateMovieInput) => {
    await create.mutateAsync(input);
    toast.success(`Added “${input.title}” to your watchlist.`);
  };

  const toggle = async (movie: Movie) => {
    try {
      await update.mutateAsync({ id: movie.id, watched: !movie.watched });
      toast.success(
        `“${movie.title}” marked as ${movie.watched ? "unwatched" : "watched"}.`,
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
      <div className="mb-10 flex flex-col justify-between gap-7 sm:flex-row sm:items-end sm:gap-10">
        <div>
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-primary">
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            YOUR PERSONAL SCREENING ROOM
          </p>
          <h1 className="max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your next
            <br />
            great watch<span className="text-primary">.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Keep the recommendations. Make time for the stories.
            <br className="hidden sm:block" /> Your next movie night starts
            here.
          </p>
        </div>
        {movies && (
          <dl className="flex shrink-0 gap-6 border-l border-border pl-6 sm:mb-1 sm:gap-8 sm:pl-8">
            <div>
              <dt className="text-xs text-muted-foreground">To watch</dt>
              <dd className="mt-1 font-mono text-3xl font-medium tracking-tight text-primary">
                {movies.length - watched}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Watched</dt>
              <dd className="mt-1 font-mono text-3xl font-medium tracking-tight">
                {watched}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-3 lg:gap-10">
        <AddMovieForm onAdd={add} disabled={isSaving} />
        <section
          aria-labelledby="collection-heading"
          className="min-w-0 lg:col-span-2"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="collection-heading"
              ref={collectionHeading}
              tabIndex={-1}
              className="flex items-center gap-2.5 rounded text-lg font-semibold tracking-tight"
            >
              Your collection
              {movies && (
                <span
                  className="rounded-md border px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground"
                  aria-label={`${movies.length} movies`}
                >
                  {movies.length}
                </span>
              )}
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {query.isFetching && !query.isPending ? (
                <>
                  <Spinner className="size-3" />
                  Refreshing…
                </>
              ) : (
                <>
                  <ArrowDown size={12} aria-hidden="true" />
                  Newest first
                </>
              )}
            </span>
          </div>

          <MovieSearch value={search} onChange={setSearch} />

          {query.isPending ? (
            <MovieListSkeleton />
          ) : !movies ? (
            <div className="rounded-xl border bg-card p-8 text-center sm:p-12">
              <TriangleAlert
                size={28}
                className="mx-auto mb-4 text-destructive"
                aria-hidden="true"
              />
              <h3 className="mb-2 font-semibold">
                Couldn&apos;t load your movies
              </h3>
              <p
                role="alert"
                className="mb-5 text-sm leading-6 text-muted-foreground"
              >
                {query.error?.message ?? "Please try again in a moment."}
              </p>
              <Button
                type="button"
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
                  className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
                >
                  <p>
                    Couldn&apos;t refresh your collection. Showing the last
                    loaded movies.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={query.isFetching || isSaving}
                    className="mt-2"
                    onClick={() => void query.refetch()}
                  >
                    <RotateCcw aria-hidden="true" />
                    Retry refresh
                  </Button>
                </div>
              )}
              {movies.length === 0 ? (
                <EmptyMovies />
              ) : filteredMovies?.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center">
                  <h3 className="font-semibold">No movies match your search</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try another title or clear your search.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <ul aria-label="Movies" className="space-y-3">
                  {filteredMovies?.map((movie, index) => (
                    <MovieItem
                      key={movie.id}
                      movie={movie}
                      number={index + 1}
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
              {movies.length > 0 && (
                <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Film size={13} aria-hidden="true" />A little less scrolling.
                  A little more cinema.
                </p>
              )}
            </>
          )}
        </section>
      </div>
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

const EmptyMovies = () => {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-input/45 px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-7 flex size-20 -rotate-6 items-center justify-center rounded-2xl border border-primary/15 bg-secondary text-primary shadow-sm"
      >
        <Clapperboard size={34} strokeWidth={1.4} />
      </div>
      <p className="mb-3 text-xs font-semibold tracking-widest text-primary">
        THE OPENING SCENE
      </p>
      <h3 className="mb-3 text-xl font-medium tracking-tight">
        Every great list starts with one film.
      </h3>
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">
        That movie you keep meaning to watch?
        <br />
        Give it a home here.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="mt-5 text-primary"
        onClick={() => document.getElementById("movie-title")?.focus()}
      >
        Add your first movie
        <ArrowUpRight aria-hidden="true" />
      </Button>
    </div>
  );
};
