import type {
  BoardAnalysis,
  BoardSnapshot,
  PlanAction,
  PlanningProposal,
} from '../types/domain'

function columnByKey(snapshot: BoardSnapshot, key: string) {
  return snapshot.columns.find((column) => column.client_key === key)
}

function cardByKey(snapshot: BoardSnapshot, key: string) {
  return snapshot.cards.find((card) => card.client_key === key)
}

function dependencyTitle(snapshot: BoardSnapshot, cardId: string) {
  return snapshot.cards.find((card) => card.id === cardId)?.title ?? 'Unknown card'
}

export function analyzeBoard(snapshot: BoardSnapshot): BoardAnalysis {
  const nowColumn = columnByKey(snapshot, 'now')
  const plannedPoints = snapshot.cards
    .filter((card) => card.column_id === nowColumn?.id)
    .reduce((sum, card) => sum + card.estimate, 0)

  const misplacedBlocker = snapshot.dependencies.find((dependency) => {
    const source = snapshot.cards.find((card) => card.id === dependency.source_card_id)
    const target = snapshot.cards.find((card) => card.id === dependency.target_card_id)
    return target?.column_id === nowColumn?.id && source?.column_id !== nowColumn?.id
  })

  const analytics = cardByKey(snapshot, 'analytics')
  const unguidedIdeas = snapshot.cards.filter((card) => !card.goal).length
  const withinCapacity = plannedPoints <= snapshot.board.capacity

  const insights = [
    misplacedBlocker
      ? {
          id: 'dependency-risk',
          tone: 'critical' as const,
          eyebrow: 'Dependency risk',
          title: `${dependencyTitle(snapshot, misplacedBlocker.source_card_id)} is outside Now`,
          detail: `It blocks ${dependencyTitle(snapshot, misplacedBlocker.target_card_id)}, which is already committed. Pull the blocker into the sprint before adding more scope.`,
        }
      : {
          id: 'dependency-clear',
          tone: 'positive' as const,
          eyebrow: 'Dependency health',
          title: 'Critical path is aligned',
          detail: 'Every blocker for committed work is scheduled in the same planning horizon.',
        },
    analytics && analytics.column_id === nowColumn?.id
      ? {
          id: 'goal-fit',
          tone: 'warning' as const,
          eyebrow: 'Goal fit',
          title: `${analytics.estimate} points do not protect activation`,
          detail: 'Activation analytics is useful, but it is not on the critical path for completing onboarding this sprint.',
        }
      : {
          id: 'goal-fit',
          tone: 'positive' as const,
          eyebrow: 'Goal fit',
          title: 'Current scope protects the sprint goal',
          detail: 'Committed work contributes directly to the activation path.',
        },
    {
      id: 'capacity',
      tone: withinCapacity ? ('positive' as const) : ('critical' as const),
      eyebrow: 'Capacity',
      title: `${plannedPoints} of ${snapshot.board.capacity} points planned`,
      detail: withinCapacity
        ? `${snapshot.board.capacity - plannedPoints} points remain, but dependencies should be resolved before adding work.`
        : `The sprint is ${plannedPoints - snapshot.board.capacity} points over capacity. Protect the goal and move supporting work out.`,
    },
    {
      id: 'unshaped-work',
      tone: 'neutral' as const,
      eyebrow: 'Backlog hygiene',
      title: `${unguidedIdeas} cards are not tied to a goal`,
      detail: 'Keep them in Inbox or Later until the team can name the outcome they support.',
    },
  ]

  const penalties = (misplacedBlocker ? 14 : 0) + (analytics?.column_id === nowColumn?.id ? 9 : 0)

  return {
    focusScore: Math.max(0, 92 - penalties - Math.max(0, plannedPoints - snapshot.board.capacity) * 4),
    plannedPoints,
    capacity: snapshot.board.capacity,
    insights,
  }
}

export function createFocusProposal(snapshot: BoardSnapshot): PlanningProposal {
  const now = columnByKey(snapshot, 'now')
  const later = columnByKey(snapshot, 'later')
  const emailApi = cardByKey(snapshot, 'email-api')
  const analytics = cardByKey(snapshot, 'analytics')
  const mobileFixes = cardByKey(snapshot, 'mobile-fixes')
  const actions: PlanAction[] = []

  if (emailApi && now && emailApi.column_id !== now.id) {
    actions.push({
      id: crypto.randomUUID(),
      type: 'move_card',
      cardId: emailApi.id,
      cardTitle: emailApi.title,
      fromColumnId: emailApi.column_id,
      toColumnId: now.id,
      toPosition: 0,
      before: { column_id: emailApi.column_id, position: emailApi.position },
      after: { column_id: now.id, position: 0 },
      rationale: 'Email API blocks Signup flow, so it belongs at the front of the critical path.',
    })
  }

  if (analytics && later && analytics.column_id !== later.id) {
    actions.push({
      id: crypto.randomUUID(),
      type: 'move_card',
      cardId: analytics.id,
      cardTitle: analytics.title,
      fromColumnId: analytics.column_id,
      toColumnId: later.id,
      toPosition: snapshot.cards.filter((card) => card.column_id === later.id).length,
      before: { column_id: analytics.column_id, position: analytics.position },
      after: { column_id: later.id },
      rationale: 'Analytics is valuable, but it does not unblock the activation journey this sprint.',
    })
  }

  if (mobileFixes && now && mobileFixes.column_id !== now.id) {
    actions.push({
      id: crypto.randomUUID(),
      type: 'move_card',
      cardId: mobileFixes.id,
      cardTitle: mobileFixes.title,
      fromColumnId: mobileFixes.column_id,
      toColumnId: now.id,
      toPosition: 2,
      before: { column_id: mobileFixes.column_id, position: mobileFixes.position },
      after: { column_id: now.id, position: 2 },
      rationale: 'Mobile fixes complete the activation path and bring the proposed plan to exactly 13 points.',
    })
  }

  return {
    id: crypto.randomUUID(),
    title: 'Protect the activation sprint',
    summary:
      'Rebuild Now around the dependency chain Email API → Signup flow → Mobile fixes, and defer measurement work until the path ships.',
    actions,
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
}

export function applyProposalToSnapshot(
  snapshot: BoardSnapshot,
  proposal: PlanningProposal,
): BoardSnapshot {
  const next = structuredClone(snapshot)

  for (const action of proposal.actions) {
    if (action.type !== 'move_card' || !action.cardId || !action.toColumnId) continue
    const card = next.cards.find((candidate) => candidate.id === action.cardId)
    if (!card) continue
    card.column_id = action.toColumnId
    card.position = action.toPosition ?? Number.MAX_SAFE_INTEGER
    card.updated_at = new Date().toISOString()
  }

  for (const column of next.columns) {
    next.cards
      .filter((card) => card.column_id === column.id)
      .sort((a, b) => a.position - b.position)
      .forEach((card, index) => {
        card.position = index
      })
  }

  return next
}
