import { Skeleton } from "@/components/ui/skeleton";

export const MoviePaginationSkeleton = () => (
  <div
    aria-hidden="true"
    data-slot="pagination-skeleton"
    className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-3"
  >
    <Skeleton className="h-3 w-24" />
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map((item) => (
        <Skeleton key={item} className="size-11 rounded-lg" />
      ))}
    </div>
  </div>
);
