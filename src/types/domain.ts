import type { Tables } from './database'

export type Board = Tables<'boards'>
export type BoardColumn = Tables<'board_columns'>
export type BoardCard = Tables<'cards'>
export type BoardStickyNote = Tables<'sticky_notes'>
export type CardDependency = Tables<'card_dependencies'>
export type BoardMember = Tables<'board_members'>
export type Profile = Tables<'profiles'>
export type CardPriority = BoardCard['priority']
export type StickyColor = BoardStickyNote['color']
export type BoardRole = 'owner' | 'editor' | 'viewer'
export type SprintStatus = 'active' | 'completed' | 'archived'

export interface SprintSummary {
  id: string
  title: string
  sprintGoal: string
  capacity: number
  status: SprintStatus
  startsOn: string | null
  endsOn: string | null
  updatedAt: string
  role: BoardRole
}

export interface Collaborator {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: BoardRole
  joinedAt: string
}

export interface BoardPresence {
  userId: string
  displayName: string
  role: BoardRole
  onlineAt: string
  clientCount: number
}

export interface CreateSprintInput {
  title: string
  sprintGoal?: string
  capacity?: number
  copyMode?: 'empty' | 'everything'
  sourceBoardId?: string | null
  startsOn?: string | null
  endsOn?: string | null
}

export interface CreateInvitationInput {
  role: Exclude<BoardRole, 'owner'>
  email?: string
}

export interface BoardInvitationLink {
  id: string
  token: string
  expiresAt: string
  role: Exclude<BoardRole, 'owner'>
  email?: string
}

export interface BoardSnapshot {
  board: Board
  columns: BoardColumn[]
  cards: BoardCard[]
  stickyNotes: BoardStickyNote[]
  dependencies: CardDependency[]
  source: 'supabase-template' | 'supabase-workspace' | 'offline-demo'
}

export type InsightTone = 'critical' | 'warning' | 'positive' | 'neutral'

export interface BoardInsight {
  id: string
  tone: InsightTone
  eyebrow: string
  title: string
  detail: string
}

export type PlanActionType =
  | 'create_card'
  | 'move_card'
  | 'update_card'
  | 'split_card'
  | 'link_dependency'

export interface PlanAction {
  id: string
  type: PlanActionType
  cardId?: string
  cardTitle: string
  fromColumnId?: string
  toColumnId?: string
  toPosition?: number
  before: Record<string, unknown>
  after: Record<string, unknown>
  rationale: string
}

export interface PlanningProposal {
  id: string
  title: string
  summary: string
  actions: PlanAction[]
  status: 'draft' | 'accepted' | 'dismissed'
  createdAt: string
}

export interface ActivityItem {
  id: string
  actor: 'Agent' | 'You' | 'System'
  title: string
  detail: string
  timestamp: string
}

export interface CreateCardInput {
  title: string
  description?: string
  columnId?: string
  priority?: CardPriority
  estimate?: number
  labels?: string[]
  agentGenerated?: boolean
}

export interface UpdateCardInput {
  title?: string
  description?: string
  priority?: CardPriority
  estimate?: number
  ownerName?: string | null
  goal?: string | null
  labels?: string[]
  agentGenerated?: boolean
}

export interface CreateStickyNoteInput {
  content: string
  x?: number
  y?: number
  color?: StickyColor
  agentGenerated?: boolean
}

export interface UpdateStickyNoteInput {
  content?: string
  x?: number
  y?: number
  color?: StickyColor
  agentGenerated?: boolean
}

export interface AgentMotion {
  phase: 'idle' | 'proposing' | 'applying' | 'editing'
  activeCardId: string | null
  /** Notes are agent targets too; the pointer travels to whichever is set. */
  activeNoteId: string | null
  step: number
  total: number
  message: string
}

export interface BoardAnalysis {
  focusScore: number
  plannedPoints: number
  capacity: number
  insights: BoardInsight[]
}
