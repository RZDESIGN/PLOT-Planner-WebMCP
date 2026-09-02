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
| Responsive behavior | Mobile opens on the active `Now` column at a readable 86%, adds compact goal/capacity context plus direct Inbox/Now/Next/Later navigation, keeps share and sticky actions visible, and presents Sidekick as a content-sized sheet. | Pass |
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
- P2: Mobile overflow obscured the information architecture. Replaced the unreadable literal full-board fit with an 86% active-column view, progressive zoom/pan, direct column navigation, and a dedicated Sidekick sheet.
- P1: Collaboration status was previously implied rather than proven. Added private Presence, durable owner/editor/viewer membership, one-use invitations, a clear live-view badge, and database-enforced read-only behavior.
- P1: Unshaped insights had nowhere to live without pretending they were backlog commitments. Added first-class sticky notes around the borderless board and reversible drag conversion with lossless planning metadata.
- P2: The opaque white board card duplicated the canvas plane and weakened the reference's continuous spatial model. Removed its fill, border, radius, shadow, and nested white column backgrounds; the grid now flows through the planning surface. Post-fix evidence: `output/design-audit/11-focused-board-comparison.png`.
- P1: Canvas movement changed abruptly between wheel, button, fit, and drag inputs. Added a shared requestAnimationFrame spring integrator, pointer-anchored target zoom, and velocity-projected inertial pan.
- P1: Card movement did not yet preserve the physical continuity visible in the supplied motion references. Added velocity tilt/stretch, lift, animated layout reflow, drop overshoot, sequential agent View Transitions, and shorter proposal staging.
- P2: Card descriptions and labels popped at the semantic-zoom breakpoint. Replaced display toggles with height, opacity, and translate transitions while keeping reduced-motion behavior immediate.
- P3: Desktop Sidekick overlays the far-right canvas while open. It now sizes to its content rather than occupying the full viewport height, and remains temporary and reversible with the close control.
- P1: A visible proposal could not be dismissed because the generic write guard also blocked proposal resolution. Dismissal now has a role-specific guard and `Keep current board` was verified end to end.
- P1: Mobile opened on an under-scaled, context-free part of the infinite canvas. It now starts on `Now`, exposes direct column focus controls, and keeps sprint goal and capacity visible above the canvas.
- P2: Sidekick's planning action was below the fold and duplicated in Quick actions. The single primary action now sits directly below the focus score with explicit review-before-change copy.
- P2: Guest mode and the mobile share action were too easy to miss. The primary guest action now says `Sign in`, and Share remains available on mobile so the route to collaboration stays discoverable.
- P2: Magic-link guidance appeared too late. The authentication dialog now says up front that the email link must be opened in the same browser.
- P2: Sidekick repeated the same planning promise across its header, focus card, CTA, three long signals, demo prompt, duplicate preview action, and footer. It now presents one compact score, one primary action, two title-only signals, and a status-only footer; consecutive duplicate activity events are collapsed.
- P1: The root named `Inter` without loading it, sticky notes named an unavailable `DM Sans`, and the mono token was undefined. Replaced the fallback-dependent stack with self-hosted Geist Sans and Geist Mono variable fonts, including the upstream OFL license.
- P2: Dense one-pixel type steps, heavy 650–760 weights, and irregular padding made the interface feel smaller and less deliberate at 100%. Consolidated the scale, normalized the 4/8/12/16 rhythm and shared radii, and reduced weight and tracking throughout the top bar, board, cards, Sidekick, and dialogs.
- P2: Compact board zoom repeated sprint and column descriptions while the user needed a fast planning scan. Those descriptions now collapse visually at compact semantic zoom and remain present in the DOM and at detailed zoom.

## September 1, 2026 audit evidence

- Full before/after evidence: `output/ux-audit/`
- Desktop core flow: board → Sidekick analysis → proposal preview → keep current board
- Mobile core flow: sprint context → direct column focus → Sidekick planning CTA
- Entry flows: authentication, sprint switcher, share entry, and add-card dialog
- Automated checks: `npm run check`, clean browser console, and `git diff --check`
- Evidence limit: owner/editor/viewer collaboration states were covered in the earlier isolated-session QA above; this pass concentrated on anonymous first-use and responsive usability.
- Typography and scale pass: `output/ux-audit/typography-scale/README.md`
- Second simplicity pass: `output/ux-audit/second-simplicity-pass/README.md`

## September 2, 2026 design system pass

