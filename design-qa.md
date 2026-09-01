# PLOT design QA

## Capture setup

- Source of truth: `output/design-audit/03-reference-canvas-frame.png`
- Implementation: `output/playwright/canvas-final-desktop.png`
- Full comparison: `output/design-audit/10-reference-vs-implementation.png`
- Focused board comparison: `output/design-audit/11-focused-board-comparison.png`
- Motion references: `output/design-audit/12-artntek-motion-frames.png` and `output/design-audit/13-curled-cards-motion-frames.png`
- Implementation motion capture: `output/design-audit/14-plot-motion-frames.png`
- Combined motion comparison: `output/design-audit/15-motion-reference-comparison.png`
- Playwright demo recording: `output/playwright/plot-motion-demo.mp4` (1440 × 900, 25 fps, 45.96 seconds)
- Sticky conversion recording: `output/playwright/plot-sticky-conversion-demo.mp4` (25 fps, 28.96 seconds)
- Desktop viewport: 1440 × 900 at DPR 1
- Source capture: 564 × 422, scaled to 1202 × 900 in the full comparison
- Sticky-note implementation: `output/playwright/sticky-notes-desktop.png`
- Collaboration live-view desktop: `output/playwright/collaboration-live-view-desktop.png`
- Collaboration live-view mobile: `output/playwright/collaboration-live-view-mobile.png`
- App state: public demo board, 9 cards, 2 loose notes, Sidekick closed, board fitted at 77% on desktop

## Required surface review

| Surface | Evidence | Result |
| --- | --- | --- |
| Typography | Compact, high-contrast sans-serif hierarchy; labels recede before card titles and planning data. | Pass |
| Spacing and composition | One floating toolbar, a centered borderless board plane, generous canvas whitespace, and thin column rhythm. | Pass |
| Color | Neutral grid and chrome with restrained pastel work blocks matching the reference's category language. | Pass |
| Images and icons | Real PLOT favicon asset and consistent Lucide icons; no decorative raster asset was needed for the product surface. | Pass |
| Copy | Board context is concise at fit view; card descriptions and labels return at 100% semantic zoom so no information is lost. | Pass |
| Responsive behavior | Mobile opens on the active `Now` column at a readable 78%, adds persistent sprint/goal/capacity context plus direct Inbox/Now/Next/Later navigation, keeps share and sticky actions visible, and presents Sidekick as a full sheet. | Pass |
| Collaboration | Isolated owner and viewer sessions showed both Presence avatars; the viewer received a newly created card without refresh while every mutation control remained disabled. | Pass |
| Interaction | Pan, fit, anchored zoom, scaled drag-and-drop, add-card, add/edit sticky, bidirectional card conversion, proposal preview/apply, and save/auth were exercised in Playwright. | Pass |
| Loose-note language | Slight rotation, compact note chrome, restrained five-color palette, and spatial separation distinguish uncommitted thinking from structured cards without adding a second white surface. | Pass |

## Motion review

| Surface | Playwright evidence | Result |
| --- | --- | --- |
| Zoom | A 90% → 100% zoom produced intermediate 93.1%, 96.3%, 98.6%, and 99.8% frames before settling at 100% in roughly 500 ms. The board stayed anchored around the selected point. | Pass |
| Pan | A direct drag moved the canvas from `(60, 110)` to `(-108, 54)`; after pointer release it continued through `(-179, 30)` and settled near `(-208, 21)`. | Pass |
| Drag | The overlay lifted, stretched, and rotated from a neutral `1.025` scale to a velocity-driven transform during travel. The tested Inbox card landed in Later and neighboring cards reflowed. | Pass |
| Drop and reflow | dnd-kit layout motion and the drop overlay use a shared soft-expo language with a small overshoot before settling. | Pass |
| Agent proposal | Three ghost cards unfurled at 0, 240, and 480 ms; the review panel appeared before any live state changed. | Pass |
| Agent apply | Accepting the proposal produced sequential View Transition groups and a visible agent landing treatment while cards moved into their approved columns. | Pass |
| Reduced motion | With `prefers-reduced-motion: reduce`, zoom snapped immediately from 90% to 100%, remained in the idle state, and CSS animation duration resolved to 0.01 ms. | Pass |
| Sticky conversion | A new blue note was dragged into `Now` and became a one-point card; a five-point `Avatar upload` card was dragged outside and returned to `Later` with low priority, label, owner, and estimate intact. A separate `Email API` round-trip also restored its blocking edge to `Signup flow`. | Pass |
| Agent sticky actions | All five new note tools were exercised through the WebMCP test bridge; agent-authored changes use the same visible transition and activity paths. | Pass |

