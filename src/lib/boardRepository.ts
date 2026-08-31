import type { RealtimeChannel, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  ActivityItem,
  BoardInvitationLink,
  BoardCard,
  BoardPresence,
  BoardRole,
  BoardSnapshot,
  BoardStickyNote,
  CardDependency,
  Collaborator,
  CreateInvitationInput,
  CreateSprintInput,
  PlanningProposal,
  SprintStatus,
  SprintSummary,
  UpdateCardInput,
  UpdateStickyNoteInput,
} from '../types/domain'
import type { Json, TablesInsert } from '../types/database'

function sortSnapshot(snapshot: BoardSnapshot): BoardSnapshot {
  snapshot.columns.sort((a, b) => a.position - b.position)
  snapshot.cards.sort((a, b) => {
    if (a.column_id !== b.column_id) return a.column_id.localeCompare(b.column_id)
    return a.position - b.position
  })
  snapshot.stickyNotes.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return snapshot
}

function isMissingStickyNotesTable(error: { code?: string } | null) {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

function templateStickyFallback(boardId: string): BoardStickyNote[] {
  const timestamp = new Date(0).toISOString()
  return [
    {
      id: '00000000-0000-4000-8000-000000000101',
      board_id: boardId,
      client_key: 'activation-hypothesis',
      content: 'Hypothesis\nA shorter first-run checklist could improve activation.',
      color: 'yellow',
      x: -220,
      y: 210,
      card_payload: {},
      created_by: null,
      updated_by: null,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      board_id: boardId,
      client_key: 'customer-signal',
      content: 'Customer signal\nTeams want a clearer invitation step before onboarding.',
      color: 'pink',
      x: 1370,
      y: 300,
      card_payload: {},
      created_by: null,
      updated_by: null,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]
}

export async function loadBoard(
  boardId: string,
  source: BoardSnapshot['source'],
): Promise<BoardSnapshot> {
  const [boardResult, columnsResult, cardsResult, stickyNotesResult, dependenciesResult] = await Promise.all([
    supabase.from('boards').select('*').eq('id', boardId).single(),
    supabase.from('board_columns').select('*').eq('board_id', boardId).order('position'),
    supabase.from('cards').select('*').eq('board_id', boardId).order('position'),
    supabase.from('sticky_notes').select('*').eq('board_id', boardId).order('created_at'),
    supabase.from('card_dependencies').select('*').eq('board_id', boardId),
  ])

  const error =
    boardResult.error ||
    columnsResult.error ||
    cardsResult.error ||
    (isMissingStickyNotesTable(stickyNotesResult.error) ? null : stickyNotesResult.error) ||
    dependenciesResult.error
  if (error) throw error

  return sortSnapshot({
    board: boardResult.data,
    columns: columnsResult.data,
    cards: cardsResult.data,
    stickyNotes: isMissingStickyNotesTable(stickyNotesResult.error)
      ? source === 'supabase-template'
        ? templateStickyFallback(boardId)
        : []
      : stickyNotesResult.data || [],
    dependencies: dependenciesResult.data,
    source,
  })
}

export async function loadPublicTemplate(): Promise<BoardSnapshot> {
  const { data, error } = await supabase
    .from('boards')
    .select('id')
    .eq('is_template', true)
    .order('created_at')
    .limit(1)
    .single()

  if (error) throw error
  return loadBoard(data.id, 'supabase-template')
}

export async function loadOwnedWorkspace(user: User): Promise<BoardSnapshot | null> {
  const { data, error } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_template', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? loadBoard(data.id, 'supabase-workspace') : null
}

function isBoardRole(value: string): value is BoardRole {
  return value === 'owner' || value === 'editor' || value === 'viewer'
}

function isSprintStatus(value: string): value is SprintStatus {
  return value === 'active' || value === 'completed' || value === 'archived'
}

export async function loadAccessibleSprints(userId: string): Promise<SprintSummary[]> {
  const [boardsResult, membershipsResult] = await Promise.all([
    supabase
      .from('boards')
      .select('id,title,sprint_goal,capacity,status,starts_on,ends_on,updated_at')
      .eq('is_template', false)
      .order('updated_at', { ascending: false }),
    supabase.from('board_members').select('board_id,role').eq('user_id', userId),
  ])
  if (boardsResult.error) throw boardsResult.error
  if (membershipsResult.error) throw membershipsResult.error

  const roles = new Map(
    membershipsResult.data
      .filter((membership) => isBoardRole(membership.role))
      .map((membership) => [membership.board_id, membership.role as BoardRole]),
  )
  return boardsResult.data.flatMap((board) => {
    const role = roles.get(board.id)
    if (!role) return []
    return [{
      id: board.id,
      title: board.title,
      sprintGoal: board.sprint_goal,
      capacity: board.capacity,
      status: isSprintStatus(board.status) ? board.status : 'active',
      startsOn: board.starts_on,
      endsOn: board.ends_on,
      updatedAt: board.updated_at,
      role,
    }]
  })
}

export async function loadBoardCollaborators(boardId: string): Promise<Collaborator[]> {
  const { data: members, error: memberError } = await supabase
    .from('board_members')
    .select('user_id,role,joined_at')
    .eq('board_id', boardId)
    .order('joined_at')
  if (memberError) throw memberError
  const userIds = members.map((member) => member.user_id)
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase.from('profiles').select('id,display_name,avatar_url').in('id', userIds)
    : { data: [], error: null }
  if (profileError) throw profileError
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  return members.flatMap((member) => {
    if (!isBoardRole(member.role)) return []
    const profile = profileById.get(member.user_id)
    return [{
      userId: member.user_id,
      displayName: profile?.display_name || 'Planner',
      avatarUrl: profile?.avatar_url || null,
      role: member.role,
      joinedAt: member.joined_at,
    }]
  })
}

export async function createSprint(input: CreateSprintInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_sprint', {
    p_title: input.title,
    p_sprint_goal: input.sprintGoal || '',
    p_capacity: input.capacity || 15,
    p_source_board_id: input.sourceBoardId || undefined,
    p_copy_mode: input.copyMode || 'empty',
    p_starts_on: input.startsOn || undefined,
    p_ends_on: input.endsOn || undefined,
  })
  if (error) throw error
  return data
}