The interface was already well composed, so this pass rebuilt the layer beneath
it rather than the layout: one generated palette, one type scale, one elevation
scale, and one motion scale, with every surface re-pointed at those tokens.

### Colour

- `src/App.css` held about 200 distinct literal colours with no relationship
  between them. It now holds none: every value resolves through a token.
- The palette is generated on a single OKLCH ladder. Each step fixes one
  lightness across all families, and chroma is weighted by hue so warm and cool
  tints read as equally colourful instead of yellow and lime shouting over rose
  and violet.
- Measured before: card fills ranged from L 0.885 to L 0.946 and C 0.054 to
  C 0.101. After: all four sit at L 0.900 with hue-weighted chroma. The loud
  columns came down to meet the quiet ones.
- Columns publish one contract (`--column-surface`, `--column-edge`,
  `--column-accent`, `--column-ink`). Cards, swatches, mobile navigation dots
  and drop states all read from it, so recolouring a column is a one-line edit.
- The column colours were previously defined three times: in the stylesheet, in
  a hard-coded map inside `BoardCanvas`, and again in board data used only by
  the mobile navigation. The mobile dots did not match the desktop swatches.
  There is now one definition.
- Dependency chips used a pink or lime fill that clashed on violet and gold
  cards. They now use neutral glass and carry meaning in icon and text colour.

### Type, elevation, shape

- Nine ad-hoc font weights collapsed to four tokens; raw pixel sizes,
  line heights and letter spacing now resolve through the scale.
- Twelve radius values collapsed to a six-step scale. The deliberately uneven
  sticky-note corners were left alone.
- Thirty-five hand-written shadows collapsed to a five-step elevation scale
  plus a small set of state rings.
- Loose notes were rendered identical to cards once both used the same tokens,
  which erased the distinction the earlier QA established. Notes now sit one
  step deeper on the ladder so they read as paper rather than as another card.

### Motion

- Twenty-seven ad-hoc durations collapsed to an eight-step scale, tightened for
  responsiveness: hover settles in 150ms, panels in 280ms.
- Fifty-three transitions used the CSS default `ease`, which accelerates before
  it decelerates and reads as mushy under a pointer. They now use a standard
  decelerating curve, with separate entrance, exit and spring curves available.
- Hover states sprang in *and* out, so cards wobbled when the pointer left.
  The spring now applies only on the way in; exits use the standard curve.
- The canvas springs were re-tuned to a damping ratio near 0.95 with higher
  stiffness, so the canvas arrives faster without bouncing. Settle thresholds
  were loosened to just under one device pixel, which was the real source of
  the long tail: frames were being spent animating sub-pixel motion.
- Drag reflow dropped from 420ms to 260ms; proposal staggering from 240ms per
  card to 90ms.
- Fixed: dnd-kit writes `transition: transform linear` inline on every sortable
  wrapper, which silently overrode the wrapper's own transition. Card entrance
  and drag-dim fades were therefore snapping rather than animating. Both moved
  onto the inner card element, where they run.
- Added transitions to controls that had hover styles but no transition at all:
  canvas zoom buttons, the sticky edit affordance, the sidekick close button,
  the toast dismiss button and the mobile column navigation.

### Verification

- `npm run check` passes; browser console clean on load and interaction.
- Contrast measured on eleven text-on-surface pairs. All pass WCAG AA at their
  rendered size. The canvas hint was the one failure at 3.65:1 and was darkened.
- Desktop, mobile and dialog surfaces re-checked after the change.
- Not re-verified in this pass: multi-user collaboration states and the agent
  proposal choreography end to end, both covered by the earlier QA above.

## September 2, 2026 second design and motion pass

A review pass over the system built earlier the same day, looking for what the
token work had not reached.

### Defects found

- **Sliced text.** Every collapsible container had a `max-height` that was a
  fractional multiple of its own line height, so any overflowing line was cut
  through the middle of its glyphs. Card descriptions showed one line plus a
  25% sliver. Measured: card copy 1.25 lines, labels 1.06, board subtitle 1.27,
  column description 2.47. All are now whole-line values derived from the
  leading token, so they stay correct if the type scale moves.
- **Nothing had an exit.** Dialogs, the sprint menu and toasts were
  conditionally rendered, so React unmounted them instantly. They could animate
  in and then vanish. A `usePresence` hook now holds each surface mounted for
  the length of its exit, and `useLatched` keeps the content that the surface
  renders from so the closing frame is not blank.
