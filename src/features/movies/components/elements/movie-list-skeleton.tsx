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
        className="flex h-20 items-center gap-2 pl-3 sm:gap-4 sm:pl-5"
      >
        <Skeleton className="hidden size-5 shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-3/4 sm:w-1/2" />
        </div>
        <Skeleton className="size-5 shrink-0 sm:w-28" />
        <div className="flex size-11 shrink-0 items-center justify-center">
          <Skeleton className="size-4" />
        </div>
        <div className="flex h-full w-12 shrink-0 items-center justify-center border-l sm:w-14">
          <Skeleton className="size-5" />
        </div>
      </div>
    ))}
  </div>
);
