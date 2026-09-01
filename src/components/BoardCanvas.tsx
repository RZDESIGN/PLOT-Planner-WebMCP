import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DropAnimation,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowRight,
  Bot,
  CirclePlus,
  Goal,
  GripVertical,
  Hand,
  Link2,
  Maximize2,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Sparkles,
  StickyNote as StickyNoteIcon,
} from 'lucide-react'
import type {
  AgentMotion,
  BoardCard,
  BoardColumn,
  BoardSnapshot,
  BoardStickyNote,
  PlanAction,
  PlanningProposal,
  StickyColor,
} from '../types/domain'
import { useCanvasMotion } from '../hooks/useCanvasMotion'

interface BoardCanvasProps {
  snapshot: BoardSnapshot
  proposal: PlanningProposal | null
  agentMotion: AgentMotion
  recentAgentCardIds: Set<string>
  recentAgentStickyIds: Set<string>
  readOnly?: boolean
  onMoveCard: (cardId: string, columnId: string, position?: number) => Promise<unknown>
  onMoveStickyNote: (noteId: string, x: number, y: number) => Promise<unknown>
  onConvertStickyToCard: (noteId: string, columnId: string, position?: number) => Promise<unknown>
  onConvertCardToSticky: (
    cardId: string,
    x: number,
    y: number,
    color?: StickyColor,
  ) => Promise<unknown>
  onAddCard: (columnId: string) => void
  onAddSticky: (position: { x: number; y: number }) => void
  onEditSticky: (noteId: string) => void
  onActionError: (error: unknown) => void
}

interface CardProps {
  card: BoardCard
  snapshot: BoardSnapshot
  isLeaving?: boolean
  isOverlay?: boolean
  disabled?: boolean
  agentAnimated?: boolean
  agentActive?: boolean
  dragVelocity?: { x: number; y: number }
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 1.35
const PROPOSAL_STAGGER_MS = 240
const STICKY_WIDTH = 200
const STICKY_HEIGHT = 160

const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return args.pointerCoordinates ? [] : closestCorners(args)
}

const CARD_DROP_ANIMATION: DropAnimation = {
  duration: 460,
  easing: 'cubic-bezier(0.18, 0.82, 0.2, 1)',
  keyframes: ({ transform }) => {
    const travelX = transform.final.x - transform.initial.x
    const travelY = transform.final.y - transform.initial.y
    const overshoot = {
      ...transform.final,
      x: transform.final.x + travelX * 0.025,
      y: transform.final.y + travelY * 0.025,
      scaleX: 1.012,
      scaleY: 0.988,
    }
    return [
      { transform: CSS.Transform.toString(transform.initial), offset: 0 },
      { transform: CSS.Transform.toString(overshoot), offset: 0.78 },
      { transform: CSS.Transform.toString(transform.final), offset: 1 },
    ]
  },
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0' },
    },
  }),
}

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
}

const priorityLabel = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function initials(name: string | null) {
  if (!name) return '—'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ownerClassName(name: string | null) {
  if (!name) return 'open'
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'open'
  )
}