- **Unhandled view-transition rejections.** `startViewTransition` returns three
  promises and only `finished` was caught. Aborting a transition, which happens
  whenever the document is hidden, produced console errors. Transitions are now
  skipped on a hidden document and while another is in flight, and every
  promise is handled.
- **Dependency chips outweighed card titles.** They stretched full width as
  white bars. They are now sized to their content, with a lighter fill, and the
  blocked variant carries a red edge marker instead of a heavier fill.
- **The fit ignored the floating chrome.** `fitCanvas` centred the board in the
  raw viewport plus an unexplained 18px nudge, so the board header sat behind
  the top bar on load. It now centres in the band between the top bar and the
  zoom controls.
- **`Add card` failed contrast** at 2.16:1. Raised to 5.9:1, which also makes
  the affordance findable.

### Refinements

- Exit motion is shorter than entrance motion and uses an accelerating curve.
- Loose notes had no hover response although cards did; they now lift on hover.
- Drop-target feedback was slower than hover feedback; both now land in 150ms.
- The drag grip strengthens on card hover, so the affordance appears when it is
  relevant instead of sitting permanently at low contrast.
- The focus ring moved to the deeper blue. It is drawn in the outline-offset
  gap, so it is read against the canvas rather than the card fill, where the
  lighter accent managed only 3.7:1 against 6.3:1 for the deeper tone.

### Verification

- `npm run check` passes, 11 tests. Browser console clean through load,
  dialog open and close, menu open and close, and propose-then-accept.
- Exit motion verified by observation: each surface stays mounted with its
  closing class, runs the expected keyframes, then unmounts. Reopening during
  an exit correctly cancels the pending unmount.
- Contrast re-measured with translucent fills composited over their real
  backgrounds. All text passes AA at its rendered size.
- Not verified: drag physics could not be exercised through synthetic pointer
  events in this environment, and the toast exit could not be observed because
  toasts only fire on Supabase error paths. Both use the same code as surfaces
  that were verified.

## September 2, 2026 third pass

### Defects found

- **Card prose was coloured as status.** Descriptions, priority labels, points
  and label chips all drew from the fully saturated column ink, so an Inbox
  description rendered crimson and a Later one mustard. Running text now uses a
  mostly neutral tone with a trace of the column hue; colour stays in the fill,
  the priority dot, the blocked marker and the avatars.
- **Toasts never expired.** `showToast` set state with no timer, so a banner
  stayed until someone clicked it away. Confirmations now clear after six
  seconds and errors after nine, verified by measurement.
- **Auth failures showed developer text to end users.** A failed magic link
  printed Supabase's raw diagnostic, ending with advice about `@supabase/ssr`,
  Next.js and SvelteKit. The three common failures are now translated into
  plain guidance. The verifier case reads: open the link in the same browser
  you requested it from.
- **The canvas grid turned to mush when zoomed out.** A fixed 72px period meant
  14px squares at the 20% zoom floor. The period now doubles or halves so a
  square always covers roughly 40 to 110 screen pixels. Measured at 20% zoom:
  14.4px before, 57.6px after.
- **Scrollbars were unstyled.** Panels and menus scroll inside light rounded
  chrome, where a default platform scrollbar lands as a heavy slab. Now a thin
  rounded thumb on a transparent track.
- **The sticky footer failed contrast** at 4.41:1, now above the threshold.

### Refinements

- The Sidekick panel now leaves faster than it arrives, on an accelerating
  curve, instead of retreating at entrance speed.
- The loading scrim fades in rather than appearing abruptly.
- Card interior spacing moved onto the step scale: the title and description
  read as one unit at 6px, later groups sit on the 8px step.

### Verification

- `npm run check` passes, 11 tests.
- Console clean on a fresh tab with no hot-reload history. Errors seen during
  the session were hot-reload hook-order artifacts from editing, not defects.
- Contrast measured on 20 text-on-surface pairs with translucent fills and the
  `color(srgb ...)` syntax composited correctly. No failures; minimum 5.14:1.
- Drag and drop verified end to end: a card moved between columns, adopted the
  destination tint, and both column counts and point totals updated.
- Toast lifecycle verified end to end by triggering a real auth failure with an
  invalid callback code, which also confirmed the callback URL is cleaned.
- Not verified: the magic-link round trip, which needs a real email delivered
  and opened.

## September 2, 2026 fourth pass

This pass reviewed the states that only exist under a condition, which is where
the previous sweeps had blind spots: an empty column, a breached WIP limit, the
colour picker mid-selection, the activity timeline.

