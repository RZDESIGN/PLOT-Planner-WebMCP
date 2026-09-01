import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { cloneOfflineDemo } from '../data/demoBoard'
import {
  acceptBoardInvitation,
  cloneSnapshotToWorkspace,
  createBoardInvitation,
  createSprint as createSprintRepository,
  loadAccessibleSprints,
  loadBoard,
  loadBoardCollaborators,
  loadPublicTemplate,
  persistActivity,
  persistAppliedProposal,
  persistCardToSticky,
  persistCardLayout,
  persistCardUpdate,
  persistDependency,
  persistNewCard,
  persistNewStickyNote,
  persistProposal,
  persistStickyToCard,
  persistStickyNoteUpdate,
  resolveProposal,
  subscribeToBoard,
  subscribeToBoardPresence,
} from '../lib/boardRepository'
import {
  cardToPayload,
  createLocalCard,
  createLocalStickyNote,
  findCard,
  findColumn,
  findStickyNote,
  isCardPriority,
  moveCardInSnapshot,
  normalizeCardPositions,
  stickyPayload,
  updateCardInSnapshot,
  updateStickyNoteInSnapshot,
  wouldCreateDependencyCycle,
} from '../lib/boardModel'
import {
  analyzeBoard,
  applyProposalToSnapshot,
  createFocusProposal,
} from '../lib/planner'
import { initializeSupabaseSession } from '../lib/authSession'
import {
  buildAuthRedirectUrl,
  buildBoardUrl,
  readPlotNavigation,
  removeInvitationFromUrl,
} from '../lib/navigation'
import { publicAppUrl, supabase } from '../lib/supabase'
import type {
  ActivityItem,
  AgentMotion,
  BoardPresence,
  BoardRole,
  BoardSnapshot,
  CardDependency,
  Collaborator,
  CreateInvitationInput,
  CreateCardInput,
  CreateSprintInput,
  CreateStickyNoteInput,
  PlanningProposal,
  SprintSummary,
  StickyColor,
  UpdateCardInput,
  UpdateStickyNoteInput,
} from '../types/domain'

type ConnectionState = 'connecting' | 'live' | 'offline'

const idleMotion: AgentMotion = {
  phase: 'idle',
  activeCardId: null,
  step: 0,
  total: 0,
  message: '',
}

const PROPOSAL_STAGGER_MS = 240

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