function CardContent({ card, snapshot, isLeaving, isOverlay, agentAnimated, agentActive, dragVelocity }: CardProps) {
  const incoming = snapshot.dependencies
    .filter((dependency) => dependency.target_card_id === card.id)
    .map((dependency) => snapshot.cards.find((item) => item.id === dependency.source_card_id))
    .filter((item): item is BoardCard => Boolean(item))
  const outgoing = snapshot.dependencies
    .filter((dependency) => dependency.source_card_id === card.id)
    .map((dependency) => snapshot.cards.find((item) => item.id === dependency.target_card_id))
    .filter((item): item is BoardCard => Boolean(item))
  const horizontalVelocity = dragVelocity?.x || 0
  const verticalVelocity = dragVelocity?.y || 0
  const tilt = Math.max(-7.5, Math.min(7.5, horizontalVelocity * 5.8))
  const lift = Math.min(1, Math.hypot(horizontalVelocity, verticalVelocity) / 1.65)
  const stretch = Math.min(0.025, Math.abs(horizontalVelocity) * 0.012)
  const columnKey = snapshot.columns.find((column) => column.id === card.column_id)?.client_key
  const columnColor = {
    inbox: '#ffc5d0',
    now: '#d4f58f',
    next: '#cec6ff',
    later: '#ffe98a',
  }[columnKey || ''] || '#f1f2f4'

  return (
    <article
      className={`plot-card priority-${card.priority}${isLeaving ? ' is-leaving' : ''}${isOverlay ? ' is-overlay' : ''}${agentAnimated ? ' is-agent-animated' : ''}${agentActive ? ' is-agent-active' : ''}`}
      aria-label={`${card.title}, ${priorityLabel[card.priority]} priority, ${card.estimate} points`}
      data-card-key={card.client_key}
      style={{
        '--column-card': columnColor,
        '--drag-tilt': `${tilt}deg`,
        '--drag-lift': lift,
        '--drag-scale': 1.025 + lift * 0.012,
        '--drag-stretch-x': 1 + stretch,
        '--drag-stretch-y': 1 - stretch * 0.45,
      } as CSSProperties}
    >
      <div className="plot-card__topline">
        <span className="priority-pill">
          <span className="priority-dot" />
          {priorityLabel[card.priority]}
        </span>
        {!isOverlay && (
          <span className="drag-hint" aria-hidden="true">
            <GripVertical size={15} />
          </span>
        )}
      </div>
      <div className="plot-card__copy">
        <h3>{card.title}</h3>
        <p>{card.description}</p>
      </div>
      {card.labels.length > 0 && (
        <div className="label-row" aria-label="Labels">
          {card.labels.slice(0, 3).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="dependency-stack">
          {incoming.map((source) => (
            <div className="dependency-note is-blocked" key={`in-${source.id}`}>
              <Link2 size={12} />
              <span>Blocked by {source.title}</span>
            </div>
          ))}
          {outgoing.map((target) => (
            <div className="dependency-note" key={`out-${target.id}`}>
              <Link2 size={12} />
              <span>Blocks {target.title}</span>
            </div>
          ))}
        </div>
      )}
      <footer className="plot-card__footer">
        <div className="estimate" aria-label={`${card.estimate} story points`}>
          <span>{card.estimate}</span> pts
        </div>
        <div className={`owner-avatar owner-${ownerClassName(card.owner_name)}`}>
          {initials(card.owner_name)}
        </div>
      </footer>
      {isLeaving && (
        <div className="leaving-banner">
          <Bot size={13} /> moving in proposal
        </div>
      )}
      {agentAnimated && <span className="agent-page-curl" aria-hidden="true" />}
      {agentActive && (
        <span className="agent-live-cursor" aria-hidden="true">
          <MousePointer2 size={19} fill="currentColor" />
          <small>PLOT</small>
        </span>
      )}
    </article>
  )
}

function SortableCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
    disabled: props.disabled,
    animateLayoutChanges: ({ isSorting, wasDragging }) => isSorting || wasDragging,
    transition: {
      duration: 420,
      easing: 'cubic-bezier(0.18, 0.82, 0.2, 1)',
    },
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        viewTransitionName: `plot-card-${props.card.id}`,
      } as CSSProperties}
      className={isDragging ? 'sortable-card is-dragging' : 'sortable-card'}
      {...attributes}
      {...listeners}
    >
      <CardContent {...props} />
    </div>
  )
}

function GhostCard({ card, action, snapshot, index }: { card: BoardCard; action: PlanAction; snapshot: BoardSnapshot; index: number }) {
  const source = snapshot.columns.find((column) => column.id === action.fromColumnId)
  return (
    <article
      className="ghost-card"
      aria-label={`Proposed move: ${card.title}`}
      style={{ '--ghost-delay': `${index * PROPOSAL_STAGGER_MS}ms` } as CSSProperties}
    >
      <div className="ghost-card__label">
        <Sparkles size={13} /> AI proposal
      </div>
      <h3>{card.title}</h3>
      <p>
        From {source?.title || 'another column'} <ArrowRight size={12} /> here
      </p>
      <span>{action.rationale}</span>
      <span className="ghost-page-curl" aria-hidden="true" />
      <span className="ghost-agent-cursor" aria-hidden="true">
        <MousePointer2 size={19} fill="currentColor" />
        <small>PLOT</small>
      </span>
    </article>
  )
}