### Defects found

- **Faint text everywhere it was not being looked at.** `grey-500` measures
  3.4:1 on the canvas and `grey-400` about 2.2:1, so every text use of either
  failed. Twenty-two text uses moved to `grey-600`; the four icon-only controls
  stayed, since a non-text control needs 3:1 and each darkens on hover.
- **The empty column caption failed at 2.16:1** and its dashed edge sat at
  1.26:1, which is close to invisible for a drop target. The caption is now
  readable and the target carries a wash of the column it belongs to.
- **A breached WIP limit failed at 3.96:1.** It is read as text, so it now uses
  the deeper rose and a heavier weight.
- **The colour picker highlighted every choice in amber.** Selecting violet
  drew a gold ring. The ring now reads the swatch it wraps.
- **The activity timeline's rule dangled** past the final entry. The last entry
  now draws no rule, so the line terminates on the last dot.
- **The new-card dialog had no mark** while the other four dialogs all opened
  with one, and its stacked fields ran together with no gap between a field and
  the next label.

### A regression guard

Contrast had been found by hand three passes running, so `tests/palette.test.ts`
now enforces the palette's own rules in the test suite:

- every family exposes the same eight steps, so no surface can inherit a step
  that does not exist
- a given step holds the same lightness across families, within a tolerance, so
  no column can drift heavier than the others
- heading and body tones clear AA on every card surface, not only on the canvas
- the focus ring clears 3:1 against everything it is drawn over
- the neutral ramp stays monotonic

It caught a real problem on its first run: `grey-600` cleared 4.5:1 on the
canvas but only reached 4.38:1 on the rose surface. The ramp value moved from
L 0.500 to L 0.480, which is visually near-identical and clears 4.73:1 at worst.

### Verification

- `npm run check` passes, 16 tests.
- Contrast now measured by walking every rendered text node rather than a
  hand-written list, across six states: board, sprint menu, both Sidekick tabs,
  and the new-card, sticky and auth dialogs. No failures, minimum 4.94:1. The
  automated walk is what surfaced the last two failures a hand list had missed.
- Drag and drop exercised across three moves, including a card re-tinting to
  its destination column, a WIP limit being breached, and a column emptied.

### A note on verifying in a hidden pane

Several apparent defects during these passes were artifacts of the preview pane
being hidden: `document.visibilityState` is `hidden`, which pauses
`requestAnimationFrame`, clamps timers to about a second, and can freeze a CSS
animation mid-flight. Screenshots caught transitions part-way and looked like
missing descriptions or a see-through menu. Confirm anything suspicious against
a settled frame before treating it as real.

## September 2, 2026 fifth pass

This pass looked at keyboard and assistive-technology behaviour, and at what
happens when content or the viewport is hostile.

### Verified as already correct

- Dialogs really do trap focus. `inert` is applied to the top bar, the canvas
  and the Sidekick while a dialog is open, so nothing behind it is tabbable.
  An initial measurement suggested otherwise; the query was at fault, not the
  app. Worth recording so the same false alarm is not chased again.
- A keyboard drag sensor is configured, so cards can be moved without a mouse.

### Defects found

- **Closing a dialog dropped focus on `document.body`.** A keyboard visitor had
  to tab in from the top of the page to get back to where they were. All five
  dialogs now return focus to whatever opened them, via the close button or
  Escape. The opener has to be captured in a lazy initialiser during the first
  render: an effect runs after `autoFocus` has already moved focus inside, so
  the dialog would otherwise remember its own input.
- **The Sidekick returned focus on an animation frame,** which never arrives
  while the document is hidden, stranding focus in a closed panel. It now uses
  a task instead.
- **Error toasts announced politely.** The one message a reader must not miss
  waited for a pause in speech. Errors now use `role="alert"`.
- **Loose notes skipped a heading level,** rendering an `h3` directly under the
  `h1`. A note is a peer of a column, not of a card, so it is now an `h2`. The
  outline reads h1, h2, h3 throughout with no skips.
- **Drag announcements were dnd-kit's generic defaults.** They now name the card
  and the column: "Signup flow is over Now", "Dropped Signup flow into Later",
  and describe dropping outside the board as making a loose note. Custom
  keyboard instructions are attached to every draggable.
- **A long unbroken word broke the layout.** A pasted URL or a compound word in
  a card title overflowed the card by 237px and spilled across the column.
  Titles, descriptions and headings now wrap anywhere; label chips truncate.
