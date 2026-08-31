-- Keep card/column ownership structurally consistent and expose the multi-row
-- board mutations as short, RLS-aware transactions.
-- Applied remotely as migration 20260830081506.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'board_columns_id_board_id_key'
      and conrelid = 'public.board_columns'::regclass
  ) then
    alter table public.board_columns
      add constraint board_columns_id_board_id_key unique (id, board_id);
  end if;
end;
$$;

alter table public.cards drop constraint if exists cards_column_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_column_id_board_id_fkey'
      and conrelid = 'public.cards'::regclass
  ) then
    alter table public.cards
      add constraint cards_column_id_board_id_fkey
      foreign key (column_id, board_id)
      references public.board_columns (id, board_id)
      on delete cascade;
  end if;
end;
$$;

create index if not exists cards_column_board_idx
on public.cards (column_id, board_id);

create or replace function public.commit_card_layout(
  p_board_id uuid,
  p_layout jsonb
)
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
    raise exception using
      errcode = '22023',
      message = 'Card layout must be a JSON array.';
  end if;

  perform 1
  from public.boards
  where id = p_board_id
    and owner_id = (select auth.uid())
    and not is_template
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'The board is not writable by the current user.';
  end if;

  select count(*)::integer
  into board_card_count
  from public.cards
  where board_id = p_board_id;

  if jsonb_array_length(p_layout) <> board_card_count then
    raise exception using
      errcode = '22023',
      message = 'Card layout must contain every card on the board exactly once.';
  end if;

  with layout as (
    select id, ordinal
    from jsonb_to_recordset(p_layout) with ordinality
      as item(id uuid, column_id uuid, position integer, ordinal bigint)
  )
  update public.cards as card
  set position = 1000000 + layout.ordinal::integer,
      updated_by = (select auth.uid())
  from layout
  where card.id = layout.id
    and card.board_id = p_board_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> board_card_count then
    raise exception using
      errcode = '22023',
      message = 'Card layout contains missing or duplicate card ids.';
  end if;

  with layout as (
    select id, column_id, position
    from jsonb_to_recordset(p_layout)
      as item(id uuid, column_id uuid, position integer)
  )
  update public.cards as card
  set column_id = layout.column_id,
      position = layout.position,
      updated_by = (select auth.uid())
  from layout
  where card.id = layout.id
    and card.board_id = p_board_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> board_card_count then
    raise exception using
      errcode = '22023',
      message = 'Card layout could not be applied completely.';
  end if;
end;
$$;

