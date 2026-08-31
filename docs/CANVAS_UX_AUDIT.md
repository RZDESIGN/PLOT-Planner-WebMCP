# PLOT canvas UX audit

## Audit scope

The public Activation sprint demo was reviewed as a single-screen planning flow: enter the board, understand the plan, navigate the workspace, move work, open Sidekick, preview an agent proposal, and accept it.

Reference evidence:

- `output/design-audit/01-current-canvas.png` — previous PLOT layout.
- `output/design-audit/03-reference-canvas-frame.png` — current capture of the supplied velocity-driven calendar reference.
- `output/playwright/canvas-final-desktop.png` — final desktop canvas.
- `output/playwright/canvas-final-mobile.png` — final mobile overview.
- `output/playwright/canvas-final-mobile-sidekick.png` — final mobile Sidekick.
- `output/design-audit/15-motion-reference-comparison.png` — the two supplied motion references and the final PLOT motion sequence in one QA image.
- `output/playwright/plot-motion-demo.mp4` — Playwright walkthrough of zoom, pan, card movement, proposal review, and sequential apply.

## User goal and accessibility target

The user should be able to understand and reshape a sprint without first navigating dashboard chrome. The entire viewport is the workspace. Pointer, touch, keyboard drag, visible zoom controls, and reduced-motion preferences remain supported.

## Strengths retained

- The four planning states, dependencies, WIP limits, estimates, owners, add-card actions, Sidekick, activity history, agent proposals, approval gate, Auth, Realtime, and WebMCP tools remain available.
- Pastel cards and velocity-driven drag motion match the supplied reference direction without copying its calendar-specific content.
- The proposal ghost state clearly separated a suggestion from committed work.

## UX risks found in the previous layout

1. **Entry and orientation — needs work.** A large title, description, sprint-goal card, view toolbar, and critical-path strip consumed the top of the screen before the planning surface began.
2. **Board manipulation — needs work.** The board behaved like a wide document; the fourth column could be clipped and there was no canvas navigation model.
3. **Card scanning — mixed.** All metadata was always visible, creating more visual noise than the compact event blocks in the reference.
4. **Sidekick review — healthy but visually dominant.** The panel worked, but opening it on top of a document-like board made the remaining workspace feel cramped.
5. **Responsive overview — needs work.** Mobile relied on horizontal overflow instead of offering a useful whole-board overview.

## Implemented opportunities

- Replaced the page header, hero, and board toolbar with one compact floating control bar.
- Made the board a centered object on an infinite, screen-filling grid.
- Added automatic fit, zoom in/out, pointer-centered wheel zoom, trackpad panning, space-drag panning, and a fit shortcut.
- Unified fit and zoom around one spring integrator, added projected pan momentum, and made rapid zoom-button presses accumulate on the active target.
- Added velocity-responsive card tilt/stretch, lifted overlays, animated neighbor reflow, soft drop overshoot, and sequential agent landings.
- Added semantic zoom: compact overview cards at lower scales and richer label detail when zoomed in.
- Made semantic-detail changes continuous and kept every motion path immediate for reduced-motion users.
- Kept Sidekick off-canvas until requested and made it a focused mobile sheet at narrow widths.
- Preserved explicit human approval before multi-card agent changes are committed.

## Accessibility risks and limits

- At mobile fit scale, card copy is intentionally an overview and must be zoomed for reading; the persistent zoom controls make that path visible.
- Keyboard drag remains provided by dnd-kit, but a full screen-reader workflow cannot be proven from screenshots alone.
- Contrast, labels, focus styles, reduced motion, and touch target sizes were inspected; formal WCAG conformance was not claimed.