- **At the 320px floor the Sidekick trigger was entirely off-screen**, putting
  the product's main feature out of reach at its own declared minimum width.
  Below 380px the wordmark hides and the sprint name is capped, which returns
  the space to the three actions.

### Two more regression guards

`tests/motion.test.ts` now enforces the motion system the way the palette test
enforces colour:

- the duration scale ascends, press feedback stays under 80ms and hover under
  200ms
- an exit timer in a component equals the CSS duration it waits on. Nothing
  previously connected `DIALOG_EXIT_MS` to `--dur-2`, so retiming the scale
  would have cut exits off or left surfaces lingering
- reduced motion neutralises delay as well as duration, and covers view
  transitions
- no stylesheet hard-codes a duration, an easing curve, or a colour

### Verification

- `npm run check` passes, 21 tests.
- Focus return confirmed for three dialogs, via both the close button and
  Escape. Drag announcements confirmed by observing the live region during a
  keyboard drag.
- Contrast re-swept across board, Sidekick and dialog states: no failures,
  minimum 4.94:1.
- Layout checked at 320, 375 and 1280 wide. No horizontal page scroll at any of
  them; all top-bar actions reachable at 320.
- Console clean on a fresh tab.
- Not verified: reduced motion could not be emulated in this environment. The
  CSS reset and the canvas hook's media-query check were reviewed by reading,
  and the reset is now covered by a test.

## September 2, 2026 sixth pass: agent hand, card editing, drop latency

### The agent's hand

Every card rendered its own cursor, which faded in on the spot and faded out.
A three-step plan therefore read as three cursors blinking in three places
rather than as one agent working through a list.

There is now a single pointer for the whole board. It travels to whatever the
agent is working on, presses on arrival, and carries a caption naming the
action. Travel time is computed per move from the distance covered, between
180ms and 680ms, so a hop between neighbours is quick and a trip across the
board takes long enough to follow. While the agent is idle the pointer is
hidden, so moving to a distant target between separate actions jumps rather
than flies, which is correct: nothing is on screen to fly.

Notes were invisible to the pointer because their agent paths set no target at
all. `AgentMotion` now carries a note target alongside the card target, and the
four note-editing paths set it.

### Cards could not be edited by hand

`plot.update_card` existed for the agent, and `updateCard` existed in the hook,
but there was no human affordance anywhere: the board was effectively read-only
for the people using it. Cards now carry the same pencil a note already had,
revealed on hover and on keyboard focus, and always visible where there is no
hover. It opens a dialog for title, description, priority, estimate, owner and
labels. Verified end to end, by hand and through the agent's tool.

### Notes and cards obeyed different physics

A dragged card leaned, stretched and lifted with the hand carrying it. A note
slid rigidly. Both now read their pose from `src/lib/dragPhysics.ts`, a single
model covering lean, lift, stretch and scale, unit-tested in
`tests/dragPhysics.test.ts`.

Two problems surfaced while wiring it. The first sampling attempt listed the
velocity in its own effect's dependencies, so each update re-ran the effect,
reset the sample window, and flattened every reading to zero. The pose is now
written straight to the node instead of held in state: it changes every frame
of a drag, and re-rendering a note that often merely to move it is wasted work.

### Dropped items landed late

A drop committed through `transitionToSnapshot`, which starts a view
transition. So releasing a card played a 520ms cross-fade on top of the drag
library's own reflow, and a note snapped back to its old position before
drifting to the new one.

The rule now is: a change the person made by dragging commits immediately; a
change they did not perform themselves animates. Card moves, note moves and
both conversions take the immediate path when the actor is a person, and keep
the transition when the actor is the agent, who needs to show what moved.
Measured: a note drop settles in 43ms.

### Verification

- `npm run check` passes, 27 tests.
- Agent editing exercised through the WebMCP test bridge: 17 tools registered,
  `plot.update_card` applied a title, priority, estimate and labels, and the
  pointer travelled to the card with the caption naming the change.
- Hand editing exercised through the dialog with the same result.
- Console clean on a fresh tab.
- Not verified here: drag tilt could not be observed, because a hidden preview
  document clamps timers to about a second and the sampling window rejects
  anything older than 220ms. The formula is covered by unit tests instead. The
  drop delay likewise cannot reproduce in this environment, since view
  transitions are skipped on a hidden document, which is why it needed reading
  the code rather than watching it.

## Final result

passed
