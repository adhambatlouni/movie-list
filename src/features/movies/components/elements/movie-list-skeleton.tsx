import { Skeleton } from "@/components/ui/skeleton";

export const MovieListSkeleton = () => (
  <div
    role="status"
    aria-label="Loading movies"
    className="divide-y overflow-hidden rounded-xl border bg-card"
  >
    <span className="sr-only">Loading movies…</span>
    {[0, 1, 2, 3, 4].map((item) => (
      <div
        key={item}
        aria-hidden="true"
        className="flex h-20 items-center gap-2 px-3 sm:gap-3 sm:px-5"
      >
        <div className="flex size-11 shrink-0 items-center justify-center">
          <Skeleton className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 sm:w-1/2" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex shrink-0">
          <div className="flex size-11 items-center justify-center">
            <Skeleton className="size-4" />
          </div>
          <div className="flex size-11 items-center justify-center">
            <Skeleton className="size-5" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
