-- PLOT core schema (remote migration 20260829212115)
-- A shared planning canvas for humans and browser agents.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.card_priority as enum ('critical', 'high', 'medium', 'low');
create type public.proposal_status as enum ('draft', 'accepted', 'dismissed');
create type public.proposal_action_type as enum (
  'create_card',
  'move_card',
  'update_card',
  'split_card',
  'link_dependency'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Planner' check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  sprint_goal text not null default '' check (char_length(sprint_goal) <= 240),
  capacity integer not null default 15 check (capacity between 1 and 200),
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_owner_check check (
    (is_template and owner_id is null) or (not is_template and owner_id is not null)
  )
);

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  client_key text not null check (client_key ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 160),
  accent text not null default '#d9ff57' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  position integer not null check (position >= 0),
  wip_limit integer check (wip_limit is null or wip_limit between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, client_key),
  unique (board_id, position)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  column_id uuid not null references public.board_columns (id) on delete cascade,
  client_key text not null check (client_key ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  priority public.card_priority not null default 'medium',
  estimate integer not null default 1 check (estimate between 1 and 100),
  position integer not null check (position >= 0),
  labels text[] not null default '{}',
  owner_name text check (owner_name is null or char_length(owner_name) <= 80),
  goal text check (goal is null or char_length(goal) <= 240),
  due_date date,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, board_id),
  unique (board_id, client_key),
  unique (column_id, position)
);

create table public.card_dependencies (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  source_card_id uuid not null,
  target_card_id uuid not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (source_card_id, board_id) references public.cards (id, board_id) on delete cascade,
  foreign key (target_card_id, board_id) references public.cards (id, board_id) on delete cascade,
  constraint different_dependency_cards check (source_card_id <> target_card_id),
  unique (source_card_id, target_card_id)
);

create table public.planning_proposals (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 1000),
  status public.proposal_status not null default 'draft',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.proposal_actions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.planning_proposals (id) on delete cascade,
  action_type public.proposal_action_type not null,
  entity_id uuid,
  before_state jsonb not null default '{}',
  after_state jsonb not null default '{}',
  rationale text not null default '' check (char_length(rationale) <= 500),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (proposal_id, position)
);

create table public.activity_events (
  id bigint generated by default as identity primary key,
  board_id uuid not null references public.boards (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z0-9_]+$'),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index boards_owner_id_idx on public.boards (owner_id);
create index board_columns_board_position_idx on public.board_columns (board_id, position);
create index cards_board_column_position_idx on public.cards (board_id, column_id, position);
create index cards_priority_idx on public.cards (board_id, priority);
create index card_dependencies_board_idx on public.card_dependencies (board_id);
create index planning_proposals_board_created_idx on public.planning_proposals (board_id, created_at desc);
create index proposal_actions_proposal_position_idx on public.proposal_actions (proposal_id, position);
create index activity_events_board_created_idx on public.activity_events (board_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger boards_set_updated_at
before update on public.boards
for each row execute function private.set_updated_at();

create trigger board_columns_set_updated_at
before update on public.board_columns
for each row execute function private.set_updated_at();

create trigger cards_set_updated_at
before update on public.cards
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'Planner'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.cards enable row level security;
alter table public.card_dependencies enable row level security;
alter table public.planning_proposals enable row level security;
alter table public.proposal_actions enable row level security;
alter table public.activity_events enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "boards_select_public_templates"
on public.boards for select
to anon
using (is_template);

create policy "boards_select_owned_or_template"
on public.boards for select
to authenticated
using (is_template or owner_id = (select auth.uid()));

create policy "boards_insert_owned"
on public.boards for insert
to authenticated
with check (owner_id = (select auth.uid()) and not is_template);

create policy "boards_update_owned"
on public.boards for update
to authenticated
using (owner_id = (select auth.uid()) and not is_template)
with check (owner_id = (select auth.uid()) and not is_template);

create policy "boards_delete_owned"
on public.boards for delete
to authenticated
using (owner_id = (select auth.uid()) and not is_template);

create policy "columns_select_public_templates"
on public.board_columns for select
to anon
using (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id and boards.is_template
  )
);

create policy "columns_select_owned_or_template"
on public.board_columns for select
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id
      and (boards.is_template or boards.owner_id = (select auth.uid()))
  )
);

create policy "columns_insert_owned"
on public.board_columns for insert
to authenticated
with check (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "columns_update_owned"
on public.board_columns for update
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
)
with check (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "columns_delete_owned"
on public.board_columns for delete
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = board_columns.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "cards_select_public_templates"
on public.cards for select
to anon
using (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id and boards.is_template
  )
);

create policy "cards_select_owned_or_template"
on public.cards for select
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id
      and (boards.is_template or boards.owner_id = (select auth.uid()))
  )
);

create policy "cards_insert_owned"
on public.cards for insert
to authenticated
with check (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "cards_update_owned"
on public.cards for update
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
)
with check (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "cards_delete_owned"
on public.cards for delete
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = cards.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "dependencies_select_public_templates"
on public.card_dependencies for select
to anon
using (
  exists (
    select 1 from public.boards
    where boards.id = card_dependencies.board_id and boards.is_template
  )
);

create policy "dependencies_select_owned_or_template"
on public.card_dependencies for select
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = card_dependencies.board_id
      and (boards.is_template or boards.owner_id = (select auth.uid()))
  )
);