export async function createBoardInvitation(
  boardId: string,
  input: CreateInvitationInput,
): Promise<BoardInvitationLink> {
  const { data, error } = await supabase.rpc('create_board_invitation', {
    p_board_id: boardId,
    p_role: input.role,
    p_email: input.email || undefined,
  })
  if (error) throw error
  const invitation = data[0]
  if (!invitation) throw new Error('Supabase did not return an invitation link.')
  return {
    id: invitation.invitation_id,
    token: invitation.invitation_token,
    expiresAt: invitation.expires_at,
    role: input.role,
    email: input.email,
  }
}

export async function acceptBoardInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_board_invitation', { p_token: token })
  if (error) throw error
  return data
}

export async function cloneSnapshotToWorkspace(
  snapshot: BoardSnapshot,
  user: User,
): Promise<BoardSnapshot> {
  const boardId = crypto.randomUUID()
  const columnIdMap = new Map(snapshot.columns.map((column) => [column.id, crypto.randomUUID()]))
  const cardIdMap = new Map(snapshot.cards.map((card) => [card.id, crypto.randomUUID()]))

  const boardInsert: TablesInsert<'boards'> = {
    id: boardId,
    owner_id: user.id,
    title: snapshot.board.title,
    description: snapshot.board.description,
    sprint_goal: snapshot.board.sprint_goal,
    capacity: snapshot.board.capacity,
    is_template: false,
  }

  const { error: boardError } = await supabase.from('boards').insert(boardInsert)
  if (boardError) throw boardError

  try {
    const columns: TablesInsert<'board_columns'>[] = snapshot.columns.map((column) => ({
      id: columnIdMap.get(column.id),
      board_id: boardId,
      client_key: column.client_key,
      title: column.title,
      description: column.description,
      accent: column.accent,
      position: column.position,
      wip_limit: column.wip_limit,
    }))
    const { error: columnsError } = await supabase.from('board_columns').insert(columns)
    if (columnsError) throw columnsError

    const cards: TablesInsert<'cards'>[] = snapshot.cards.map((card) => ({
      id: cardIdMap.get(card.id),
      board_id: boardId,
      column_id: columnIdMap.get(card.column_id)!,
      client_key: card.client_key,
      title: card.title,
      description: card.description,
      priority: card.priority,
      estimate: card.estimate,
      position: card.position,
      labels: card.labels,
      owner_name: card.owner_name,
      goal: card.goal,
      due_date: card.due_date,
      created_by: user.id,
      updated_by: user.id,
    }))
    const { error: cardsError } = await supabase.from('cards').insert(cards)
    if (cardsError) throw cardsError

    if (snapshot.dependencies.length) {
      const dependencies: TablesInsert<'card_dependencies'>[] = snapshot.dependencies.map(
        (dependency) => ({
          id: crypto.randomUUID(),
          board_id: boardId,
          source_card_id: cardIdMap.get(dependency.source_card_id)!,
          target_card_id: cardIdMap.get(dependency.target_card_id)!,
          created_by: user.id,
        }),
      )
      const { error: dependencyError } = await supabase
        .from('card_dependencies')
        .insert(dependencies)
      if (dependencyError) throw dependencyError
    }

    if (snapshot.stickyNotes.length) {
      const stickyNotes: TablesInsert<'sticky_notes'>[] = snapshot.stickyNotes.map((note) => ({
        id: crypto.randomUUID(),
        board_id: boardId,
        client_key: note.client_key,
        content: note.content,
        color: note.color,
        x: note.x,
        y: note.y,
        card_payload: note.card_payload,
        created_by: user.id,
        updated_by: user.id,
      }))
      const { error: stickyNotesError } = await supabase.from('sticky_notes').insert(stickyNotes)
      if (stickyNotesError && !isMissingStickyNotesTable(stickyNotesError)) throw stickyNotesError
    }
  } catch (error) {
    await supabase.from('boards').delete().eq('id', boardId)
    throw error
  }

  return loadBoard(boardId, 'supabase-workspace')
}

