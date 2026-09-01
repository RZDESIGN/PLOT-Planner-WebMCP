import { useEffect, useId, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Cloud, LockKeyhole, Mail, Plus, StickyNote as StickyNoteIcon, X } from 'lucide-react'
import type {
  BoardColumn,
  BoardStickyNote,
  CardPriority,
  CreateCardInput,
  CreateStickyNoteInput,
  StickyColor,
  UpdateStickyNoteInput,
} from '../types/domain'

function useCloseOnEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])
}

interface AuthDialogProps {
  open: boolean
  onClose: () => void
  onSendLink: (email: string) => Promise<void>
}

export function AuthDialog({ open, onClose, onSendLink }: AuthDialogProps) {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useCloseOnEscape(open, onClose)

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSendLink(email)
      setSent(true)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not send the magic link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close sign in dialog"><X size={19} /></button>
        <div className="dialog-mark"><span>P</span><Cloud size={18} /></div>
        {sent ? (
          <div className="auth-success" aria-live="polite">
            <span><Check size={24} /></span>
            <p className="dialog-eyebrow">Magic link sent</p>
            <h2 id={titleId}>Check your inbox</h2>
            <p>We sent a secure sign-in link to <strong>{email}</strong>. Open it in this browser; PLOT will restore your session after refresh and return to this board or invitation.</p>
            <button className="primary-button" type="button" onClick={onClose}>Keep exploring the demo</button>
          </div>
        ) : (
          <>
            <p className="dialog-eyebrow">Save your PLOT</p>
            <h2 id={titleId}>Turn this demo into your workspace.</h2>
            <p>Sign in without a password. Your canvas becomes a private realtime sprint you can share as edit access or live view. Open the email link in this browser.</p>
            <form onSubmit={submit}>
              <label htmlFor="auth-email">Work email</label>
              <div className="input-with-icon">
                <Mail size={17} />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button auth-submit" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Email me a magic link'} <ArrowRight size={16} />
              </button>
            </form>
            <div className="security-note"><LockKeyhole size={14} /> Passwordless auth · row-level security · private by default</div>
          </>
        )}
      </section>
    </div>
  )
}

interface NewCardDialogProps {
  open: boolean
  columns: BoardColumn[]
  initialColumnId: string | null
  onClose: () => void
  onCreate: (input: CreateCardInput) => Promise<unknown>
}

export function NewCardDialog({
  open,
  columns,
  initialColumnId,
  onClose,
  onCreate,
}: NewCardDialogProps) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [columnId, setColumnId] = useState(initialColumnId || columns[0]?.id || '')
  const [priority, setPriority] = useState<CardPriority>('medium')
  const [estimate, setEstimate] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useCloseOnEscape(open, onClose)

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onCreate({
        title,
        description,
        columnId: columnId || initialColumnId || columns[0]?.id,
        priority,
        estimate,
      })
      setTitle('')
      setDescription('')
      setPriority('medium')
      setEstimate(2)
      onClose()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The card could not be created.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog card-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close new card dialog"><X size={19} /></button>
        <p className="dialog-eyebrow">Shape the work</p>
        <h2 id={titleId}>Create a planning card</h2>
        <p>Give the team and the agent enough context to make a good planning decision later.</p>
        <form onSubmit={submit}>
          <label htmlFor="card-title">Title</label>
          <input id="card-title" autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What outcome are we creating?" />
          <label htmlFor="card-description">Description</label>
          <textarea id="card-description" rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Why it matters and what done means…" />
          <div className="form-grid">
            <label>
              Column
              <select value={columnId || initialColumnId || columns[0]?.id || ''} onChange={(event) => setColumnId(event.target.value)}>
                {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as CardPriority)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Estimate
              <select value={estimate} onChange={(event) => setEstimate(Number(event.target.value))}>
                {[1, 2, 3, 5, 8, 13].map((value) => <option key={value} value={value}>{value} pts</option>)}
              </select>
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button card-submit" type="submit" disabled={loading}>
            <Plus size={16} /> {loading ? 'Creating…' : 'Create card'}
          </button>
        </form>
      </section>
    </div>
  )
}

interface StickyNoteDialogProps {
  open: boolean
  note?: BoardStickyNote | null
  position?: { x: number; y: number } | null
  onClose: () => void
  onCreate: (input: CreateStickyNoteInput) => Promise<unknown>
  onUpdate: (noteId: string, input: UpdateStickyNoteInput) => Promise<unknown>
}

const stickyColors: Array<{ value: StickyColor; label: string }> = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink', label: 'Pink' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'violet', label: 'Violet' },
]

export function StickyNoteDialog({
  open,
  note,
  position,
  onClose,
  onCreate,
  onUpdate,
}: StickyNoteDialogProps) {
  const titleId = useId()
  const [content, setContent] = useState(note?.content || '')
  const [color, setColor] = useState<StickyColor>(note?.color || 'yellow')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useCloseOnEscape(open, onClose)

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (note) {
        await onUpdate(note.id, { content, color })
      } else {
        await onCreate({
          content,
          color,
          x: position?.x,
          y: position?.y,
        })
      }
      onClose()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The sticky note could not be saved.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog sticky-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close sticky note dialog"><X size={19} /></button>
        <div className="dialog-mark sticky-dialog__mark"><StickyNoteIcon size={19} /></div>
        <p className="dialog-eyebrow">Loose canvas thinking</p>
        <h2 id={titleId}>{note ? 'Edit sticky note' : 'Write outside the sprint'}</h2>
        <p>Keep an idea loose until it is ready. Drag it into a sprint column later to turn it into a card.</p>
        <form onSubmit={submit}>
          <label htmlFor="sticky-content">Note</label>
          <textarea
            id="sticky-content"
            rows={6}
            required
            autoFocus
            maxLength={1200}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={'Give the thought a short heading…\nThen add the useful context.'}
          />
          <fieldset className="sticky-color-picker">
            <legend>Color</legend>
            {stickyColors.map((option) => (
              <label key={option.value} title={option.label}>
                <input
                  type="radio"
                  name="sticky-color"
                  value={option.value}
                  checked={color === option.value}
                  onChange={() => setColor(option.value)}
                />
                <span className={`sticky-swatch color-${option.value}`} />
                <small>{option.label}</small>
              </label>
            ))}
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button sticky-submit" type="submit" disabled={loading}>
            <StickyNoteIcon size={16} /> {loading ? 'Saving…' : note ? 'Save note' : 'Place sticky'}
          </button>
        </form>
      </section>
    </div>
  )
}
