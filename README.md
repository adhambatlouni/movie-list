<p align="center">
  <img src="src/app/icon.svg" width="72" height="72" alt="Watchlist clapperboard logo" />
</p>

<h1 align="center">Movie Watchlist</h1>

<p align="center">Keep track of your next great watch.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&amp;logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-149ECA?logo=react&amp;logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-0F172A?logo=tailwindcss&amp;logoColor=38BDF8" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-245B46?logo=supabase&amp;logoColor=white" alt="Supabase" />
</p>

<p align="center">
  <a href="#getting-started">Setup</a> ·
  <a href="#docker">Docker</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#api">API</a> ·
  <a href="#testing">Testing</a>
</p>

A full-stack assessment project rebuilt with Next.js and Supabase. Add movies,
keep a few notes, and check them off as you watch. Everything is saved in
PostgreSQL and stays there after a refresh.

## Features

- Add a movie with a required title and optional notes.
- Mark movies watched or unwatched, with optimistic updates and rollback on failure.
- Delete movies after confirmation.
- Search titles on the server with a 300 ms debounce.
- Browse five movies per page, newest first. Search and page are saved in the URL.
- Expand notes inline, with keyboard controls and a smooth height animation.
- Responsive layouts, loading skeletons, inline errors, and toast notifications.

The current scope excludes title editing, genres, and accounts. This is a local
application with a shared watchlist. Read [Security](#security) before considering
public deployment.

## Stack

| Area | Tools |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Interface | Tailwind CSS, shadcn/ui, Radix, Lucide, Sonner |
| Forms | React Hook Form and shared Zod schemas |
| Data fetching | TanStack Query |
| Backend | Next.js Route Handlers and Supabase PostgreSQL |
| Tests | Jest, React Testing Library, Playwright, axe |
| Tooling | ESLint, GitHub Actions, Docker |

## Getting started

Use **Node.js 22 or newer** and **npm**. CI and Docker use Node.js 22.

### 1. Install dependencies

Clone the repository and run commands from the folder containing `package.json`:

```sh
git clone https://github.com/adhambatlouni/movie-list.git
cd movie-list
npm ci
```

If you already have the project open, use its existing folder instead.

### 2. Set up Supabase

1. Create a development project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Run [the movies migration](supabase/migrations/20261015000100_create_movies.sql)
   once in the SQL Editor. Confirm that `public.movies` exists. If it already
   exists, compare its schema before applying changes.
3. Copy the Project URL and a secret key beginning with `sb_secret_` from
   **Settings > API Keys**. Both must belong to the same project.
4. Copy [`.env.example`](.env.example) to `.env.local` beside `package.json`.
   In PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   If the file already exists, edit it instead. Set:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
   ```

5. Keep the Supabase Data API enabled with the `public` schema exposed.

These values are used only on the server. No `NEXT_PUBLIC_` variables,
publishable key, or database password are needed. Never commit `.env.local`.

Running SQL in the editor does not register CLI migration history. Reconcile
that history before adopting `supabase db push`.

### 3. Start the app

```sh
npm run db:check
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).
Restart the server after changing environment variables.

The database check creates temporary records, verifies persistence, and removes
them. With the app running, check its REST endpoints from another terminal:

```sh
npm run api:check
# For an app running on another local port:
npm run api:check -- 3001
```

This verifies CRUD, ordering, search, pagination, and error responses. The script
only removes its own uniquely named records. If cleanup fails, it prints the
title prefix to remove manually.

<details>
<summary>Troubleshooting</summary>

| Symptom | What to check |
| --- | --- |
| `package.json` not found | Run npm from the project folder. |
| Missing configuration | Put both values in `.env.local`, then restart. |
| HTTP 401 | Use a secret key from the same project as the URL. |
| Table not found / `PGRST205` | Apply the migration and expose `public` through the Data API. |
| Permission denied / `42501` | Check the migration grants and server secret key. |
| Connection failure | Check the project URL, network, and Supabase project status. |