## Comparison history

- P1: The previous stacked header and document-like layout competed with the work. Replaced with one floating control bar and a full-viewport canvas.
- P1: The wide board clipped without navigation. Added responsive auto-fit, trackpad/wheel pan, blank-space drag, Space + drag, anchored zoom, and a fit control.
- P2: Default cards exposed too much metadata. Added semantic zoom: the fitted 90% view is compact, while 100% restores descriptions and labels.
- P2: Mobile overflow obscured the information architecture. Replaced the unreadable literal 20% full fit with a 38% planning overview, progressive zoom/pan, and a dedicated Sidekick sheet.
- P1: Collaboration status was previously implied rather than proven. Added private Presence, durable owner/editor/viewer membership, one-use invitations, a clear live-view badge, and database-enforced read-only behavior.
- P1: Unshaped insights had nowhere to live without pretending they were backlog commitments. Added first-class sticky notes around the borderless board and reversible drag conversion with lossless planning metadata.
- P2: The opaque white board card duplicated the canvas plane and weakened the reference's continuous spatial model. Removed its fill, border, radius, shadow, and nested white column backgrounds; the grid now flows through the planning surface. Post-fix evidence: `output/design-audit/11-focused-board-comparison.png`.
- P1: Canvas movement changed abruptly between wheel, button, fit, and drag inputs. Added a shared requestAnimationFrame spring integrator, pointer-anchored target zoom, and velocity-projected inertial pan.
- P1: Card movement did not yet preserve the physical continuity visible in the supplied motion references. Added velocity tilt/stretch, lift, animated layout reflow, drop overshoot, sequential agent View Transitions, and shorter proposal staging.
- P2: Card descriptions and labels popped at the semantic-zoom breakpoint. Replaced display toggles with height, opacity, and translate transitions while keeping reduced-motion behavior immediate.
- P3: Desktop Sidekick overlays the far-right canvas while open. This is intentional, temporary, and fully reversible with the close control.
- P1: A visible proposal could not be dismissed because the generic write guard also blocked proposal resolution. Dismissal now has a role-specific guard and `Keep current board` was verified end to end.
- P1: Mobile opened on an under-scaled, context-free part of the infinite canvas. It now starts on `Now`, exposes direct column focus controls, and keeps sprint goal and capacity visible above the canvas.
- P2: Sidekick's planning action was below the fold and duplicated in Quick actions. The single primary action now sits directly below the focus score with explicit review-before-change copy.
- P2: Guest mode and the mobile share action were too easy to miss. Desktop now shows a Demo badge, Save explains its sign-in requirement, and Share remains available on mobile so the route to collaboration stays discoverable.
- P2: Magic-link guidance appeared too late. The authentication dialog now says up front that the email link must be opened in the same browser.
- P2: Sidekick repeated the same planning promise across its header, focus card, CTA, three long signals, demo prompt, duplicate preview action, and footer. It now presents one compact score, one primary action, two signals, one prompt shortcut, and a status-only footer; consecutive duplicate activity events are collapsed.

## September 1, 2026 audit evidence

- Full before/after evidence: `output/ux-audit/`
- Desktop core flow: board → Sidekick analysis → proposal preview → keep current board
- Mobile core flow: sprint context → direct column focus → Sidekick planning CTA
- Entry flows: authentication, sprint switcher, share entry, and add-card dialog
- Automated checks: `npm run check`, clean browser console, and `git diff --check`
- Evidence limit: owner/editor/viewer collaboration states were covered in the earlier isolated-session QA above; this pass concentrated on anonymous first-use and responsive usability.

## Final result

passed
