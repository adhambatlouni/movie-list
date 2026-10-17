"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddMovieForm } from "../elements/add-movie-form";
import type { CreateMovieInput } from "../../schemas/movie.schema";

export const AddMovieDialog = ({
  open,
  pending,
  onClose,
  onAdd,
  onRestoreFocus,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onAdd: (input: CreateMovieInput) => Promise<void>;
  onRestoreFocus: () => void;
}) => {
  const submitting = useRef(false);
  const submit = async (input: CreateMovieInput) => {
    submitting.current = true;
    try {
      await onAdd(input);
      onClose();
    } finally {
      submitting.current = false;
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting.current) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("movie-title")?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle className="text-xl font-semibold">
              Add a movie
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Save a title and an optional note.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={pending}
            aria-label="Close add movie"
            onClick={() => {
              if (!submitting.current) onClose();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <AddMovieForm onAdd={submit} />
      </DialogContent>
    </Dialog>
  );
};
