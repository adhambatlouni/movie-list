"use client";

import { Check, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Movie } from "../../types";

type Props = {
  movie: Movie;
  number: number;
  disabled: boolean;
  saving: boolean;
  onToggle: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
};

export const MovieItem = ({
  movie,
  number,
  disabled,
  saving,
  onToggle,
  onDelete,
}: Props) => {
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-5 transition-colors sm:p-6",
        movie.watched && "bg-card/60",
      )}
    >
      <div className="flex gap-4 sm:gap-5">
        <div
          aria-hidden="true"
          className={cn(
            "flex h-16 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-secondary font-mono text-sm text-primary sm:h-20 sm:w-14",
            movie.watched && "border-border bg-muted text-muted-foreground",
          )}
        >
          {String(number).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-lg font-semibold leading-7 tracking-tight wrap-anywhere">
              {movie.title}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={(event) => onDelete(event.currentTarget)}
              aria-label={`Delete ${movie.title}`}
              className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
          {movie.notes && (
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground wrap-anywhere">
              {movie.notes}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label={`Watched: ${movie.title}`}
              aria-pressed={movie.watched}
              aria-busy={saving}
              onClick={onToggle}
              className={cn(
                "-ml-2 px-2 text-muted-foreground",
                movie.watched && "text-primary",
              )}
            >
              {saving ? (
                <Spinner />
              ) : movie.watched ? (
                <Check aria-hidden="true" />
              ) : (
                <Circle aria-hidden="true" />
              )}
              {saving
                ? "Saving…"
                : movie.watched
                  ? "Watched"
                  : "Mark as watched"}
            </Button>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium tracking-wide",
                movie.watched
                  ? "bg-secondary text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {movie.watched ? "CREDITS ROLLED" : "UP NEXT"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
};
