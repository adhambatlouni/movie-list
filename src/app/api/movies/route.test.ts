import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type { Movie } from "@/features/movies/types";

jest.mock("next/server", () => ({
  connection: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

// Register the request-context mock before loading handlers, without relying
// on the compiler to hoist calls made through the imported Jest helpers.
const { GET, POST } = jest.requireActual<typeof import("./route")>("./route");
const { DELETE, PATCH } =
  jest.requireActual<typeof import("./[id]/route")>("./[id]/route");

const movie: Movie = {
  id: "a1ad0f7f-57e3-4b2c-a021-a46d5c232e19",
  title: "Arrival",
  notes: null,
  watched: false,
  created_at: "2026-10-15T12:00:00+00:00",
};
const context = (id = movie.id) => ({ params: Promise.resolve({ id }) });
const request = (method: string, body?: unknown) =>
  new Request("http://localhost/api/movies", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const databaseResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

let fetchMock: jest.SpiedFunction<typeof fetch>;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SECRET_KEY;

beforeEach(() => {
  // The real handlers, validation, services, and SDK run against a mocked HTTP
  // transport. Tests never connect to Supabase or need real credentials.
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
  fetchMock = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected database request in test."));
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  if (originalUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = originalKey;
});

describe("GET /api/movies", () => {
  it("returns movies using newest-first ordering with an ID tie-breaker", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse([movie]));
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([movie]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("order")).toBe(
      "created_at.desc,id.desc",
    );
    expect(options?.cache).toBe("no-store");
  });

  it("returns an empty array for an empty watchlist", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse([]));
    expect(await (await GET()).json()).toEqual([]);
  });
});

describe("POST /api/movies", () => {
  it("creates a normalized movie and leaves defaults to the database", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse(movie, 201));
    const response = await POST(
      request("POST", { title: "  Arrival  ", notes: " \n" }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(movie);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: "Arrival",
      notes: null,
    });
  });

  it("accepts omitted notes", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse(movie, 201));
    expect((await POST(request("POST", { title: movie.title }))).status).toBe(
      201,
    );
    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).notes,
    ).toBeNull();
  });

  it.each([
    {},
    null,
    [],
    { title: " \n" },
    { title: 1 },
    { title: "A\0B" },
    { title: "Arrival", watched: true },
    { title: "Arrival", notes: 42 },
  ])("rejects invalid input before any database call: %p", async (body) => {
    const response = await POST(request("POST", body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: expect.any(String),
        issues: expect.any(Array),
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/movies/[id]", () => {
  it.each([true, false])(
    "persists watched=%p and only updates that field",
    async (watched) => {
      fetchMock.mockResolvedValueOnce(
        databaseResponse([{ ...movie, watched }]),
      );
      const response = await PATCH(request("PATCH", { watched }), context());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ...movie, watched });
      const [url, options] = fetchMock.mock.calls[0];
      expect(new URL(String(url)).searchParams.get("id")).toBe(
        `eq.${movie.id}`,
      );
      expect(options?.method).toBe("PATCH");
      expect(JSON.parse(String(options?.body))).toEqual({ watched });
    },
  );

  it.each([
    {},
    { watched: "true" },
    { watched: 1 },
    { watched: null },
    { watched: true, title: "Edited" },
    { watched: false, notes: "Edited" },
  ])("rejects invalid updates %p", async (body) => {
    const response = await PATCH(request("PATCH", body), context());
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/movies/[id]", () => {
  it("deletes only the requested ID and returns an empty 204", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse([{ id: movie.id }]));
    const response = await DELETE(request("DELETE"), context());

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("id")).toBe(`eq.${movie.id}`);
    expect(options?.method).toBe("DELETE");
  });
});

describe.each(["PATCH", "DELETE"])("%s ID handling", (method) => {
  const call = (id = movie.id) =>
    method === "PATCH"
      ? PATCH(request("PATCH", { watched: true }), context(id))
      : DELETE(request("DELETE"), context(id));

  it("returns 404 for a missing movie", async () => {
    fetchMock.mockResolvedValueOnce(databaseResponse([]));
    const response = await call();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Movie not found." },
    });
  });

  it("rejects malformed IDs before contacting the database", async () => {
    const response = await call("not-a-uuid");
    expect(response.status).toBe(400);
    expect((await response.json()).error.issues[0].path).toBe("id");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe.each(["POST", "PATCH"])("%s request body handling", (method) => {
  const call = (req: Request) =>
    method === "POST" ? POST(req) : PATCH(req, context());

  it.each(["", "{"])("rejects empty or malformed JSON (%p)", async (body) => {
    const response = await call(
      new Request("http://localhost/api/movies", {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-JSON media types", async () => {
    const response = await call(
      new Request("http://localhost/api/movies", {
        method,
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts JSON with a charset parameter", async () => {
    fetchMock.mockResolvedValueOnce(
      databaseResponse(method === "POST" ? movie : [movie]),
    );
    const body =
      method === "POST" ? { title: movie.title } : { watched: false };
    const response = await call(
      new Request("http://localhost/api/movies", {
        method,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      }),
    );
    expect(response.status).toBe(method === "POST" ? 201 : 200);
  });
});

describe.each([
  ["GET", () => GET()],
  ["POST", () => POST(request("POST", { title: "Arrival" }))],
  ["PATCH", () => PATCH(request("PATCH", { watched: true }), context())],
  ["DELETE", () => DELETE(request("DELETE"), context())],
] as const)("%s failure handling", (_method, call) => {
  it("returns a generic 500 without exposing database details", async () => {
    fetchMock.mockResolvedValueOnce(
      databaseResponse(
        {
          code: "42501",
          message: "private database details",
          details: "internal schema",
          hint: "secret",
        },
        403,
      ),
    );
    const response = await call();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong. Please try again.",
      },
    });
  });

  it("handles a network failure", async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const pending = call();
    // The SDK retries reads with backoff. Advance it without real delays.
    await jest.runAllTimersAsync();
    const response = await pending;
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
