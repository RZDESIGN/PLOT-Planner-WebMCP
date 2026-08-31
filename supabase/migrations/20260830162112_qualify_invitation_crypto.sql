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
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
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
  insert into public.board_invitations (board_id, email, role, token_hash, created_by)
  values (
    p_board_id,
    nullif(lower(trim(p_email)), ''),
    p_role,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    (select auth.uid())
  )
  returning id, raw_token, board_invitations.expires_at;
end;
$$;

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
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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

revoke all on function public.create_board_invitation(uuid, text, text) from public, anon;
grant execute on function public.create_board_invitation(uuid, text, text) to authenticated;
revoke all on function private.accept_board_invitation(text) from public, anon, service_role;
grant execute on function private.accept_board_invitation(text) to authenticated;
