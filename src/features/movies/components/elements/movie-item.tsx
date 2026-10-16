"use client";

import { useId } from "react";
import { Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const checkboxId = useId();
  return (
    <li className={cn(movie.watched && "bg-muted/25")}>
      <Accordion type="single" collapsible>
        <AccordionItem value="notes">
          <div className="flex min-h-20 items-center gap-2 pl-3 sm:gap-4 sm:pl-5">
            <span
              aria-hidden="true"
              className="hidden w-5 shrink-0 font-mono text-xs text-muted-foreground sm:block"
            >
              {String(number).padStart(2, "0")}
            </span>
            <h3 className="min-w-0 flex-1 py-4 text-sm font-semibold leading-6 wrap-anywhere sm:text-base">
              {movie.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1">
              <Label
                htmlFor={checkboxId}
                aria-busy={saving}
                className="relative flex size-11 cursor-pointer items-center justify-center gap-2 text-sm text-muted-foreground sm:w-32 sm:justify-start"
              >
                <Checkbox
                  id={checkboxId}
                  checked={movie.watched}
                  onCheckedChange={onToggle}
                  disabled={disabled}
                  aria-label={`Watched: ${movie.title}`}
                />
                <span className="sr-only sm:not-sr-only">
                  {saving ? "Saving..." : "Watched"}
                </span>
                {saving && (
                  <Spinner className="absolute right-0 size-3 sm:right-2" />
                )}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Delete ${movie.title}`}
                onClick={(event) => onDelete(event.currentTarget)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {movie.notes ? (
              <AccordionTrigger
                aria-label={`Notes for ${movie.title}`}
                title="Show or hide notes"
                className="h-full min-h-20 w-12 justify-center rounded-none border-l bg-muted/20 hover:bg-muted/60 sm:w-14"
              >
                <span className="sr-only">Notes</span>
              </AccordionTrigger>
            ) : (
              <span className="flex w-12 shrink-0 self-stretch items-center justify-center border-l text-muted-foreground/50 sm:w-14">
                <Minus aria-hidden="true" className="size-4" />
                <span className="sr-only">No notes</span>
              </span>
            )}
          </div>
          {movie.notes && (
            <AccordionContent className="border-t bg-muted/20 px-4 py-4 sm:px-14">
              {movie.notes}
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    </li>
  );
};