function replaceBrowserUrl(nextHref: string) {
  const url = new URL(nextHref)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function syncActiveBoardUrl(boardId: string) {
  replaceBrowserUrl(buildBoardUrl(window.location.href, boardId))
}

export interface AppToast {
  id: string
  title: string
  detail: string
  tone: 'success' | 'info' | 'error'
}

const initialActivities: ActivityItem[] = [
  {
    id: 'analysis:initial',
    actor: 'Agent',
    title: 'Board scan complete',
    detail: 'Found a blocker outside the sprint and 5 points of supporting scope in Now.',
    timestamp: 'Just now',
  },
  {
    id: 'dependency:initial',
    actor: 'System',
    title: 'Critical path mapped',
    detail: 'Email API → Signup flow → Mobile fixes',
    timestamp: '1 min ago',
  },
]

export function useBoard() {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>(() => cloneOfflineDemo())
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [proposal, setProposal] = useState<PlanningProposal | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [toast, setToast] = useState<AppToast | null>(null)
  const [agentMotion, setAgentMotion] = useState<AgentMotion>(idleMotion)
  const [recentAgentCardIds, setRecentAgentCardIds] = useState<Set<string>>(() => new Set())
  const [recentAgentStickyIds, setRecentAgentStickyIds] = useState<Set<string>>(() => new Set())
  const [sprints, setSprints] = useState<SprintSummary[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [presence, setPresence] = useState<BoardPresence[]>([])
  const [accessRole, setAccessRole] = useState<BoardRole | 'guest'>('guest')
  const snapshotRef = useRef(snapshot)
  const proposalRef = useRef<PlanningProposal | null>(null)
  const accessRoleRef = useRef<BoardRole | 'guest'>('guest')
  const refreshTimerRef = useRef<number | null>(null)
  const agentIdleTimerRef = useRef<number | null>(null)
  const recentCardTimerRef = useRef<number | null>(null)
  const recentStickyTimerRef = useRef<number | null>(null)

  const commitSnapshot = useCallback((next: BoardSnapshot) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  const commitProposal = useCallback((next: PlanningProposal | null) => {
    proposalRef.current = next
    setProposal(next)
  }, [])

  const commitAccessRole = useCallback((next: BoardRole | 'guest') => {
    accessRoleRef.current = next
    setAccessRole(next)
  }, [])

  const assertBoardWritable = useCallback(() => {
    if (accessRoleRef.current === 'viewer') {
      throw new Error('This sprint is in live view mode. Ask an owner for edit access to make changes.')
    }
    if (proposalRef.current) {
      throw new Error('Resolve the visible proposal before making another board change.')
    }
  }, [])

  const transitionToSnapshot = useCallback(
    async (next: BoardSnapshot) => {
      const transitionDocument = document as Document & {
        startViewTransition?: (update: () => void) => { finished: Promise<void> }
      }
      if (!transitionDocument.startViewTransition) {
        commitSnapshot(next)
        return
      }
      const transition = transitionDocument.startViewTransition(() => {
        flushSync(() => commitSnapshot(next))
      })
      await transition.finished.catch(() => undefined)
    },
    [commitSnapshot],
  )

  const scheduleAgentIdle = useCallback((delay: number) => {
    if (agentIdleTimerRef.current) window.clearTimeout(agentIdleTimerRef.current)
    agentIdleTimerRef.current = window.setTimeout(() => {
      agentIdleTimerRef.current = null
      setAgentMotion(idleMotion)
    }, delay)
  }, [])

  const markAgentCards = useCallback((cardIds: string[], duration = 1500) => {
    if (recentCardTimerRef.current) window.clearTimeout(recentCardTimerRef.current)
    setRecentAgentCardIds(new Set(cardIds))
    recentCardTimerRef.current = window.setTimeout(() => {
      recentCardTimerRef.current = null
      setRecentAgentCardIds(new Set())
    }, duration)
  }, [])

  const markAgentStickies = useCallback((noteIds: string[], duration = 1500) => {
    if (recentStickyTimerRef.current) window.clearTimeout(recentStickyTimerRef.current)
    setRecentAgentStickyIds(new Set(noteIds))
    recentStickyTimerRef.current = window.setTimeout(() => {
      recentStickyTimerRef.current = null
      setRecentAgentStickyIds(new Set())
    }, duration)
  }, [])

  useEffect(
    () => () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
      if (agentIdleTimerRef.current) window.clearTimeout(agentIdleTimerRef.current)
      if (recentCardTimerRef.current) window.clearTimeout(recentCardTimerRef.current)
      if (recentStickyTimerRef.current) window.clearTimeout(recentStickyTimerRef.current)
    },
    [],
  )

  const showToast = useCallback((next: Omit<AppToast, 'id'>) => {
    setToast({ ...next, id: crypto.randomUUID() })
  }, [])

  const reportError = useCallback(
    (error: unknown, title = 'Action could not be completed') => {
      showToast({
        title,
        detail: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    },
    [showToast],
  )

  const addActivity = useCallback(
    (item: ActivityItem) => {
      setActivities((current) => [item, ...current].slice(0, 12))
      if (session?.user && snapshotRef.current.source === 'supabase-workspace') {
        void persistActivity(snapshotRef.current.board.id, session.user.id, item).catch(() => undefined)
      }
    },
    [session],
  )

  useEffect(() => {
    let active = true
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      // Initial session resolution is owned by initializeSupabaseSession so a
      // late null INITIAL_SESSION cannot overwrite a freshly exchanged callback.
      if (event === 'INITIAL_SESSION') return
      setSession(nextSession)
    })

    void initializeSupabaseSession(window.location.href, replaceBrowserUrl)
      .then(({ session: initialSession, callbackError }) => {
        if (!active) return
        setSession(initialSession)
        if (callbackError) reportError(callbackError, 'Sign-in could not be completed')
      })
      .catch((error) => {
        if (!active) return
        setSession(null)
        reportError(error, 'Session could not be restored')
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [reportError])

  useEffect(() => {
    if (!authReady) return
    let cancelled = false
    async function boot() {
      try {
        let next: BoardSnapshot
        if (session?.user) {
          const navigation = readPlotNavigation(window.location.href)
          const invitationToken = navigation.invitationToken
          let invitedBoardId: string | null = null
          if (invitationToken) {
            try {
              invitedBoardId = await acceptBoardInvitation(invitationToken)
              replaceBrowserUrl(removeInvitationFromUrl(window.location.href))
              showToast({
                title: 'You joined the sprint',
                detail: 'The shared board is live and your access role is active.',
                tone: 'success',
              })
            } catch (error) {
              replaceBrowserUrl(removeInvitationFromUrl(window.location.href))
              reportError(error, 'Invitation could not be accepted')
            }
          }

          let accessible = await loadAccessibleSprints(session.user.id)
          let selectedBoardId = invitedBoardId
          if (!selectedBoardId) {
            const remembered = window.localStorage.getItem(`plot:active-sprint:${session.user.id}`)
            selectedBoardId = accessible.some((item) => item.id === navigation.boardId)
              ? navigation.boardId
              : accessible.some((item) => item.id === remembered)
                ? remembered
                : accessible[0]?.id || null
          }

          if (!selectedBoardId) {
            if (snapshotRef.current.source === 'offline-demo') {
              next = await cloneSnapshotToWorkspace(snapshotRef.current, session.user)
              selectedBoardId = next.board.id
            } else {
              selectedBoardId = await createSprintRepository({
                title: snapshotRef.current.board.title,
                sprintGoal: snapshotRef.current.board.sprint_goal,
                capacity: snapshotRef.current.board.capacity,
                sourceBoardId: snapshotRef.current.board.id,
                copyMode: 'everything',
              })
              next = await loadBoard(selectedBoardId, 'supabase-workspace')
            }
            accessible = await loadAccessibleSprints(session.user.id)
            showToast({
              title: 'Your workspace is ready',
              detail: 'The board you explored is now your first private, collaborative sprint.',
              tone: 'success',
            })
          } else {
            next = await loadBoard(selectedBoardId, 'supabase-workspace')
          }

          const role = accessible.find((item) => item.id === selectedBoardId)?.role || 'viewer'
          const members = await loadBoardCollaborators(selectedBoardId)
          if (cancelled) return
          setSprints(accessible)
          setCollaborators(members)
          commitAccessRole(role)
          window.localStorage.setItem(`plot:active-sprint:${session.user.id}`, selectedBoardId)
          syncActiveBoardUrl(selectedBoardId)
        } else {
          next = await loadPublicTemplate()
          if (cancelled) return
          setSprints([])
          setCollaborators([])
          setPresence([])
          commitAccessRole('guest')
        }
        if (cancelled) return
        commitSnapshot(next)
        setConnection('live')
      } catch (error) {
        if (cancelled) return
        console.error('PLOT boot failed', error)
        commitSnapshot(cloneOfflineDemo())
        commitAccessRole('guest')
        setConnection('offline')
        showToast({
          title: 'Offline demo loaded',
          detail: 'PLOT could not reach Supabase, so your changes stay in this browser session.',
          tone: 'info',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [authReady, commitAccessRole, commitSnapshot, reportError, session, showToast])

  useEffect(() => {
    if (snapshot.source === 'offline-demo') return
    const channel = subscribeToBoard(snapshot.board.id, () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = window.setTimeout(() => {
        const source = snapshotRef.current.source
        const boardId = snapshotRef.current.board.id
        const refreshes: [Promise<BoardSnapshot>, Promise<Collaborator[]>?, Promise<SprintSummary[]>?] = [
          loadBoard(boardId, source),
        ]
        if (session?.user && source === 'supabase-workspace') {
          refreshes.push(loadBoardCollaborators(boardId), loadAccessibleSprints(session.user.id))
        }
        void Promise.all(refreshes)
          .then(([next, nextCollaborators, nextSprints]) => {
            commitSnapshot(next)
            if (nextCollaborators) setCollaborators(nextCollaborators)
            if (nextSprints) setSprints(nextSprints)
          })
          .catch(() => setConnection('offline'))
      }, 180)
    })

    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [commitSnapshot, session, snapshot.board.id, snapshot.source])

  const currentPresenceName = session?.user
    ? collaborators.find((item) => item.userId === session.user.id)?.displayName ||
      session.user.email?.split('@')[0] ||
      'Planner'
    : 'Planner'

  useEffect(() => {
    if (!session?.user || snapshot.source !== 'supabase-workspace' || accessRole === 'guest') {
      return
    }
    let channel: RealtimeChannel | null = null
    let cancelled = false
    void subscribeToBoardPresence(
      snapshot.board.id,
      {
        userId: session.user.id,
        displayName: currentPresenceName,
        role: accessRole,
        onlineAt: new Date().toISOString(),
      },
      setPresence,
    ).then((nextChannel) => {
      if (cancelled) {
        void supabase.removeChannel(nextChannel)
        return
      }
      channel = nextChannel
    }).catch(() => {
      if (!cancelled) setConnection('offline')
    })
    return () => {
      cancelled = true
      setPresence([])
      if (channel) void supabase.removeChannel(channel)
    }
  }, [accessRole, currentPresenceName, session?.user, snapshot.board.id, snapshot.source])

  const moveCard = useCallback(
    async (
      cardReference: string,
      columnReference: string,
      position?: number,
      actor: 'human' | 'agent' = 'human',
    ) => {
      assertBoardWritable()
      const previous = snapshotRef.current
      const { next, card, column, changed } = moveCardInSnapshot(
        previous,
        cardReference,
        columnReference,
        position,
      )
      if (!changed) return card
      if (actor === 'agent') {
        setAgentMotion({
          phase: 'editing',
          activeCardId: card.id,
          step: 1,
          total: 1,
          message: `Moving ${card.title}`,
        })
        markAgentCards([card.id])
        await transitionToSnapshot(next)
        scheduleAgentIdle(700)
      } else {
        await transitionToSnapshot(next)
      }
      if (session?.user && next.source === 'supabase-workspace') {
        try {
          await persistCardLayout(next.board.id, next.cards)
        } catch (error) {
          console.error(error)
          commitSnapshot(previous)
          showToast({
            title: 'Move was not saved',
            detail: 'The board was restored to its last synced state.',
            tone: 'error',
          })
          throw error
        }
      }
      addActivity({
        id: `move-card:${crypto.randomUUID()}`,
        actor: actor === 'agent' ? 'Agent' : 'You',
        title: `Moved “${card.title}” to ${column.title}`,
        detail:
          actor === 'agent'
            ? 'The browser agent updated the shared canvas and dependency context together.'
            : 'The shared canvas and dependency context were updated together.',
        timestamp: 'Just now',
      })
      return card
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      markAgentCards,
      scheduleAgentIdle,
      session,
      showToast,
      transitionToSnapshot,
    ],
  )

  const createCard = useCallback(
    async (input: CreateCardInput) => {
      assertBoardWritable()
      const current = snapshotRef.current
      const card = createLocalCard(current, input, session?.user.id)
      const next = { ...current, cards: [...current.cards, card] }
      if (input.agentGenerated) {
        setAgentMotion({
          phase: 'editing',
          activeCardId: card.id,
          step: 1,
          total: 1,
          message: `Writing ${card.title}`,
        })
        markAgentCards([card.id], 1900)
        await transitionToSnapshot(next)
        scheduleAgentIdle(1000)
      } else {
        await transitionToSnapshot(next)
      }
      if (session?.user && current.source === 'supabase-workspace') {
        try {
          await persistNewCard(card)
        } catch (error) {
          commitSnapshot(current)
          showToast({
            title: 'Card was not saved',
            detail: 'Supabase rejected the change; the local card was removed.',
            tone: 'error',
          })
          throw error
        }
      }
      addActivity({
        id: `create-card:${crypto.randomUUID()}`,
        actor: input.agentGenerated ? 'Agent' : 'You',
        title: `Created “${card.title}”`,
        detail: 'Added as visible shared state on the planning canvas.',
        timestamp: 'Just now',
      })
      return card
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      markAgentCards,
      scheduleAgentIdle,
      session,
      showToast,
      transitionToSnapshot,
    ],
  )

  const updateCard = useCallback(
    async (cardReference: string, input: UpdateCardInput) => {
      assertBoardWritable()
      const current = snapshotRef.current
      const { next, updated } = updateCardInSnapshot(
        current,
        cardReference,
        input,
        session?.user.id,
      )
      if (input.agentGenerated) {
        setAgentMotion({
          phase: 'editing',
          activeCardId: updated.id,
          step: 1,
          total: 1,
          message: `Updating ${updated.title}`,
        })
        markAgentCards([updated.id], 1800)
        await transitionToSnapshot(next)
        scheduleAgentIdle(900)
      } else {
        await transitionToSnapshot(next)
      }

      if (session?.user && current.source === 'supabase-workspace') {
        try {
          await persistCardUpdate(updated.id, input, session.user.id)
        } catch (error) {
          commitSnapshot(current)
          throw error
        }
      }
      return updated
    },
    [
      assertBoardWritable,
      commitSnapshot,
      markAgentCards,
      scheduleAgentIdle,
      session,
      transitionToSnapshot,
    ],
  )

  const createStickyNote = useCallback(
    async (input: CreateStickyNoteInput) => {
      assertBoardWritable()
      const current = snapshotRef.current
      const note = createLocalStickyNote(current, input, session?.user.id)
      const next = { ...current, stickyNotes: [...current.stickyNotes, note] }
      if (input.agentGenerated) {
        setAgentMotion({
          phase: 'editing',
          activeCardId: null,
          step: 1,
          total: 1,
          message: 'Placing a canvas note',
        })
        markAgentStickies([note.id], 1700)
      }
      await transitionToSnapshot(next)
      if (input.agentGenerated) scheduleAgentIdle(850)

      if (session?.user && current.source === 'supabase-workspace') {
        try {
          await persistNewStickyNote(note)
        } catch (error) {
          commitSnapshot(current)
          throw error
        }
      }
      addActivity({
        id: `create-sticky:${crypto.randomUUID()}`,
        actor: input.agentGenerated ? 'Agent' : 'You',
        title: `Added sticky “${note.content.split('\n')[0]}”`,
        detail: 'Placed as loose thinking outside the committed sprint structure.',
        timestamp: 'Just now',
      })
      return note
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      markAgentStickies,
      scheduleAgentIdle,
      session,
      transitionToSnapshot,
    ],
  )

  const updateStickyNote = useCallback(
    async (noteReference: string, input: UpdateStickyNoteInput) => {
      assertBoardWritable()
      const current = snapshotRef.current
      const { next, updated } = updateStickyNoteInSnapshot(
        current,
        noteReference,
        input,
        session?.user.id,
      )
      if (input.agentGenerated) {
        setAgentMotion({
          phase: 'editing',
          activeCardId: null,
          step: 1,
          total: 1,
          message: `Updating ${updated.content.split('\n')[0]}`,
        })
        markAgentStickies([updated.id])
      }
      await transitionToSnapshot(next)
      if (input.agentGenerated) scheduleAgentIdle(700)

      if (session?.user && current.source === 'supabase-workspace') {
        try {
          await persistStickyNoteUpdate(updated.id, input, session.user.id)
        } catch (error) {
          commitSnapshot(current)
          throw error
        }
      }
      return updated
    },
    [
      assertBoardWritable,
      commitSnapshot,
      markAgentStickies,
      scheduleAgentIdle,
      session,
      transitionToSnapshot,
    ],
  )

  const moveStickyNote = useCallback(
    async (
      noteReference: string,
      x: number,
      y: number,
      actor: 'human' | 'agent' = 'human',
    ) => {
      const note = await updateStickyNote(noteReference, {
        x,
        y,
        agentGenerated: actor === 'agent',
      })
      addActivity({
        id: `move-sticky:${crypto.randomUUID()}`,
        actor: actor === 'agent' ? 'Agent' : 'You',
        title: `Moved sticky “${note.content.split('\n')[0]}”`,
        detail: `Canvas position is now ${Math.round(x)}, ${Math.round(y)}.`,
        timestamp: 'Just now',
      })
      return note
    },
    [addActivity, updateStickyNote],
  )

  const convertStickyToCard = useCallback(
    async (
      noteReference: string,
      columnReference: string,
      position?: number,
      actor: 'human' | 'agent' = 'human',
    ) => {
      assertBoardWritable()
      const previous = snapshotRef.current
      const note = findStickyNote(previous, noteReference)
      const column = findColumn(previous, columnReference)
      if (!note) throw new Error(`Sticky note “${noteReference}” was not found.`)
      if (!column) throw new Error(`Column “${columnReference}” was not found.`)

      const payload = stickyPayload(note)
      const [firstLine, ...bodyLines] = note.content.split('\n')
      const title =
        typeof payload.title === 'string'
          ? payload.title
          : firstLine.trim() || 'Untitled sticky note'
      const description =
        typeof payload.description === 'string'
          ? payload.description
          : bodyLines.join('\n').trim() || note.content.trim()
      const appendedCard = createLocalCard(
        previous,
        {
          title,
          description,
          columnId: column.id,
          priority:
            isCardPriority(payload.priority) ? payload.priority : 'medium',
          estimate: typeof payload.estimate === 'number' ? payload.estimate : 1,
          labels: Array.isArray(payload.labels)
            ? payload.labels.filter((label): label is string => typeof label === 'string')
            : ['From sticky'],
        },
        session?.user.id,
      )
      if (typeof payload.clientKey === 'string') appendedCard.client_key = payload.clientKey
      appendedCard.owner_name = typeof payload.ownerName === 'string' ? payload.ownerName : null
      appendedCard.goal = typeof payload.goal === 'string' ? payload.goal : null
      appendedCard.due_date = typeof payload.dueDate === 'string' ? payload.dueDate : null

      const dependencyTimestamp = new Date().toISOString()
      const restoredDependencies: CardDependency[] = []
      const incomingReferences = Array.isArray(payload.incomingDependencies)
        ? payload.incomingDependencies.filter(
            (reference): reference is string => typeof reference === 'string',
          )
        : []
      const outgoingReferences = Array.isArray(payload.outgoingDependencies)
        ? payload.outgoingDependencies.filter(
            (reference): reference is string => typeof reference === 'string',
          )
        : []
      for (const reference of incomingReferences) {
        const sourceCard = findCard(previous, reference)
        if (!sourceCard || sourceCard.id === appendedCard.id) continue
        restoredDependencies.push({
          id: crypto.randomUUID(),
          board_id: previous.board.id,
          source_card_id: sourceCard.id,
          target_card_id: appendedCard.id,
          created_by: session?.user.id || null,
          created_at: dependencyTimestamp,
        })
      }
      for (const reference of outgoingReferences) {
        const targetCard = findCard(previous, reference)
        if (!targetCard || targetCard.id === appendedCard.id) continue
        restoredDependencies.push({
          id: crypto.randomUUID(),
          board_id: previous.board.id,
          source_card_id: appendedCard.id,
          target_card_id: targetCard.id,
          created_by: session?.user.id || null,
          created_at: dependencyTimestamp,
        })
      }

      const withoutNote = {
        ...previous,
        cards: [...previous.cards, appendedCard],
        stickyNotes: previous.stickyNotes.filter((candidate) => candidate.id !== note.id),
        dependencies: [...previous.dependencies, ...restoredDependencies],
      }
      const next =
        position === undefined
          ? normalizeCardPositions(structuredClone(withoutNote))
          : moveCardInSnapshot(withoutNote, appendedCard.id, column.id, position).next
      const createdCard = findCard(next, appendedCard.id)!
      if (actor === 'agent') {
        setAgentMotion({
          phase: 'editing',
          activeCardId: createdCard.id,
          step: 1,
          total: 1,
          message: `Turning ${firstLine} into sprint work`,
        })
        markAgentCards([createdCard.id], 1800)
      }
      await transitionToSnapshot(next)
      if (actor === 'agent') scheduleAgentIdle(850)

      if (session?.user && previous.source === 'supabase-workspace') {
        try {
          await persistStickyToCard(note.id, appendedCard, restoredDependencies, next.cards)
        } catch (error) {
          commitSnapshot(previous)
          throw error
        }
      }
      addActivity({
        id: `sticky-to-card:${crypto.randomUUID()}`,
        actor: actor === 'agent' ? 'Agent' : 'You',
        title: `Turned “${firstLine}” into a ${column.title} card`,
        detail: 'The loose note is now estimated, structured sprint work.',
        timestamp: 'Just now',
      })
      return createdCard
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      markAgentCards,
      scheduleAgentIdle,
      session,
      transitionToSnapshot,
    ],
  )

  const convertCardToSticky = useCallback(
    async (
      cardReference: string,
      x: number,
      y: number,
      color: StickyColor = 'yellow',
      actor: 'human' | 'agent' = 'human',
    ) => {
      assertBoardWritable()
      const previous = snapshotRef.current
      const card = findCard(previous, cardReference)
      if (!card) throw new Error(`Card “${cardReference}” was not found.`)
      const note = createLocalStickyNote(
        previous,
        {
          content: [card.title, card.description].filter(Boolean).join('\n'),
          x,
          y,
          color,
        },
        session?.user.id,
        cardToPayload(card, previous),
      )
      const next = structuredClone(previous)
      next.cards = next.cards.filter((candidate) => candidate.id !== card.id)
      next.stickyNotes.push(note)
      next.dependencies = next.dependencies.filter(
          (dependency) =>
            dependency.source_card_id !== card.id && dependency.target_card_id !== card.id,
        )
      normalizeCardPositions(next)
      if (actor === 'agent') {
        setAgentMotion({
          phase: 'editing',
          activeCardId: null,
          step: 1,
          total: 1,
          message: `Returning ${card.title} to loose thinking`,
        })
        markAgentStickies([note.id], 1800)
      }
      await transitionToSnapshot(next)
      if (actor === 'agent') scheduleAgentIdle(850)

      if (session?.user && previous.source === 'supabase-workspace') {
        try {
          await persistCardToSticky(card.id, note, next.cards)
        } catch (error) {
          commitSnapshot(previous)
          throw error
        }
      }
      addActivity({
        id: `card-to-sticky:${crypto.randomUUID()}`,
        actor: actor === 'agent' ? 'Agent' : 'You',
        title: `Turned “${card.title}” into a sticky`,
        detail: 'Its planning metadata is retained for a later return to the sprint.',
        timestamp: 'Just now',
      })
      return note
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      markAgentStickies,
      scheduleAgentIdle,
      session,
      transitionToSnapshot,
    ],
  )

  const linkDependency = useCallback(
    async (sourceReference: string, targetReference: string) => {
      assertBoardWritable()
      const current = snapshotRef.current
      const source = findCard(current, sourceReference)
      const target = findCard(current, targetReference)
      if (!source || !target) throw new Error('Both dependency cards must exist on this board.')
      if (source.id === target.id) throw new Error('A card cannot depend on itself.')
      const duplicate = current.dependencies.find(
        (item) => item.source_card_id === source.id && item.target_card_id === target.id,
      )
      if (duplicate) return duplicate
      if (wouldCreateDependencyCycle(current.dependencies, source.id, target.id)) {
        throw new Error(
          `Linking ${source.title} to ${target.title} would create a dependency cycle.`,
        )
      }
      const dependency: CardDependency = {
        id: crypto.randomUUID(),
        board_id: current.board.id,
        source_card_id: source.id,
        target_card_id: target.id,
        created_by: session?.user.id || null,
        created_at: new Date().toISOString(),
      }
      const next = {
        ...current,
        dependencies: [...current.dependencies, dependency],
      }
      await transitionToSnapshot(next)
      if (session?.user && current.source === 'supabase-workspace') {
        try {
          await persistDependency(dependency)
        } catch (error) {
          commitSnapshot(current)
          throw error
        }
      }
      addActivity({
        id: `link-dependency:${crypto.randomUUID()}`,
        actor: 'Agent',
        title: `Linked ${source.title} → ${target.title}`,
        detail: `${source.title} now blocks ${target.title}.`,
        timestamp: 'Just now',
      })
      return dependency
    },
    [addActivity, assertBoardWritable, commitSnapshot, session, transitionToSnapshot],
  )

  const proposeSprint = useCallback(async () => {
    assertBoardWritable()
    if (proposalRef.current) throw new Error('A proposal is already visible for review.')
    const nextProposal = createFocusProposal(snapshotRef.current)
    if (!nextProposal.actions.length) {
      throw new Error('The board is already focused; there are no draft changes to propose.')
    }
    if (session?.user && snapshotRef.current.source === 'supabase-workspace') {
      await persistProposal(nextProposal, snapshotRef.current.board.id)
    }
    commitProposal(nextProposal)
    setAgentMotion({
      phase: 'proposing',
      activeCardId: nextProposal.actions[0]?.cardId || null,
      step: 1,
      total: nextProposal.actions.length,
      message: 'Sketching a reviewable plan',
    })
    scheduleAgentIdle(Math.max(1200, nextProposal.actions.length * PROPOSAL_STAGGER_MS + 560))
    addActivity({
      id: `proposal:${crypto.randomUUID()}`,
      actor: 'Agent',
      title: 'Sprint proposal is ready',
      detail: `${nextProposal.actions.length} changes are shown as ghost state for review.`,
      timestamp: 'Just now',
    })
    return nextProposal
  }, [addActivity, assertBoardWritable, commitProposal, scheduleAgentIdle, session])

  const applyProposal = useCallback(
    async (proposalId?: string) => {
      assertBoardWritable()
      const currentProposal = proposalRef.current
      if (!currentProposal || (proposalId && currentProposal.id !== proposalId)) {
        throw new Error('There is no matching draft proposal to apply.')
      }
      const previous = snapshotRef.current
      let next = previous
      for (const [index, action] of currentProposal.actions.entries()) {
        setAgentMotion({
          phase: 'applying',
          activeCardId: action.cardId || null,
          step: index + 1,
          total: currentProposal.actions.length,
          message: `Applying ${action.cardTitle}`,
        })
        if (action.cardId) markAgentCards([action.cardId], 1800)
        await wait(index === 0 ? 130 : 80)
        next = applyProposalToSnapshot(next, {
          ...currentProposal,
          actions: [action],
        })
        await transitionToSnapshot(next)
      }
      if (session?.user && next.source === 'supabase-workspace') {
        try {
          await persistAppliedProposal(next.board.id, currentProposal.id, next.cards)
        } catch (error) {
          commitSnapshot(previous)
          commitProposal(currentProposal)
          throw error
        }
      }
      addActivity({
        id: `apply-proposal:${crypto.randomUUID()}`,
        actor: 'You',
        title: 'Proposal applied',
        detail: 'The reviewed ghost changes are now the live board state.',
        timestamp: 'Just now',
      })
      commitProposal(null)
      showToast({
        title: 'Plan applied',
        detail: 'Now contains a 13-point critical path that protects the sprint goal.',
        tone: 'success',
      })
      setAgentMotion({ ...idleMotion, message: 'Plan applied' })
      scheduleAgentIdle(800)
      return next
    },
    [
      addActivity,
      assertBoardWritable,
      commitSnapshot,
      commitProposal,
      markAgentCards,
      scheduleAgentIdle,
      session,
      showToast,
      transitionToSnapshot,
    ],
  )

  const dismissProposal = useCallback(
    async (proposalId?: string) => {
      if (accessRoleRef.current === 'viewer') {
        throw new Error('This sprint is in live view mode. Only an editor can resolve proposals.')
      }
      const currentProposal = proposalRef.current
      if (!currentProposal || (proposalId && currentProposal.id !== proposalId)) {
        throw new Error('There is no matching draft proposal to dismiss.')
      }
      if (session?.user && snapshotRef.current.source === 'supabase-workspace') {
        await resolveProposal(currentProposal.id, 'dismissed')
      }
      commitProposal(null)
      return currentProposal
    },
    [commitProposal, session],
  )

  const selectSprint = useCallback(
    async (reference: string) => {
      if (!session?.user) throw new Error('Sign in to switch sprints.')
      if (proposalRef.current) throw new Error('Resolve the visible proposal before switching sprints.')
      const normalized = reference.trim().toLowerCase()
      const target = sprints.find(
        (item) => item.id === reference || item.title.toLowerCase() === normalized,
      )
      if (!target) throw new Error(`Sprint “${reference}” was not found.`)
      if (target.id === snapshotRef.current.board.id) return snapshotRef.current
      setLoading(true)
      try {
        const [next, nextCollaborators] = await Promise.all([
          loadBoard(target.id, 'supabase-workspace'),
          loadBoardCollaborators(target.id),
        ])
        commitProposal(null)
        setCollaborators(nextCollaborators)
        commitAccessRole(target.role)
        window.localStorage.setItem(`plot:active-sprint:${session.user.id}`, target.id)
        syncActiveBoardUrl(target.id)
        await transitionToSnapshot(next)
        return next
      } finally {
        setLoading(false)
      }
    },
    [commitAccessRole, commitProposal, session, sprints, transitionToSnapshot],
  )

  const createNewSprint = useCallback(
    async (input: CreateSprintInput) => {
      if (!session?.user) throw new Error('Sign in to create a sprint.')
      if (proposalRef.current) throw new Error('Resolve the visible proposal before creating a sprint.')
      setLoading(true)
      try {
        const boardId = await createSprintRepository({
          ...input,
          sourceBoardId: input.sourceBoardId ?? snapshotRef.current.board.id,
        })
        const nextSprints = await loadAccessibleSprints(session.user.id)
        setSprints(nextSprints)
        const target = nextSprints.find((item) => item.id === boardId)
        if (!target) throw new Error('The new sprint was created but is not available yet.')
        const [next, nextCollaborators] = await Promise.all([
          loadBoard(boardId, 'supabase-workspace'),
          loadBoardCollaborators(boardId),
        ])
        setCollaborators(nextCollaborators)
        commitAccessRole(target.role)
        window.localStorage.setItem(`plot:active-sprint:${session.user.id}`, boardId)
        syncActiveBoardUrl(boardId)
        await transitionToSnapshot(next)
        showToast({
          title: 'Sprint created',
          detail: input.copyMode === 'everything'
            ? 'The full board was carried into a fresh collaborative sprint.'
            : 'A clean sprint is ready with the same planning structure.',
          tone: 'success',
        })
        return next
      } finally {
        setLoading(false)
      }
    },
    [commitAccessRole, session, showToast, transitionToSnapshot],
  )

  const inviteCollaborator = useCallback(
    async (input: CreateInvitationInput) => {
      if (!session?.user) throw new Error('Sign in to share a sprint.')
      if (accessRoleRef.current !== 'owner') {
        throw new Error('Only the sprint owner can create invitation links.')
      }
      const invitation = await createBoardInvitation(snapshotRef.current.board.id, input)
      const url = buildBoardUrl(
        window.location.href,
        snapshotRef.current.board.id,
        invitation.token,
        publicAppUrl,
      )
      return { ...invitation, url }
    },
    [session],
  )

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(window.location.href, publicAppUrl),
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    commitProposal(null)
    setSprints([])
    setCollaborators([])
    setPresence([])
    commitAccessRole('guest')
  }, [commitAccessRole, commitProposal])

  const analysis = useMemo(() => analyzeBoard(snapshot), [snapshot])
  const boardUrl = useMemo(
    () => buildBoardUrl(window.location.href, snapshot.board.id, undefined, publicAppUrl),
    [snapshot.board.id],
  )

  return {
    snapshot,
    analysis,
    session,
    authReady,
    loading,
    connection,
    proposal,
    activities,
    toast,
    agentMotion,
    recentAgentCardIds,
    recentAgentStickyIds,
    sprints,
    collaborators,
    presence,
    accessRole,
    boardUrl,
    canEdit: accessRole !== 'viewer',
    dismissToast: () => setToast(null),
    reportError,
    moveCard,
    createCard,
    updateCard,
    createStickyNote,
    updateStickyNote,
    moveStickyNote,
    convertStickyToCard,
    convertCardToSticky,
    linkDependency,
    proposeSprint,
    applyProposal,
    dismissProposal,
    selectSprint,
    createNewSprint,
    inviteCollaborator,
    sendMagicLink,
    signOut,
  }
}
