import { test, expect, type Locator, type Page } from "@playwright/test";
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
    failList: false,
    failWrites: false,
    readGate: null as Promise<void> | null,
    writeGate: null as Promise<void> | null,
  };
  await page.route("**/api/movies**", async (route) => {
    const request = route.request();
    const method = request.method();
    await (method === "GET" ? controls.readGate : controls.writeGate);
    if (
      (method === "GET" && controls.failList) ||
      (method !== "GET" && controls.failWrites)
    ) {
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
      await route.fulfill({ json: movies });
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
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockApi(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page
    .getByRole("textbox", { name: /Movie title/ })
    .fill("  In the Mood for Love  ");
  await page.getByRole("textbox", { name: "Notes" }).fill("Watch on Friday");
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("heading", { name: "In the Mood for Love", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Movie title/ })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("textbox", { name: /Movie title/ }),
  ).toBeFocused();
  await expect(
    page.locator("[data-sonner-toast][data-type=success]"),
  ).toContainText("Added");
  await page.reload();
  const toggle = page.getByRole("button", {
    name: "Watched: In the Mood for Love",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toBeEnabled();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Delete In the Mood for Love", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Keep movie" })).toBeFocused();
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
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, []);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Add your first movie" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-empty.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(
    page.getByRole("textbox", { name: /Movie title/ }),
  ).toBeFocused();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-long-content.png"),
    fullPage: true,
    animations: "disabled",
  });
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
  await page.screenshot({
    path: testInfo.outputPath("mobile-dialog.png"),
    fullPage: false,
    animations: "disabled",
  });
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

test("HTTP errors preserve inputs, roll back writes, and can be retried", async ({
  page,
}) => {
  const api = await mockApi(page);
  api.failList = true;
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Couldn't load your movies" }),
  ).toBeVisible();
  api.failList = false;
  await page.getByRole("button", { name: "Try again" }).click();
  const toggle = page.getByRole("button", {
    name: "Watched: Perfect Days",
    exact: true,
  });
  await expect(toggle).toBeVisible();
  api.failWrites = true;
  await toggle.click();
  await expect(
    page.locator("[data-sonner-toast][data-type=error]"),
  ).toContainText("Something went wrong");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Close toast" }).click();
  await page
    .getByRole("textbox", { name: /Movie title/ })
    .fill("Keep this draft");
  await page.getByRole("button", { name: "Add to watchlist" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Something went wrong",
  );
  await expect(page.getByRole("textbox", { name: /Movie title/ })).toHaveValue(
    "Keep this draft",
  );
  await page
    .getByRole("button", { name: "Delete Perfect Days", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete movie", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText(
    "Something went wrong",
  );
  api.failWrites = false;
  await page.getByRole("button", { name: "Delete movie", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Perfect Days", exact: true }),
  ).toHaveCount(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`pending actions provide continuous feedback with motion preference: ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    const api = await mockApi(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Perfect Days", exact: true }),
    ).toBeVisible();

    let release!: () => void;
    const holdWrite = () => {
      api.writeGate = new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    const verifyPending = async (button: Locator) => {
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
      const start = await spinner.evaluate((element) =>
        Number(element.getAnimations()[0]?.currentTime ?? 0),
      );
      await expect
        .poll(() =>
          spinner.evaluate((element) =>
            Number(element.getAnimations()[0]?.currentTime ?? 0),
          ),
        )
        .toBeGreaterThan(start + 100);
      expect(
        await spinner.evaluate(
          (element) => element.getAnimations()[0]?.playState,
        ),
      ).toBe("running");
    };

    try {
      holdWrite();
      await page.getByLabel("Movie title").fill("Slow request check");
      await page.getByRole("button", { name: "Add to watchlist" }).click();
      await verifyPending(page.getByRole("button", { name: "Adding movie…" }));
      release();
      await expect(
        page.getByRole("button", { name: "Add to watchlist" }),
      ).toBeEnabled();

      holdWrite();
      const toggle = page.getByRole("button", {
        name: "Watched: Perfect Days",
        exact: true,
      });
      await toggle.click();
      await expect(toggle).toHaveText("Saving…");
      await verifyPending(toggle);
      release();
      await expect(toggle).toBeEnabled();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");

      await page
        .getByRole("button", { name: "Delete Perfect Days", exact: true })
        .click();
      holdWrite();
      await page
        .getByRole("button", { name: "Delete movie", exact: true })
        .click();
      await verifyPending(page.getByRole("button", { name: "Deleting…" }));
      release();
      await expect(page.getByRole("alertdialog")).toBeHidden();
    } finally {
      release?.();
    }
  });
}

for (const width of [320, 768, 1440]) {
  test(`list skeleton and populated layout fit a ${width}px viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const api = await mockApi(page);
    let release!: () => void;
    api.readGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto("/");
      await expect(
        page.getByRole("status", { name: "Loading movies" }),
      ).toBeVisible();
      expect(
        await page.locator('[data-slot="skeleton"]').count(),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`loading-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      release();
      await expect(
        page.getByRole("heading", { name: "Perfect Days", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`collection-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
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
  await expect(
    page.getByText("<script>alert(1)</script>", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test("title search uses the URL, survives refresh, and filters without refetching", async ({
  page,
}) => {
  await mockApi(page);
  let reads = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/movies" &&
      request.method() === "GET"
    )
      reads++;
  });
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
  const initialReads = reads;
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
  await search.pressSequentially("perfect days");
  await expect(
    page.getByRole("list", { name: "Movies" }).getByRole("listitem"),
  ).toHaveCount(1);
  expect(reads).toBe(initialReads);
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
