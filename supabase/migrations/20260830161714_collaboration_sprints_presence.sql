-- Multi-user collaboration, live spectator access, sprint lifecycle, and
-- secure share links for PLOT. Boards are the sprint boundary.

alter table public.boards
  add column status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  add column starts_on date,
  add column ends_on date,
  add column created_from_board_id uuid references public.boards (id) on delete set null,
  add constraint boards_date_range_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on);

create index boards_owner_status_updated_idx
on public.boards (owner_id, status, updated_at desc)
where not is_template;

create index boards_created_from_board_id_idx
on public.boards (created_from_board_id);

create table public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index board_members_user_board_idx
on public.board_members (user_id, board_id);

create index board_members_board_role_idx
on public.board_members (board_id, role);

create table public.board_invitations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  email text,
  role text not null check (role in ('editor', 'viewer')),
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  check (email is null or (char_length(email) between 3 and 320 and email = lower(email))),
  check (expires_at > created_at),
  check ((accepted_at is null) = (accepted_by is null))
);

create index board_invitations_board_active_idx
on public.board_invitations (board_id, expires_at desc)
where accepted_at is null and revoked_at is null;

create index board_invitations_accepted_by_idx
on public.board_invitations (accepted_by)
where accepted_by is not null;

alter table public.board_members enable row level security;
alter table public.board_invitations enable row level security;

create or replace function private.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.board_members
    where board_id = p_board_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_board(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.board_members
    where board_id = p_board_id
      and user_id = (select auth.uid())
      and role in ('owner', 'editor')
  );
$$;

create or replace function private.is_board_owner(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.boards
    where id = p_board_id
      and owner_id = (select auth.uid())
      and not is_template
  );
$$;

create or replace function private.shares_board_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.board_members mine
    join public.board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.is_board_member(uuid) from public, anon, authenticated, service_role;
