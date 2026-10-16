import { describe, expect, it } from "@jest/globals";
import {
  createMovieSchema,
  movieParamsSchema,
  updateMovieSchema,
} from "./movie.schema";

describe("createMovieSchema", () => {
  it("trims title and notes", () => {
    expect(
      createMovieSchema.parse({
        title: "  Arrival  ",
        notes: "  Watch again  ",
      }),
    ).toEqual({ title: "Arrival", notes: "Watch again" });
  });

  it.each([undefined, null, "", " \n\t "])(
    "normalizes absent or blank notes (%p)",
    (notes) => {
      expect(
        createMovieSchema.parse({ title: "Arrival", notes }).notes,
      ).toBeNull();
    },
  );

  it.each([
    undefined,
    null,
    [],
    "Arrival",
    {},
    { title: "" },
    { title: " \n\t" },
    { title: 42 },
    { title: null },
    { title: "A\0B" },
    { title: "Arrival", notes: 42 },
    { title: "Arrival", notes: "A\0B" },
    { title: "Arrival", watched: true },
    { title: "Arrival", id: "client-id" },
    { title: "Arrival", created_at: "2026-10-15" },
  ])("rejects invalid creation input %p", (input) => {
    expect(createMovieSchema.safeParse(input).success).toBe(false);
  });

  it("accepts long titles and notes without inventing length limits", () => {
    expect(
      createMovieSchema.safeParse({
        title: "A".repeat(500),
        notes: "N".repeat(5000),
      }).success,
    ).toBe(true);
  });
});

describe("updateMovieSchema", () => {
  it.each([true, false])("accepts watched=%p", (watched) => {
    expect(updateMovieSchema.parse({ watched })).toEqual({ watched });
  });

  it.each([
    {},
    null,
    [],
    { watched: "false" },
    { watched: 0 },
    { watched: null },
    { watched: true, title: "Edited" },
    { watched: false, notes: "Edited" },
  ])("rejects unsupported updates %p", (input) => {
    expect(updateMovieSchema.safeParse(input).success).toBe(false);
  });
});

describe("movieParamsSchema", () => {
  it("accepts a UUID", () => {
    expect(
      movieParamsSchema.safeParse({
        id: "a1ad0f7f-57e3-4b2c-a021-a46d5c232e19",
      }).success,
    ).toBe(true);
  });

  it.each(["", "123", "not-a-uuid", undefined])(
    "rejects invalid ID %p",
    (id) => {
      expect(movieParamsSchema.safeParse({ id }).success).toBe(false);
    },
  );
});
