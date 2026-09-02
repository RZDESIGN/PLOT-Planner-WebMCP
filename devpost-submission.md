# PLOT — Plan together

> Local Devpost draft for The WebMCP Challenge. This file prepares the entry; it does not submit it.

Participant: Ricardo de Zoete, Individual, Netherlands, no teammates. The prepared project description and exact form answers are in `docs/devpost/`. The public demo video is https://youtu.be/EtIJsp6dBow.

## One-line Summary

PLOT is a shared planning canvas where humans and browser agents turn messy work into a visible, reviewable, dependency-aware sprint.

## Problem

Product planning is split between conversation and execution. An agent can recommend a better sprint, but a person still has to translate that advice into cards, estimates, dependencies, priorities and a sequence of changes. The team cannot easily see what the agent inspected, what it intends to change, or whether the recommendation fits capacity and the sprint goal.

That gap becomes more serious when several people share a board. Hidden agent work is difficult to trust, hard to review and easy to lose in chat history.

## Solution

PLOT gives people and browser agents one shared, visual planning state. Humans can drag cards and loose sticky notes; an agent can inspect the same structured board through WebMCP, add or reshape work, link blockers, create or switch sprints and propose a dependency-aware plan.

The key interaction is an explicit observe → suggest → act loop. A multi-card recommendation first appears as animated ghost cards. The live board remains unchanged until a separate apply action, and dismissal is non-destructive. A person can review and apply in the UI, or ask an agent to apply through WebMCP. Applied changes animate into place, persist to Supabase for signed-in users and appear for editors and read-only live viewers in realtime.

## Why This Matters

WebMCP is a strong fit because the agent needs the context already present in the page: card order, estimates, capacity, goal fit, dependencies, sticky notes, proposal state, access role and active collaborators. A screen-scraping agent would have to reconstruct that meaning from pixels. A separate agent API would create a second product surface with different validation and behavior.

PLOT instead registers structured tools inside the frontend and routes each tool through the same typed actions used by the visible React interface. People and agents therefore share validation, authorization, animation, persistence and activity history. The result is direct agent participation without hiding the work from the team.

## How We Used AI

The product lets a WebMCP-capable browser agent operate as a planning collaborator. Seventeen tools let it observe the board, analyze scope, manipulate cards and sticky notes, manage sprint navigation and create a reviewable plan. The board analysis and proposal logic are deterministic rather than generated on a server; this keeps the demo repeatable and makes every mutation inspectable.

The agent can:

- read the complete active planning state and capacity analysis;
- capture unshaped customer signals as loose sticky notes;
- turn a sticky into structured work or return a premature card to open thinking;
- link dependencies and update planning metadata;
- create, list and switch sprints;
- show a multi-card proposal without mutating live state; and
- apply or dismiss the reviewed proposal.

## How We Used Codex

Codex was used throughout the challenge build to scaffold and refactor the React/TypeScript frontend, develop the WebMCP tool surface, model the Supabase schema and RLS policies, debug session persistence and share links, improve drag geometry and motion, simplify the Sidekick, rebalance typography and responsive layout, write regression tests and conduct Playwright-based UX reviews.

It also helped prepare the documentation, this Devpost draft and a Remotion demo with English AI narration. On September 2, 2026, Codex's in-app browser discovered all 17 native page-defined WebMCP tools at `https://plotplanner.xyz/`. Board reads, analysis, sticky creation, sticky-to-card conversion, proposal and dismissal calls succeeded on that public origin. Claims in this document are grounded in the repository, migrations, tests, screenshots and dated commits rather than generated feature promises.

## What I Learned

I built PLOT as an individual based in the Netherlands. WebMCP was new to me. I gained significant practical experience in exposing an application's state and actions to browser agents, designing structured tools, and making agent-driven changes visible and reviewable. This also gave me useful AI development experience for my work.

## Key Features

- Seventeen imperative WebMCP tools with constrained JSON schemas and structured results.
- Observe, suggest and act modes with read-only annotations for observation tools.
- Animated ghost proposals with a separate, explicit apply or dismiss action.
- A four-column sprint canvas with capacity, focus score and visible critical path.
- Freeform sticky notes around the board with bidirectional sticky ↔ card conversion.
- Lossless card round-trips that retain estimates, priority, labels, owner, goal and due date.
- Invite-based owner, editor and live-view roles with database-enforced write boundaries.
- Supabase Auth, Postgres, Realtime Presence, RLS and transactional RPC mutations.
- Atomic creation of clean sprints or complete copies of the current planning state.
- Responsive canvas navigation, semantic zoom, keyboard drag support and reduced-motion fallbacks.

## Architecture

