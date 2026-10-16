import { Skeleton } from "@/components/ui/skeleton";
import { MovieListSkeleton } from "@/features/movies/components/elements/movie-list-skeleton";
import { MoviePaginationSkeleton } from "@/features/movies/components/elements/movie-pagination-skeleton";

const Loading = () => (
  <>
    <div
      aria-hidden="true"
      className="mb-6 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="max-w-full space-y-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-32" />
    </div>
    <div aria-hidden="true">
      <Skeleton className="mb-4 h-7 w-36" />
      <Skeleton className="mb-5 h-11 w-full" />
    </div>
    <MoviePaginationSkeleton />
    <MovieListSkeleton />
  </>
);
export default Loading;
