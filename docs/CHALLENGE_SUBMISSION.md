# PLOT — WebMCP Challenge submission kit

## One-line pitch

PLOT is a shared planning canvas where humans and browser agents turn messy work into a visible, reviewable, dependency-aware plan.

## Short description

PLOT gives a browser agent a real planning surface instead of another chat box. Through seventeen WebMCP tools, the agent can inspect and switch sprints, capture loose research as sticky notes, shape notes into cards, return premature cards to open thinking, map dependencies, create a planning cycle, and propose a focused sprint. Multi-card recommendations first appear as animated ghost state; every accepted change lands visibly before Supabase persists and broadcasts it to editors and live viewers.

## Why this needs WebMCP

The useful context already exists in the page: current card positions, WIP limits, estimates, dependencies, goal fit, proposal state, and the signed-in user's workspace. WebMCP lets the agent access that structured context directly and call the same safe actions as the UI without screen scraping or a parallel integration surface.

PLOT demonstrates the part of WebMCP that matters most for collaborative software: the agent does not merely return text. It participates in a shared, inspectable state while the human retains control.

## Suggested 2–3 minute demo

### 0:00–0:25 — The problem

- Show the four-column activation sprint.
- Point out that `Signup flow` is blocked by `Email API`, which is still in `Next`.
- Show that `Activation analytics` consumes five points in `Now` without unlocking the sprint goal.

### 0:25–0:50 — Observe

- Open PLOT Sidekick.
- Show focus score 69, the dependency warning, goal-fit warning, and 10/13 committed points.
- Ask the browser agent to inspect the board using `plot.get_board` and `plot.analyze_board`.

### 0:50–1:15 — Shape loose thinking

- Ask the agent to place a customer signal with `plot.create_sticky_note`.
- Drag the note into `Inbox` and show it becoming a structured card.
- Drag the card back outside the board and show it returning to a sticky without losing metadata.

### 1:15–1:45 — Suggest

- Prompt: “We have three days left. Protect the sprint goal and show me a realistic plan before applying anything.”
- Call `plot.propose_sprint`.
- Show ghost cards, the agent cursor, page-curl motion, and the unchanged live capacity value.
- Emphasize: this is proposed state, not hidden agent work.

### 1:45–2:00 — Human control

- Dismiss once and show that the board returns unchanged.
- Propose again.

### 2:00–2:30 — Act

- Accept the plan through `plot.apply_proposal`.
- Show each card move sequentially with velocity-aware landing motion.
- Show `Now` at 13/13, the full critical path aligned in `Now`, and focus score 92.

### 2:30–2:55 — Durable shared state and live view

- Show an authenticated editor and an invited live viewer on the same sprint.
- Create one new card with `plot.create_card`; show it animate for the editor and appear without refresh for the viewer.
- Point out that the viewer's mutation controls are disabled and that Supabase RLS independently rejects writes.

## Official judging-criteria mapping

### WebMCP Leverage

- Registers seventeen schema-constrained tools through the browser's imperative `document.modelContext.registerTool()` API.
- Exposes the current board, notes, dependencies, capacity, proposal state, access role and sprint lifecycle as structured context instead of relying on screen scraping.
- Reuses the same typed React actions for people and agents, including validation, authorization, motion, persistence and activity history.
- Separates observe, suggest and act behavior; multi-card scope changes become reviewable ghost state before anything is applied.

### Execution

- Typed React/Vite application with deterministic domain logic.
- Reproducible Postgres schema, RLS, Auth, Realtime, and indexes.
- Seventeen schema-constrained WebMCP tools with structured results.
- Invite-based owner, editor and live-view roles enforced across UI, WebMCP and Postgres RLS.
- Responsive UI, reduced-motion support, and keyboard drag support.

### Potential Impact

- Removes the translation step between an agent recommendation and the planning board where a team already works.
- Makes capacity, blockers, goal fit and proposed scope changes visible to owners, editors and live viewers.
- Keeps the human in control while letting the agent contribute directly to durable shared state.
- Gives distributed product teams a concrete pattern for safe human-agent planning rather than another isolated chat transcript.

### Creativity & Ambition

- Treats WebMCP as a collaboration protocol for shared visual state, not only as browser automation.
- Uses animated ghost proposals as an explicit human-agent negotiation layer.
- Lets loose sticky notes and structured sprint cards transform into each other without losing planning metadata.
- Gives agent-authored changes a distinct, legible motion language and broadcasts approved results to the whole team.

## Submission copy

**Title:** PLOT — Plan together

**Tagline:** Turn ideas into a plan, together with your browser agent.

**Description:** PLOT is a live planning canvas where humans and browser agents work in the same visible state. WebMCP exposes the active backlog, estimates, goals, dependencies, loose notes and sprint lifecycle as structured tools. The agent can diagnose planning risks and propose a dependency-aware sprint as animated ghost state. A human reviews, dismisses or accepts; approved work moves visibly and syncs through Supabase to editors and read-only live viewers.

## Launch checklist

- [x] Publish the source under the MIT license at `https://github.com/RZDESIGN/PLOT-Planner-WebMCP`.
- [ ] Deploy the production build to a public HTTPS URL.
- [ ] Add the production URL to Supabase Auth redirect URLs.
- [ ] Verify all seventeen tools in the target WebMCP-capable browser and record at least one real agent call.
- [x] Run `npm run check` on the prepared submission commit.
- [x] Re-run the Playwright desktop and mobile smoke flows.
- [x] Record the motion demo at 1440×900 (`output/playwright/plot-motion-demo.mp4`).
- [x] Record the sticky/card round-trip (`output/playwright/plot-sticky-conversion-demo.mp4`).
- [ ] Keep browser zoom at 100% and use the public template for a deterministic start.
- [ ] Record the final public YouTube video under three minutes with spoken audio.
- [ ] Include the live URL, public repository and public video in the submission form.
- [x] Confirm the tracked repository contains no secret or `service_role` key.

## Current evidence

- Public repository: `https://github.com/RZDESIGN/PLOT-Planner-WebMCP`
- Desktop collaboration capture: `output/playwright/collaboration-live-view-desktop.png`
- Mobile live-view capture: `output/playwright/collaboration-live-view-mobile.png`
- Sprint switcher capture: `output/playwright/collaboration-sprint-menu.png`
- Current-UI board capture: `output/ux-audit/second-simplicity-pass/improved/01-desktop-board.png`
- Current-UI proposal capture: `output/ux-audit/second-simplicity-pass/improved/04-desktop-proposal.png`
- Rough silent recordings exist locally and are intentionally not committed; the final narrated video still needs to be published.
- Public demo URL: **TODO after deployment**
- Public YouTube URL with audio: **TODO**

## Submission-period evidence

PLOT is a new project for this challenge. The first repository commit was created on August 31, 2026, after the August 25 submission-period start. The public history then documents the canvas launch, drag/readability work, durable authentication and board links, collaboration UX, Sidekick simplification, typography and final control refinements.

## Useful links

- [The WebMCP Challenge on Devpost](https://webmcp.devpost.com/)
- [WebMCP explainer and specification work](https://github.com/webmachinelearning/webmcp)
- [OpenAI WebMCP apps showcase](https://developers.openai.com/showcase?view=webmcp-apps)