create policy "dependencies_insert_owned"
on public.card_dependencies for insert
to authenticated
with check (
  exists (
    select 1 from public.boards
    where boards.id = card_dependencies.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "dependencies_delete_owned"
on public.card_dependencies for delete
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = card_dependencies.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "proposals_select_owned"
on public.planning_proposals for select
to authenticated
using (created_by = (select auth.uid()));

create policy "proposals_insert_owned"
on public.planning_proposals for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.boards
    where boards.id = planning_proposals.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "proposals_update_owned"
on public.planning_proposals for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

create policy "proposal_actions_select_owned"
on public.proposal_actions for select
to authenticated
using (
  exists (
    select 1 from public.planning_proposals
    where planning_proposals.id = proposal_actions.proposal_id
      and planning_proposals.created_by = (select auth.uid())
  )
);

create policy "proposal_actions_insert_owned"
on public.proposal_actions for insert
to authenticated
with check (
  exists (
    select 1 from public.planning_proposals
    where planning_proposals.id = proposal_actions.proposal_id
      and planning_proposals.created_by = (select auth.uid())
      and planning_proposals.status = 'draft'
  )
);

create policy "activity_select_owned"
on public.activity_events for select
to authenticated
using (
  exists (
    select 1 from public.boards
    where boards.id = activity_events.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

create policy "activity_insert_owned"
on public.activity_events for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1 from public.boards
    where boards.id = activity_events.board_id and boards.owner_id = (select auth.uid()) and not boards.is_template
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.boards, public.board_columns, public.cards, public.card_dependencies to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.boards, public.board_columns, public.cards, public.card_dependencies to authenticated;
grant select, insert, update on public.planning_proposals to authenticated;
grant select, insert on public.proposal_actions, public.activity_events to authenticated;
grant usage, select on sequence public.activity_events_id_seq to authenticated;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'boards',
    'board_columns',
    'cards',
    'card_dependencies',
    'planning_proposals',
    'proposal_actions',
    'activity_events'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = relation_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', relation_name);
    end if;
  end loop;
end;
$$;

do $$
declare
  template_board_id uuid;
  inbox_id uuid;
  now_id uuid;
  next_id uuid;
  later_id uuid;
  email_api_id uuid;
  signup_flow_id uuid;
  mobile_fixes_id uuid;
begin
  insert into public.boards (title, description, sprint_goal, capacity, is_template)
  values (
    'Activation sprint',
    'A shared product board for turning a messy backlog into a focused, dependency-aware sprint.',
    'Improve new-user activation without overcommitting the team.',
    13,
    true
  )
  returning id into template_board_id;

  insert into public.board_columns (board_id, client_key, title, description, accent, position, wip_limit)
  values (template_board_id, 'inbox', 'Inbox', 'Loose ideas that still need shape.', '#f0a8ff', 0, null)
  returning id into inbox_id;

  insert into public.board_columns (board_id, client_key, title, description, accent, position, wip_limit)
  values (template_board_id, 'now', 'Now', 'The smallest plan that protects the goal.', '#d9ff57', 1, 3)
  returning id into now_id;

  insert into public.board_columns (board_id, client_key, title, description, accent, position, wip_limit)
  values (template_board_id, 'next', 'Next', 'Important work waiting for capacity.', '#95c7ff', 2, 4)
  returning id into next_id;

  insert into public.board_columns (board_id, client_key, title, description, accent, position, wip_limit)
  values (template_board_id, 'later', 'Later', 'Useful, but not for this sprint goal.', '#ffc568', 3, null)
  returning id into later_id;

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name, goal
  ) values (
    template_board_id, now_id, 'signup-flow', 'Signup flow',
    'Finish the new account creation path and remove the two largest points of friction.',
    'critical', 5, 0, array['Activation', 'Core'], 'Ricardo', 'Improve activation'
  ) returning id into signup_flow_id;

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name, goal
  ) values (
    template_board_id, now_id, 'analytics', 'Activation analytics',
    'Instrument the complete funnel and add the first reporting view.',
    'medium', 5, 1, array['Data'], 'Maya', 'Measure activation'
  );

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name, goal
  ) values (
    template_board_id, next_id, 'email-api', 'Email API',
    'Connect transactional onboarding emails and verify the welcome sequence.',
    'critical', 3, 0, array['Backend', 'Blocker'], 'Noah', 'Improve activation'
  ) returning id into email_api_id;

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name, goal
  ) values (
    template_board_id, next_id, 'mobile-fixes', 'Mobile onboarding fixes',
    'Repair the keyboard overlap and sticky footer on small screens.',
    'high', 5, 1, array['Mobile', 'UX'], 'Ricardo', 'Improve activation'
  ) returning id into mobile_fixes_id;

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name, goal
  ) values (
    template_board_id, next_id, 'empty-state', 'Empty state copy',
    'Guide first-time users toward their first meaningful action.',
    'medium', 2, 2, array['Copy', 'UX'], 'Maya', 'Improve activation'
  );

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name
  ) values (
    template_board_id, later_id, 'login-polish', 'Login polish',
    'Refine motion, validation copy, and provider button states.',
    'low', 3, 0, array['Polish'], 'Ricardo'
  );

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name
  ) values (
    template_board_id, later_id, 'avatar-upload', 'Avatar upload',
    'Add crop controls and image compression to profile settings.',
    'low', 5, 1, array['Profile'], 'Noah'
  );

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name
  ) values (
    template_board_id, inbox_id, 'pricing-experiment', 'Pricing experiment?',
    'Unvalidated idea from the last customer call.',
    'low', 3, 0, array['Idea'], null
  );

  insert into public.cards (
    board_id, column_id, client_key, title, description, priority, estimate, position, labels, owner_name
  ) values (
    template_board_id, inbox_id, 'notification-center', 'Notification center',
    'Explore whether users need an in-product activity inbox.',
    'low', 8, 1, array['Discovery'], null
  );

  insert into public.card_dependencies (board_id, source_card_id, target_card_id)
  values
    (template_board_id, email_api_id, signup_flow_id),
    (template_board_id, signup_flow_id, mobile_fixes_id);
end;
$$;