create or replace function public.convert_card_to_sticky(
  p_card_id uuid,
  p_note jsonb,
  p_layout jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  board_id_value uuid;
begin
  select card.board_id
  into board_id_value
  from public.cards as card
  join public.boards as board on board.id = card.board_id
  where card.id = p_card_id
    and board.owner_id = (select auth.uid())
    and not board.is_template
  for update of board;

  if board_id_value is null then
    raise exception using
      errcode = '42501',
      message = 'The card is not writable by the current user.';
  end if;

  insert into public.sticky_notes (
    id,
    board_id,
    client_key,
    content,
    color,
    x,
    y,
    card_payload,
    created_by,
    updated_by
  )
  values (
    (p_note ->> 'id')::uuid,
    board_id_value,
    p_note ->> 'client_key',
    p_note ->> 'content',
    coalesce(p_note ->> 'color', 'yellow'),
    coalesce((p_note ->> 'x')::double precision, 0),
    coalesce((p_note ->> 'y')::double precision, 0),
    coalesce(p_note -> 'card_payload', '{}'::jsonb),
    (select auth.uid()),
    (select auth.uid())
  );

  delete from public.cards where id = p_card_id and board_id = board_id_value;
  perform public.commit_card_layout(board_id_value, p_layout);
end;
$$;

create or replace function public.convert_sticky_to_card(
  p_note_id uuid,
  p_card jsonb,
  p_dependencies jsonb,
  p_layout jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  board_id_value uuid;
begin
  if jsonb_typeof(p_dependencies) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'Dependencies must be a JSON array.';
  end if;

  select note.board_id
  into board_id_value
  from public.sticky_notes as note
  join public.boards as board on board.id = note.board_id
  where note.id = p_note_id
    and board.owner_id = (select auth.uid())
    and not board.is_template
  for update of board;

  if board_id_value is null then
    raise exception using
      errcode = '42501',
      message = 'The sticky note is not writable by the current user.';
  end if;

  insert into public.cards (
    id,
    board_id,
    column_id,
    client_key,
    title,
    description,
    priority,
    estimate,
    position,
    labels,
    owner_name,
    goal,
    due_date,
    created_by,
    updated_by
  )
  values (
    (p_card ->> 'id')::uuid,
    board_id_value,
    (p_card ->> 'column_id')::uuid,
    p_card ->> 'client_key',
    p_card ->> 'title',
    coalesce(p_card ->> 'description', ''),
    coalesce(p_card ->> 'priority', 'medium')::public.card_priority,
    coalesce((p_card ->> 'estimate')::integer, 1),
    (p_card ->> 'position')::integer,
    coalesce(
      (
        select array_agg(label)
        from jsonb_array_elements_text(coalesce(p_card -> 'labels', '[]'::jsonb)) as label
      ),
      array[]::text[]
    ),
    p_card ->> 'owner_name',
    p_card ->> 'goal',
    nullif(p_card ->> 'due_date', '')::date,
    (select auth.uid()),
    (select auth.uid())
  );

  insert into public.card_dependencies (
    id,
    board_id,
    source_card_id,
    target_card_id,
    created_by
  )
  select
    dependency.id,
    board_id_value,
    dependency.source_card_id,
    dependency.target_card_id,
    (select auth.uid())
  from jsonb_to_recordset(p_dependencies)
    as dependency(id uuid, source_card_id uuid, target_card_id uuid);

  delete from public.sticky_notes where id = p_note_id and board_id = board_id_value;
  perform public.commit_card_layout(board_id_value, p_layout);
end;
$$;

create or replace function public.persist_planning_proposal(
  p_board_id uuid,
  p_proposal jsonb,
  p_actions jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_actions) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'Proposal actions must be a JSON array.';
  end if;

  insert into public.planning_proposals (
    id,
    board_id,
    created_by,
    title,
    summary,
    status
  )
  values (
    (p_proposal ->> 'id')::uuid,
    p_board_id,
    (select auth.uid()),
    p_proposal ->> 'title',
    coalesce(p_proposal ->> 'summary', ''),
    'draft'
  );

  insert into public.proposal_actions (
    id,
    proposal_id,
    action_type,
    entity_id,
    before_state,
    after_state,
    rationale,
    position
  )
  select
    action.id,
    (p_proposal ->> 'id')::uuid,
    action.action_type::public.proposal_action_type,
    action.entity_id,
    coalesce(action.before_state, '{}'::jsonb),
    coalesce(action.after_state, '{}'::jsonb),
    coalesce(action.rationale, ''),
    action.ordinal::integer - 1
  from jsonb_to_recordset(p_actions) with ordinality
    as action(
      id uuid,
      action_type text,
      entity_id uuid,
      before_state jsonb,
      after_state jsonb,
      rationale text,
      ordinal bigint
    );
end;
$$;

revoke all on function public.commit_card_layout(uuid, jsonb) from public, anon;
revoke all on function public.convert_card_to_sticky(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.convert_sticky_to_card(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.persist_planning_proposal(uuid, jsonb, jsonb) from public, anon;

grant execute on function public.commit_card_layout(uuid, jsonb) to authenticated;
grant execute on function public.convert_card_to_sticky(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.convert_sticky_to_card(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.persist_planning_proposal(uuid, jsonb, jsonb) to authenticated;
