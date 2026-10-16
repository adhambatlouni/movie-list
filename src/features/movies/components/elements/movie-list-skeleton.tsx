import { Skeleton } from "@/components/ui/skeleton";

export const MovieListSkeleton = () => (
  <div role="status" aria-label="Loading movies" className="space-y-3">
    <span className="sr-only">Loading movies…</span>
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        aria-hidden="true"
        className="flex gap-5 rounded-xl border bg-card p-6"
      >
        <Skeleton className="h-20 w-14 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-4 py-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);
