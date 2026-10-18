import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Movie } from "../../src/features/movies/types";

const fixtures: Movie[] = [
  {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Perfect Days",
    notes: "For a slow Sunday. Recommended by Maya.",
    watched: false,
    created_at: "2026-10-15T15:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "The Grand Budapest Hotel",
    notes: "A little adventure, a very good color palette.",
    watched: false,
    created_at: "2026-10-15T14:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Arrival",
    notes: "Even better the second time.",
    watched: true,
    created_at: "2026-10-15T13:00:00Z",
  },
];

const mockApi = async (page: Page, initial: Movie[] = fixtures) => {
  let movies = initial.map((movie) => ({ ...movie }));
  const controls = {
    failWrites: false,
    readGate: null as Promise<void> | null,
    writeGate: null as Promise<void> | null,
  };

  await page.route("**/api/movies**", async (route) => {
    const request = route.request();
    const method = request.method();
    await (method === "GET" ? controls.readGate : controls.writeGate);
    if (method !== "GET" && controls.failWrites) {
      await route.fulfill({
        status: 500,
        json: {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong. Please try again.",
          },
        },
      });

      return;
    }

    if (method === "GET") {
      const params = new URL(request.url()).searchParams;
      const q = (params.get("q") ?? "").toLowerCase();
      const matches = movies.filter((movie) =>
        movie.title.toLowerCase().includes(q),
      );

      const current = Math.min(
        Number(params.get("page") ?? 1),
        Math.max(1, Math.ceil(matches.length / 5)),
      );

      await route.fulfill({
        json: {
          movies: matches.slice((current - 1) * 5, current * 5),
          total: matches.length,
          page: current,
          pageSize: 5,
        },
      });
    } else if (method === "POST") {
      const movie: Movie = {
        ...request.postDataJSON(),
        id: crypto.randomUUID(),
        watched: false,
        created_at: new Date().toISOString(),
      };

      movies.unshift(movie);
      await route.fulfill({ status: 201, json: movie });
    } else {
      const id = request.url().split("/").at(-1);
      if (method === "DELETE") {
        movies = movies.filter((movie) => movie.id !== id);
        await route.fulfill({ status: 204 });
      } else if (method === "PATCH") {
        const movie = movies.find((entry) => entry.id === id)!;
        movie.watched = request.postDataJSON().watched;
        await route.fulfill({ json: movie });
      } else {
        await route.fulfill({ status: 405 });
      }
    }
  });

  return controls;
};

test("desktop: add, reload, toggle both ways, confirm delete, and keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toBeVisible();

  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.getByRole("button", { name: "Add movie", exact: true }).click();
  await page
    .getByRole("textbox", { name: /Movie title/ })
    .fill("  In the Mood for Love  ");

  await page.getByRole("textbox", { name: "Notes" }).fill("Watch on Friday");
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("heading", { name: "In the Mood for Love", exact: true }),
  ).toBeVisible();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Add movie", exact: true }),
  ).toBeFocused();

  await expect(
    page.locator("[data-sonner-toast][data-type=success]"),
  ).toContainText("Added");

  await page.reload();
  const toggle = page.getByRole("checkbox", {
    name: "Watched: In the Mood for Love",
    exact: true,
  });

  const movieRow = page
    .getByRole("list", { name: "Movies" })
    .getByRole("listitem")
    .filter({ has: toggle });

  await expect(movieRow.getByText("To watch", { exact: true })).toBeVisible();
  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(toggle).toBeEnabled();
  await expect(movieRow.getByText("Watched", { exact: true })).toBeVisible();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(movieRow.getByText("To watch", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Delete In the Mood for Love", exact: true })
    .click();

  await expect(page.getByRole("button", { name: "Keep movie" })).toBeFocused();
  // Measure final colors after the dialog and toast transitions finish.
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });

  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.getByRole("button", { name: "Delete movie", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /Your collection/ }),
  ).toBeFocused();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "In the Mood for Love", exact: true }),
  ).toHaveCount(0);

  expect(errors).toEqual([]);
});