PLOT is a static React 19 + TypeScript + Vite frontend. The WebMCP integration lives in `src/hooks/useWebMcp.ts` and calls the same board actions as the human interface. `src/lib/boardModel.ts` contains deterministic domain validation and `src/lib/planner.ts` calculates the planning analysis and proposal.

Supabase provides magic-link authentication, Postgres persistence, Realtime database updates and Presence. Row Level Security separates owner, editor and viewer capabilities. Multi-row operations such as layout commits, sticky/card conversion, sprint copies and proposal application run through short transactional Postgres functions.

No separate MCP server is required: `document.modelContext.registerTool()` registers the tools in the browser page itself.

## Testing Instructions

### Public judge flow

1. Open https://plotplanner.xyz/ in a WebMCP-capable browser. Native discovery, reads, sticky/card conversion, proposal and dismissal have been verified on this public origin in Codex's in-app browser.
2. Use the anonymous activation sprint; no account is required for the core deterministic demo.
3. Ask the agent to call `plot.get_board` and `plot.analyze_board`.
4. Ask it to add a customer signal with `plot.create_sticky_note`, then shape it with `plot.convert_sticky_to_card`.
5. Ask: “We have three days left. Protect the sprint goal and show me a realistic plan before applying anything.”
6. Run `plot.propose_sprint`; verify that ghost cards appear while the live totals remain unchanged.
7. Dismiss once with `plot.dismiss_proposal`, propose again, review the ghost changes, then explicitly ask the agent to call `plot.apply_proposal` (or click Apply in the UI).
8. Verify that `Now` becomes 13/13 points and the focus score changes from 69 to 92.

### Collaboration flow

Sign in by magic link, create a private sprint, then use Share to generate an editor or live-view invitation. Open it in another browser profile. Mutations by an owner or editor should appear without refresh; a live viewer should receive updates but be unable to mutate through the UI, WebMCP, REST or RPC paths.

### Local fallback

```bash
npm ci
cp .env.example .env.local
npm run check
npm run dev
```

Open `http://localhost:5173`. The checked-in Supabase publishable key can load the public template; no secret or service-role key is required.

## Public Demo Link

https://plotplanner.xyz/

The Hostinger deployment returned HTTP 200 over HTTPS on September 2, 2026 and loaded the anonymous activation sprint in a browser. Its served bundle includes the proposal-application fix, the canonical domain and the expected Supabase project. Native WebMCP checks also passed on the public origin. Hosted authentication URL settings still await dashboard access. See `docs/PRODUCTION_VERIFICATION.md` for the dated results and `docs/DEPLOYMENT.md` for configuration.

## Public Repository Link

https://github.com/RZDESIGN/PLOT-Planner-WebMCP

The repository is publicly reachable and includes an MIT `LICENSE` file at its root.

## Demo Video

**Public YouTube demo:** https://youtu.be/EtIJsp6dBow — published on September 2, 2026 on [@RicardoDeZoete](https://www.youtube.com/@RicardoDeZoete), with the participant's authorization. The upload includes a PLOT thumbnail, supplied English captions and AI narration disclosure. YouTube reported no copyright problems; the public player played the video and displayed English captions.

**Local source:** `output/playwright/plot-devpost-remotion.mp4` — approximately 2:16, 1920 × 1080 at 30 fps, with English AI narration and timed captions. Editable source and reproduction instructions are in `video/README.md`; the script is in `video/src/story.json`. Publication copy is recorded in `video/youtube-upload.md`.

The footage shows the real local app through its existing WebMCP tool-handler test bridge. It is labeled accordingly and does not claim to be a recording of an external browser agent or an authenticated collaboration session.

Native WebMCP was separately verified through Codex's in-app browser on September 2, 2026 at both the local and public origins. On `https://plotplanner.xyz/`, all 17 tools were discovered; reads, analysis, sticky creation, conversion, proposal and dismissal succeeded. The final native apply check awaits explicit approval of its three card moves. The film's successful apply recording uses the local tool-handler bridge, as labeled.

Current cut:

- **0:00–0:12:** Introduce PLOT: people, agents, one shared canvas.
- **0:12–0:27:** Show the blocked activation sprint.
- **0:27–0:46:** Inspect the board and visible Sidekick analysis.
- **0:46–1:03:** Create a customer-signal sticky and convert it into a card.
- **1:03–1:22:** Preview the ghost plan, then dismiss it without changing the board.
- **1:22–1:42:** Apply the plan and show 13/13 points and focus score 92.
- **1:42–2:05:** Explain the 17 page tools, shared actions, persistence architecture, and Codex's role.
- **2:05–2:16:** Close on shared action and the public repository.

## Screenshot Shot List

