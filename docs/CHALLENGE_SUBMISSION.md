# PLOT — WebMCP Challenge submission kit

## One-line pitch

PLOT is a shared planning canvas where humans and browser agents turn messy work into a visible, reviewable, dependency-aware plan.

## Short description

PLOT gives a browser agent a real planning surface instead of another chat box. Through seventeen WebMCP tools, the agent can inspect and switch sprints, capture loose research as sticky notes, shape notes into cards, return premature cards to open thinking, map dependencies, create a planning cycle, and propose a focused sprint. Multi-card recommendations first appear as animated ghost state; every accepted change lands visibly before Supabase persists and broadcasts it to editors and live viewers.

## Why this needs WebMCP

The useful context already exists in the page: current card positions, WIP limits, estimates, dependencies, goal fit, proposal state, and the signed-in user's workspace. WebMCP lets the agent access that structured context directly and call the same safe actions as the UI without screen scraping or a parallel integration surface.

PLOT demonstrates the part of WebMCP that matters most for collaborative software: the agent does not merely return text. It participates in a shared, inspectable state while the human retains control.

## Published 2:16 demo

Watch the [public YouTube demo](https://youtu.be/EtIJsp6dBow), with English AI narration, supplied English subtitles and a PLOT thumbnail. The editable composition, narration script and capture workflow are in [`video/`](../video/README.md).

| Time | What the film shows |
| --- | --- |
| 0:00–0:12 | People and browser agents sharing one canvas. |
| 0:12–0:27 | The blocked activation sprint. |
| 0:27–0:46 | Board observation and visible Sidekick analysis. |
| 0:46–1:03 | A customer-signal sticky becoming an Inbox card. |
| 1:03–1:22 | Ghost proposal, followed by non-destructive dismissal. |
| 1:22–1:42 | Applied plan, 13/13 points and focus score 92. |
| 1:42–2:05 | The 17 tools, shared actions, persistence architecture and Codex's role. |
| 2:05–2:16 | Closing and public repository. |

The film records the real local app through its existing WebMCP tool-handler test bridge, labeled in the footage. Native WebMCP discovery and calls were verified separately in Codex's in-app browser; see the [production verification record](PRODUCTION_VERIFICATION.md). The film does not stage a signed-in multi-user session.

For a separate collaboration demonstration, sign in, create a sprint and invite an editor or live viewer. This feature is documented and has prior browser evidence, but it is separate from the public film.

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

**Title:** PLOT

**Tagline:** A shared planning canvas where people and browser agents turn messy work into a visible, reviewable sprint.

**Description:** PLOT is a live planning canvas where humans and browser agents work in the same visible state. WebMCP exposes the active backlog, estimates, goals, dependencies, loose notes and sprint lifecycle as structured tools. The agent can diagnose planning risks and propose a dependency-aware sprint as animated ghost state. A human reviews, dismisses or accepts; approved work moves visibly and syncs through Supabase to editors and read-only live viewers.

## Launch checklist

- [x] Publish the source under the MIT license at `https://github.com/RZDESIGN/PLOT-Planner-WebMCP`.
- [x] Deploy the production build to https://plotplanner.xyz/; HTTPS returns 200 and the canvas loads.
- [x] Set and verify the production Supabase Site URL and redirect allow-list through the official CLI.
- [x] Discover all seventeen tools and invoke native WebMCP calls in Codex's in-app browser on the public origin.
- [x] Run `npm run check` on the prepared submission commit.
- [x] Re-run the Playwright desktop and mobile smoke flows.
- [x] Record the motion demo at 1440×900 (`output/playwright/plot-motion-demo.mp4`).
- [x] Record the sticky/card round-trip (`output/playwright/plot-sticky-conversion-demo.mp4`).
- [x] Use the anonymous public template for the deterministic live check.
- [x] Publish the final narrated YouTube video under three minutes.
- [x] Prepare the live URL, public repository and public video in the local submission packet.
- [ ] Receive final approval and send the complete entry to Devpost.
- [x] Confirm the tracked repository contains no secret or `service_role` key.

## Current evidence

- Public repository: `https://github.com/RZDESIGN/PLOT-Planner-WebMCP`
- Desktop collaboration capture: `output/playwright/collaboration-live-view-desktop.png`
- Mobile live-view capture: `output/playwright/collaboration-live-view-mobile.png`
- Sprint switcher capture: `output/playwright/collaboration-sprint-menu.png`
- Current-UI board capture: `output/ux-audit/second-simplicity-pass/improved/01-desktop-board.png`
- Current-UI proposal capture: `output/ux-audit/second-simplicity-pass/improved/04-desktop-proposal.png`
- Public demo URL: https://plotplanner.xyz/
- Public YouTube URL with audio: https://youtu.be/EtIJsp6dBow
- Editable video source: [`video/README.md`](../video/README.md)
- Current production and Supabase verification: [`PRODUCTION_VERIFICATION.md`](PRODUCTION_VERIFICATION.md)
- Final project copy and custom answers: [`devpost/`](devpost/)

## Submission-period evidence

PLOT is a new project for this challenge. The first repository commit was created on August 31, 2026, after the August 25 submission-period start. The public history then documents the canvas launch, drag/readability work, durable authentication and board links, collaboration UX, Sidekick simplification, typography and final control refinements.

## Useful links

- [The WebMCP Challenge on Devpost](https://webmcp.devpost.com/)
- [WebMCP explainer and specification work](https://github.com/webmachinelearning/webmcp)
- [OpenAI WebMCP apps showcase](https://developers.openai.com/showcase?view=webmcp-apps)
