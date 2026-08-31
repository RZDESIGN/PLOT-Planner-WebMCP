-- Keep the privileged invitation token lookup outside the exposed API schema.
-- The public wrapper remains SECURITY INVOKER and the private schema has no
-- USAGE grant for client roles.

create index board_invitations_created_by_idx
on public.board_invitations (created_by);

create index board_members_invited_by_idx
on public.board_members (invited_by)
where invited_by is not null;

drop function public.accept_board_invitation(text);

create or replace function private.accept_board_invitation(p_token text)
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

revoke all on function private.accept_board_invitation(text)
from public, anon, service_role;
grant execute on function private.accept_board_invitation(text)
to authenticated;

create or replace function public.accept_board_invitation(p_token text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_board_invitation(p_token);
$$;

revoke all on function public.accept_board_invitation(text) from public, anon;
grant execute on function public.accept_board_invitation(text) to authenticated;