1. **Planning canvas:** `output/ux-audit/second-simplicity-pass/improved/01-desktop-board.png`
2. **Concise analysis:** `output/ux-audit/second-simplicity-pass/improved/02-desktop-sidekick.png`
3. **Reviewable ghost plan:** `output/ux-audit/second-simplicity-pass/improved/04-desktop-proposal.png`
4. **Realtime collaboration:** `output/playwright/collaboration-live-view-desktop.png`
5. **Responsive canvas:** `output/ux-audit/second-simplicity-pass/improved/03-mobile-board.png`

## Submission Readiness Notes

- [x] New project created during the submission period; first commit is dated August 31, 2026.
- [x] Public GitHub repository is reachable without authentication.
- [x] Root MIT license is publicly reachable.
- [x] Seventeen WebMCP registrations exist in the frontend source.
- [x] Supabase migrations, RLS policies and local setup instructions are included.
- [x] Current desktop, proposal, collaboration and mobile screenshots are committed.
- [x] Final domain supplied: https://plotplanner.xyz/ (Hostinger).
- [x] Verify the final HTTPS URL and anonymous guest board on the public Hostinger deployment.
- [ ] Add the final origin to the Supabase Site URL and redirect allow-list.
- [x] Verify real native WebMCP tool calls in Codex's in-app browser at the local origin: 17 tools discovered; board and analysis calls succeeded.
- [x] Discover all 17 tools and execute native read, analysis, sticky/card, proposal and dismissal calls on the public origin.
- [ ] Complete the native public apply test after explicit approval of the three proposed card moves.
- [x] Publish the proposal-application fix and editable video source to the public repository: commit `c5b685c87ebd7da57ce23a075d98cb1551b2c821`, pushed to `main` and confirmed on the remote.
- [x] Verify the served production bundle includes the proposal fix and correct production configuration.
- [x] Publish the narrated public YouTube demo under three minutes, with English subtitles.
- [x] Participant confirmed Individual, Netherlands, no teammates.
- [x] Participant confirmed significant learning; WebMCP was new to them.
- [x] Source scan found no high-confidence secrets. Three generic matches in `supabase/config.toml` are environment-variable references, not credential values; `.env.local` is ignored and only the publishable example is tracked.
- [ ] Approve the final, complete entry before invoking Devpost's submission action.

## Known Limitations

- Hosted Supabase Site URL, redirect allow-list and end-to-end production magic-link login still await dashboard access. The project is healthy, all 11 migrations match and all 11 application tables have RLS enabled.
- Public native discovery, reads, sticky/card conversion, proposal and dismissal passed. The final native apply call was blocked before execution by browser approval review and awaits the participant's approval of its exact card moves. The narrated film and automated apply evidence use the real UI and page-level tool-handler bridge.
- Anonymous visitors can explore the deterministic template, but persistent multi-user collaboration requires magic-link authentication.
- The apply step is separate from the proposal step, but it is callable by an authorized agent; the application does not independently prove that a human has reviewed the proposal.
- The public video's description now reflects the live HTTPS deployment and completed native checks. The film does not stage a multi-user session.

## Official Form Fields

| Official field | Draft value |
| --- | --- |
| Submitter Type | **Individual** — confirmed by the participant. |
| Country of residence | **Netherlands** — sole participant; confirmed. |
| Organization name | Leave blank. |
| App Status | **New** |
| Existing-project update explanation | Not applicable; the first commit is dated August 31, 2026. |
| Live URL | https://plotplanner.xyz/ — live over HTTPS; public native WebMCP checks passed on September 2, 2026. |
| Testing instructions | Use the public judge flow above; add credentials only if the final deployment requires them. |
| Public repository | https://github.com/RZDESIGN/PLOT-Planner-WebMCP |
| Agent(s) or client(s) tested | Codex's in-app browser on https://plotplanner.xyz/: all 17 native tools discovered; board, analysis, sticky creation/conversion, proposal and dismissal calls succeeded on September 2, 2026. Playwright separately exercises the real UI and tool-handler bridge, including apply. Native public apply awaits approval of the proposed moves. |
| AI tools leveraged | OpenAI Codex for implementation, refactoring, tests, UX review, native WebMCP verification and submission preparation. Remotion for the demo edit; Microsoft Edge en-US-AriaNeural via edge-tts for English AI narration. |
| Level of learning | **Significant** — WebMCP was new to the participant. |
| Career-relevant AI value | **Yes** |

## Official Judging Alignment

- **WebMCP Leverage:** seventeen non-trivial tools, structured page context, read-only hints and an explicit proposal/apply boundary.
- **Execution:** a coherent React product with responsive interaction, Supabase persistence, realtime collaboration, RLS and regression evidence.
- **Potential Impact:** removes the manual translation between agent advice and the planning surface used by a product team.
- **Creativity & Ambition:** combines shapeable sticky notes, animated ghost negotiation and shared human-agent state instead of presenting another chat wrapper.