</details>

## Docker

Docker runs the production app while the database stays in hosted Supabase.
Configure Supabase first, then start Docker Desktop with its Linux engine.

```sh
docker build -t movie-watchlist .
docker run --rm --name movie-watchlist --env-file .env.local -p 127.0.0.1:3000:3000 movie-watchlist
```

Open [http://localhost:3000](http://localhost:3000). Stop with Ctrl+C or
`docker stop movie-watchlist`. If port 3000 is busy, use
`-p 127.0.0.1:3001:3000` and open port 3001 instead.

- The two-stage build copies Next.js standalone output into a non-root runtime.
- Environment files stay outside the image. Credentials are passed at startup.
- Use plain `NAME=value` entries in `.env.local`, without quotes or variable expansion.
- Rebuild after code changes and recreate the container after environment changes.
- Removing the container does not delete movies from Supabase.
- The published port is restricted to localhost. Compose is not needed for one app container.

The build needs internet access for the base image, npm packages, and Geist fonts.
Use `npm run dev` for everyday development and `npm run api:check` to verify a
running container. The verification script requires Node.js locally.

## Architecture

```text
React UI -> TanStack Query -> /api/movies -> server services -> Supabase
```

```text
src/
  app/                       Pages, layout, loading fallback, REST handlers
  features/movies/
    components/
      elements/              Form, movie row, search, pagination, skeletons
      overlays/              Add and delete dialogs
      movie-watchlist.tsx    Feature composition
    hooks/                   Fetching, mutations, optimistic cache updates
    schemas/                 Shared Zod schemas and request types
    services/                Browser API client and server-only database access
    types.ts                 Movie and paginated response types
  components/ui/             Shared UI primitives
  components/query-provider.tsx
  lib/                       HTTP errors, Supabase client, shared utilities
supabase/migrations/          Database schema
scripts/                     Live database and API verification
tests/e2e/                   Browser workflows and accessibility checks
```

Movie behavior lives in one feature folder. Route handlers handle HTTP concerns,
services handle database operations, and components handle interaction. Tests
sit beside the code they cover, with browser tests in `tests/e2e`.

### Database

| Field | Type | Default / constraint |
| --- | --- | --- |
| `id` | UUID | Primary key, generated by PostgreSQL |
| `title` | Text | Required, cannot be blank |
| `notes` | Text | Nullable |
| `watched` | Boolean | `false` |
| `created_at` | Timestamp with time zone | `now()` |

Titles can repeat. Results sort by `created_at DESC, id DESC` for deterministic
ordering. The server client is initialized when needed, so builds do not require
database credentials.

### Technical decisions

- **Shared validation:** the form and API use the same strict Zod schemas.
  Text is trimmed, empty notes become `null`, and unexpected fields are rejected.
- **Server search and pagination:** the database filters titles and returns five
  rows per page. Search treats punctuation literally. A count query lets the
  service clamp pages after deletions; count and rows are separate reads.
- **Predictable caching:** each search/page has its own query key and a 30-second
  stale time. There is no polling, and HTTP/database reads use `no-store`.
- **Optimistic writes:** toggles and deletes snapshot cached pages and roll back
  on failure. Successful toggles use the returned movie; deletes refetch to fill
  the page. Creation returns to the unfiltered first page.
- **Simple concurrency:** one write runs at a time to keep rollback predictable.
  Failed writes refetch to reconcile a response lost after a successful save.
- **URL state:** `q` and `page` survive refresh and support Back/Forward navigation.
  Search resets to page one; obsolete requests are cancelled.
- **Accessible feedback:** dialogs manage focus, fields have linked errors,
  checkboxes expose watched state, and keyboard users have visible focus.
  Notes animate to their measured height, with matching arrow rotation.
- **Loading:** `app/loading.tsx` provides the route fallback. Query loading uses
  matching list and pagination skeletons. No artificial delays are added.
  The pending-action spinner and notes accordion stay animated independently of
  the operating system's reduced-motion setting. Other decorative effects respect it.

## API

| Method | Endpoint | Request body | Success |
| --- | --- | --- | --- |
| GET | `/api/movies?q=arrival&page=1` | None | `200`: `{ movies, total, page, pageSize }` |
| POST | `/api/movies` | `{ "title": "Arrival", "notes": "Watch this weekend" }` | `201`: created movie |
| PATCH | `/api/movies/[id]` | `{ "watched": true }` | `200`: updated movie |
| DELETE | `/api/movies/[id]` | None | `204`: empty response |

Send `Content-Type: application/json` for POST and PATCH. POST accepts only
`title` and optional `notes`; PATCH accepts only `watched`.

GET defaults to an empty search and page 1. Page numbers must be integers from
1 to 1,000,000. Requests beyond the last page return the last available page,
or page 1 when there are no matches. `pageSize` is always 5.

Application errors use a consistent response:

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
| 400 | `VALIDATION_ERROR` | Invalid input or UUID |
| 400 | `INVALID_JSON` | Empty or malformed JSON |
| 404 | `NOT_FOUND` | Movie does not exist |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Request body is not JSON |
| 500 | `INTERNAL_SERVER_ERROR` | Server error, without private database details |

`issues` appears only for validation errors. Unsupported methods return Next.js's
`405 Method Not Allowed` response outside this JSON format. There is no
individual GET endpoint or title-editing endpoint.

## Testing

| Command | Purpose |
| --- | --- |
| `npm test` | Jest schema, API, client, and component tests |
| `npm run test:watch` | Jest watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm run build` | Production build |
| `npm start` | Start the production app locally |
| `npm run test:e2e` | Playwright browser tests |
| `npm run db:check` | Real Supabase persistence check |
| `npm run api:check` | Real HTTP API verification |

For browser tests, install Chromium and build the app first:

```sh
npm exec -- playwright install chromium --only-shell
npm run build
npm run test:e2e
```

Playwright starts and stops a production server on port 3108. The suite covers
movie interactions, URL search, pagination, loading, responsive layouts, and
axe accessibility checks. Failed tests save screenshots and traces under
`test-results/`.

Jest covers validation, route responses, form behavior, optimistic updates, and
rollback. Node tests use `.test.ts`; component tests use `.test.tsx` with jsdom.

Automated suites mock network requests and do not modify Supabase. The separate
live verification scripts use temporary records. Automated accessibility checks
complement manual keyboard and screen-reader review.

## Continuous integration

[CI runs](https://github.com/adhambatlouni/movie-list/actions/workflows/ci.yml)
on pull requests targeting `main`, pushes to `main`, and manual requests.
Feature branches are checked through their PRs, avoiding duplicate push runs.

The job installs locked dependencies on Node.js 22, runs lint, TypeScript and
Jest, builds the app, then runs Chromium tests. No Supabase secrets are required.
New commits cancel outdated runs for the same branch or PR, and focused
Playwright `test.only` calls fail CI.

HTML reports and failure screenshots/traces are retained for seven days.
Download the `playwright-report` artifact from an Actions run, extract it, then run:

```sh
npx playwright show-report <extracted-folder>/playwright-report
```

CI verifies the app. Deployment is deferred until hosting and access controls
are configured.

## Security

This version has **no authentication or authorization at the Next.js API**.
Anyone who can reach the endpoints can read or change the shared watchlist.
Do not deploy it publicly as-is.

The migration enables RLS and grants table access only to `service_role`.
The server secret bypasses RLS and stays in server-only code. Those database
restrictions do not protect the unauthenticated REST endpoints.

Before public deployment, add authentication, ownership checks, request-size and
rate limits, appropriate origin protections, and production secret management.
Review dependencies with `npm audit` and `npm audit --omit=dev`; assess fixes
before applying changes that could replace major versions.
