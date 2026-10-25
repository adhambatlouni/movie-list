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
        className="max-w-104 gap-0 p-0"
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-destructive/15 bg-destructive/10 text-destructive"
          >
            <Trash2 size={18} />
          </span>
          <AlertDialogHeader className="min-w-0 flex-1 space-y-1.5 text-left">
            <AlertDialogTitle className="text-lg leading-6">
              Remove from watchlist?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-5 wrap-anywhere">
              <span className="font-medium text-foreground">
                “{movie?.title}”
              </span>{" "}
              will be removed from your watchlist. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>
        {error && (
          <p
            role="alert"
            className="mx-5 mb-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive wrap-anywhere sm:mx-6"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter className="border-t px-5 py-4 sm:px-6">
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
