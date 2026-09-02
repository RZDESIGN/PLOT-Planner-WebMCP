import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  Lightbulb,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import type {
  ActivityItem,
  BoardAnalysis,
  BoardSnapshot,
  PlanningProposal,
} from '../types/domain'

interface SidekickPanelProps {
  analysis: BoardAnalysis
  snapshot: BoardSnapshot
  proposal: PlanningProposal | null
  activities: ActivityItem[]
  webMcpStatus: 'registering' | 'active' | 'unsupported' | 'error'
  toolCount: number
  open: boolean
  readOnly?: boolean
  onClose: () => void
  onPropose: () => Promise<unknown>
  onApply: () => Promise<unknown>
  onDismiss: () => Promise<unknown>
}

export function SidekickPanel({
  analysis,
  snapshot,
  proposal,
  activities,
  webMcpStatus,
  toolCount,
  open,
  readOnly = false,
  onClose,
  onPropose,
  onApply,
  onDismiss,
}: SidekickPanelProps) {
  const [tab, setTab] = useState<'plan' | 'activity'>('plan')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  async function run(action: () => Promise<unknown>) {
    setWorking(true)
    setError('')
    try {
      await action()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The action could not be completed.')
    } finally {
      setWorking(false)
    }
  }

  const webMcpCopy = {
    active: `${toolCount} tools`,
    registering: 'Connecting',
    unsupported: `${toolCount} ready`,
    error: 'Unavailable',
  }[webMcpStatus]
  const visibleActivities = activities.filter(
    (item, index) => index === 0
      || item.title !== activities[index - 1]?.title
      || item.detail !== activities[index - 1]?.detail,
  )

  return (
    <aside
      id="plot-sidekick"
      className={`sidekick-panel${open ? ' is-open' : ''}`}
      aria-label="PLOT Sidekick"
      aria-hidden={!open}
      inert={!open}
    >
      <header className="sidekick-header">
        <div className="sidekick-identity">
          <span className="sidekick-avatar"><Bot size={18} /></span>
          <strong>Sidekick</strong>
        </div>
        <button ref={closeButtonRef} className="icon-button sidekick-close" type="button" onClick={onClose} aria-label="Close sidekick">
          <X size={18} />
        </button>
      </header>

      <div className="sidekick-tabs" role="tablist" aria-label="Sidekick views">
        <button id="sidekick-plan-tab" className={tab === 'plan' ? 'is-active' : ''} onClick={() => setTab('plan')} role="tab" type="button" aria-selected={tab === 'plan'} aria-controls="sidekick-plan-panel" tabIndex={tab === 'plan' ? 0 : -1}>
          <Sparkles size={15} /> Plan
        </button>
        <button id="sidekick-activity-tab" className={tab === 'activity' ? 'is-active' : ''} onClick={() => setTab('activity')} role="tab" type="button" aria-selected={tab === 'activity'} aria-controls="sidekick-activity-panel" tabIndex={tab === 'activity' ? 0 : -1}>
          <Activity size={15} /> Activity <span>{visibleActivities.length}</span>
        </button>
      </div>

      {tab === 'plan' ? (
        <div id="sidekick-plan-panel" className="sidekick-body" role="tabpanel" aria-labelledby="sidekick-plan-tab">
          {proposal ? (
            <section className="proposal-review" aria-live="polite">
              <div className="proposal-kicker"><Sparkles size={14} /> Plan preview</div>
              <h2>{proposal.title}</h2>
              <div className="proposal-actions">
                {proposal.actions.map((action) => {
                  const from = snapshot.columns.find((column) => column.id === action.fromColumnId)
                  const to = snapshot.columns.find((column) => column.id === action.toColumnId)
                  return (
                    <article key={action.id} aria-label={`${action.cardTitle}: ${from?.title} to ${to?.title}. ${action.rationale}`}>
                      <span className="action-icon"><ArrowRight size={14} /></span>
                      <div>
                        <strong>{action.cardTitle}</strong>
                        <span>{from?.title} <ArrowRight size={11} /> {to?.title}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="proposal-controls">
                <button className="primary-button" type="button" disabled={working || readOnly} onClick={() => void run(onApply)}>
                  <Check size={16} /> {working ? 'Applying…' : 'Accept plan'}
                </button>
                <button className="secondary-button" type="button" disabled={working || readOnly} onClick={() => void run(onDismiss)}>
                  Keep board
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="focus-score-card">
                <div className="focus-score__header">
                  <span>Focus</span>
                  <strong>{analysis.focusScore}<small>/100</small></strong>
                  <b>{analysis.plannedPoints}/{analysis.capacity} pts</b>
                </div>
                <div
                  className="focus-meter"
                  data-band={analysis.focusScore >= 80 ? 'strong' : analysis.focusScore >= 50 ? 'fair' : 'low'}
                >
                  <span style={{ width: `${analysis.focusScore}%` }} />
                </div>
              </section>

              <button
                className="sidekick-plan-cta"
                type="button"
                disabled={working || readOnly}
                onClick={() => void run(onPropose)}
              >
                <Sparkles size={15} />
                <span>
                  <strong>{readOnly ? 'Live view only' : working ? 'Building preview…' : 'Preview plan'}</strong>
                </span>
                <ArrowRight size={15} />
              </button>

              <section className="sidekick-section" aria-label="Top signals">
                <div className="insight-list">
                  {analysis.insights.slice(0, 2).map((insight) => (
                    <article
                      className={`insight-card tone-${insight.tone}`}
                      key={insight.id}
                      aria-label={`${insight.title}. ${insight.detail}`}
                      title={insight.detail}
                    >
                      <span className="insight-icon">
                        {insight.tone === 'critical' ? <Zap size={15} /> : insight.tone === 'positive' ? <Check size={15} /> : <Lightbulb size={15} />}
                      </span>
                      <div>
                        <strong>{insight.title}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

            </>
          )}
        </div>
      ) : (
        <div id="sidekick-activity-panel" className="sidekick-body activity-view" role="tabpanel" aria-labelledby="sidekick-activity-tab">
          <div className="activity-timeline">
            {visibleActivities.map((item) => (
              <article key={item.id}>
                <span className={`timeline-dot actor-${item.actor.toLowerCase()}`} />
                <div>
                  <span>{item.actor} · {item.timestamp}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {error && <p className="sidekick-error" role="alert">{error}</p>}

      <footer className="sidekick-footer">
        <div className={`webmcp-status status-${webMcpStatus}`}>
          <span><i /> WebMCP</span>
          <strong>{webMcpCopy}</strong>
        </div>
        {webMcpStatus === 'unsupported' && <p>Requires a WebMCP browser.</p>}
        {webMcpStatus === 'error' && <p>Reload to reconnect.</p>}
      </footer>
    </aside>
  )
}
