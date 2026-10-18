import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type { Movie } from "../src/features/movies/types";
import { createSupabaseServerClient } from "../src/lib/supabase/server";

loadEnvConfig(process.cwd(), true);

const checkError = (error: { code: string } | null, operation: string) => {
  if (error) {
    throw new Error(
      `${operation} failed (${error.code || "HTTP/network error"}). Check the project URL, secret key, Data API, and migration.`,
    );
  }
};

const checkDatabase = async () => {
  const client = createSupabaseServerClient();
  // A unique title lets cleanup target only this run, even if an insert's
  // response is lost after the database has already saved the row.
  const title = `[connection check] ${randomUUID()}`;
  let operationsPassed = false;

  console.log("Checking Supabase with one temporary movie...");

  try {
    const { data: movie, error: insertError } = await client
      .from("movies")
      .insert({ title })
      .select("*")
      .single();

    checkError(insertError, "Insert");
    assert.ok(movie, "Insert returned no movie.");
    assert.match(
      movie.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    assert.equal(movie.title, title);
    assert.equal(movie.notes, null, "Notes should default to null.");
    assert.equal(movie.watched, false, "Movies should default to unwatched.");
    assert.ok(
      Number.isFinite(Date.parse(movie.created_at)),
      "Missing creation timestamp.",
    );

    // Read through a fresh client to confirm database persistence.
    const reader = createSupabaseServerClient();
    const { data: saved, error: readError } = await reader
      .from("movies")
      .select("*")
      .eq("id", movie.id)
      .single();

    checkError(readError, "Read");
    assert.deepEqual(
      saved,
      movie,
      "The saved movie should match the inserted movie.",
    );

    for (const watched of [true, false]) {
      const { error: updateError } = await client
        .from("movies")
        .update({ watched })
        .eq("id", movie.id);

      checkError(updateError, "Update");

      const reread: PostgrestSingleResponse<Pick<Movie, "watched">> =
        await reader
          .from("movies")
          .select("watched")
          .eq("id", movie.id)
          .single();

      checkError(reread.error, "Read after update");
      assert.equal(
        reread.data?.watched,
        watched,
        "Watched status did not persist.",
      );
    }

    operationsPassed = true;
  } finally {
    const { error: deleteError } = await client
      .from("movies")
      .delete()
      .eq("title", title);

    if (deleteError) {
      console.error(
        `Cleanup failed. If present, remove only the movie titled "${title}" in the Table Editor.`,
      );
      // Preserve the original operation error if a preceding check failed.
      if (operationsPassed) checkError(deleteError, "Cleanup");
    }
  }

  const { data: remaining, error: finalReadError } = await client
    .from("movies")
    .select("id")
    .eq("title", title);

  checkError(finalReadError, "Read after delete");
  assert.deepEqual(remaining, [], "The temporary movie was not deleted.");

  console.log(
    "PASS: insert, UUID/defaults, read, watched/unwatched updates, and deletion. Temporary movie removed.",
  );
};

checkDatabase().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database check failed.",
  );

  process.exitCode = 1;
});