revoke all on function private.can_edit_board(uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_board_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function private.shares_board_with(uuid) from public, anon, authenticated, service_role;

create or replace function private.seed_board_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_template and new.owner_id is not null then
    insert into public.board_members (board_id, user_id, role, invited_by)
    values (new.id, new.owner_id, 'owner', new.owner_id)
    on conflict (board_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

revoke all on function private.seed_board_owner_membership() from public, anon, authenticated;

create trigger boards_seed_owner_membership
after insert on public.boards
for each row execute function private.seed_board_owner_membership();

insert into public.board_members (board_id, user_id, role, invited_by)
select id, owner_id, 'owner', owner_id
from public.boards
where not is_template and owner_id is not null
on conflict (board_id, user_id) do update set role = 'owner';

-- Replace owner-only policies with membership-aware access. Viewers receive
-- every live row but cannot mutate anything.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_self_or_collaborator"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select private.shares_board_with(id)));

drop policy if exists "boards_select_owned_or_template" on public.boards;
drop policy if exists "boards_update_owned" on public.boards;
drop policy if exists "boards_delete_owned" on public.boards;

create policy "boards_select_member_or_template"
on public.boards for select
to authenticated
using (is_template or (select private.is_board_member(id)));

create policy "boards_update_owner"
on public.boards for update
to authenticated
using ((select private.is_board_owner(id)))
with check (owner_id = (select auth.uid()) and not is_template);

create policy "boards_delete_owner"
on public.boards for delete
to authenticated
using ((select private.is_board_owner(id)));

drop policy if exists "columns_select_owned_or_template" on public.board_columns;
drop policy if exists "columns_insert_owned" on public.board_columns;
drop policy if exists "columns_update_owned" on public.board_columns;
drop policy if exists "columns_delete_owned" on public.board_columns;

create policy "columns_select_member_or_template"
on public.board_columns for select
to authenticated
using (
  exists (select 1 from public.boards where id = board_id and is_template)
  or (select private.is_board_member(board_id))
);
create policy "columns_insert_editor"
on public.board_columns for insert to authenticated
with check ((select private.can_edit_board(board_id)));
create policy "columns_update_editor"
on public.board_columns for update to authenticated
using ((select private.can_edit_board(board_id)))
with check ((select private.can_edit_board(board_id)));
create policy "columns_delete_editor"
on public.board_columns for delete to authenticated
using ((select private.can_edit_board(board_id)));

drop policy if exists "cards_select_owned_or_template" on public.cards;
drop policy if exists "cards_insert_owned" on public.cards;
drop policy if exists "cards_update_owned" on public.cards;
drop policy if exists "cards_delete_owned" on public.cards;

create policy "cards_select_member_or_template"
on public.cards for select to authenticated
using (
  exists (select 1 from public.boards where id = board_id and is_template)
  or (select private.is_board_member(board_id))
);
create policy "cards_insert_editor"
on public.cards for insert to authenticated
with check (
  (select private.can_edit_board(board_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy "cards_update_editor"
on public.cards for update to authenticated
using ((select private.can_edit_board(board_id)))
with check (
  (select private.can_edit_board(board_id))
  and updated_by = (select auth.uid())
);
create policy "cards_delete_editor"
on public.cards for delete to authenticated
using ((select private.can_edit_board(board_id)));

drop policy if exists "sticky_notes_select_owned_or_template" on public.sticky_notes;
drop policy if exists "sticky_notes_insert_owned" on public.sticky_notes;
drop policy if exists "sticky_notes_update_owned" on public.sticky_notes;
drop policy if exists "sticky_notes_delete_owned" on public.sticky_notes;

create policy "sticky_notes_select_member_or_template"
on public.sticky_notes for select to authenticated
using (
  exists (select 1 from public.boards where id = board_id and is_template)
  or (select private.is_board_member(board_id))
);
create policy "sticky_notes_insert_editor"
on public.sticky_notes for insert to authenticated
with check (
  (select private.can_edit_board(board_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy "sticky_notes_update_editor"
on public.sticky_notes for update to authenticated
using ((select private.can_edit_board(board_id)))
with check (
  (select private.can_edit_board(board_id))
  and updated_by = (select auth.uid())
);
create policy "sticky_notes_delete_editor"
on public.sticky_notes for delete to authenticated
using ((select private.can_edit_board(board_id)));

drop policy if exists "dependencies_select_owned_or_template" on public.card_dependencies;
drop policy if exists "dependencies_insert_owned" on public.card_dependencies;
drop policy if exists "dependencies_delete_owned" on public.card_dependencies;

create policy "dependencies_select_member_or_template"
on public.card_dependencies for select to authenticated
using (
  exists (select 1 from public.boards where id = board_id and is_template)
  or (select private.is_board_member(board_id))
);
create policy "dependencies_insert_editor"
on public.card_dependencies for insert to authenticated
with check (
  (select private.can_edit_board(board_id))
  and created_by = (select auth.uid())
);
create policy "dependencies_delete_editor"
on public.card_dependencies for delete to authenticated
using ((select private.can_edit_board(board_id)));

drop policy if exists "proposals_select_owned" on public.planning_proposals;
drop policy if exists "proposals_insert_owned" on public.planning_proposals;
drop policy if exists "proposals_update_owned" on public.planning_proposals;

create policy "proposals_select_member"
on public.planning_proposals for select to authenticated
using ((select private.is_board_member(board_id)));
create policy "proposals_insert_editor"
on public.planning_proposals for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_edit_board(board_id))
);
create policy "proposals_update_creator"
on public.planning_proposals for update to authenticated
using (created_by = (select auth.uid()) and (select private.can_edit_board(board_id)))
with check (created_by = (select auth.uid()) and (select private.can_edit_board(board_id)));

drop policy if exists "proposal_actions_select_owned" on public.proposal_actions;
drop policy if exists "proposal_actions_insert_owned" on public.proposal_actions;

create policy "proposal_actions_select_member"
on public.proposal_actions for select to authenticated
using (
  exists (
    select 1 from public.planning_proposals p
    where p.id = proposal_id and (select private.is_board_member(p.board_id))
  )
);
create policy "proposal_actions_insert_creator"
on public.proposal_actions for insert to authenticated
with check (
  exists (
    select 1 from public.planning_proposals p
    where p.id = proposal_id
      and p.created_by = (select auth.uid())
      and p.status = 'draft'
      and (select private.can_edit_board(p.board_id))
  )
);

drop policy if exists "activity_select_owned" on public.activity_events;
drop policy if exists "activity_insert_owned" on public.activity_events;
create policy "activity_select_member"
on public.activity_events for select to authenticated
using ((select private.is_board_member(board_id)));
create policy "activity_insert_editor"
on public.activity_events for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and (select private.can_edit_board(board_id))
);

create policy "board_members_select_collaborators"
on public.board_members for select to authenticated
using ((select private.is_board_member(board_id)));

create policy "board_invitations_select_owner"
on public.board_invitations for select to authenticated
using ((select private.is_board_owner(board_id)));
create policy "board_invitations_insert_owner"
on public.board_invitations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.is_board_owner(board_id))
);
create policy "board_invitations_update_owner"
on public.board_invitations for update to authenticated
using ((select private.is_board_owner(board_id)))
with check ((select private.is_board_owner(board_id)));

revoke all on table public.board_members, public.board_invitations from anon, authenticated;
grant select on table public.board_members to authenticated;
grant select, insert, update on table public.board_invitations to authenticated;

-- Atomic sprint creation. Empty sprints retain the column structure; full
-- copies also carry cards, dependencies, and loose canvas notes.
create or replace function public.create_sprint(
  p_title text,
  p_sprint_goal text default '',
  p_capacity integer default 15,
  p_source_board_id uuid default null,
  p_copy_mode text default 'empty',
  p_starts_on date default null,
  p_ends_on date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_board_id uuid := gen_random_uuid();
  source_board public.boards%rowtype;
  source_column public.board_columns%rowtype;
  source_card public.cards%rowtype;
  source_dependency public.card_dependencies%rowtype;
  source_note public.sticky_notes%rowtype;
  new_column_id uuid;
  new_card_id uuid;
  column_map jsonb := '{}'::jsonb;
  card_map jsonb := '{}'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Sign in to create a sprint.';
  end if;
  if char_length(trim(p_title)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Sprint title must be between 1 and 120 characters.';
  end if;
  if char_length(coalesce(p_sprint_goal, '')) > 240 then
    raise exception using errcode = '22023', message = 'Sprint goal is too long.';
  end if;
  if p_capacity not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Capacity must be between 1 and 200.';
  end if;
  if p_copy_mode not in ('empty', 'everything') then
    raise exception using errcode = '22023', message = 'Copy mode must be empty or everything.';
  end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception using errcode = '22023', message = 'Sprint end date cannot be before its start date.';
  end if;

  if p_source_board_id is not null then
    select * into source_board from public.boards where id = p_source_board_id;
    if not found then
      raise exception using errcode = '42501', message = 'The source sprint is not available.';
    end if;
  end if;

  insert into public.boards (
    id, owner_id, title, description, sprint_goal, capacity, is_template,
    status, starts_on, ends_on, created_from_board_id
  ) values (
    new_board_id,
    (select auth.uid()),
    trim(p_title),
    coalesce(source_board.description, ''),
    coalesce(p_sprint_goal, ''),
    p_capacity,
    false,
    'active',
    p_starts_on,
    p_ends_on,
    p_source_board_id
  );

  if p_source_board_id is null then
    insert into public.board_columns (board_id, client_key, title, description, accent, position, wip_limit)
    values
      (new_board_id, 'inbox', 'Inbox', 'Unsorted ideas and requests', '#ffc7d2', 0, null),
      (new_board_id, 'now', 'Now', 'Committed sprint work', '#d6f59a', 1, 5),
      (new_board_id, 'next', 'Next', 'Ready when capacity opens', '#d2ccff', 2, 6),
      (new_board_id, 'later', 'Later', 'Useful, not urgent', '#ffeb96', 3, null);
  else
    for source_column in
      select * from public.board_columns where board_id = p_source_board_id order by position
    loop
      new_column_id := gen_random_uuid();
      column_map := column_map || jsonb_build_object(source_column.id::text, new_column_id::text);
      insert into public.board_columns (
        id, board_id, client_key, title, description, accent, position, wip_limit
      ) values (
        new_column_id, new_board_id, source_column.client_key, source_column.title,
        source_column.description, source_column.accent, source_column.position, source_column.wip_limit
      );
    end loop;
  end if;

  if p_copy_mode = 'everything' and p_source_board_id is not null then
    for source_card in
      select * from public.cards where board_id = p_source_board_id order by column_id, position
    loop
      new_card_id := gen_random_uuid();
      card_map := card_map || jsonb_build_object(source_card.id::text, new_card_id::text);
      insert into public.cards (
        id, board_id, column_id, client_key, title, description, priority,
        estimate, position, labels, owner_name, goal, due_date, created_by, updated_by
      ) values (
        new_card_id,
        new_board_id,
        (column_map ->> source_card.column_id::text)::uuid,
        source_card.client_key,
        source_card.title,
        source_card.description,
        source_card.priority,
        source_card.estimate,
        source_card.position,
        source_card.labels,
        source_card.owner_name,
        source_card.goal,
        source_card.due_date,
        (select auth.uid()),
        (select auth.uid())
      );
    end loop;

    for source_dependency in
      select * from public.card_dependencies where board_id = p_source_board_id
    loop
      insert into public.card_dependencies (
        board_id, source_card_id, target_card_id, created_by
      ) values (
        new_board_id,
        (card_map ->> source_dependency.source_card_id::text)::uuid,
        (card_map ->> source_dependency.target_card_id::text)::uuid,
        (select auth.uid())
      );
    end loop;

    for source_note in
      select * from public.sticky_notes where board_id = p_source_board_id
    loop
      insert into public.sticky_notes (
        board_id, client_key, content, color, x, y, card_payload, created_by, updated_by
      ) values (
        new_board_id, source_note.client_key, source_note.content, source_note.color,
        source_note.x, source_note.y, source_note.card_payload,
        (select auth.uid()), (select auth.uid())
      );
    end loop;
  end if;

  return new_board_id;
end;
$$;

create or replace function public.create_board_invitation(
  p_board_id uuid,
  p_role text default 'editor',
  p_email text default null
)
returns table (invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  raw_token text := encode(gen_random_bytes(24), 'hex');
begin
  if not (select private.is_board_owner(p_board_id)) then
    raise exception using errcode = '42501', message = 'Only the sprint owner can invite collaborators.';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception using errcode = '22023', message = 'Invite role must be editor or viewer.';
  end if;
  if p_email is not null and (char_length(trim(p_email)) not between 3 and 320 or position('@' in p_email) = 0) then
    raise exception using errcode = '22023', message = 'Enter a valid email address or leave it blank.';
  end if;

  return query
  insert into public.board_invitations (
    board_id, email, role, token_hash, created_by
  ) values (
    p_board_id,
    nullif(lower(trim(p_email)), ''),
    p_role,
    encode(digest(raw_token, 'sha256'), 'hex'),
    (select auth.uid())
  )
  returning id, raw_token, board_invitations.expires_at;
end;
$$;

-- The token hash is intentionally hidden by RLS. This tightly scoped definer
-- RPC performs the one privileged lookup, then binds access to auth.uid().
create or replace function public.accept_board_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.board_invitations%rowtype;
  caller_id uuid := (select auth.uid());
  caller_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Sign in to accept this invitation.';
  end if;
  if p_token is null or char_length(p_token) <> 48 then
    raise exception using errcode = '22023', message = 'This invitation link is invalid.';
  end if;

  select * into invitation
  from public.board_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'This invitation is invalid, expired, or already used.';
  end if;
  if invitation.email is not null and invitation.email <> caller_email then
    raise exception using errcode = '42501', message = 'This invitation was created for another email address.';
  end if;

  insert into public.board_members (board_id, user_id, role, invited_by)
  values (invitation.board_id, caller_id, invitation.role, invitation.created_by)
  on conflict (board_id, user_id) do update
  set role = case
    when public.board_members.role = 'owner' then 'owner'
    when public.board_members.role = 'editor' or excluded.role = 'editor' then 'editor'
    else 'viewer'
  end;

  update public.board_invitations
  set accepted_at = now(), accepted_by = caller_id
  where id = invitation.id;

  return invitation.board_id;
end;
$$;

revoke all on function public.create_sprint(text, text, integer, uuid, text, date, date) from public, anon;
revoke all on function public.create_board_invitation(uuid, text, text) from public, anon;
revoke all on function public.accept_board_invitation(text) from public, anon;
grant execute on function public.create_sprint(text, text, integer, uuid, text, date, date) to authenticated;
grant execute on function public.create_board_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_board_invitation(text) to authenticated;

-- Existing transaction RPCs now accept editors as well as owners.
create or replace function public.commit_card_layout(p_board_id uuid, p_layout jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
  board_card_count integer;
begin
  if jsonb_typeof(p_layout) <> 'array' then
    raise exception using errcode = '22023', message = 'Card layout must be a JSON array.';
  end if;
  if not (select private.can_edit_board(p_board_id)) then
    raise exception using errcode = '42501', message = 'The board is read-only for the current user.';
  end if;
  perform 1 from public.boards where id = p_board_id and not is_template for update;
  if not found then
    raise exception using errcode = '42501', message = 'The board is not writable by the current user.';
  end if;

  select count(*)::integer into board_card_count
  from public.cards where board_id = p_board_id;
  if jsonb_array_length(p_layout) <> board_card_count then
    raise exception using errcode = '22023', message = 'Card layout must contain every card on the board exactly once.';
  end if;

  with layout as (
    select id, row_number() over () as ordinal
    from jsonb_to_recordset(p_layout) as item(id uuid, column_id uuid, position integer)
  )
  update public.cards card
  set position = 1000000 + layout.ordinal::integer, updated_by = (select auth.uid())
  from layout
  where card.id = layout.id and card.board_id = p_board_id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> board_card_count then
    raise exception using errcode = '22023', message = 'Card layout contains missing or duplicate card ids.';
  end if;

  with layout as (
    select id, column_id, position
    from jsonb_to_recordset(p_layout) as item(id uuid, column_id uuid, position integer)
  )
  update public.cards card
  set column_id = layout.column_id, position = layout.position, updated_by = (select auth.uid())
  from layout
  where card.id = layout.id and card.board_id = p_board_id;
  get diagnostics affected_rows = row_count;
  if affected_rows <> board_card_count then
    raise exception using errcode = '22023', message = 'Card layout could not be applied completely.';
  end if;
end;
$$;

-- Private Realtime Presence for board members. This keeps live viewers
-- read-only at the data layer while still allowing them to announce presence.
create policy "plot_members_can_receive_presence"
on realtime.messages for select to authenticated
using (
  extension = 'presence'
  and (select private.is_board_member(
    nullif(split_part((select realtime.topic()), ':', 3), '')::uuid
  ))
);

create policy "plot_members_can_track_presence"
on realtime.messages for insert to authenticated
with check (
  extension = 'presence'
  and (select private.is_board_member(
    nullif(split_part((select realtime.topic()), ':', 3), '')::uuid
  ))
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'board_members'
  ) then
    alter publication supabase_realtime add table public.board_members;
  end if;
end;
$$;
