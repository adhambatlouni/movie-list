import { Skeleton } from "@/components/ui/skeleton";
import { MovieListSkeleton } from "@/features/movies/components/elements/movie-list-skeleton";

const Loading = () => (
  <>
    <div aria-hidden="true" className="mb-10 space-y-5">
      <Skeleton className="h-3 w-56" />
      <Skeleton className="h-28 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <div className="grid items-start gap-8 lg:grid-cols-3 lg:gap-10">
      <div
        aria-hidden="true"
        className="space-y-6 rounded-2xl border bg-card p-6 sm:p-7"
      >
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <Skeleton aria-hidden="true" className="mb-5 h-7 w-40" />
        <MovieListSkeleton />
      </div>
    </div>
  </>
);

export default Loading;