function serializeCardLayout(cards: BoardCard[]): Json {
  return cards.map((card) => ({
    id: card.id,
    column_id: card.column_id,
    position: card.position,
  }))
}

export async function persistCardLayout(boardId: string, cards: BoardCard[]): Promise<void> {
  const { error } = await supabase.rpc('commit_card_layout', {
    p_board_id: boardId,
    p_layout: serializeCardLayout(cards),
  })
  if (error) throw error
}

export async function persistAppliedProposal(
  boardId: string,
  proposalId: string,
  cards: BoardCard[],
): Promise<void> {
  const { error } = await supabase.rpc('apply_planning_proposal', {
    p_board_id: boardId,
    p_proposal_id: proposalId,
    p_layout: serializeCardLayout(cards),
  })
  if (error) throw error
}

export async function persistNewCard(card: BoardCard): Promise<BoardCard> {
  const { data, error } = await supabase
    .from('cards')
    .insert({
      id: card.id,
      board_id: card.board_id,
      column_id: card.column_id,
      client_key: card.client_key,
      title: card.title,
      description: card.description,
      priority: card.priority,
      estimate: card.estimate,
      position: card.position,
      labels: card.labels,
      owner_name: card.owner_name,
      goal: card.goal,
      due_date: card.due_date,
      created_by: card.created_by,
      updated_by: card.updated_by,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function persistNewStickyNote(note: BoardStickyNote): Promise<BoardStickyNote> {
  const { data, error } = await supabase
    .from('sticky_notes')
    .insert({
      id: note.id,
      board_id: note.board_id,
      client_key: note.client_key,
      content: note.content,
      color: note.color,
      x: note.x,
      y: note.y,
      card_payload: note.card_payload,
      created_by: note.created_by,
      updated_by: note.updated_by,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function persistStickyNoteUpdate(
  noteId: string,
  input: UpdateStickyNoteInput,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('sticky_notes')
    .update({
      content: input.content,
      color: input.color,
      x: input.x,
      y: input.y,
      updated_by: userId,
    })
    .eq('id', noteId)
  if (error) throw error
}

export async function persistCardToSticky(
  cardId: string,
  note: BoardStickyNote,
  cards: BoardCard[],
): Promise<void> {
  const { error } = await supabase.rpc('convert_card_to_sticky', {
    p_card_id: cardId,
    p_note: {
      id: note.id,
      client_key: note.client_key,
      content: note.content,
      color: note.color,
      x: note.x,
      y: note.y,
      card_payload: note.card_payload,
    },
    p_layout: serializeCardLayout(cards),
  })
  if (error) throw error
}

export async function persistStickyToCard(
  noteId: string,
  card: BoardCard,
  dependencies: CardDependency[],
  cards: BoardCard[],
): Promise<void> {
  const { error } = await supabase.rpc('convert_sticky_to_card', {
    p_note_id: noteId,
    p_card: {
      id: card.id,
      column_id: card.column_id,
      client_key: card.client_key,
      title: card.title,
      description: card.description,
      priority: card.priority,
      estimate: card.estimate,
      position: card.position,
      labels: card.labels,
      owner_name: card.owner_name,
      goal: card.goal,
      due_date: card.due_date,
    },
    p_dependencies: dependencies.map((dependency) => ({
      id: dependency.id,
      source_card_id: dependency.source_card_id,
      target_card_id: dependency.target_card_id,
    })),
    p_layout: serializeCardLayout(cards),
  })
  if (error) throw error
}

export async function persistCardUpdate(
  cardId: string,
  input: UpdateCardInput,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({
      title: input.title,
      description: input.description,
      priority: input.priority,
      estimate: input.estimate,
      owner_name: input.ownerName,
      goal: input.goal,
      labels: input.labels,
      updated_by: userId,
    })
    .eq('id', cardId)
  if (error) throw error
}

export async function persistDependency(
  dependency: CardDependency,
): Promise<void> {
  const { error } = await supabase.from('card_dependencies').insert({
    id: dependency.id,
    board_id: dependency.board_id,
    source_card_id: dependency.source_card_id,
    target_card_id: dependency.target_card_id,
    created_by: dependency.created_by,
  })
  if (error) throw error
}

export async function persistProposal(
  proposal: PlanningProposal,
  boardId: string,
): Promise<void> {
  const { error } = await supabase.rpc('persist_planning_proposal', {
    p_board_id: boardId,
    p_proposal: {
      id: proposal.id,
      title: proposal.title,
      summary: proposal.summary,
    },
    p_actions: proposal.actions.map((action) => ({
      id: action.id,
      action_type: action.type,
      entity_id: action.cardId || null,
      before_state: action.before as Json,
      after_state: action.after as Json,
      rationale: action.rationale,
    })),
  })
  if (error) throw error
}

export async function resolveProposal(
  proposalId: string,
  status: 'accepted' | 'dismissed',
): Promise<void> {
  const { error } = await supabase
    .from('planning_proposals')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', proposalId)
  if (error) throw error
}

export async function persistActivity(
  boardId: string,
  userId: string,
  item: ActivityItem,
): Promise<void> {
  const { error } = await supabase.from('activity_events').insert({
    board_id: boardId,
    actor_id: userId,
    event_type: item.id.split(':')[0].replace(/-/g, '_'),
    payload: { title: item.title, detail: item.detail, actor: item.actor },
  })
  if (error) throw error
}

export function subscribeToBoard(boardId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`plot:data:${boardId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'board_columns', filter: `board_id=eq.${boardId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sticky_notes', filter: `board_id=eq.${boardId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'card_dependencies',
        filter: `board_id=eq.${boardId}`,
      },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` },
      onChange,
    )
    .subscribe()
}

interface PresencePayload {
  userId: string
  displayName: string
  role: BoardRole
  onlineAt: string
}

export async function subscribeToBoardPresence(
  boardId: string,
  payload: PresencePayload,
  onSync: (presence: BoardPresence[]) => void,
  onStatus?: (status: string) => void,
): Promise<RealtimeChannel> {
  const topic = `plot:board:${boardId}`
  // supabase-js intentionally reuses a channel with the same topic. React can
  // restart an effect before the previous unsubscribe acknowledgement arrives,
  // so explicitly drain that stale instance before adding new Presence hooks.
  const existing = supabase
    .getChannels()
    .find((candidate) => candidate.topic === `realtime:${topic}`)
  if (existing) await supabase.removeChannel(existing)

  const channel = supabase.channel(topic, {
    config: {
      private: true,
      presence: { key: `${payload.userId}:${crypto.randomUUID()}` },
    },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresencePayload>()
      const aggregated = new Map<string, BoardPresence>()
      Object.values(state).flat().forEach((entry) => {
        if (!entry.userId || !isBoardRole(entry.role)) return
        const existing = aggregated.get(entry.userId)
        aggregated.set(entry.userId, {
          userId: entry.userId,
          displayName: entry.displayName || 'Planner',
          role: entry.role,
          onlineAt: entry.onlineAt,
          clientCount: (existing?.clientCount || 0) + 1,
        })
      })
      onSync([...aggregated.values()])
    })
    .subscribe(async (status) => {
      onStatus?.(status)
      if (status === 'SUBSCRIBED') await channel.track(payload)
    })

  return channel
}
