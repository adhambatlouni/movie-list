import {
  movieParamsSchema,
  updateMovieSchema,
} from "@/features/movies/schemas/movie.schema";
import {
  deleteMovie,
  updateMovie,
} from "@/features/movies/services/movies.server";
import { errorResponse, HttpError, readJson } from "@/lib/api/http";

type Context = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, context: Context) => {
  try {
    const { id } = movieParamsSchema.parse(await context.params);
    const input = updateMovieSchema.parse(await readJson(request));
    const movie = await updateMovie(id, input);

    if (!movie) throw new HttpError(404, "NOT_FOUND", "Movie not found.");

    return Response.json(movie);
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE = async (_request: Request, context: Context) => {
  try {
    const { id } = movieParamsSchema.parse(await context.params);
    const deleted = await deleteMovie(id);

    if (!deleted) throw new HttpError(404, "NOT_FOUND", "Movie not found.");

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
};
