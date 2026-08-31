-- Advisor fixes (remote migration 20260829212203).
-- Lock down the platform-created RLS event-trigger function. Event triggers do
-- not need client-callable EXECUTE privileges to run.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Cover foreign keys used by ownership checks and cascade operations.
create index activity_events_actor_id_idx on public.activity_events (actor_id);
create index card_dependencies_created_by_idx on public.card_dependencies (created_by);
create index card_dependencies_source_board_idx on public.card_dependencies (source_card_id, board_id);
create index card_dependencies_target_board_idx on public.card_dependencies (target_card_id, board_id);
create index cards_created_by_idx on public.cards (created_by);
create index cards_updated_by_idx on public.cards (updated_by);
create index planning_proposals_created_by_idx on public.planning_proposals (created_by);
