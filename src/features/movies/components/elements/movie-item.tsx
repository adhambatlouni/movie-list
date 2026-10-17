"use client";

import { useId } from "react";
import { Trash2 } from "lucide-react";
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
  disabled: boolean;
  saving: boolean;
  onToggle: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
};

export const MovieItem = ({
  movie,
  disabled,
  saving,
  onToggle,
  onDelete,
}: Props) => {
  const checkboxId = useId();
  const action = movie.watched ? "Mark as unwatched" : "Mark as watched";
  return (
    <li>
      <Accordion type="single" collapsible>
        <AccordionItem value="notes">
          <div className="flex min-h-20 items-start gap-2 px-3 py-4 sm:gap-3 sm:px-5">
            <Label
              htmlFor={checkboxId}
              aria-busy={saving}
              title={action}
              className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                id={checkboxId}
                checked={movie.watched}
                onCheckedChange={onToggle}
                disabled={disabled}
                aria-label={`Watched: ${movie.title}`}
                title={action}
              />
              {saving && <Spinner className="absolute right-0 size-3" />}
            </Label>
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "text-sm font-semibold leading-6 wrap-anywhere sm:text-base",
                  movie.watched && "text-muted-foreground",
                )}
              >
                {movie.title}
              </h3>
              <Label
                htmlFor={checkboxId}
                className="cursor-pointer text-xs leading-5 text-muted-foreground"
                title={action}
              >
                {saving ? "Saving..." : movie.watched ? "Watched" : "To watch"}
              </Label>
            </div>
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={`Delete ${movie.title}`}
                title="Delete movie"
                onClick={(event) => onDelete(event.currentTarget)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 aria-hidden="true" />
              </Button>
              {movie.notes && (
                <AccordionTrigger
                  aria-label={`Notes for ${movie.title}`}
                  title="Show or hide notes"
                  className="size-11 justify-center rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <span className="sr-only">Notes</span>
                </AccordionTrigger>
              )}
            </div>
          </div>
          {movie.notes && (
            <AccordionContent className="pb-5 pl-16 pr-5 sm:pl-20">
              {movie.notes}
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    </li>
  );
};
