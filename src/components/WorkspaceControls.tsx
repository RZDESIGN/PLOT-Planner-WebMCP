import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Link2,
  LockKeyhole,
  Plus,
  Radio,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useModalDialog } from '../hooks/useModalDialog'
import { usePresence } from '../hooks/usePresence'
import type {
  BoardInvitationLink,
  Collaborator,
  CreateInvitationInput,
  CreateSprintInput,
  SprintSummary,
} from '../types/domain'

/** Matches the exit duration of `.sprint-menu.is-closing` in App.css. */
const MENU_EXIT_MS = 100

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function sprintDates(sprint: SprintSummary) {
  if (!sprint.startsOn && !sprint.endsOn) return 'No dates'
  const format = (value: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
  if (sprint.startsOn && sprint.endsOn) return `${format(sprint.startsOn)} – ${format(sprint.endsOn)}`
  return format(sprint.startsOn || sprint.endsOn!)
}

interface SprintSwitcherProps {
  activeId: string
  activeTitle: string
  sprints: SprintSummary[]
  signedIn: boolean
  disabled?: boolean
  onSelect: (id: string) => Promise<unknown>
  onNewSprint: () => void
}

export function SprintSwitcher({
  activeId,
  activeTitle,
  sprints,
  signedIn,
  disabled,
  onSelect,
  onNewSprint,
}: SprintSwitcherProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  const menuPresence = usePresence(open, MENU_EXIT_MS)

  return (
    <div className={`sprint-switcher${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        className="board-switcher"
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{activeTitle}</strong>
        <ChevronDown size={14} />
      </button>
      {menuPresence.mounted && (
        <div
          className={`sprint-menu${menuPresence.closing ? ' is-closing' : ''}`}
          role="menu"
          aria-label="Switch sprint"
        >
          <div className="sprint-menu__header">
            <span>Your sprints</span>
            <small>{sprints.length || 1} total</small>
          </div>
          <div className="sprint-menu__list">
            {signedIn ? sprints.map((sprint, index) => (
              <button
                key={sprint.id}
                type="button"
                role="menuitemradio"
                aria-checked={sprint.id === activeId}
                className={sprint.id === activeId ? 'is-active' : ''}
                style={{ '--menu-index': index } as React.CSSProperties}
                onClick={() => {
                  setOpen(false)
                  void onSelect(sprint.id)
                }}
              >
                <span className="sprint-menu__check">{sprint.id === activeId && <Check size={12} />}</span>
                <span className="sprint-menu__copy">
                  <strong>{sprint.title}</strong>
                  <small><CalendarDays size={10} /> {sprintDates(sprint)} · {sprint.role === 'viewer' ? 'Live view' : sprint.role}</small>
                </span>
                <i className={`sprint-status status-${sprint.status}`} />
              </button>
            )) : (
              <div className="sprint-menu__demo"><Sparkles size={14} /> Sign in to keep multiple collaborative sprints.</div>
            )}
          </div>
          <button className="sprint-menu__new" type="button" onClick={() => { setOpen(false); onNewSprint() }}>
            <Plus size={14} /> New sprint
          </button>
        </div>
      )}
    </div>
  )
}

interface NewSprintDialogProps {
  currentTitle: string
  open: boolean
  closing?: boolean
  onClose: () => void
  onCreate: (input: CreateSprintInput) => Promise<unknown>
}

export function NewSprintDialog({ currentTitle, open, closing, onClose, onCreate }: NewSprintDialogProps) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [capacity, setCapacity] = useState(15)
  const [copyMode, setCopyMode] = useState<'empty' | 'everything'>('empty')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dialogRef = useModalDialog(open, onClose)

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onCreate({ title, sprintGoal: goal, capacity, copyMode, startsOn: startsOn || null, endsOn: endsOn || null })
      onClose()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The sprint could not be created.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      className={`dialog-backdrop${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="dialog sprint-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close new sprint dialog"><X size={19} /></button>
        <div className="dialog-mark sprint-dialog__mark"><CalendarDays size={19} /></div>
        <p className="dialog-eyebrow">Start a new planning cycle</p>
        <h2 id={titleId}>Create a sprint</h2>
        <p>Keep the structure of <strong>{currentTitle}</strong>, then choose whether its work should travel with you.</p>
        <form onSubmit={submit}>
          <label htmlFor="sprint-title">Sprint name</label>
          <input id="sprint-title" autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Activation · Sprint 02" />
          <label htmlFor="sprint-goal">Sprint goal</label>
          <textarea id="sprint-goal" rows={2} maxLength={240} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What outcome should this sprint protect?" />
          <div className="form-grid sprint-details-grid">
            <label>Capacity<input type="number" min={1} max={200} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label>
            <label>Starts<input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></label>
            <label>Ends<input type="date" min={startsOn || undefined} value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label>
          </div>
          <fieldset className="copy-mode-picker">
            <legend>Bring forward</legend>
            <label className={copyMode === 'empty' ? 'is-selected' : ''}>
              <input type="radio" name="copy-mode" value="empty" checked={copyMode === 'empty'} onChange={() => setCopyMode('empty')} />
              <span><strong>Clean board</strong><small>Same columns, no cards or stickies</small></span>
            </label>
            <label className={copyMode === 'everything' ? 'is-selected' : ''}>
              <input type="radio" name="copy-mode" value="everything" checked={copyMode === 'everything'} onChange={() => setCopyMode('everything')} />
              <span><strong>Carry everything</strong><small>Cards, dependencies and loose notes</small></span>
            </label>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button sprint-submit" type="submit" disabled={loading}><Plus size={16} /> {loading ? 'Creating…' : 'Create and open sprint'}</button>
        </form>
      </section>
    </div>
  )
}

interface ShareDialogProps {
  open: boolean
  closing?: boolean
  boardTitle: string
  boardUrl: string
  collaborators: Collaborator[]
  canInvite: boolean
  onClose: () => void
  onInvite: (input: CreateInvitationInput) => Promise<BoardInvitationLink & { url: string }>
}

export function ShareDialog({ open, closing, boardTitle, boardUrl, collaborators, canInvite, onClose, onInvite }: ShareDialogProps) {
  const titleId = useId()
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [boardCopied, setBoardCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dialogRef = useModalDialog(open, onClose)

  if (!open) return null

  async function createLink() {
    setLoading(true)
    setError('')
    try {
      const invitation = await onInvite({ role, email: email.trim() || undefined })
      setLink(invitation.url)
      setCopied(false)
      void navigator.clipboard.writeText(invitation.url).then(() => setCopied(true)).catch(() => setCopied(false))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The invitation link could not be created.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={dialogRef}
      className={`dialog-backdrop${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="dialog share-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close sharing dialog"><X size={19} /></button>
        <div className="dialog-mark share-dialog__mark"><Users size={19} /></div>
        <p className="dialog-eyebrow">Realtime collaboration</p>
        <h2 id={titleId}>Share “{boardTitle}”</h2>
        <p>Editors collaborate with people and AI. Live viewers see every move instantly, without write access.</p>

        <div className="share-permalink">
          <label htmlFor="board-permalink">Board permalink</label>
          <div>
            <input id="board-permalink" value={boardUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
            <button
              type="button"
              aria-label="Copy board permalink"
              onClick={() => void navigator.clipboard.writeText(boardUrl).then(() => setBoardCopied(true)).catch(() => setBoardCopied(false))}
            >
              <Copy size={15} />
            </button>
          </div>
          <span aria-live="polite"><Radio size={13} /><strong>{boardCopied ? 'Board link copied' : 'Stable link for existing members'}</strong></span>
        </div>

        {canInvite ? (
          <div className="share-builder">
            <div className="share-role-picker" role="radiogroup" aria-label="Invitation role">
              <button type="button" className={role === 'editor' ? 'is-selected' : ''} role="radio" aria-checked={role === 'editor'} onClick={() => { setRole('editor'); setLink(''); setCopied(false) }}><Sparkles size={15} /><span><strong>Can edit</strong><small>Human + AI planning</small></span></button>
              <button type="button" className={role === 'viewer' ? 'is-selected' : ''} role="radio" aria-checked={role === 'viewer'} onClick={() => { setRole('viewer'); setLink(''); setCopied(false) }}><Eye size={15} /><span><strong>Live view</strong><small>Realtime, read-only</small></span></button>
            </div>
            <label htmlFor="invite-email">Restrict to email <small>optional</small></label>
            <input id="invite-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLink(''); setCopied(false) }} placeholder="teammate@company.com" />
            {link ? (
              <div className="share-link-result">
                <label htmlFor="invitation-link">Unique invitation link</label>
                <div>
                  <input id="invitation-link" value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
                  <button type="button" aria-label="Copy invitation link" onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false))}>
                    <Copy size={15} />
                  </button>
                </div>
                <span aria-live="polite"><Link2 size={14} /><strong>{copied ? 'Link copied' : 'Ready to share'}</strong></span>
              </div>
            ) : (
              <button className="primary-button share-create" type="button" disabled={loading} onClick={() => void createLink()}><Link2 size={15} /> {loading ? 'Creating secure link…' : `Create ${role === 'viewer' ? 'live view' : 'edit'} link`}</button>
            )}
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="security-note"><LockKeyhole size={14} /> One use · expires in 7 days · login required</div>
          </div>
        ) : (
          <div className="share-readonly-note"><Eye size={17} /><span><strong>You’re here in live view.</strong><small>Only the sprint owner can invite more collaborators.</small></span></div>
        )}

        <div className="collaborator-list">
          <header><span>People with access</span><small>{collaborators.length}</small></header>
          {collaborators.map((collaborator, index) => (
            <div key={collaborator.userId} style={{ '--member-index': index } as React.CSSProperties}>
              <span className="collaborator-avatar">{initials(collaborator.displayName)}</span>
              <span><strong>{collaborator.displayName}</strong><small>Joined {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(collaborator.joinedAt))}</small></span>
              <b className={`role-badge role-${collaborator.role}`}>{collaborator.role === 'viewer' ? 'Live view' : collaborator.role}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
