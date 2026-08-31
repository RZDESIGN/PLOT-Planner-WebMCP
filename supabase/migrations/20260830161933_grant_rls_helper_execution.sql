-- Policy expressions and SECURITY INVOKER RPCs execute as the signed-in role.
-- Grant only function execution; schema USAGE remains revoked so these helpers
-- are not directly addressable through the Data API.

grant execute on function private.is_board_member(uuid) to authenticated;
grant execute on function private.can_edit_board(uuid) to authenticated;
grant execute on function private.is_board_owner(uuid) to authenticated;
grant execute on function private.shares_board_with(uuid) to authenticated;
