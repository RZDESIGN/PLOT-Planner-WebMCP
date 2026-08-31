import type {
  BoardCard,
  BoardSnapshot,
  BoardStickyNote,
  CardDependency,
  CardPriority,
  CreateCardInput,
  CreateStickyNoteInput,
  StickyColor,
  UpdateCardInput,
  UpdateStickyNoteInput,
} from '../types/domain'
import type { Json } from '../types/database'

const CARD_PRIORITIES = new Set<CardPriority>(['critical', 'high', 'medium', 'low'])
const STICKY_COLORS = new Set<StickyColor>(['yellow', 'pink', 'blue', 'green', 'violet'])
const MAX_CANVAS_COORDINATE = 100_000

function requireText(value: string, label: string, maxLength: number) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required.`)
  if (normalized.length > maxLength) {
    throw new Error(`${label} cannot be longer than ${maxLength} characters.`)
  }
  return normalized
}

function optionalText(value: string | null | undefined, label: string, maxLength: number) {
  if (value === undefined || value === null) return value
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new Error(`${label} cannot be longer than ${maxLength} characters.`)
  }
  return normalized
}

function requireEstimate(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error('Estimate must be a whole number between 1 and 100.')
  }
  return value
}

function requireCoordinate(value: number, axis: 'x' | 'y') {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_CANVAS_COORDINATE) {
    throw new Error(`${axis.toUpperCase()} must be between -100000 and 100000.`)
  }
  return value
}

function requirePriority(value: CardPriority) {
  if (!CARD_PRIORITIES.has(value)) throw new Error(`Unknown card priority “${value}”.`)
  return value
}

export function isCardPriority(value: unknown): value is CardPriority {
  return typeof value === 'string' && CARD_PRIORITIES.has(value as CardPriority)
}

function requireStickyColor(value: StickyColor) {
  if (!STICKY_COLORS.has(value)) throw new Error(`Unknown sticky color “${value}”.`)
  return value
}

function slugify(value: string, fallback: string) {
  const prefix = value
    .split('\n')[0]
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  return `${prefix || fallback}-${crypto.randomUUID().slice(0, 6)}`
}

export function normalizeCardPositions(snapshot: BoardSnapshot) {
  for (const column of snapshot.columns) {
    snapshot.cards
      .filter((card) => card.column_id === column.id)
      .sort((a, b) => a.position - b.position)
      .forEach((card, index) => {
        card.position = index
      })
  }
  return snapshot
}

export function findCard(snapshot: BoardSnapshot, reference: string) {
  const normalized = reference.trim().toLowerCase()
  return snapshot.cards.find(
    (card) =>
      card.id === reference ||
      card.client_key === normalized ||
      card.title.toLowerCase() === normalized,
  )
}

export function findColumn(snapshot: BoardSnapshot, reference: string) {
  const normalized = reference.trim().toLowerCase()
  return snapshot.columns.find(
    (column) =>
      column.id === reference ||
      column.client_key === normalized ||
      column.title.toLowerCase() === normalized,
  )
}

export function findStickyNote(snapshot: BoardSnapshot, reference: string) {
  const normalized = reference.trim().toLowerCase()
  return snapshot.stickyNotes.find(
    (note) =>
      note.id === reference ||
      note.client_key === normalized ||
      note.content.trim().toLowerCase() === normalized ||
      note.content.split('\n')[0]?.trim().toLowerCase() === normalized,
  )
}

export function createLocalCard(
  snapshot: BoardSnapshot,
  input: CreateCardInput,
  userId?: string,
): BoardCard {
  const title = requireText(input.title, 'A card title', 160)
  const column = input.columnId ? findColumn(snapshot, input.columnId) : snapshot.columns[0]
  if (!column) {
    throw new Error(
      input.columnId
        ? `Column “${input.columnId}” was not found.`
        : 'This board does not have a column for the new card.',
    )
  }
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    board_id: snapshot.board.id,
    column_id: column.id,
    client_key: slugify(title, 'card'),
    title,
    description: optionalText(input.description, 'Card description', 2000) || '',
    priority: input.priority === undefined ? 'medium' : requirePriority(input.priority),
    estimate: input.estimate === undefined ? 1 : requireEstimate(input.estimate),
    position: snapshot.cards.filter((card) => card.column_id === column.id).length,
    labels: input.labels?.map((label) => label.trim()).filter(Boolean) || [],
    owner_name: null,
    goal: null,
    due_date: null,
    created_by: userId || null,
    updated_by: userId || null,
    created_at: now,
    updated_at: now,
  }
}

export function updateCardInSnapshot(
  current: BoardSnapshot,
  cardReference: string,
  input: UpdateCardInput,
  userId?: string,
) {
  const existing = findCard(current, cardReference)
  if (!existing) throw new Error(`Card “${cardReference}” was not found.`)
  const hasChange =
    input.title !== undefined ||
    input.description !== undefined ||
    input.priority !== undefined ||
    input.estimate !== undefined ||
    input.ownerName !== undefined ||
    input.goal !== undefined ||
    input.labels !== undefined
  if (!hasChange) throw new Error('Provide at least one card field to update.')

  const next = structuredClone(current)
  const updated = findCard(next, cardReference)!
  if (input.title !== undefined) updated.title = requireText(input.title, 'A card title', 160)
  if (input.description !== undefined) {
    updated.description = optionalText(input.description, 'Card description', 2000) || ''
  }
  if (input.priority !== undefined) updated.priority = requirePriority(input.priority)
  if (input.estimate !== undefined) updated.estimate = requireEstimate(input.estimate)
  if (input.ownerName !== undefined) {
    updated.owner_name =
      input.ownerName === null ? null : optionalText(input.ownerName, 'Owner name', 80) || null
  }
  if (input.goal !== undefined) {
    updated.goal = input.goal === null ? null : optionalText(input.goal, 'Card goal', 240) || null
  }
  if (input.labels !== undefined) {
    updated.labels = input.labels.map((label) => label.trim()).filter(Boolean)
  }
  updated.updated_by = userId || null
  updated.updated_at = new Date().toISOString()
  return { next, updated }
}

export function createLocalStickyNote(
  snapshot: BoardSnapshot,
  input: CreateStickyNoteInput,
  userId?: string,
  cardPayload: Json = {},
): BoardStickyNote {
  const content = requireText(input.content, 'Sticky note content', 1200)
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    board_id: snapshot.board.id,
    client_key: slugify(content, 'note'),
    content,
    color: input.color === undefined ? 'yellow' : requireStickyColor(input.color),
    x: requireCoordinate(input.x ?? -210, 'x'),
    y: requireCoordinate(input.y ?? 210, 'y'),
    card_payload: cardPayload,
    created_by: userId || null,
    updated_by: userId || null,
    created_at: now,
    updated_at: now,
  }
}

export function updateStickyNoteInSnapshot(
  current: BoardSnapshot,
  noteReference: string,
  input: UpdateStickyNoteInput,
  userId?: string,
) {
  const existing = findStickyNote(current, noteReference)
  if (!existing) throw new Error(`Sticky note “${noteReference}” was not found.`)
  const hasChange =
    input.content !== undefined ||
    input.color !== undefined ||
    input.x !== undefined ||
    input.y !== undefined
  if (!hasChange) throw new Error('Provide at least one sticky note field to update.')

  const next = structuredClone(current)
  const updated = findStickyNote(next, noteReference)!
  if (input.content !== undefined) {
    updated.content = requireText(input.content, 'Sticky note content', 1200)
  }
  if (input.color !== undefined) updated.color = requireStickyColor(input.color)
  if (input.x !== undefined) updated.x = requireCoordinate(input.x, 'x')
  if (input.y !== undefined) updated.y = requireCoordinate(input.y, 'y')
  updated.updated_at = new Date().toISOString()
  updated.updated_by = userId || null
  return { next, updated }
}

export function moveCardInSnapshot(
  current: BoardSnapshot,
  cardReference: string,
  columnReference: string,
  targetPosition?: number,
) {
  if (targetPosition !== undefined && (!Number.isInteger(targetPosition) || targetPosition < 0)) {
    throw new Error('Card position must be a non-negative whole number.')
  }
  const next = structuredClone(current)
  const card = findCard(next, cardReference)
  const targetColumn = findColumn(next, columnReference)
  if (!card) throw new Error(`Card “${cardReference}” was not found.`)
  if (!targetColumn) throw new Error(`Column “${columnReference}” was not found.`)

  const sourceCards = next.cards
    .filter((candidate) => candidate.column_id === card.column_id)
    .sort((a, b) => a.position - b.position)
  const sourceIndex = sourceCards.findIndex((candidate) => candidate.id === card.id)
  const targetCards = next.cards
    .filter((candidate) => candidate.column_id === targetColumn.id && candidate.id !== card.id)
    .sort((a, b) => a.position - b.position)
  const insertionIndex = Math.max(
    0,
    Math.min(targetPosition ?? targetCards.length, targetCards.length),
  )
  const changed = card.column_id !== targetColumn.id || sourceIndex !== insertionIndex
  if (!changed) return { next: current, card: existingCard(current, card.id), column: targetColumn, changed }

  targetCards.splice(insertionIndex, 0, card)
  card.column_id = targetColumn.id
  card.updated_at = new Date().toISOString()
  targetCards.forEach((candidate, index) => {
    candidate.position = index
  })

  normalizeCardPositions(next)
  return { next, card, column: targetColumn, changed }
}

function existingCard(snapshot: BoardSnapshot, cardId: string) {
  return snapshot.cards.find((card) => card.id === cardId)!
}

export function stickyPayload(note: BoardStickyNote) {
  const payload = note.card_payload
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, Json | undefined>)
    : {}
}

export function cardToPayload(card: BoardCard, snapshot: BoardSnapshot): Json {
  return {
    clientKey: card.client_key,
    title: card.title,
    description: card.description,
    priority: card.priority,
    estimate: card.estimate,
    labels: card.labels,
    ownerName: card.owner_name,
    goal: card.goal,
    dueDate: card.due_date,
    incomingDependencies: snapshot.dependencies
      .filter((dependency) => dependency.target_card_id === card.id)
      .map(
        (dependency) =>
          snapshot.cards.find((candidate) => candidate.id === dependency.source_card_id)?.client_key,
      )
      .filter((reference): reference is string => Boolean(reference)),
    outgoingDependencies: snapshot.dependencies
      .filter((dependency) => dependency.source_card_id === card.id)
      .map(
        (dependency) =>
          snapshot.cards.find((candidate) => candidate.id === dependency.target_card_id)?.client_key,
      )
      .filter((reference): reference is string => Boolean(reference)),
  }
}

export function wouldCreateDependencyCycle(
  dependencies: CardDependency[],
  sourceCardId: string,
  targetCardId: string,
) {
  const outgoing = new Map<string, string[]>()
  for (const dependency of dependencies) {
    const targets = outgoing.get(dependency.source_card_id) || []
    targets.push(dependency.target_card_id)
    outgoing.set(dependency.source_card_id, targets)
  }

  const pending = [targetCardId]
  const visited = new Set<string>()
  while (pending.length) {
    const cardId = pending.pop()!
    if (cardId === sourceCardId) return true
    if (visited.has(cardId)) continue
    visited.add(cardId)
    pending.push(...(outgoing.get(cardId) || []))
  }
  return false
}
