import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type {
  BoardAnalysis,
  BoardRole,
  BoardSnapshot,
  CardPriority,
  CreateCardInput,
  CreateSprintInput,
  CreateStickyNoteInput,
  PlanningProposal,
  StickyColor,
  SprintSummary,
  UpdateCardInput,
  UpdateStickyNoteInput,
} from '../types/domain'

interface PlotToolApi {
  snapshot: BoardSnapshot
  analysis: BoardAnalysis
  proposal: PlanningProposal | null
  sprints: SprintSummary[]
  accessRole: BoardRole | 'guest'
  moveCard: (card: string, column: string, position?: number) => Promise<unknown>
  createCard: (input: CreateCardInput) => Promise<unknown>
  updateCard: (card: string, input: UpdateCardInput) => Promise<unknown>
  createStickyNote: (input: CreateStickyNoteInput) => Promise<unknown>
  updateStickyNote: (note: string, input: UpdateStickyNoteInput) => Promise<unknown>
  moveStickyNote: (note: string, x: number, y: number) => Promise<unknown>
  convertStickyToCard: (note: string, column: string, position?: number) => Promise<unknown>
  convertCardToSticky: (
    card: string,
    x: number,
    y: number,
    color?: StickyColor,
  ) => Promise<unknown>
  linkDependency: (source: string, target: string) => Promise<unknown>
  proposeSprint: () => Promise<PlanningProposal>
  applyProposal: (proposalId?: string) => Promise<unknown>
  dismissProposal: (proposalId?: string) => Promise<unknown>
  selectSprint: (sprint: string) => Promise<unknown>
  createSprint: (input: CreateSprintInput) => Promise<unknown>
}

type WebMcpStatus = 'registering' | 'active' | 'unsupported' | 'error'
const PLOT_TOOL_COUNT = 17

function textResult(message: string, data: unknown) {
  return {
    content: [{ type: 'text', text: `${message}\n\n${JSON.stringify(data, null, 2)}` }],
    structuredContent: data,
  }
}

function requiredString(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`“${key}” must be a non-empty string.`)
  }
  return value.trim()
}

function optionalNumber(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`“${key}” must be a number.`)
  }
  return value
}

function requiredNumber(input: Record<string, unknown>, key: string) {
  const value = optionalNumber(input, key)
  if (value === undefined) throw new Error(`“${key}” must be a number.`)
  return value
}

function optionalInteger(input: Record<string, unknown>, key: string) {
  const value = optionalNumber(input, key)
  if (value !== undefined && !Number.isInteger(value)) {
    throw new Error(`“${key}” must be a whole number.`)
  }
  return value
}

function optionalStringArray(input: Record<string, unknown>, key: string, maxItems: number) {
  const value = input[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`“${key}” must be an array of strings.`)
  }
  if (value.length > maxItems) throw new Error(`“${key}” accepts at most ${maxItems} items.`)
  return value as string[]
}

const stickyColors: StickyColor[] = ['yellow', 'pink', 'blue', 'green', 'violet']

function optionalStickyColor(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !stickyColors.includes(value as StickyColor)) {
    throw new Error(`“${key}” must be one of: ${stickyColors.join(', ')}.`)
  }
  return value as StickyColor
}

