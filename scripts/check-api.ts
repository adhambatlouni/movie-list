import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Movie, MoviePage } from "../src/features/movies/types";

const port = Number(process.argv[2] ?? 3000);
assert.ok(
  Number.isInteger(port) && port > 0 && port <= 65535,
  "Supply a valid local port.",
);
const baseUrl = `http://127.0.0.1:${port}/api/movies`;
const tag = `[API check] ${randomUUID()}`;
const titles = [
  `${tag} first`,
  `${tag} second`,
  ...Array.from(
    { length: 6 },
    (_, index) => `${tag} extra ${index} .*_[x]%$\\(literal)`,
  ),
];

const call = async (path = "", method = "GET", body?: unknown) => {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
};

const listPage = async (q = tag, page = 1): Promise<MoviePage> => {
  const response = await call(
    `?${new URLSearchParams({ q, page: String(page) })}`,
  );
  assert.equal(response.status, 200, "Listing movies failed.");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result: MoviePage = await response.json();
  assert.ok(Array.isArray(result.movies), "GET must return a movies array.");
  assert.equal(result.pageSize, 5);
  return result;
};
const list = async () => (await listPage()).movies;

const checkApi = async () => {
  console.log(`Checking movie endpoints on local port ${port}...`);
  let passed = false;

  try {
    const firstResponse = await call("", "POST", {
      title: `  ${titles[0]}  `,
      notes: "  Keep this note  ",
    });
    assert.equal(firstResponse.status, 201, "Create failed.");
    const first: Movie = await firstResponse.json();
    assert.equal(first.title, titles[0]);
    assert.equal(first.notes, "Keep this note");
    assert.equal(first.watched, false);

    const secondResponse = await call("", "POST", { title: titles[1] });
    assert.equal(secondResponse.status, 201);
    const second: Movie = await secondResponse.json();
    assert.equal(second.notes, null);

    const movies = await list();
    const firstIndex = movies.findIndex((movie) => movie.id === first.id);
    const secondIndex = movies.findIndex((movie) => movie.id === second.id);
    assert.ok(
      firstIndex >= 0 && secondIndex >= 0,
      "Created movies were not persisted.",
    );
    assert.ok(secondIndex < firstIndex, "Movies must be listed newest first.");

    for (const watched of [true, false]) {
      const response = await call(`/${first.id}`, "PATCH", { watched });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ...first, watched });
      const saved = (await list()).find((movie) => movie.id === first.id);
      assert.equal(saved?.watched, watched, "Watched status did not persist.");
    }

    const invalid = await call("", "POST", { title: " \n" });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "VALIDATION_ERROR");
    assert.equal(
      (await call(`/${first.id}`, "PATCH", { watched: true, title: "Edited" }))
        .status,
      400,
    );
    assert.equal((await call("/not-a-uuid", "DELETE")).status, 400);
    assert.equal(
      (await call(`/${randomUUID()}`, "PATCH", { watched: true })).status,
      404,
    );
    assert.equal((await call("", "PUT", {})).status, 405);

    const deleted = await call(`/${first.id}`, "DELETE");
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), "");
    assert.ok(
      !(await list()).some((movie) => movie.id === first.id),
      "Deletion did not persist.",
    );
    assert.equal((await call(`/${first.id}`, "DELETE")).status, 404);

    for (const title of titles.slice(2)) {
      assert.equal((await call("", "POST", { title })).status, 201);
    }
    const firstPage = await listPage(tag.toUpperCase());
    const secondPage = await listPage(tag, 2);
    assert.equal(firstPage.total, 7);
    assert.equal(firstPage.movies.length, 5);
    assert.equal(secondPage.movies.length, 2);
    assert.equal(
      new Set(
        [...firstPage.movies, ...secondPage.movies].map((movie) => movie.id),
      ).size,
      7,
    );
    assert.deepEqual(
      await listPage(tag, 999),
      secondPage,
      "Out-of-range pages must clamp to the last page.",
    );
    const literal = await listPage(titles[2]);
    assert.equal(literal.total, 1, "Search punctuation must be literal.");
    assert.equal(literal.movies[0].title, titles[2]);
    assert.equal((await listPage(`${tag} absent`)).total, 0);
    assert.equal((await call("?page=0")).status, 400);
    passed = true;
  } finally {
    // Find only this run's uniquely named records, even if a POST response was
    // lost after its insert. Never delete the user's other movies.
    try {
      let remaining = (await list()).filter((movie) =>
        titles.includes(movie.title),
      );
      while (remaining.length) {
        for (const movie of remaining) {
          assert.equal(
            (await call(`/${movie.id}`, "DELETE")).status,
            204,
            "Cleanup failed.",
          );
        }
        remaining = (await list()).filter((movie) =>
          titles.includes(movie.title),
        );
      }
      assert.ok(
        !(await list()).some((movie) => titles.includes(movie.title)),
        "Cleanup did not persist.",
      );
    } catch (error) {
      console.error(
        `Cleanup could not finish. Remove only movies whose titles start with "${tag}".`,
      );
      if (passed) throw error;
    }
  }

  console.log(
    "PASS: CRUD persistence, newest-first ordering, server search, literal punctuation, five-row pages, page bounds, validation, 404, and 405. Test movies removed.",
  );
};

checkApi().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "API check failed.");
  process.exitCode = 1;
});
