"use client";

import type { MouseEvent } from "react";
import { MOVIES_PAGE_SIZE } from "../../schemas/movie.schema";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const MoviePagination = ({
  page,
  pageCount,
  total,
  searchParams,
  disabled = false,
}: {
  disabled?: boolean;
  page: number;
  pageCount: number;
  total: number;
  searchParams: string;
}) => {
  const href = (target: number) => {
    const params = new URLSearchParams(searchParams);
    if (target === 1) params.delete("page");
    else params.set("page", String(target));
    return params.size ? `/?${params}` : "/";
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, target: number) => {
    if (disabled || target < 1 || target > pageCount) {
      event.preventDefault();
      return;
    }
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (target !== page) window.history.pushState(null, "", href(target));
  };
  const first = Math.max(1, Math.min(page - 1, pageCount - 2));
  const pages = Array.from(
    { length: Math.min(3, pageCount) },
    (_, index) => first + index,
  );

  return (
    <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {total === 0 ? 0 : (page - 1) * MOVIES_PAGE_SIZE + 1}-
        {Math.min(page * MOVIES_PAGE_SIZE, total)} of {total} movies
      </p>
      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={page > 1 ? href(page - 1) : undefined}
                aria-disabled={disabled || page === 1}
                tabIndex={disabled || page === 1 ? -1 : undefined}
                onClick={(event) => navigate(event, page - 1)}
              />
            </PaginationItem>
            {pages.map((number) => (
              <PaginationItem key={number}>
                <PaginationLink
                  href={href(number)}
                  isActive={page === number}
                  aria-disabled={disabled}
                  tabIndex={disabled ? -1 : undefined}
                  aria-label={`Page ${number}`}
                  onClick={(event) => navigate(event, number)}
                >
                  {number}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={page < pageCount ? href(page + 1) : undefined}
                aria-disabled={disabled || page === pageCount}
                tabIndex={disabled || page === pageCount ? -1 : undefined}
                onClick={(event) => navigate(event, page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
