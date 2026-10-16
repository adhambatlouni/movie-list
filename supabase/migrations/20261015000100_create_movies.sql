begin;

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  watched boolean not null default false,
  created_at timestamptz not null default now(),
  constraint movies_title_not_blank check (title ~ '[^[:space:]]')
);

-- Newest first, with a stable order when timestamps match.
create index movies_created_at_id_idx on public.movies (created_at desc, id desc);

-- Access goes through the Next.js server. No direct browser access in V1.
alter table public.movies enable row level security;
revoke all on table public.movies from public, anon, authenticated;
grant select, insert, update, delete on table public.movies to service_role;

commit;
