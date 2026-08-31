import { useCallback, useRef, useState } from 'react'
import {
  Bot,
  Cloud,
  CloudOff,
  Eye,
  Lock,
  Share2,
  Sparkles,
} from 'lucide-react'
import './App.css'
import { BoardCanvas } from './components/BoardCanvas'
import { AuthDialog, NewCardDialog, StickyNoteDialog } from './components/Dialogs'
import { SidekickPanel } from './components/SidekickPanel'
import { Toast } from './components/Toast'
import { NewSprintDialog, ShareDialog, SprintSwitcher } from './components/WorkspaceControls'
import { useBoard } from './hooks/useBoard'
import { useWebMcp } from './hooks/useWebMcp'

function userInitials(email?: string) {
  if (!email) return 'RD'
  return email.slice(0, 2).toUpperCase()
}

function App() {
  const board = useBoard()
  const [sidekickOpen, setSidekickOpen] = useState(false)
  const sidekickTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [newSprintOpen, setNewSprintOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null)
  const [stickyDialog, setStickyDialog] = useState<{
    noteId?: string
    position?: { x: number; y: number }
  } | null>(null)

  const toolApi = {
      snapshot: board.snapshot,
      analysis: board.analysis,
      proposal: board.proposal,
      moveCard: (card: string, column: string, position?: number) =>
        board.moveCard(card, column, position, 'agent'),
      createCard: (input: Parameters<typeof board.createCard>[0]) =>
        board.createCard({ ...input, agentGenerated: true }),
      updateCard: (card: string, input: Parameters<typeof board.updateCard>[1]) =>
        board.updateCard(card, { ...input, agentGenerated: true }),
      createStickyNote: (input: Parameters<typeof board.createStickyNote>[0]) =>
        board.createStickyNote({ ...input, agentGenerated: true }),
      updateStickyNote: (note: string, input: Parameters<typeof board.updateStickyNote>[1]) =>
        board.updateStickyNote(note, { ...input, agentGenerated: true }),
      moveStickyNote: (note: string, x: number, y: number) =>
        board.moveStickyNote(note, x, y, 'agent'),
      convertStickyToCard: (note: string, column: string, position?: number) =>
        board.convertStickyToCard(note, column, position, 'agent'),
      convertCardToSticky: (
        card: string,
        x: number,
        y: number,
        color?: Parameters<typeof board.convertCardToSticky>[3],
      ) => board.convertCardToSticky(card, x, y, color, 'agent'),
      linkDependency: board.linkDependency,
      proposeSprint: board.proposeSprint,
      applyProposal: board.applyProposal,
      dismissProposal: board.dismissProposal,
      sprints: board.sprints,
      accessRole: board.accessRole,
      selectSprint: board.selectSprint,
      createSprint: board.createNewSprint,
  }
  const webMcp = useWebMcp(toolApi)
  const isWorkspace = board.snapshot.source === 'supabase-workspace'
  const blockingOverlayOpen =
    sidekickOpen || authOpen || newSprintOpen || shareOpen || Boolean(newCardColumnId) || Boolean(stickyDialog)

  const closeSidekick = useCallback(() => {
    setSidekickOpen(false)
    window.requestAnimationFrame(() => sidekickTriggerRef.current?.focus())
  }, [])

  return (
    <div className="plot-app">
      <header className="canvas-topbar" inert={blockingOverlayOpen}>
        <a className="plot-logo" href="#top" aria-label="PLOT home">
          <img className="plot-logo__asset" src="/favicon.svg" alt="" />
          <span>PLOT</span>
        </a>
        <SprintSwitcher
          activeId={board.snapshot.board.id}
          activeTitle={board.snapshot.board.title}
          sprints={board.sprints}
          signedIn={Boolean(board.session?.user)}
          disabled={board.loading}
          onSelect={board.selectSprint}
          onNewSprint={() => board.session?.user ? setNewSprintOpen(true) : setAuthOpen(true)}
        />
        <div className="topbar-actions">
          <div
            className={`sync-state state-${board.connection}`}
            aria-label={board.connection === 'live' ? 'Live sync' : board.connection === 'connecting' ? 'Connecting' : 'Local only'}
            title={board.connection === 'live' ? 'Live sync' : board.connection === 'connecting' ? 'Connecting' : 'Local only'}
          >
            {board.connection === 'offline' ? <CloudOff size={14} /> : <Cloud size={14} />}
            <i />
          </div>
          {board.accessRole === 'viewer' && (
            <span className="live-view-badge"><Eye size={12} /> Live view</span>
          )}
          <div className="presence-stack" aria-label={`${board.presence.length} people live on this sprint`}>
            {board.presence.slice(0, 4).map((person, index) => (
              <span
                key={person.userId}
                className="presence-avatar"
                style={{ '--presence-index': index } as React.CSSProperties}
                title={`${person.displayName} · ${person.role}${person.clientCount > 1 ? ` · ${person.clientCount} tabs` : ''}`}
              >
                {userInitials(person.displayName)}
              </span>
            ))}
            {board.presence.length > 4 && <span className="presence-avatar presence-more">+{board.presence.length - 4}</span>}
            <span className="presence-avatar avatar-agent" title="PLOT Sidekick"><Bot size={12} /></span>
          </div>
          {board.session?.user ? (
            <button
              className="user-button"
              type="button"
              onClick={() => void board.signOut().catch((error) => board.reportError(error, 'Could not sign out'))}
              title="Sign out"
              aria-label={`Sign out ${board.session.user.email || ''}`.trim()}
            >
              <span>{userInitials(board.session.user.email)}</span>
              <strong>{board.session.user.email?.split('@')[0]}</strong>
            </button>
          ) : (
            <button className="save-button" type="button" aria-label="Save board" onClick={() => setAuthOpen(true)}>
              <Lock size={14} /> <span>Save</span>
            </button>
          )}
          <button
            className="share-button"
            type="button"
            aria-label="Share sprint"
            title="Share sprint"
            onClick={() => board.session?.user ? setShareOpen(true) : setAuthOpen(true)}
          >
            <Share2 size={15} />
          </button>
          <button ref={sidekickTriggerRef} className="sidekick-trigger" type="button" onClick={() => setSidekickOpen(true)} aria-label="Open PLOT Sidekick" aria-controls="plot-sidekick" aria-expanded={sidekickOpen}>
            <Sparkles size={15} />
            <span>Sidekick</span>
            <b>{board.analysis.focusScore}</b>
          </button>
        </div>
      </header>

      <main className="app-main" id="top">
        <div className="canvas-shell" data-workspace-mode={isWorkspace ? 'private' : 'demo'} inert={blockingOverlayOpen}>
          <BoardCanvas
            snapshot={board.snapshot}
            proposal={board.proposal}
            agentMotion={board.agentMotion}
            recentAgentCardIds={board.recentAgentCardIds}
            recentAgentStickyIds={board.recentAgentStickyIds}
            onMoveCard={board.moveCard}
            onMoveStickyNote={board.moveStickyNote}
            onConvertStickyToCard={board.convertStickyToCard}
            onConvertCardToSticky={board.convertCardToSticky}
            onAddCard={setNewCardColumnId}
            onAddSticky={(position) => setStickyDialog({ position })}
            onEditSticky={(noteId) => setStickyDialog({ noteId })}
            onActionError={(error) => board.reportError(error, 'Board change was not saved')}
            readOnly={!board.canEdit}
          />

          {board.loading && (
            <div className="loading-scrim" role="status">
              <img className="loading-mark" src="/favicon.svg" alt="" />
              <strong>Opening canvas…</strong>
            </div>
          )}
        </div>

        <SidekickPanel
          analysis={board.analysis}
          snapshot={board.snapshot}
          proposal={board.proposal}
          activities={board.activities}
          webMcpStatus={webMcp.status}
          toolCount={webMcp.toolCount}
          open={sidekickOpen}
          readOnly={!board.canEdit}
          onClose={closeSidekick}
          onPropose={board.proposeSprint}
          onApply={() => board.applyProposal()}
          onDismiss={() => board.dismissProposal()}
        />
      </main>

      {sidekickOpen && <button className="panel-backdrop" type="button" aria-label="Close PLOT Sidekick" onClick={closeSidekick} />}
      {authOpen && (
        <AuthDialog open onClose={() => setAuthOpen(false)} onSendLink={board.sendMagicLink} />
      )}
      {newSprintOpen && (
        <NewSprintDialog
          open
          currentTitle={board.snapshot.board.title}
          onClose={() => setNewSprintOpen(false)}
          onCreate={board.createNewSprint}
        />
      )}
      {shareOpen && (
        <ShareDialog
          open
          boardTitle={board.snapshot.board.title}
          collaborators={board.collaborators}
          canInvite={board.accessRole === 'owner'}
          onClose={() => setShareOpen(false)}
          onInvite={board.inviteCollaborator}
        />
      )}
      {newCardColumnId && (
        <NewCardDialog
          open
          columns={board.snapshot.columns}
          initialColumnId={newCardColumnId}
          onClose={() => setNewCardColumnId(null)}
          onCreate={board.createCard}
        />
      )}
      {stickyDialog && (
        <StickyNoteDialog
          open
          note={board.snapshot.stickyNotes.find((note) => note.id === stickyDialog.noteId)}
          position={stickyDialog.position}
          onClose={() => setStickyDialog(null)}
          onCreate={board.createStickyNote}
          onUpdate={board.updateStickyNote}
        />
      )}
      <Toast toast={board.toast} onDismiss={board.dismissToast} />
    </div>
  )
}

export default App
