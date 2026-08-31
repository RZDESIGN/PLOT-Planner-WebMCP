-- Freeform canvas notes that can be converted to and from sprint cards.
-- Applied remotely as migration 20260830075628.

create table public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  client_key text not null check (client_key ~ '^[a-z0-9-]+$'),
  content text not null check (char_length(content) between 1 and 1200),
  color text not null default 'yellow' check (color in ('yellow', 'pink', 'blue', 'green', 'violet')),
  x double precision not null default 0 check (x between -100000 and 100000),
  y double precision not null default 0 check (y between -100000 and 100000),
  card_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(card_payload) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, client_key)
);

create index sticky_notes_board_updated_idx
on public.sticky_notes (board_id, updated_at desc);

create index sticky_notes_created_by_idx
on public.sticky_notes (created_by);

create index sticky_notes_updated_by_idx
on public.sticky_notes (updated_by);

create trigger sticky_notes_set_updated_at
before update on public.sticky_notes
for each row execute function private.set_updated_at();

alter table public.sticky_notes enable row level security;

create policy "sticky_notes_select_public_templates"
on public.sticky_notes for select
to anon
using (
  exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id and boards.is_template
  )
);

create policy "sticky_notes_select_owned_or_template"
on public.sticky_notes for select
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id
      and (boards.is_template or boards.owner_id = (select auth.uid()))
  )
);

create policy "sticky_notes_insert_owned"
on public.sticky_notes for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id
      and boards.owner_id = (select auth.uid())
      and not boards.is_template
  )
);

create policy "sticky_notes_update_owned"
on public.sticky_notes for update
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id
      and boards.owner_id = (select auth.uid())
      and not boards.is_template
  )
)
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id
      and boards.owner_id = (select auth.uid())
      and not boards.is_template
  )
);

create policy "sticky_notes_delete_owned"
on public.sticky_notes for delete
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = sticky_notes.board_id
      and boards.owner_id = (select auth.uid())
      and not boards.is_template
  )
);

-- New public tables are no longer guaranteed to be exposed automatically.
grant select on public.sticky_notes to anon;
grant select, insert, update, delete on public.sticky_notes to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sticky_notes'
  ) then
    alter publication supabase_realtime add table public.sticky_notes;
  end if;
end;
$$;

insert into public.sticky_notes (
  board_id,
  client_key,
  content,
  color,
  x,
  y
)
select
  boards.id,
  seed.client_key,
  seed.content,
  seed.color,
  seed.x,
  seed.y
from public.boards
cross join (
  values
    (
      'activation-hypothesis',
      'Hypothesis\nA shorter first-run checklist could improve activation.',
      'yellow',
      -220::double precision,
      210::double precision
    ),
    (
      'customer-signal',
      'Customer signal\nTeams want a clearer invitation step before onboarding.',
      'pink',
      1370::double precision,
      300::double precision
    )
) as seed (client_key, content, color, x, y)
where boards.is_template;
