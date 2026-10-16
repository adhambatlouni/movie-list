"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Movie } from "../../types";

type Props = {
  movie: Movie | null;
  pending: boolean;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  onRestoreFocus: () => void;
};

export const DeleteMovieDialog = ({
  movie,
  pending,
  onDelete,
  onClose,
  onRestoreFocus,
}: Props) => {
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const close = () => {
    if (submitting.current) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!movie || submitting.current) return;
    submitting.current = true;
    setError(null);
    try {
      await onDelete(movie.id);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't delete the movie. Please try again.",
      );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <AlertDialog
      open={Boolean(movie)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] grid-cols-1 overflow-y-auto rounded-2xl border-border bg-card sm:rounded-2xl"
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <Trash2 size={20} />
        </span>
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle>Delete this movie?</AlertDialogTitle>
          <AlertDialogDescription className="leading-6 wrap-anywhere">
            “{movie?.title}” will be removed from your watchlist. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep movie</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && <Spinner />}
            {pending ? "Deleting…" : "Delete movie"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
