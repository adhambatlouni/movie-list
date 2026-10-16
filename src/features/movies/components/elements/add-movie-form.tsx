"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowUpRight, Plus } from "lucide-react";
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
  disabled: boolean;
};

export const AddMovieForm = ({ onAdd, disabled }: Props) => {
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
      form.setFocus("title");
      form.reset();
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
    <section
      aria-labelledby="add-heading"
      className="rounded-2xl border bg-card p-6 shadow-sm sm:p-7"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground">
            FOUND SOMETHING GOOD?
          </p>
          <h2 id="add-heading" className="text-xl font-semibold tracking-tight">
            Add a movie
          </h2>
        </div>
        <span
          className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary"
          aria-hidden="true"
        >
          <Plus size={19} />
        </span>
      </div>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        aria-busy={isSubmitting}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="movie-title">
            Movie title{" "}
            <span aria-hidden="true" className="text-primary">
              *
            </span>
          </Label>
          <Input
            id="movie-title"
            placeholder="e.g. The Grand Budapest Hotel"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            readOnly={disabled || isSubmitting}
            {...form.register("title")}
          />
          {errors.title && (
            <p
              id="title-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.title.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="movie-notes">Notes</Label>
            <span id="notes-hint" className="text-xs text-muted-foreground">
              Optional
            </span>
          </div>
          <Textarea
            id="movie-notes"
            placeholder="A recommendation, a reminder, a reason to watch…"
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={`notes-hint${errors.notes ? " notes-error" : ""}`}
            readOnly={disabled || isSubmitting}
            {...form.register("notes")}
          />
          {errors.notes && (
            <p
              id="notes-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.notes.message}
            </p>
          )}
        </div>
        {errors.root && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={disabled || isSubmitting}
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
        <p className="text-center text-xs leading-5 text-muted-foreground">
          A good recommendation deserves a place to stay.
        </p>
      </form>
    </section>
  );
};
