-- The private schema is not part of the Data API's exposed schemas. USAGE is
-- still required for SECURITY INVOKER RPCs to resolve their tightly scoped
-- helper functions; it grants no table access by itself.

grant usage on schema private to authenticated;
