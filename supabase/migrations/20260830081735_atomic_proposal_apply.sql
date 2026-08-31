-- Applied remotely as migration 20260830081735.

create or replace function public.apply_planning_proposal(
  p_board_id uuid,
  p_proposal_id uuid,
  p_layout jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  perform public.commit_card_layout(p_board_id, p_layout);

  update public.planning_proposals
  set status = 'accepted',
      resolved_at = now()
  where id = p_proposal_id
    and board_id = p_board_id
    and created_by = (select auth.uid())
    and status = 'draft';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using
      errcode = '22023',
      message = 'The draft proposal could not be resolved.';
  end if;
end;
$$;

revoke all on function public.apply_planning_proposal(uuid, uuid, jsonb)
from public, anon;

grant execute on function public.apply_planning_proposal(uuid, uuid, jsonb)
to authenticated;
