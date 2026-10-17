"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  createMovieSchema,
  type CreateMovieInput,
} from "../../schemas/movie.schema";
import { MovieApiError } from "../../services/movies-api";

type Props = {
  onAdd: (input: CreateMovieInput) => Promise<void>;
};

export const AddMovieForm = ({ onAdd }: Props) => {
  const form = useForm<
    z.input<typeof createMovieSchema>,
    unknown,
    CreateMovieInput
  >({
    resolver: zodResolver(createMovieSchema),
    defaultValues: { title: "", notes: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = async (input: CreateMovieInput) => {
    form.clearErrors("root");
    try {
      await onAdd(input);
    } catch (error) {
      if (error instanceof MovieApiError) {
        for (const issue of error.issues) {
          if (issue.path === "title" || issue.path === "notes") {
            form.setError(
              issue.path,
              { message: issue.message },
              { shouldFocus: true },
            );
          }
        }
      }
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Couldn’t add the movie. Please try again.",
      });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      noValidate
      aria-busy={isSubmitting}
      className="grid gap-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="movie-title" className="leading-5">
          Movie title{" "}
          <span aria-hidden="true" className="text-primary">
            *
          </span>
        </Label>
        <Input
          id="movie-title"
          placeholder="e.g. Arrival"
          autoComplete="off"
          aria-required="true"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          readOnly={isSubmitting}
          {...form.register("title")}
        />
        {errors.title && (
          <p id="title-error" role="alert" className="text-sm text-destructive wrap-anywhere">
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="movie-notes" className="leading-5">Notes</Label>
          <span id="notes-hint" className="text-xs text-muted-foreground">
            Optional
          </span>
        </div>
        <Textarea
          className="min-h-20"
          id="movie-notes"
          placeholder="Add a note (optional)"
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={`notes-hint${errors.notes ? " notes-error" : ""}`}
          readOnly={isSubmitting}
          {...form.register("notes")}
        />
        {errors.notes && (
          <p id="notes-error" role="alert" className="text-sm text-destructive wrap-anywhere">
            {errors.notes.message}
          </p>
        )}
      </div>
      {errors.root && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive wrap-anywhere"
        >
          {errors.root.message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Spinner />
            Adding movie…
          </>
        ) : (
          <>
            Add to watchlist
            <ArrowUpRight aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
};