function createTools(apiRef: React.RefObject<PlotToolApi>) {
  const current = () => {
    if (!apiRef.current) throw new Error('PLOT is not ready yet.')
    return apiRef.current
  }
  const mutable = () => {
    const api = current()
    if (api.accessRole === 'viewer') {
      throw new Error('This sprint is open in live view mode. The agent cannot change it.')
    }
    if (api.proposal) {
      throw new Error('Resolve the visible proposal before making another board change.')
    }
    return api
  }

  const tools: WebMCP.ModelContextTool[] = [
    {
      name: 'plot.get_board',
      title: 'Read the active PLOT board',
      description:
        'Returns the active board, columns, cards, loose sticky notes, estimates, priorities, labels, owners, and dependency edges. Use this before planning or making changes.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: (_input, options) => {
        options?.signal?.throwIfAborted()
        const { snapshot } = current()
        const data = {
          board: {
            id: snapshot.board.id,
            title: snapshot.board.title,
            description: snapshot.board.description,
            sprintGoal: snapshot.board.sprint_goal,
            capacity: snapshot.board.capacity,
            accessRole: current().accessRole,
            status: snapshot.board.status,
            startsOn: snapshot.board.starts_on,
            endsOn: snapshot.board.ends_on,
            mode: snapshot.source === 'supabase-workspace' ? 'private-workspace' : 'demo',
          },
          columns: snapshot.columns.map((column) => ({
            id: column.id,
            key: column.client_key,
            title: column.title,
            description: column.description,
            position: column.position,
            wipLimit: column.wip_limit,
            cards: snapshot.cards
              .filter((card) => card.column_id === column.id)
              .map((card) => ({
                id: card.id,
                key: card.client_key,
                title: card.title,
                description: card.description,
                priority: card.priority,
                estimate: card.estimate,
                position: card.position,
                labels: card.labels,
                owner: card.owner_name,
                goal: card.goal,
                dueDate: card.due_date,
              })),
          })),
          dependencies: snapshot.dependencies.map((dependency) => ({
            id: dependency.id,
            source: {
              id: dependency.source_card_id,
              key: snapshot.cards.find((card) => card.id === dependency.source_card_id)?.client_key,
              title: snapshot.cards.find((card) => card.id === dependency.source_card_id)?.title,
            },
            target: {
              id: dependency.target_card_id,
              key: snapshot.cards.find((card) => card.id === dependency.target_card_id)?.client_key,
              title: snapshot.cards.find((card) => card.id === dependency.target_card_id)?.title,
            },
          })),
          stickyNotes: snapshot.stickyNotes.map((note) => ({
            id: note.id,
            key: note.client_key,
            content: note.content,
            color: note.color,
            x: note.x,
            y: note.y,
          })),
        }
        return textResult('Active PLOT board', data)
      },
    },
    {
      name: 'plot.list_sprints',
      title: 'List accessible PLOT sprints',
      description: 'Lists the signed-in user’s accessible sprints and their owner, editor, or live-view role.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: (_input, options) => {
        options?.signal?.throwIfAborted()
        const api = current()
        return textResult('Accessible PLOT sprints', {
          activeSprintId: api.snapshot.board.id,
          sprints: api.sprints,
        })
      },
    },
    {
      name: 'plot.switch_sprint',
      title: 'Open another accessible sprint',
      description: 'Switches the visible PLOT canvas to another accessible sprint by id or exact title. It does not change board data.',
      inputSchema: {
        type: 'object',
        properties: { sprint: { type: 'string', minLength: 1, description: 'Sprint id or exact title.' } },
        required: ['sprint'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const next = await current().selectSprint(requiredString(input, 'sprint'))
        return textResult('Sprint opened on the shared canvas', next)
      },
    },
    {
      name: 'plot.create_sprint',
      title: 'Create and open a new sprint',
      description: 'Creates a fresh sprint from the active board structure. Optionally carries all cards, dependencies, and sticky notes.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 120 },
          sprint_goal: { type: 'string', maxLength: 240 },
          capacity: { type: 'integer', minimum: 1, maximum: 200 },
          copy_mode: { type: 'string', enum: ['empty', 'everything'] },
          starts_on: { type: 'string', description: 'Optional ISO date (YYYY-MM-DD).' },
          ends_on: { type: 'string', description: 'Optional ISO date (YYYY-MM-DD).' },
        },
        required: ['title'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const next = await current().createSprint({
          title: requiredString(input, 'title'),
          sprintGoal: typeof input.sprint_goal === 'string' ? input.sprint_goal : undefined,
          capacity: optionalInteger(input, 'capacity'),
          copyMode: input.copy_mode === 'everything' ? 'everything' : 'empty',
          startsOn: typeof input.starts_on === 'string' ? input.starts_on : undefined,
          endsOn: typeof input.ends_on === 'string' ? input.ends_on : undefined,
        })
        return textResult('New sprint created and opened', next)
      },
    },
    {
      name: 'plot.analyze_board',
      title: 'Analyze scope, capacity, and blockers',
      description:
        'Observes the active board without changing it. Identifies dependency risks, off-goal scope, unshaped work, capacity pressure, and a focus score.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: (_input, options) => {
        options?.signal?.throwIfAborted()
        return textResult('Board analysis complete', current().analysis)
      },
    },
    {
      name: 'plot.create_card',
      title: 'Create a visible planning card',
      description:
        'Creates a card on the shared canvas. Prefer Inbox when the work is not shaped yet. The UI updates immediately so the user can see the change.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 160, description: 'Short, outcome-oriented card title.' },
          description: { type: 'string', maxLength: 2000, description: 'Why the work matters and what done means.' },
          column: {
            type: 'string',
            description: 'Column id, key, or title. Common keys: inbox, now, next, later.',
          },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          estimate: { type: 'integer', minimum: 1, maximum: 100 },
          labels: { type: 'array', items: { type: 'string' }, maxItems: 8 },
        },
        required: ['title'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const card = await mutable().createCard({
          title: requiredString(input, 'title'),
          description: typeof input.description === 'string' ? input.description : undefined,
          columnId: typeof input.column === 'string' ? input.column : undefined,
          priority:
            typeof input.priority === 'string' ? (input.priority as CardPriority) : undefined,
          estimate: optionalInteger(input, 'estimate'),
          labels: optionalStringArray(input, 'labels', 8),
        })
        return textResult('Card created and shown on the board', card)
      },
    },
    {
      name: 'plot.move_card',
      title: 'Move a card on the shared canvas',
      description:
        'Moves a card to another column and updates the visible board immediately. Use a proposal first when moving several cards or changing sprint scope.',
      inputSchema: {
        type: 'object',
        properties: {
          card: { type: 'string', description: 'Card id, key, or exact title.' },
          column: { type: 'string', description: 'Destination column id, key, or title.' },
          position: { type: 'integer', minimum: 0, description: 'Zero-based position in the column.' },
        },
        required: ['card', 'column'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const card = await mutable().moveCard(
          requiredString(input, 'card'),
          requiredString(input, 'column'),
          optionalInteger(input, 'position'),
        )
        return textResult('Card moved on the shared canvas', card)
      },
    },
    {
      name: 'plot.update_card',
      title: 'Update card planning metadata',
      description:
        'Updates a card title, description, priority, estimate, owner, goal, or labels. Only supplied fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          card: { type: 'string', description: 'Card id, key, or exact title.' },
          title: { type: 'string', minLength: 1, maxLength: 160 },
          description: { type: 'string', maxLength: 2000 },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          estimate: { type: 'integer', minimum: 1, maximum: 100 },
          owner: { type: ['string', 'null'], maxLength: 80 },
          goal: { type: ['string', 'null'], maxLength: 240 },
          labels: { type: 'array', items: { type: 'string' }, maxItems: 8 },
        },
        required: ['card'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const updated = await mutable().updateCard(requiredString(input, 'card'), {
          title: typeof input.title === 'string' ? input.title : undefined,
          description: typeof input.description === 'string' ? input.description : undefined,
          priority:
            typeof input.priority === 'string' ? (input.priority as CardPriority) : undefined,
          estimate: optionalInteger(input, 'estimate'),
          ownerName:
            typeof input.owner === 'string' || input.owner === null ? input.owner : undefined,
          goal: typeof input.goal === 'string' || input.goal === null ? input.goal : undefined,
          labels: optionalStringArray(input, 'labels', 8),
        })
        return textResult('Card metadata updated', updated)
      },
    },
    {
      name: 'plot.create_sticky_note',
      title: 'Write a loose note around the board',
      description:
        'Places an uncommitted sticky note on the open canvas around the sprint. Use this for signals, questions, hypotheses, or ideas that are not shaped as sprint work yet.',
      inputSchema: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            minLength: 1,
            maxLength: 1200,
            description: 'A short heading, optionally followed by context on new lines.',
          },
          x: { type: 'number', minimum: -100000, maximum: 100000, description: 'Horizontal world position. Negative values sit left of the board.' },
          y: { type: 'number', minimum: -100000, maximum: 100000, description: 'Vertical world position.' },
          color: { type: 'string', enum: stickyColors },
        },
        required: ['content'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const note = await mutable().createStickyNote({
          content: requiredString(input, 'content'),
          x: optionalNumber(input, 'x') ?? -220,
          y: optionalNumber(input, 'y') ?? 210,
          color: optionalStickyColor(input, 'color') ?? 'yellow',
        })
        return textResult('Loose note placed on the shared canvas', note)
      },
    },
    {
      name: 'plot.update_sticky_note',
      title: 'Edit a loose canvas note',
      description:
        'Updates the text or color of an existing sticky note without committing it to the sprint.',
      inputSchema: {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'Sticky note id, key, exact heading, or exact content.' },
          content: { type: 'string', minLength: 1, maxLength: 1200 },
          color: { type: 'string', enum: stickyColors },
        },
        required: ['note'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const note = await mutable().updateStickyNote(requiredString(input, 'note'), {
          content: typeof input.content === 'string' ? input.content : undefined,
          color: optionalStickyColor(input, 'color'),
        })
        return textResult('Sticky note updated on the shared canvas', note)
      },
    },
    {
      name: 'plot.move_sticky_note',
      title: 'Move a loose note on the canvas',
      description:
        'Moves a sticky note to an exact canvas position while keeping it outside the sprint structure.',
      inputSchema: {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'Sticky note id, key, exact heading, or exact content.' },
          x: { type: 'number', minimum: -100000, maximum: 100000, description: 'Horizontal world position.' },
          y: { type: 'number', minimum: -100000, maximum: 100000, description: 'Vertical world position.' },
        },
        required: ['note', 'x', 'y'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const note = await mutable().moveStickyNote(
          requiredString(input, 'note'),
          requiredNumber(input, 'x'),
          requiredNumber(input, 'y'),
        )
        return textResult('Sticky note moved on the shared canvas', note)
      },
    },
    {
      name: 'plot.convert_sticky_to_card',
      title: 'Shape a sticky note into sprint work',
      description:
        'Turns a loose sticky note into a planning card in a chosen column. If it previously came from a card, its estimate, priority, labels, owner, goal, and due date are restored.',
      inputSchema: {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'Sticky note id, key, exact heading, or exact content.' },
          column: { type: 'string', description: 'Destination column id, key, or title.' },
          position: { type: 'integer', minimum: 0, description: 'Optional zero-based position in the column.' },
        },
        required: ['note', 'column'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const card = await mutable().convertStickyToCard(
          requiredString(input, 'note'),
          requiredString(input, 'column'),
          optionalInteger(input, 'position'),
        )
        return textResult('Loose note shaped into a visible sprint card', card)
      },
    },
    {
      name: 'plot.convert_card_to_sticky',
      title: 'Return a card to loose thinking',
      description:
        'Removes a card from the sprint and places it as a sticky note on the open canvas. Planning metadata is retained for a later return to the board.',
      inputSchema: {
        type: 'object',
        properties: {
          card: { type: 'string', description: 'Card id, key, or exact title.' },
          x: { type: 'number', minimum: -100000, maximum: 100000, description: 'Horizontal world position for the sticky.' },
          y: { type: 'number', minimum: -100000, maximum: 100000, description: 'Vertical world position for the sticky.' },
          color: { type: 'string', enum: stickyColors },
        },
        required: ['card', 'x', 'y'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const note = await mutable().convertCardToSticky(
          requiredString(input, 'card'),
          requiredNumber(input, 'x'),
          requiredNumber(input, 'y'),
          optionalStickyColor(input, 'color'),
        )
        return textResult('Card returned to loose thinking as a sticky note', note)
      },
    },
    {
      name: 'plot.link_dependency',
      title: 'Link a blocking dependency',
      description:
        'Creates a directed dependency edge: source blocks target. The relationship becomes visible on both cards and in the critical-path strip.',
      inputSchema: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Blocking card id, key, or exact title.' },
          target: { type: 'string', description: 'Blocked card id, key, or exact title.' },
        },
        required: ['source', 'target'],
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const dependency = await mutable().linkDependency(
          requiredString(input, 'source'),
          requiredString(input, 'target'),
        )
        return textResult('Dependency linked and rendered', dependency)
      },
    },
    {
      name: 'plot.propose_sprint',
      title: 'Show a reviewable sprint proposal',
      description:
        'Suggests a dependency-aware sprint plan as visible ghost changes. This never changes the live board; the user can inspect and explicitly apply or dismiss the proposal.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: async (_input, options) => {
        options?.signal?.throwIfAborted()
        const api = current()
        if (api.proposal) throw new Error('A proposal is already visible for review.')
        const proposal = await api.proposeSprint()
        return textResult('Proposal is visible for human review', proposal)
      },
    },
    {
      name: 'plot.apply_proposal',
      title: 'Apply the reviewed proposal',
      description:
        'Applies the currently visible draft proposal after the user has reviewed it. Turns ghost changes into the live board and persists them for signed-in users.',
      inputSchema: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'Optional id returned by plot.propose_sprint.' },
        },
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const next = await current().applyProposal(
          typeof input.proposal_id === 'string' ? input.proposal_id : undefined,
        )
        return textResult('Reviewed proposal applied', next)
      },
    },
    {
      name: 'plot.dismiss_proposal',
      title: 'Dismiss the visible proposal',
      description:
        'Dismisses the current ghost proposal without changing the live board.',
      inputSchema: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', description: 'Optional id returned by plot.propose_sprint.' },
        },
        additionalProperties: false,
      },
      execute: async (input, options) => {
        options?.signal?.throwIfAborted()
        const dismissed = await current().dismissProposal(
          typeof input.proposal_id === 'string' ? input.proposal_id : undefined,
        )
        return textResult('Proposal dismissed; live board unchanged', dismissed)
      },
    },
  ]

  return tools
}

