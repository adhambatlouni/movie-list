import { z } from "zod";

// PostgreSQL text columns cannot store null characters.
const text = z.string().refine((value) => !value.includes("\0"), {
  message: "Null characters are not allowed.",
});

export const movieParamsSchema = z.object({
  id: z.uuid({ error: "Movie ID must be a valid UUID." }),
});

export const createMovieSchema = z.strictObject({
  title: text
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Title is required.")),
  notes: text.nullish().transform((value) => value?.trim() || null),
});

export const updateMovieSchema = z.strictObject({
  watched: z.boolean({ error: "Watched must be a boolean." }),
});

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
