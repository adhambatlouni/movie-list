/** @jest-environment jsdom */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import "@testing-library/jest-dom/jest-globals";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { Movie } from "../types";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const { toast } = jest.requireMock<typeof import("sonner")>("sonner");

jest.mock("../services/movies-api", () => ({
  ...jest.requireActual<typeof import("../services/movies-api")>(
    "../services/movies-api",
  ),
  fetchMovies: jest.fn(),
  addMovie: jest.fn(),
  setMovieWatched: jest.fn(),
  removeMovie: jest.fn(),
}));

// Load after registering the mock; next/jest's SWC transform does not hoist
// jest.mock calls that use the explicitly imported Jest globals.
const api = jest.mocked(
  jest.requireMock<typeof import("../services/movies-api")>(
    "../services/movies-api",
  ),
);
const { MovieWatchlist } =
  jest.requireActual<typeof import("./movie-watchlist")>("./movie-watchlist");

const arrival: Movie = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Arrival",
  notes: "For a quiet evening",
  watched: false,
  created_at: "2026-10-15T12:00:00.000Z",
};
const perfectDays: Movie = {
  ...arrival,
  id: "00000000-0000-4000-8000-000000000002",
  title: "Perfect Days",
  notes: null,
  created_at: "2026-10-15T13:00:00.000Z",
};
let client: QueryClient;

const setup = () => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={client}>
      <MovieWatchlist />
    </QueryClientProvider>,
  );
  return userEvent.setup();
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  api.fetchMovies.mockReset().mockResolvedValue([arrival]);
  api.addMovie.mockReset();
  api.setMovieWatched.mockReset();
  api.removeMovie.mockReset();
});

afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe("MovieWatchlist", () => {
  it("announces loading, then shows an empty state that focuses the add form", async () => {
    const pending = deferred<Movie[]>();
    api.fetchMovies.mockReturnValue(pending.promise);
    const user = setup();
    expect(screen.getByRole("status")).toHaveTextContent("Loading movies");
    await act(async () => pending.resolve([]));
    await user.click(
      await screen.findByRole("button", { name: "Add your first movie" }),
    );
    expect(screen.getByRole("textbox", { name: /Movie title/ })).toHaveFocus();
  });

  it("shows a readable list error and lets the user retry", async () => {
    api.fetchMovies.mockRejectedValueOnce(new Error("Connection unavailable."));
    const user = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connection unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Arrival" }),
    ).toBeVisible();
  });

  it("preserves the API's newest-first order and renders optional notes", async () => {
    api.fetchMovies.mockResolvedValue([perfectDays, arrival]);
    setup();
    const list = await screen.findByRole("list", { name: "Movies" });
    expect(
      within(list)
        .getAllByRole("heading")
        .map((heading) => heading.textContent),
    ).toEqual(["Perfect Days", "Arrival"]);
    expect(within(list).getByText("For a quiet evening")).toBeVisible();
  });

  it("rejects a whitespace-only title and focuses the invalid field", async () => {
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: /Movie title/ }),
      "   ",
    );
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Title is required.",
    );
    expect(screen.getByRole("textbox", { name: /Movie title/ })).toHaveFocus();
    expect(
      screen.getByRole("textbox", { name: /Movie title/ }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(api.addMovie).not.toHaveBeenCalled();
  });

  it("sends normalized form values, prevents duplicate submissions, and clears only after success", async () => {
    const pending = deferred<Movie>();
    api.addMovie.mockReturnValue(pending.promise);
    const user = setup();
    const title = screen.getByRole("textbox", { name: /Movie title/ });
    await user.type(title, "  Perfect Days  ");
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "   ");
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    await waitFor(() => expect(api.addMovie).toHaveBeenCalledTimes(1));
    expect(api.addMovie.mock.calls[0][0]).toEqual({
      title: "Perfect Days",
      notes: null,
    });
    expect(
      screen.getByRole("button", { name: "Adding movie…" }),
    ).toBeDisabled();
    expect(title).toHaveValue("  Perfect Days  ");
    api.fetchMovies.mockResolvedValue([perfectDays, arrival]);
    await act(async () => pending.resolve(perfectDays));
    expect(
      await screen.findByRole("heading", { name: "Perfect Days" }),
    ).toBeVisible();
    await waitFor(() => expect(title).toHaveValue(""));
    expect(title).toHaveFocus();
    expect(api.fetchMovies).toHaveBeenCalledTimes(1);
  });

  it("keeps the user's inputs when adding fails", async () => {
    api.addMovie.mockRejectedValue(
      new api.MovieApiError("Couldn't save the movie."),
    );
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: /Movie title/ }),
      "Perfect Days",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Notes" }),
      "Recommended by a friend",
    );
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save the movie.",
    );
    expect(screen.getByRole("textbox", { name: /Movie title/ })).toHaveValue(
      "Perfect Days",
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(
      "Recommended by a friend",
    );
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeEnabled();
  });

  it("attaches server field errors to the matching form input", async () => {
    api.addMovie.mockRejectedValue(
      new api.MovieApiError("Request validation failed.", [
        { path: "title", message: "Please check this title." },
      ]),
    );
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: /Movie title/ }),
      "Perfect Days",
    );
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: /Movie title/ }),
      ).toHaveAccessibleDescription("Please check this title."),
    );
  });

  it("updates watched immediately, disables overlapping writes, and rolls back a failed save", async () => {
    const pending = deferred<Movie>();
    api.setMovieWatched.mockReturnValue(pending.promise);
    const user = setup();
    const toggle = await screen.findByRole("button", {
      name: "Watched: Arrival",
    });
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
    expect(toggle).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Delete Arrival" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeDisabled();
    await act(async () =>
      pending.reject(new api.MovieApiError("Couldn't save watched status.")),
    );
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toast.error).toHaveBeenCalledWith("Couldn't save watched status.");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(api.fetchMovies).toHaveBeenCalledTimes(2);
  });

  it("supports marking a movie watched and unwatched", async () => {
    let saved = arrival;
    api.fetchMovies.mockImplementation(async () => [saved]);
    api.setMovieWatched.mockImplementation(async (_id, input) => {
      saved = { ...saved, ...input };
      return saved;
    });
    const user = setup();
    const toggle = await screen.findByRole("button", {
      name: "Watched: Arrival",
    });
    await user.click(toggle);
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(api.setMovieWatched).toHaveBeenLastCalledWith(arrival.id, {
      watched: false,
    });
    expect(api.fetchMovies).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenLastCalledWith(
      expect.stringContaining("unwatched"),
    );
  });

  it("requires delete confirmation and returns focus when cancelled", async () => {
    const user = setup();
    const trigger = await screen.findByRole("button", {
      name: "Delete Arrival",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("alertdialog");
    const cancel = within(dialog).getByRole("button", { name: "Keep movie" });
    expect(cancel).toHaveFocus();
    await user.click(cancel);
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(api.removeMovie).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("deletes optimistically after confirmation and restores focus to the collection", async () => {
    const pending = deferred<void>();
    api.removeMovie.mockReturnValue(pending.promise);
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete Arrival" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete movie" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Arrival", hidden: true }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    api.fetchMovies.mockResolvedValue([]);
    await act(async () => pending.resolve());
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: /Your collection/ }),
    ).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Add your first movie" }),
    ).toBeVisible();
    expect(api.fetchMovies).toHaveBeenCalledTimes(1);
  });

  it("fetches the complete collection when adding before any successful list load", async () => {
    api.fetchMovies
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue([perfectDays, arrival]);
    api.addMovie.mockResolvedValue(perfectDays);
    const user = setup();
    await screen.findByRole("alert");
    await user.type(
      screen.getByRole("textbox", { name: /Movie title/ }),
      "Perfect Days",
    );
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(
      await screen.findByRole("heading", { name: "Arrival" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Perfect Days" })).toBeVisible();
    expect(api.fetchMovies).toHaveBeenCalledTimes(2);
  });

  it("cancels an outdated list request and uses the server's saved movie without another GET", async () => {
    const user = setup();
    const toggle = await screen.findByRole("button", {
      name: "Watched: Arrival",
    });
    const oldRead = deferred<Movie[]>();
    const save = deferred<Movie>();
    api.fetchMovies.mockReturnValueOnce(oldRead.promise);
    api.setMovieWatched.mockReturnValue(save.promise);
    let refresh!: Promise<void>;
    act(() => {
      refresh = client.invalidateQueries({ queryKey: ["movies"] });
    });
    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledTimes(2));
    const signal = api.fetchMovies.mock.calls[1][0];
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      oldRead.resolve([arrival]);
      await refresh;
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    // The response is authoritative even when it differs from our prediction.
    await act(async () =>
      save.resolve({ ...arrival, notes: "Confirmed by server" }),
    );
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Confirmed by server")).toBeVisible();
    expect(api.fetchMovies).toHaveBeenCalledTimes(2);
  });

  it("skips focus and reconnect refreshes during writes, then refreshes stale data on focus", async () => {
    const pending = deferred<Movie>();
    api.setMovieWatched.mockReturnValue(pending.promise);
    const user = setup();
    const toggle = await screen.findByRole("button", {
      name: "Watched: Arrival",
    });
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(api.fetchMovies).toHaveBeenCalledTimes(1);
    const saved = { ...arrival, watched: true };
    api.fetchMovies.mockResolvedValue([saved]);
    await act(async () => pending.resolve(saved));
    await waitFor(() => expect(toggle).toBeEnabled());
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledTimes(2));
  });

  it("restores a movie after failed deletion and lets the user retry in the dialog", async () => {
    api.removeMovie.mockRejectedValueOnce(
      new api.MovieApiError("Couldn't delete this movie."),
    );
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete Arrival" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete movie" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't delete this movie.",
    );
    expect(
      screen.getByRole("heading", { name: "Arrival", hidden: true }),
    ).toBeInTheDocument();
    api.removeMovie.mockResolvedValue(undefined);
    api.fetchMovies.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Delete movie" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(api.removeMovie).toHaveBeenCalledTimes(2);
  });

  it("keeps cached movies visible when refreshing fails", async () => {
    const user = setup();
    await screen.findByRole("heading", { name: "Arrival" });
    api.fetchMovies.mockRejectedValueOnce(new Error("Unavailable"));
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["movies"] });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Showing the last loaded movies.",
    );
    expect(screen.getByRole("heading", { name: "Arrival" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry refresh" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });

  it("lets the user retry a failed form submission with Enter and clears the old error", async () => {
    api.addMovie
      .mockRejectedValueOnce(new api.MovieApiError("Save failed."))
      .mockResolvedValue(perfectDays);
    const user = setup();
    await user.type(
      screen.getByRole("textbox", { name: /Movie title/ }),
      "  Perfect Days  ",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Notes" }),
      "  Watch this weekend  ",
    );
    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed.");
    await user.click(screen.getByRole("textbox", { name: /Movie title/ }));
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /Movie title/ })).toHaveValue(
        "",
      ),
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.addMovie.mock.calls[1][0]).toEqual({
      title: "Perfect Days",
      notes: "Watch this weekend",
    });
  });

  it("rolls back watched status before reconciliation completes, even if that read also fails", async () => {
    const save = deferred<Movie>();
    const refresh = deferred<Movie[]>();
    api.setMovieWatched.mockReturnValue(save.promise);
    const user = setup();
    const toggle = await screen.findByRole("button", {
      name: "Watched: Arrival",
    });
    api.fetchMovies.mockReturnValueOnce(refresh.promise);
    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
    await act(async () => save.reject(new api.MovieApiError("Save failed.")));
    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledTimes(2));
    // The pending GET cannot supply the original value: rollback must restore it.
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toBeDisabled();
    await act(async () => refresh.reject(new Error("Still offline")));
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toast.error).toHaveBeenCalledWith("Save failed.");
    expect(screen.getByText(/Showing the last loaded movies/)).toBeVisible();
  });

  it("restores a deleted movie in its original position before reconciliation returns", async () => {
    api.fetchMovies.mockResolvedValue([perfectDays, arrival]);
    const save = deferred<void>();
    const refresh = deferred<Movie[]>();
    api.removeMovie.mockReturnValue(save.promise);
    const user = setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete Perfect Days" }),
    );
    api.fetchMovies.mockReturnValueOnce(refresh.promise);
    await user.click(screen.getByRole("button", { name: "Delete movie" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Perfect Days", hidden: true }),
      ).not.toBeInTheDocument(),
    );
    await act(async () => save.reject(new api.MovieApiError("Delete failed.")));
    await waitFor(() => expect(api.fetchMovies).toHaveBeenCalledTimes(2));
    const list = screen.getByRole("list", { hidden: true });
    expect(
      within(list)
        .getAllByRole("heading", { hidden: true })
        .map((heading) => heading.textContent),
    ).toEqual(["Perfect Days", "Arrival"]);
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    // A lost response can mean the delete actually succeeded. A fresh server
    // result should then replace the rolled-back snapshot.
    await act(async () => refresh.resolve([arrival]));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Delete failed.",
    );
    expect(
      screen.queryByRole("heading", { name: "Perfect Days", hidden: true }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep movie" }));
    expect(screen.getByRole("heading", { name: "Arrival" })).toBeVisible();
  });
});
