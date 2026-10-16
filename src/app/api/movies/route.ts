import { connection } from "next/server";
import { createMovieSchema } from "@/features/movies/schemas/movie.schema";
import {
  createMovie,
  listMovies,
} from "@/features/movies/services/movies.server";
import { errorResponse, readJson } from "@/lib/api/http";

export const GET = async () => {
  // Wait for a real request, including when Cache Components is enabled.
  // Keep this outside the catch so Next.js can handle its build-time signal.
  await connection();

  try {
    return Response.json(await listMovies(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST = async (request: Request) => {
  try {
    const input = createMovieSchema.parse(await readJson(request));
    const movie = await createMovie(input);
    return Response.json(movie, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
