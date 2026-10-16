"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const MovieSearch = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // URL navigation (including Back/Forward) replaces the local draft.
  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(value);
  }
  useEffect(() => () => clearTimeout(timer.current), [value]);

  const change = (next: string) => {
    setDraft(next);
    clearTimeout(timer.current);
    if (!next) onChange("");
    else timer.current = setTimeout(() => onChange(next), 300);
  };
  return (
    <div role="search" className="mb-5">
      <Label htmlFor="movie-search" className="sr-only">
        Search movies by title
      </Label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-4 size-4 text-muted-foreground"
        />
        <Input
          id="movie-search"
          type="search"
          placeholder="Search by movie title…"
          value={draft}
          onChange={(event) => change(event.target.value)}
          className="pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear title search"
            className="absolute right-0.5 top-0.5"
            onClick={() => {
              change("");
              document.getElementById("movie-search")?.focus();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
};
