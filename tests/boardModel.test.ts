import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createLocalCard,
  createLocalStickyNote,
  moveCardInSnapshot,
  updateCardInSnapshot,
  wouldCreateDependencyCycle,
} from '../src/lib/boardModel.ts'

const timestamp = '2026-08-30T00:00:00.000Z'

function createSnapshot() {
  return {
    board: {
      id: 'board-1',
      owner_id: null,
      title: 'Test board',
      description: '',
      sprint_goal: '',
      capacity: 13,
      is_template: true,
      created_at: timestamp,
      updated_at: timestamp,
    },
    columns: [
      {
        id: 'column-inbox',
        board_id: 'board-1',
        client_key: 'inbox',
        title: 'Inbox',
        description: '',
        accent: '#ffffff',
        position: 0,
        wip_limit: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: 'column-now',
        board_id: 'board-1',
        client_key: 'now',
        title: 'Now',
        description: '',
        accent: '#ffffff',
        position: 1,
        wip_limit: 3,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    cards: [
      {
        id: 'card-a',
        board_id: 'board-1',
        column_id: 'column-inbox',
        client_key: 'a',
        title: 'A',
        description: '',
        priority: 'medium' as const,
        estimate: 1,
        position: 0,
        labels: [],
        owner_name: null,
        goal: null,
        due_date: null,
        created_by: null,
        updated_by: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
      {
        id: 'card-b',
        board_id: 'board-1',
        column_id: 'column-inbox',
        client_key: 'b',
        title: 'B',
        description: '',
        priority: 'medium' as const,
        estimate: 2,
        position: 1,
        labels: [],
        owner_name: null,
        goal: null,
        due_date: null,
        created_by: null,
        updated_by: null,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    stickyNotes: [],
    dependencies: [],
    source: 'offline-demo' as const,
  }
}

test('card creation rejects invalid database-domain values', () => {
  const snapshot = createSnapshot()
  assert.throws(
    () => createLocalCard(snapshot, { title: 'Invalid column', columnId: 'missing' }),
    /Column “missing” was not found/,
  )
  assert.throws(
    () => createLocalCard(snapshot, { title: 'Zero estimate', estimate: 0 }),
    /between 1 and 100/,
  )
})

test('card creation preserves a valid estimate and normalized copy', () => {
  const card = createLocalCard(createSnapshot(), {
    title: '  Useful outcome  ',
    estimate: 8,
    labels: [' research ', ''],
  })
  assert.equal(card.title, 'Useful outcome')
  assert.equal(card.estimate, 8)
  assert.deepEqual(card.labels, ['research'])
})

test('card updates require a real valid change', () => {
  const snapshot = createSnapshot()
  assert.throws(() => updateCardInSnapshot(snapshot, 'a', {}), /at least one card field/)
  assert.throws(
    () => updateCardInSnapshot(snapshot, 'a', { title: '  ' }),
    /card title.*required/i,
  )
})

test('card movement detects no-ops and normalizes both columns', () => {
  const snapshot = createSnapshot()
  const unchanged = moveCardInSnapshot(snapshot, 'a', 'inbox', 0)
  assert.equal(unchanged.changed, false)
  assert.equal(unchanged.next, snapshot)

  const moved = moveCardInSnapshot(snapshot, 'a', 'now', 0)
  assert.equal(moved.changed, true)
  assert.equal(moved.card.column_id, 'column-now')
  assert.equal(moved.card.position, 0)
  assert.equal(moved.next.cards.find((card) => card.id === 'card-b')?.position, 0)
})

test('dependency cycle detection follows the complete directed path', () => {
  const dependencies = [
    { source_card_id: 'a', target_card_id: 'b' },
    { source_card_id: 'b', target_card_id: 'c' },
  ] as Parameters<typeof wouldCreateDependencyCycle>[0]
  assert.equal(wouldCreateDependencyCycle(dependencies, 'c', 'a'), true)
  assert.equal(wouldCreateDependencyCycle(dependencies, 'c', 'd'), false)
})

test('sticky notes enforce content and canvas bounds before persistence', () => {
  const snapshot = createSnapshot()
  assert.throws(
    () => createLocalStickyNote(snapshot, { content: 'Out of bounds', x: 100_001 }),
    /between -100000 and 100000/,
  )
  assert.throws(() => createLocalStickyNote(snapshot, { content: '  ' }), /content is required/)
})