test("phone: empty state, validation, long content, and accessible delete dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, []);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Add your first movie" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add your first movie" }).click();
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("textbox", { name: /Movie title/ }),
  ).toBeFocused();

  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Title is required.",
  );

  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  const longTitle = "A".repeat(180);
  await page.getByRole("textbox", { name: /Movie title/ }).fill(longTitle);
  await page
    .getByRole("textbox", { name: "Notes" })
    .fill("A long recommendation\n" + "B".repeat(300));

  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("heading", { name: longTitle, exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Close toast" }).click();
  const notes = page.getByRole("button", {
    name: `Notes for ${longTitle}`,
    exact: true,
  });

  await expect(notes).toHaveAttribute("aria-expanded", "false");
  await notes.focus();
  await notes.press("Enter");
  await expect(notes).toHaveAttribute("aria-expanded", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page
    .getByRole("button", { name: `Delete ${longTitle}`, exact: true })
    .click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);

  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.getByRole("button", { name: "Keep movie" }).click();
  await expect(
    page.getByRole("button", { name: `Delete ${longTitle}`, exact: true }),
  ).toBeFocused();
});

// One delayed request verifies the shared spinner in both OS motion settings.
for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`the add spinner keeps moving with motion preference: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const api = await mockApi(page);
    let release!: () => void;
    api.writeGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      await page.goto("/");
      await page.getByRole("button", { name: "Add movie", exact: true }).click();
      await page.getByLabel("Movie title").fill("Slow request check");
      await page.getByRole("button", { name: "Add to watchlist" }).click();

      const button = page.getByRole("button", { name: /Adding movie/ });
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute("aria-busy", "true");

      const spinner = button.locator('[data-slot="spinner"]');
      await expect(spinner).toBeVisible();
      const initialTransform = await spinner.evaluate(
        (element) => getComputedStyle(element).transform,
      );
      await expect
        .poll(() =>
          spinner.evaluate((element) => getComputedStyle(element).transform),
        )
        .not.toBe(initialTransform);

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Close add movie" }),
      ).toBeDisabled();
      release();
      await expect(page.getByRole("dialog")).toBeHidden();
    } finally {
      release();
    }
  });
}

for (const width of [320, 768]) {
  test(`list skeleton and populated layout fit a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const api = await mockApi(page);
    let release!: () => void;
    api.readGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      await page.goto("/");
      // The route fallback can coexist with streamed content during hydration.
      const collection = page.getByRole("region", { name: "Your collection" });
      const loadingMovies = collection.getByRole("status", {
        name: "Loading movies",
      });

      await expect(collection).toBeVisible();
      await expect(loadingMovies).toBeVisible();
      await expect(
        collection.locator('[data-slot="pagination-skeleton"]'),
      ).toBeVisible();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);

      release();
      await expect(
        page.getByRole("heading", { name: "Perfect Days", exact: true }),
      ).toBeVisible();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      release?.();
    }
  });
}