function CanvasStickyNote({
  note,
  zoom,
  disabled,
  agentAnimated,
  onEdit,
}: {
  note: BoardStickyNote
  zoom: number
  disabled: boolean
  agentAnimated: boolean
  onEdit: (noteId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sticky:${note.id}`,
    disabled,
    data: { type: 'sticky-note', noteId: note.id },
  })
  const [heading, ...body] = note.content.split('\n')
  const rotation = ((note.client_key.charCodeAt(0) + note.client_key.length) % 5) - 2
  const dragX = transform?.x ? transform.x / zoom : 0
  const dragY = transform?.y ? transform.y / zoom : 0

  return (
    <div
      ref={setNodeRef}
      className={`canvas-sticky color-${note.color}${isDragging ? ' is-dragging' : ''}${agentAnimated ? ' is-agent-animated' : ''}`}
      data-sticky-key={note.client_key}
      style={{
        '--sticky-x': `${note.x + dragX}px`,
        '--sticky-y': `${note.y + dragY}px`,
        '--sticky-rotation': `${rotation}deg`,
        '--sticky-scale': isDragging ? 1.035 : 1,
        viewTransitionName: `plot-sticky-${note.id}`,
      } as CSSProperties}
    >
      <div
        className="canvas-sticky__drag-surface"
        aria-label={`Sticky note: ${heading}`}
        {...attributes}
        {...listeners}
      >
        <header className="canvas-sticky__header">
          <span><StickyNoteIcon size={13} /> Loose note</span>
        </header>
        <h3>{heading}</h3>
        {body.length > 0 && <p>{body.join('\n')}</p>}
        <footer>Drag into a sprint column to shape</footer>
      </div>
      <button
        className="canvas-sticky__edit"
        type="button"
        disabled={disabled}
        aria-label={`Edit sticky note ${heading}`}
        title={disabled ? 'Resolve the proposal before editing notes' : 'Edit sticky'}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onEdit(note.id)
        }}
      >
        <Pencil size={12} />
      </button>
      {agentAnimated && <span className="sticky-agent-pulse" aria-hidden="true" />}
    </div>
  )
}

function BoardColumnView({
  column,
  cards,
  snapshot,
  leavingCardIds,
  incomingActions,
  proposalActive,
  proposalActions,
  agentMotion,
  recentAgentCardIds,
  onAddCard,
}: {
  column: BoardColumn
  cards: BoardCard[]
  snapshot: BoardSnapshot
  leavingCardIds: Set<string>
  incomingActions: PlanAction[]
  proposalActive: boolean
  proposalActions: PlanAction[]
  agentMotion: AgentMotion
  recentAgentCardIds: Set<string>
  onAddCard: (columnId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const total = cards.reduce((sum, card) => sum + card.estimate, 0)
  const overLimit = Boolean(column.wip_limit && cards.length > column.wip_limit)

  return (
    <section
      ref={setNodeRef}
      className={`board-column${isOver ? ' is-over' : ''}`}
      aria-labelledby={`column-${column.id}`}
      data-column-key={column.client_key}
      style={{ '--column-accent': column.accent } as CSSProperties}
    >
      <header className="board-column__header">
        <div>
          <div className="column-title-row">
            <span className="column-swatch" />
            <h2 id={`column-${column.id}`}>{column.title}</h2>
            <span className="column-count">{cards.length}</span>
          </div>
          <p>{column.description}</p>
        </div>
        <div className="column-metrics">
          <span>{total} pts</span>
          {column.wip_limit && (
            <span className={overLimit ? 'is-over-limit' : ''}>WIP {cards.length}/{column.wip_limit}</span>
          )}
        </div>
      </header>
      <div className="column-rule" />
      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="card-stack">
          {incomingActions.map((action) => {
            const card = snapshot.cards.find((item) => item.id === action.cardId)
            return card ? (
              <GhostCard
                key={action.id}
                card={card}
                action={action}
                snapshot={snapshot}
                index={Math.max(0, proposalActions.findIndex((item) => item.id === action.id))}
              />
            ) : null
          })}
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              snapshot={snapshot}
              isLeaving={leavingCardIds.has(card.id)}
              disabled={proposalActive}
              agentAnimated={recentAgentCardIds.has(card.id)}
              agentActive={agentMotion.activeCardId === card.id}
            />
          ))}
          {cards.length === 0 && incomingActions.length === 0 && (
            <div className="empty-column">
              <span>Drop cards here</span>
            </div>
          )}
        </div>
      </SortableContext>
      <button className="add-card-button" type="button" disabled={proposalActive} onClick={() => onAddCard(column.id)}>
        <CirclePlus size={16} /> Add card
      </button>
    </section>
  )
}

function CriticalPath({ snapshot }: { snapshot: BoardSnapshot }) {
  const chain = useMemo(() => {
    if (!snapshot.dependencies.length) return []
    const targeted = new Set(snapshot.dependencies.map((item) => item.target_card_id))
    const firstEdge = snapshot.dependencies.find((item) => !targeted.has(item.source_card_id)) || snapshot.dependencies[0]
    const ids = [firstEdge.source_card_id, firstEdge.target_card_id]
    let cursor = firstEdge.target_card_id
    while (ids.length < 8) {
      const edge = snapshot.dependencies.find((item) => item.source_card_id === cursor)
      if (!edge || ids.includes(edge.target_card_id)) break
      ids.push(edge.target_card_id)
      cursor = edge.target_card_id
    }
    return ids
      .map((id) => snapshot.cards.find((card) => card.id === id))
      .filter((card): card is BoardCard => Boolean(card))
  }, [snapshot])

  if (!chain.length) return null
  return (
    <div className="critical-path" aria-label="Critical path">
      <span className="critical-path__label">
        <Link2 size={14} /> Critical path
      </span>
      <div className="critical-path__chain">
        {chain.map((card, index) => {
          const column = snapshot.columns.find((item) => item.id === card.column_id)
          return (
            <span className="path-step" key={card.id}>
              {index > 0 && <ArrowRight size={15} className="path-arrow" />}
              <span>{card.title}</span>
              <small>{column?.title}</small>
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function BoardCanvas({
  snapshot,
  proposal,
  agentMotion,
  recentAgentCardIds,
  recentAgentStickyIds,
  onMoveCard,
  onMoveStickyNote,
  onConvertStickyToCard,
  onConvertCardToSticky,
  onAddCard,
  onAddSticky,
  onEditSticky,
  onActionError,
  readOnly = false,
}: BoardCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [selectedMobileColumnId, setSelectedMobileColumnId] = useState(
    () => snapshot.columns.find((column) => column.client_key === 'now')?.id || snapshot.columns[0]?.id || '',
  )
  const {
    transform: canvasTransform,
    mode: canvasMotionMode,
    animateTo: animateCanvasTo,
    setImmediate: setCanvasImmediate,
    getTransform: getCanvasTransform,
    getTarget: getCanvasTarget,
    prefersReducedMotion,
  } = useCanvasMotion({ x: 36, y: 86, zoom: 0.82 })
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const boardSurfaceRef = useRef<HTMLElement | null>(null)
  const fittedBoardIdRef = useRef<string | null>(null)
  const panSession = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    lastX: number
    lastY: number
    lastTime: number
    velocityX: number
    velocityY: number
  } | null>(null)
  const lastDragSample = useRef({ x: 0, y: 0, time: 0 })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const activeCard = snapshot.cards.find((card) => card.id === activeId)
  const activeSticky = activeId?.startsWith('sticky:')
    ? snapshot.stickyNotes.find((note) => note.id === activeId.slice('sticky:'.length))
    : null
  const defaultMobileColumnId =
    snapshot.columns.find((column) => column.client_key === 'now')?.id || snapshot.columns[0]?.id || ''
  const activeMobileColumnId = snapshot.columns.some((column) => column.id === selectedMobileColumnId)
    ? selectedMobileColumnId
    : defaultMobileColumnId
  const plannedPoints = snapshot.cards
    .filter((card) => snapshot.columns.find((column) => column.id === card.column_id)?.client_key === 'now')
    .reduce((sum, card) => sum + card.estimate, 0)
  const leavingCardIds = new Set(
    proposal?.actions
      .filter((action) => {
        const card = snapshot.cards.find((item) => item.id === action.cardId)
        return action.type === 'move_card' && card?.column_id !== action.toColumnId
      })
      .map((action) => action.cardId)
      .filter((cardId): cardId is string => Boolean(cardId)) || [],
  )

  const fitCanvas = useCallback((animate = true) => {
    const canvas = canvasRef.current
    const boardSurface = boardSurfaceRef.current
    if (!canvas || !boardSurface) return

    const isNarrowViewport = canvas.clientWidth < 720
    const horizontalPadding = isNarrowViewport ? 28 : 72
    const verticalPadding = canvas.clientHeight < 620 ? 34 : 72
    const minX = Math.min(0, ...snapshot.stickyNotes.map((note) => note.x))
    const minY = Math.min(0, ...snapshot.stickyNotes.map((note) => note.y))
    const maxX = Math.max(
      boardSurface.offsetWidth,
      ...snapshot.stickyNotes.map((note) => note.x + STICKY_WIDTH),
    )
    const maxY = Math.max(
      boardSurface.offsetHeight,
      ...snapshot.stickyNotes.map((note) => note.y + STICKY_HEIGHT),
    )
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    if (!contentWidth || !contentHeight) return

    const fittedZoom = Math.min(
      (canvas.clientWidth - horizontalPadding) / contentWidth,
      (canvas.clientHeight - verticalPadding) / contentHeight,
      0.9,
    )
    if (isNarrowViewport) {
      const defaultColumnIndex = Math.max(
        0,
        snapshot.columns.findIndex((column) => column.client_key === 'now'),
      )
      const nextZoom = 0.78
      const columnWidth = boardSurface.offsetWidth / Math.max(1, snapshot.columns.length)
      const nextTransform = {
        x: Math.round(12 - defaultColumnIndex * columnWidth * nextZoom),
        y: 170,
        zoom: nextZoom,
      }
      if (animate) {
        animateCanvasTo(nextTransform, {
          stiffness: 190,
          damping: 24,
          maxDuration: 920,
          mode: 'settling',
        })
      } else {
        setCanvasImmediate(nextTransform, 'idle')
      }
      return
    }

    const nextZoom = clampZoom(Math.max(0.8, fittedZoom))
    const nextTransform = {
      x: Math.round((canvas.clientWidth - contentWidth * nextZoom) / 2 - minX * nextZoom),
      y: Math.round((canvas.clientHeight - contentHeight * nextZoom) / 2 - minY * nextZoom + 18),
      zoom: nextZoom,
    }
    if (animate) {
      animateCanvasTo(nextTransform, {
        stiffness: 190,
        damping: 24,
        maxDuration: 920,
        mode: 'settling',
      })
    } else {
      setCanvasImmediate(nextTransform, 'idle')
    }
  }, [animateCanvasTo, setCanvasImmediate, snapshot.columns, snapshot.stickyNotes])

  const focusMobileColumn = useCallback((columnId: string) => {
    const boardSurface = boardSurfaceRef.current
    const columnIndex = snapshot.columns.findIndex((column) => column.id === columnId)
    if (!boardSurface || columnIndex < 0) return
    const nextZoom = 0.78
    const columnWidth = boardSurface.offsetWidth / Math.max(1, snapshot.columns.length)
    setSelectedMobileColumnId(columnId)
    animateCanvasTo(
      {
        x: Math.round(12 - columnIndex * columnWidth * nextZoom),
        y: 170,
        zoom: nextZoom,
      },
      {
        stiffness: 220,
        damping: 26,
        maxDuration: 760,
        mode: 'settling',
      },
    )
  }, [animateCanvasTo, snapshot.columns])

  useLayoutEffect(() => {
    if (fittedBoardIdRef.current === snapshot.board.id) return
    const frame = window.requestAnimationFrame(() => {
      fitCanvas(false)
      fittedBoardIdRef.current = snapshot.board.id
    })
    return () => window.cancelAnimationFrame(frame)
  }, [fitCanvas, snapshot.board.id])

  useEffect(() => {
    const onResize = () => fitCanvas(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [fitCanvas])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (event.code === 'Space') {
        event.preventDefault()
        setSpacePressed(true)
      }
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault()
        fitCanvas()
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [fitCanvas])

  function zoomAt(nextZoomValue: number, point?: { x: number; y: number }) {
    const canvas = canvasRef.current
    if (!canvas) return
    const anchor = point || { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 }
    const current = getCanvasTarget()
    const nextZoom = clampZoom(nextZoomValue)
    const worldX = (anchor.x - current.x) / current.zoom
    const worldY = (anchor.y - current.y) / current.zoom
    animateCanvasTo(
      {
        x: anchor.x - worldX * nextZoom,
        y: anchor.y - worldY * nextZoom,
        zoom: nextZoom,
      },
      {
        stiffness: 285,
        damping: 29,
        maxDuration: 680,
        mode: 'zooming',
      },
    )
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      const rect = event.currentTarget.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * 0.0022)
      zoomAt(getCanvasTarget().zoom * factor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
      return
    }
    const current = getCanvasTarget()
    animateCanvasTo(
      {
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      },
      {
        stiffness: 390,
        damping: 39,
        maxDuration: 520,
        mode: 'panning',
      },
    )
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const isInteractive = Boolean(
      target.closest('button, a, input, textarea, select, [role="button"], .sortable-card, .ghost-card, .canvas-sticky'),
    )
    const shouldPan = event.button === 1 || spacePressed || (event.button === 0 && !isInteractive)
    if (!shouldPan) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const current = getCanvasTransform()
    const now = performance.now()
    setCanvasImmediate(current, 'panning')
    panSession.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
      velocityX: 0,
      velocityY: 0,
    }
    setIsPanning(true)
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const session = panSession.current
    if (!session || session.pointerId !== event.pointerId) return
    const now = performance.now()
    const elapsed = Math.max(8, now - session.lastTime)
    const sampledVelocityX = (event.clientX - session.lastX) / elapsed
    const sampledVelocityY = (event.clientY - session.lastY) / elapsed
    session.velocityX += (sampledVelocityX - session.velocityX) * 0.42
    session.velocityY += (sampledVelocityY - session.velocityY) * 0.42
    session.lastX = event.clientX
    session.lastY = event.clientY
    session.lastTime = now
    setCanvasImmediate({
      ...getCanvasTransform(),
      x: session.originX + event.clientX - session.startX,
      y: session.originY + event.clientY - session.startY,
    }, 'panning')
  }

  function endCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    const session = panSession.current
    if (session?.pointerId !== event.pointerId) return
    panSession.current = null
    setIsPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const current = getCanvasTransform()
    const speed = Math.hypot(session.velocityX, session.velocityY)
    if (prefersReducedMotion() || speed < 0.025) {
      setCanvasImmediate(current, 'idle')
      return
    }
    const project = (velocity: number) => Math.max(-260, Math.min(260, velocity * 180))
    animateCanvasTo(
      {
        ...current,
        x: current.x + project(session.velocityX),
        y: current.y + project(session.velocityY),
      },
      {
        stiffness: 115,
        damping: 18,
        maxDuration: 1100,
        mode: 'gliding',
        initialVelocity: {
          x: session.velocityX * 1000,
          y: session.velocityY * 1000,
        },
      },
    )
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
    setDragVelocity({ x: 0, y: 0 })
    lastDragSample.current = { x: 0, y: 0, time: performance.now() }
  }

  function handleDragMove(event: DragMoveEvent) {
    if (String(event.active.id).startsWith('sticky:')) return
    const now = performance.now()
    const elapsed = Math.max(8, now - lastDragSample.current.time)
    const sampled = {
      x: (event.delta.x - lastDragSample.current.x) / elapsed,
      y: (event.delta.y - lastDragSample.current.y) / elapsed,
    }
    setDragVelocity((current) => ({
      x: current.x + (sampled.x - current.x) * 0.38,
      y: current.y + (sampled.y - current.y) * 0.38,
    }))
    lastDragSample.current = { x: event.delta.x, y: event.delta.y, time: now }
  }

  function resolveDropTarget(overId: string) {
    const overCard = snapshot.cards.find((card) => card.id === overId)
    const targetColumn = overCard
      ? snapshot.columns.find((column) => column.id === overCard.column_id)
      : snapshot.columns.find((column) => column.id === overId)
    return { overCard, targetColumn }
  }

  function runMutation(action: Promise<unknown>) {
    void action.catch(onActionError)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setDragVelocity({ x: 0, y: 0 })
    const activeKey = String(event.active.id)

    if (activeKey.startsWith('sticky:')) {
      const noteId = activeKey.slice('sticky:'.length)
      const note = snapshot.stickyNotes.find((candidate) => candidate.id === noteId)
      if (!note) return
      if (event.over) {
        const { overCard, targetColumn } = resolveDropTarget(String(event.over.id))
        if (targetColumn) {
          runMutation(onConvertStickyToCard(note.id, targetColumn.id, overCard?.position))
          return
        }
      }
      runMutation(onMoveStickyNote(
        note.id,
        Math.round(note.x + event.delta.x / canvasTransform.zoom),
        Math.round(note.y + event.delta.y / canvasTransform.zoom),
      ))
      return
    }

    const cardId = activeKey
    if (event.over) {
      const { overCard, targetColumn } = resolveDropTarget(String(event.over.id))
      if (targetColumn) {
        runMutation(onMoveCard(cardId, targetColumn.id, overCard?.position))
        return
      }
    }

    const translated = event.active.rect.current.translated
    const boardRect = boardSurfaceRef.current?.getBoundingClientRect()
    const viewportRect = canvasRef.current?.getBoundingClientRect()
    if (!translated || !boardRect || !viewportRect) return
    const centerX = translated.left + translated.width / 2
    const centerY = translated.top + translated.height / 2
    const outsideBoard =
      centerX < boardRect.left ||
      centerX > boardRect.right ||
      centerY < boardRect.top ||
      centerY > boardRect.bottom
    if (!outsideBoard) return

    const current = getCanvasTransform()
    const worldX =
      (centerX - viewportRect.left - current.x) / current.zoom - STICKY_WIDTH / 2
    const worldY =
      (centerY - viewportRect.top - current.y) / current.zoom - STICKY_HEIGHT / 2
    const sourceColumnKey = snapshot.columns.find(
      (column) => column.id === snapshot.cards.find((card) => card.id === cardId)?.column_id,
    )?.client_key
    const color: StickyColor =
      sourceColumnKey === 'inbox'
        ? 'pink'
        : sourceColumnKey === 'now'
          ? 'green'
          : sourceColumnKey === 'next'
            ? 'violet'
            : 'yellow'
    runMutation(onConvertCardToSticky(cardId, Math.round(worldX), Math.round(worldY), color))
  }

  return (
    <div
      className={`board-viewport${isPanning ? ' is-panning' : ''}${spacePressed ? ' is-space-ready' : ''}`}
      data-agent-motion={agentMotion.phase}
      data-detail={canvasTransform.zoom >= 0.96 ? 'full' : 'compact'}
      data-canvas-motion={canvasMotionMode}
      ref={canvasRef}
      style={{
        '--canvas-x': `${canvasTransform.x}px`,
        '--canvas-y': `${canvasTransform.y}px`,
        '--canvas-zoom': canvasTransform.zoom,
      } as CSSProperties}
      onWheel={handleCanvasWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={endCanvasPan}
      onPointerCancel={endCanvasPan}
    >
      <div className="canvas-grid" aria-hidden="true" />
      <div
        className="canvas-content"
        style={{
          '--canvas-x': `${canvasTransform.x}px`,
          '--canvas-y': `${canvasTransform.y}px`,
          '--canvas-zoom': canvasTransform.zoom,
        } as CSSProperties}
      >
        <section ref={boardSurfaceRef} className="board-surface" data-read-only={readOnly} aria-label={`${snapshot.board.title} planning board`}>
          <header className="board-surface__header">
            <div className="surface-title">
              <span>{snapshot.cards.length} cards · {snapshot.stickyNotes.length} notes</span>
              <h1>{snapshot.board.title}</h1>
              <p>{snapshot.board.description}</p>
            </div>
            <div className="surface-goal">
              <Goal size={17} />
              <div>
                <span>Sprint goal</span>
                <strong>{snapshot.board.sprint_goal}</strong>
              </div>
              <b>{plannedPoints}<small>/{snapshot.board.capacity}</small></b>
            </div>
          </header>
          <CriticalPath snapshot={snapshot} />
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
              setActiveId(null)
              setDragVelocity({ x: 0, y: 0 })
            }}
          >
            {snapshot.stickyNotes.map((note) => (
              <CanvasStickyNote
                key={note.id}
                note={note}
                zoom={canvasTransform.zoom}
                disabled={Boolean(proposal) || readOnly}
                agentAnimated={recentAgentStickyIds.has(note.id)}
                onEdit={onEditSticky}
              />
            ))}
            <div className="board-grid">
              {snapshot.columns.map((column) => {
                const cards = snapshot.cards
                  .filter((card) => card.column_id === column.id)
                  .sort((a, b) => a.position - b.position)
                const incomingActions =
                  proposal?.actions.filter(
                    (action) => {
                      const card = snapshot.cards.find((item) => item.id === action.cardId)
                      return (
                        action.type === 'move_card' &&
                        action.toColumnId === column.id &&
                        card?.column_id !== action.toColumnId
                      )
                    },
                  ) || []
                return (
                  <BoardColumnView
                    key={column.id}
                    column={column}
                    cards={cards}
                    snapshot={snapshot}
                    leavingCardIds={leavingCardIds}
                    incomingActions={incomingActions}
                    proposalActive={Boolean(proposal) || readOnly}
                    proposalActions={proposal?.actions || []}
                    agentMotion={agentMotion}
                    recentAgentCardIds={recentAgentCardIds}
                    onAddCard={onAddCard}
                  />
                )
              })}
            </div>
            {typeof document !== 'undefined'
              ? createPortal(
                  <DragOverlay
                    className={`drag-overlay-root${canvasTransform.zoom < 0.96 ? ' is-compact' : ''}`}
                    dropAnimation={CARD_DROP_ANIMATION}
                  >
                    {activeCard
                      ? (
                          <div
                            className="drag-overlay-scale"
                            style={{ '--drag-overlay-zoom': canvasTransform.zoom } as CSSProperties}
                          >
                            <CardContent
                              card={activeCard}
                              snapshot={snapshot}
                              isOverlay
                              dragVelocity={dragVelocity}
                            />
                          </div>
                        )
                      : null}
                  </DragOverlay>,
                  document.body,
                )
              : null}
          </DndContext>
        </section>
      </div>

      <section className="mobile-board-context" aria-label="Mobile board navigation">
        <div className="mobile-board-context__summary">
          <div>
            <span>Active sprint</span>
            <strong>{snapshot.board.title}</strong>
          </div>
          <b>{plannedPoints}<small>/{snapshot.board.capacity} pts</small></b>
        </div>
        <p><Goal size={13} /> {snapshot.board.sprint_goal}</p>
        <div className="mobile-column-nav" role="toolbar" aria-label="Focus a sprint column">
          {snapshot.columns.map((column) => (
            <button
              key={column.id}
              type="button"
              className={column.id === activeMobileColumnId ? 'is-active' : ''}
              aria-pressed={column.id === activeMobileColumnId}
              onClick={() => focusMobileColumn(column.id)}
            >
              <span style={{ background: column.accent }} />
              {column.title}
            </button>
          ))}
        </div>
      </section>

      <div className="canvas-controls" aria-label="Canvas controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomAt(getCanvasTarget().zoom - 0.1)}>
          <Minus size={15} />
        </button>
        <button className="zoom-readout" type="button" onClick={() => fitCanvas()} title="Fit board">
          {Math.round(canvasTransform.zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomAt(getCanvasTarget().zoom + 0.1)}>
          <Plus size={15} />
        </button>
        <span />
        <button type="button" aria-label="Fit board to screen" title="Fit board to screen" onClick={() => fitCanvas()}>
          <Maximize2 size={14} />
        </button>
        <span />
        <button
          className="new-sticky-control"
          type="button"
          disabled={Boolean(proposal) || readOnly}
          aria-label="Create sticky note"
          title="Create sticky note"
          onClick={() => {
            const index = snapshot.stickyNotes.length
            const onLeft = index % 2 === 0
            onAddSticky({
              x: onLeft ? -220 : 1370,
              y: 170 + (index % 3) * 155,
            })
          }}
        >
          <StickyNoteIcon size={14} /> <b>Sticky</b>
        </button>
      </div>
      <div className={`canvas-help${activeSticky || activeCard ? ' is-conversion' : ''}`} aria-hidden="true">
        {activeSticky || activeCard ? <StickyNoteIcon size={13} /> : <Hand size={13} />}
        <span>
          {readOnly
            ? 'Live view · changes appear here automatically'
            : activeSticky
            ? 'Drop in a column to turn this note into a card'
            : activeCard
              ? 'Drop outside the board to turn this card into a sticky'
              : 'Drag to pan · ⌘ scroll to zoom'}
        </span>
      </div>
    </div>
  )
}