export function useWebMcp(api: PlotToolApi) {
  const apiRef = useRef<PlotToolApi>(api)
  const [status, setStatus] = useState<WebMcpStatus>(() =>
    document.modelContext ? 'registering' : 'unsupported',
  )
  const [toolCount, setToolCount] = useState(document.modelContext ? 0 : PLOT_TOOL_COUNT)

  useLayoutEffect(() => {
    apiRef.current = api
  }, [api])

  useEffect(() => {
    const tools = createTools(apiRef)
    const testBridge = {
      listTools: () => tools.map(({ name, title, description, inputSchema }) => ({
        name,
        title,
        description,
        inputSchema,
      })),
      execute: async (name: string, input: Record<string, unknown> = {}) => {
        const tool = tools.find((candidate) => candidate.name === name)
        if (!tool) throw new Error(`Unknown PLOT tool: ${name}`)
        return tool.execute(input, { signal: new AbortController().signal })
      },
    }
    ;(
      window as Window & {
        __PLOT_WEBMCP_TEST__?: typeof testBridge
      }
    ).__PLOT_WEBMCP_TEST__ = testBridge

    if (!document.modelContext) {
      return () => {
        delete (
          window as Window & {
            __PLOT_WEBMCP_TEST__?: typeof testBridge
          }
        ).__PLOT_WEBMCP_TEST__
      }
    }

    const controller = new AbortController()
    void Promise.allSettled(
      tools.map((tool) => document.modelContext!.registerTool(tool, { signal: controller.signal })),
    ).then((results) => {
      const registered = results.filter((result) => result.status === 'fulfilled').length
      setToolCount(registered)
      setStatus(registered === tools.length ? 'active' : registered > 0 ? 'active' : 'error')
    })

    return () => {
      controller.abort()
      delete (
        window as Window & {
          __PLOT_WEBMCP_TEST__?: typeof testBridge
        }
      ).__PLOT_WEBMCP_TEST__
    }
  }, [])

  return { status, toolCount }
}
