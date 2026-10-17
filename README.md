# Movie Watchlist

A focused movie watchlist built with Next.js App Router, React, TypeScript, and
Supabase. Add a title and optional notes, see the newest movies first, mark films
watched or unwatched, and delete them with confirmation. Changes persist in
PostgreSQL across page refreshes.

V1 deliberately excludes title editing, genre metadata, and authentication. This is a
local development application; public deployment requires the access controls
outlined under [Security](#security).

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and shadcn/ui primitives, with Radix for accessible labels/dialogs
- TanStack Query for requests, caching, and optimistic updates
- React Hook Form and shared Zod schemas for validation
- Supabase PostgreSQL, accessed only from the Next.js server
- Jest, React Testing Library, Playwright, and axe for verification

## Local setup

Use **Node.js 22 or newer** and npm. Run commands inside `movie-watchlist`, the
folder containing `package.json`:

```sh
cd movie-watchlist
npm ci
```

### 1. Configure Supabase

1. Create a development project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open the project's SQL Editor and run the full contents of
   [`supabase/migrations/20261015000100_create_movies.sql`](supabase/migrations/20261015000100_create_movies.sql)
   **once**. Confirm `public.movies` exists. If a table already exists, compare
   schemas first; do not drop existing data or rerun the creation blindly.
3. Copy the Project URL from **Connect**, and a secret key starting with
   `sb_secret_` from **Settings > API Keys**. Use values from the same project.
4. Copy `.env.example` to `.env.local` beside `package.json`. In PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   If `.env.local` already exists, edit it instead of overwriting it. Set:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
   ```

   Neither variable needs a `NEXT_PUBLIC_` prefix. A publishable key and database
   password are not needed for this server-only Data API connection. Keep real
   credentials out of source control; `.env.local` is ignored.
5. Keep Supabase's Data API enabled with the `public` schema exposed.

Applying SQL in the editor does not register a Supabase CLI migration-history
entry. Reconcile that history before adopting `supabase db push` later.

### 2. Verify the database and start the app

```sh
npm run db:check
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The dev and start scripts bind
to localhost. Restart the server after changing environment variables.

The database check creates a uniquely named temporary movie, verifies generated
values and persisted CRUD operations, and removes its test data. To verify the
REST endpoints, leave the server running and use a second terminal:

```sh
npm run api:check
# For a different local port:
npm run api:check -- 3109
```

This verifies ordering, normalization, watched/unwatched persistence, deletion,
server search (including literal punctuation), five-row pagination, page bounds,
validation, and error statuses. Cleanup targets only this run's temporary movies.
If a network failure prevents cleanup, the script prints the exact title prefix
to remove. For a manual UI check, add a movie, refresh, toggle watched, refresh,
then delete and refresh again.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| `package.json` not found | Run npm from `movie-watchlist`, not its parent directory. |
| Missing configuration | Put both values in `.env.local` beside `package.json`, then restart. |
| HTTP 401 / invalid key | Use an `sb_secret_` key from the same project as the URL. |
| Table not found / `PGRST205` | Apply the migration and confirm `public` is exposed to the Data API. |
| Permission denied / `42501` | Check the migration's grants and that the server uses the secret key. |
| Connection failure | Check the URL, network connection, and whether the Supabase project is paused. |

## Run with Docker

Docker is an optional way to run the production application. For everyday
development, continue using `npm run dev`. Install Docker Desktop and start its
Linux container engine, then run these commands beside `package.json`:

```sh
docker build -t movie-watchlist .
docker run --rm --name movie-watchlist --env-file .env.local -p 127.0.0.1:3000:3000 movie-watchlist
```

Open http://localhost:3000. Stop the container with Ctrl+C, or run
`docker stop movie-watchlist` from another terminal. If port 3000 is already in
use, publish `127.0.0.1:3001:3000` instead and open http://localhost:3001.

Configure Supabase and apply the migration as described above first. In
`.env.local`, use plain `NAME=value` lines without surrounding quotes. Docker's
env-file parser does not perform Next.js-style variable expansion. Recreate the
container after changing credentials. Movie data stays in hosted Supabase, so
removing the container does not remove the watchlist.

The Dockerfile uses two stages: the builder installs locked dependencies and
builds Next.js; the runtime copies only standalone output and static assets and
runs as the non-root `node` user. `.dockerignore` keeps local dependencies, build
output, Git history, and environment files out of the build context. Supabase
credentials are supplied only when starting the container, not when building it.
The build needs internet access for npm packages, the base image, and Geist fonts.

The container listens on `0.0.0.0` internally so port forwarding works; the run
command publishes the port only on your computer's loopback interface. This
does not deploy the app or replace the production access controls in Security.
Compose is unnecessary here because only the app runs in a container.

To verify real database operations through the running container:

```sh
npm run api:check
# If you published port 3001 instead:
npm run api:check -- 3001
```

These checks use temporary records and require Node locally. Rebuild the image
after source changes. Tests continue to run through the existing npm/CI commands.

## Architecture

```text
React components -> TanStack Query hooks -> browser API client
                                            |
                                   Next.js Route Handlers
                                            |
                                   server movie services
                                            |
                                   Supabase / PostgreSQL
```

```text
src/
  app/
    layout.tsx               Shared header, footer, main landmark, query provider
    page.tsx                 Composes the movie feature
    loading.tsx              Route-level skeleton fallback
    globals.css              Theme tokens, focus styles, reduced-motion behavior
    api/movies/              Collection and [id] REST handlers, API tests
  features/movies/
    components/              Watchlist orchestration and interaction tests
      elements/              Form, movie item, search, pagination, list skeleton
      overlays/              Add movie and delete confirmation dialogs
    hooks/                   Query cache and mutations
    schemas/                 Shared Zod validation and inferred request types
    services/                Browser HTTP client and server-only DB operations
    types.ts                 Database movie type and paginated response
  components/
    query-provider.tsx       One QueryClient per mounted application
    ui/                      Shared shadcn primitives and loading indicator
  lib/
    api/                     JSON parsing and consistent error responses
    supabase/                Server-only client and database types
    utils.ts                 Class-name merging
scripts/                     Live database and API checks
supabase/migrations/         Versioned SQL schema
tests/e2e/                   Browser workflows, accessibility, responsive checks
```

Movie-specific logic stays inside its feature. Shared UI and infrastructure stay
outside it. Components and application functions use arrow functions. There are
no generic repository layers, global state stores, or duplicate model definitions.

## Technical decisions

### Validation and persistence

The form and API use the same strict Zod schemas. Titles and notes are trimmed;
empty notes become `null`. Blank titles, invalid UUIDs, null characters, extra
fields, and non-boolean watched values are rejected. There are no arbitrary text
length limits. React renders titles and notes as text, not HTML.

| Column | PostgreSQL type | Constraint/default |
| --- | --- | --- |
| `id` | `uuid` | Primary key; `gen_random_uuid()` |
| `title` | `text` | Required; database check rejects blank values |
| `notes` | `text` | Nullable |
| `watched` | `boolean` | Required; defaults to `false` |
| `created_at` | `timestamptz` | Required; defaults to `now()` |

Titles may repeat. Reads order by `created_at DESC, id DESC`; a matching index
supports deterministic newest-first results. The server client is initialized
when needed, so builds do not require working database credentials. Database reads
and list responses use `no-store` to avoid stale HTTP/server caches.

### Query cache and optimistic writes

- Each search/page has a separate cache entry: `['movies', { q, page }]`.
  Queries stay fresh for 30 seconds. There is no polling.
- Toggle and delete cancel in-flight reads, snapshot cached pages, and update
  visible records immediately. Failed writes restore those snapshots before
  refetching. Successful toggles use the returned record without another GET.
- Creation returns to the unfiltered first page and refreshes it. Deletion
  refreshes the active page to fill the gap and correct totals. Other cached
  pages become stale and refresh when visited.
- Failures refetch because the database may have changed despite a lost response.
- The UI permits one write at a time to keep rollback straightforward. Stale
  data refreshes on mount, focus, or reconnect; focus/reconnect refreshes are
  suppressed during writes. This is not a realtime multi-user application.

### Search, pagination, and notifications

Search and pagination run on the server. The browser sends `q` and `page` to
`GET /api/movies`. Supabase filters titles case-insensitively and returns at most
five rows, ordered newest first. Search escapes regex characters before using
PostgREST's `imatch` operator, so punctuation is literal rather than a wildcard.
Genre is not stored.

The service counts matching rows, clamps the requested page to the available
range, then fetches that page. This uses two database requests for a nonempty
result and one for an empty result. Keeping those steps explicit avoids multiple
fallback queries after deleting the last item on a page. Count and rows are
separate reads, so simultaneous external writes can briefly change the totals.

Typing updates the input immediately; a 300 ms debounce updates the URL and
starts the search request. Clearing is immediate. Navigation cancels a pending
search, and obsolete network requests are aborted. Search uses `?q=arrival`;
pagination adds `page=2`. Both survive refresh. Native history keeps Next.js
search parameters synchronized, preserves unrelated parameters, and lets Back
and Forward navigate pages. Search and creation return to page one.

[Sonner](https://ui.shadcn.com/docs/components/radix/sonner) provides dismissible
success notifications and watched-update errors. Form validation and delete
failures stay next to their controls so users can correct or retry them.

### Loading, accessibility, and styling

Next.js automatically wraps the page in the Suspense boundary supplied by
`app/loading.tsx`; the page does not add a second boundary. Client-side database
fetching has its own pending state using the same shadcn list skeleton; route
loading alone cannot cover TanStack Query requests. Fast route loads may skip the
route fallback, and no artificial delays are added to the application.

Buttons keep their loading text while requests are pending. A spinner rotates
continuously, including when reduced motion is enabled, as a small pending-action
indicator. Decorative animations and skeleton pulsing are disabled in that mode.

The UI uses shadcn labels, linked field errors, live status/error messages,
checked/busy states, visible keyboard focus, and a skip link. Watched status uses
a shadcn checkbox beside the title, with a visible "To watch" or "Watched" label.
Delete and notes controls sit together on the right; notes expand below the title.
Movies without notes have no expand control. Add and delete
dialogs trap focus and restore it after closing. Long content wraps, and dialogs
scroll within the viewport.

Tailwind uses shared color tokens and standard spacing/typography utilities.
Button and field defaults live in shared UI components. The full-width collection
uses evenly spaced compact rows with pagination above the list. Pagination and
rows have matching loading skeletons during the initial fetch. The add form opens in a dialog
to leave room for browsing. Titles wrap on narrow screens while controls retain
comfortable touch targets. Rows use subtle horizontal separators without vertical dividers.

## REST API

| Method | Endpoint | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/movies?q=arrival&page=1` | None | `200` with `{ movies, total, page, pageSize }` |
| POST | `/api/movies` | `{ "title": "Arrival", "notes": "Watch this weekend" }` | `201` with the created movie |
| PATCH | `/api/movies/[id]` | `{ "watched": true }` | `200` with the updated movie |
| DELETE | `/api/movies/[id]` | None | `204` with no body |

GET defaults to an empty search and page 1. `page` must be an integer from 1 to
1,000,000; invalid API parameters return 400. Pages past the end return the last
available page (page 1 for no matches). `total` counts matching movies, and
`pageSize` is always 5. The UI falls back to page 1 for malformed page URLs.

Send `Content-Type: application/json` for POST and PATCH. Creation accepts only
`title` and optional `notes`; PATCH accepts only `watched`. Database-generated
fields cannot be overridden. There is no individual GET endpoint.

Application errors share this shape; `issues` appears only for validation errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "issues": [{ "path": "title", "message": "Title is required." }]
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid fields or UUID |
| 400 | `INVALID_JSON` | Empty, malformed, or unreadable JSON |
| 404 | `NOT_FOUND` | PATCH/DELETE target does not exist |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | POST/PATCH body is not JSON |
| 500 | `INTERNAL_SERVER_ERROR` | Generic server failure; private DB details withheld |

Next.js returns `405 Method Not Allowed` for unsupported methods, outside the
application's JSON error envelope. Deleting a missing movie returns 404.

## Testing and production build

```sh
npm test
npm run test:watch
npm run typecheck
npm run lint
npm run build
npm start
```

`typecheck` generates Next.js route types and runs `tsc --noEmit`. The production
build also checks types. `next/font` downloads Geist on an uncached build, so
that first build needs network access.

| Test location | Coverage |
| --- | --- |
| `src/features/movies/schemas/movie.schema.test.ts` | Normalization, UUIDs, required fields, strict inputs |
| `src/app/api/movies/route.test.ts` | Real handlers/services/SDK with mocked HTTP transport |
| `src/features/movies/components/movie-watchlist.test.tsx` | Forms, keyboard interaction, optimistic changes, rollback, reconciliation |
| `src/features/movies/services/movies-api.test.ts` | JSON requests, empty responses, errors, cancellation |
| `src/features/movies/components/elements/movie-search.test.tsx` | Debounce timing, immediate clear, navigation and unmount cleanup |
| `src/app/loading.test.tsx` | Accessible route loading fallback |
| `tests/e2e/watchlist.spec.ts` | Browser CRUD flow, URL search, spinner rotation, reduced motion, accessibility, responsive layouts |

Jest selects Node for `.test.ts` files and jsdom for `.test.tsx` files through
two projects in `jest.config.mjs`; individual files need no environment comments. Rollback
tests hold the reconciliation request open so a refetch cannot hide a broken
rollback. The Jest and Playwright suites use mocked requests and do not modify
Supabase data; the separate live verification scripts use temporary records.

Install Chromium once, then run browser tests against a fresh production build:

```sh
npm exec -- playwright install chromium --only-shell
npm run build
npm run test:e2e
```

Playwright starts and stops a local server on port 3108. Screenshots and failure
traces go into the ignored `test-results/` folder. Browser tests cover desktop,
tablet, narrow phones, long content, and axe accessibility checks. Automated axe
checks do not replace manual keyboard and screen-reader review.

Verified locally on 2026-10-16: **119 Jest tests and 14 browser tests passed**,
along with lint, TypeScript checks, and the production build. Live database,
REST API, and browser CRUD checks also passed, including persistence across
reloads; their temporary records were removed. Responsive browser checks covered
320px, 390px, 768px, and 1440px widths.

## Continuous integration

[GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
runs `.github/workflows/ci.yml` on pull requests and pushes to `main`, or manually
from the Actions tab. Feature branch pushes are checked through their pull request,
avoiding duplicate CI runs. It installs the lockfile dependencies on Node.js 22, runs lint,
TypeScript and Jest checks, builds the app, and runs Chromium browser tests.
The suites mock database requests, so no Supabase secrets are needed in CI.

Continuous deployment is intentionally deferred until a hosting target and
production access controls are configured. CI verifies the application;
it does not deploy it.

## Security

This V1 has a shared watchlist and **no authentication or authorization at the
Next.js API boundary**. Anyone able to reach those endpoints can read or mutate
movies. Localhost binding reduces accidental network exposure; it is not an
access-control system. Do not publicly deploy this V1 as-is.

The database enables RLS, revokes table privileges from `public`, `anon`, and
`authenticated`, and grants CRUD only to `service_role`. Server-only modules keep
the secret out of client imports. The secret bypasses RLS, so these database
permissions do not protect the unauthenticated Next.js API. See the
[Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

Before public deployment, define authentication and ownership/authorization,
request-size and rate limits, appropriate origin protections, and production
secret handling. These are intentionally outside the current V1 implementation.

The 2026-10-16 dependency review found **zero production dependency advisories**
with `npm audit --omit=dev`. The full audit reported 24 development-tool advisories
(19 moderate, 5 high), including the Jest `sprintf-js` and ESLint `braces` chains.
Suggested automatic fixes downgrade Jest and Next's ESLint configuration to
incompatible majors; those downgrades were not applied. Recheck the audit before
upgrading or deploying; this is a dated check, not a guarantee of future safety.
