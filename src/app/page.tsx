import { Suspense } from "react";
import Loading from "./loading";
import { MovieWatchlist } from "@/features/movies/components/movie-watchlist";

const Home = () => {
  return (
    <Suspense fallback={<Loading />}>
      <MovieWatchlist />
    </Suspense>
  );
};

export default Home;