test("movie titles and notes are displayed as text, not executable HTML", async ({
  page,
}) => {
  const title = '<img src=x onerror="alert(1)">';
  await mockApi(page, [
    { ...fixtures[0], title, notes: "<script>alert(1)</script>" },
  ]);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: `Notes for ${title}`, exact: true })
    .click();

  await expect(
    page.getByText("<script>alert(1)</script>", { exact: true }),
  ).toBeVisible();

  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test("title search uses the URL and survives refresh and Back navigation", async ({
  page,
}) => {
  await mockApi(page);

  await page.goto("/?q=ARRival&other=keep");
  const search = page.getByRole("searchbox", {
    name: "Search movies by title",
  });

  await expect(search).toHaveValue("ARRival");
  await expect(
    page.getByRole("heading", { name: "Arrival", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toBeHidden();

  await search.fill("no matches");
  await expect(
    page.getByRole("heading", { name: "No movies match your search" }),
  ).toBeVisible();

  await expect(page).toHaveURL(/q=no\+matches&other=keep/);
  await page.getByRole("button", { name: "Clear title search" }).click();
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(/\?other=keep$/);
  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(3);

  await search.fill("perfect days");
  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(1);

  await page.reload();
  await expect(search).toHaveValue("perfect days");
  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(1);

  await page.evaluate(() => window.history.pushState(null, "", "/?q=arrival"));
  await expect(search).toHaveValue("arrival");
  await page.goBack();
  await expect(search).toHaveValue("perfect days");
});

const paginatedFixtures = Array.from({ length: 11 }, (_, index) => ({
  ...fixtures[0],
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  title: `Movie ${String(index + 1).padStart(2, "0")}`,
  notes: null,
}));

test("an older search response cannot replace the newest search results", async ({
  page,
}) => {
  await mockApi(page);
  let release!: () => void;
  let finished!: () => void;
  const delivered = new Promise<void>((resolve) => {
    finished = resolve;
  });

  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route("**/api/movies?q=arrival&*", async (route) => {
    await gate;
    await route.fulfill({
      json: { movies: [fixtures[2]], total: 1, page: 1, pageSize: 5 },
    });

    finished();
  });

  try {
    await page.goto("/");
    const search = page.getByRole("searchbox");
    const started = page.waitForRequest(
      (request) => new URL(request.url()).searchParams.get("q") === "arrival",
    );

    await search.fill("arrival");
    await started;
    await search.fill("perfect");
    await expect(
      page.getByRole("heading", { name: "Perfect Days", exact: true }),
    ).toBeVisible();

    release();
    await delivered;
    await expect(page).toHaveURL(/q=perfect/);
    await expect(
      page.getByRole("heading", { name: "Arrival", exact: true }),
    ).toBeHidden();
  } finally {
    release();
  }
});

test("pagination shows five movies, preserves URL state, and resets for search and creation", async ({
  page,
}) => {
  await mockApi(page, paginatedFixtures);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?other=keep");
  const list = page.getByRole("list", { name: "Movies" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await expect(
    page.getByText("1-5 of 11 movies", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Go to next page" }).click();
  await expect(page).toHaveURL(/other=keep&page=2/);
  await expect(
    page.getByRole("heading", { name: "Movie 06", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Page 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Movie 06", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Page 3", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(page.locator('[aria-label="Go to next page"]')).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Movie 06", exact: true }),
  ).toBeVisible();

  await page.getByRole("searchbox").fill("movie 01");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(page).not.toHaveURL(/page=/);
  await page.getByRole("button", { name: "Clear title search" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(5);
  await page.getByRole("link", { name: "Page 2", exact: true }).click();
  await page.getByRole("button", { name: "Add movie", exact: true }).click();
  await page.getByRole("textbox", { name: /Movie title/ }).fill("Newest movie");
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("heading", { name: "Newest movie", exact: true }),
  ).toBeVisible();

  await expect(page).not.toHaveURL(/page=/);
});

test("deleting the final page item restores it on failure and falls back after success", async ({
  page,
}) => {
  const api = await mockApi(page, paginatedFixtures.slice(0, 6));
  await page.goto("/?page=2");
  await expect(
    page.getByRole("heading", { name: "Movie 06", exact: true }),
  ).toBeVisible();

  api.failWrites = true;
  await page
    .getByRole("button", { name: "Delete Movie 06", exact: true })
    .click();

  await page.getByRole("button", { name: "Delete movie", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Keep movie" }).click();
  await expect(
    page.getByRole("heading", { name: "Movie 06", exact: true }),
  ).toBeVisible();

  api.failWrites = false;
  await page
    .getByRole("button", { name: "Delete Movie 06", exact: true })
    .click();

  await page.getByRole("button", { name: "Delete movie", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(5);

  await expect(
    page.getByText("1-5 of 5 movies", { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: /Your collection/ }),
  ).toBeFocused();
});

test("invalid and out-of-range page parameters still show a valid page", async ({
  page,
}) => {
  await mockApi(page, paginatedFixtures);
  await page.goto("/?page=nope");
  await expect(
    page.getByRole("heading", { name: "Movie 01", exact: true }),
  ).toBeVisible();

  await page.goto("/?page=999");
  await expect(
    page.getByRole("heading", { name: "Movie 11", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(1);
});
