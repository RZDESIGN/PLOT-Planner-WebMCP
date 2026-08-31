-- PostgreSQL requires a different shape when a record-returning function is
-- combined with ordinality. Keep the layout and proposal RPCs portable by
-- deriving ordinals from rows/JSON elements instead.
-- Applied remotely as migration 20260830081941.

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
    select id, row_number() over () as ordinal
    from jsonb_to_recordset(p_layout)
      as item(id uuid, column_id uuid, position integer)
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
    (item.value ->> 'id')::uuid,
    (p_proposal ->> 'id')::uuid,
    (item.value ->> 'action_type')::public.proposal_action_type,
    nullif(item.value ->> 'entity_id', '')::uuid,
    coalesce(item.value -> 'before_state', '{}'::jsonb),
    coalesce(item.value -> 'after_state', '{}'::jsonb),
    coalesce(item.value ->> 'rationale', ''),
    item.ordinal::integer - 1
  from jsonb_array_elements(p_actions) with ordinality as item(value, ordinal);
end;
$$;

revoke all on function public.commit_card_layout(uuid, jsonb) from public, anon;
revoke all on function public.persist_planning_proposal(uuid, jsonb, jsonb) from public, anon;

grant execute on function public.commit_card_layout(uuid, jsonb) to authenticated;
grant execute on function public.persist_planning_proposal(uuid, jsonb, jsonb) to authenticated;
