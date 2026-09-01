# PLOT — Plan together

> Local Devpost draft for The WebMCP Challenge. This file prepares the entry; it does not submit it.

## One-line Summary

PLOT is a shared planning canvas where humans and browser agents turn messy work into a visible, reviewable, dependency-aware sprint.

## Problem

Product planning is split between conversation and execution. An agent can recommend a better sprint, but a person still has to translate that advice into cards, estimates, dependencies, priorities and a sequence of changes. The team cannot easily see what the agent inspected, what it intends to change, or whether the recommendation fits capacity and the sprint goal.

That gap becomes more serious when several people share a board. Hidden agent work is difficult to trust, hard to review and easy to lose in chat history.

## Solution

PLOT gives people and browser agents one shared, visual planning state. Humans can drag cards and loose sticky notes; an agent can inspect the same structured board through WebMCP, add or reshape work, link blockers, create or switch sprints and propose a dependency-aware plan.

The key interaction is an explicit observe → suggest → act loop. A multi-card recommendation first appears as animated ghost cards. The live board remains unchanged until a human accepts it, and dismissal is non-destructive. Approved changes animate into place, persist to Supabase and appear for editors and read-only live viewers in realtime.

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

It also helped turn the verified implementation into this README and Devpost draft. Claims in this document are grounded in the repository, migrations, tests, screenshots and dated commits rather than generated feature promises.

## Key Features

- Seventeen imperative WebMCP tools with constrained JSON schemas and structured results.
- Observe, suggest and act modes with read-only annotations for observation tools.
- Animated ghost proposals that require a separate human apply action.
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

1. Open the public URL in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.
2. Use the anonymous activation sprint; no account is required for the core deterministic demo.
3. Ask the agent to call `plot.get_board` and `plot.analyze_board`.
4. Ask it to add a customer signal with `plot.create_sticky_note`, then shape it with `plot.convert_sticky_to_card`.
5. Ask: “We have three days left. Protect the sprint goal and show me a realistic plan before applying anything.”
6. Run `plot.propose_sprint`; verify that ghost cards appear while the live totals remain unchanged.
7. Dismiss once with `plot.dismiss_proposal`, propose again, then call `plot.apply_proposal`.
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

**TODO — deploy the production `dist/` build to the final HTTPS Hostinger URL, configure that exact URL in Supabase Auth, and paste it here.**

## Public Repository Link

https://github.com/RZDESIGN/PLOT-Planner-WebMCP

The repository is publicly reachable and includes an MIT `LICENSE` file at its root.

## Demo Video

**TODO — publish a narrated, public YouTube video shorter than three minutes and paste its URL here.**

Suggested outline:

- **0:00–0:15:** Start with an agent-authored change visibly appearing on the canvas.
- **0:15–0:35:** Explain the gap between planning advice in chat and durable board state.
- **0:35–1:05:** Call the read and analysis tools; show the dependency and capacity problem.
- **1:05–1:30:** Create a sticky note and convert it into a card.
- **1:30–2:05:** Show the ghost proposal, dismiss it and prove that live state did not change.
- **2:05–2:30:** Apply the proposal and show the improved 13/13 plan and focus score.
- **2:30–2:50:** Show the same update arriving for a live viewer and explain Supabase/RLS.
- **2:50–2:58:** Close on why WebMCP makes this shared workflow possible.

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
- [ ] Deploy and verify the final HTTPS URL in a clean browser profile.
- [ ] Add the final origin to the Supabase Site URL and redirect allow-list.
- [ ] Verify at least one real tool call in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.
- [ ] Publish the narrated public YouTube demo under three minutes.
- [ ] Add every teammate to Devpost and confirm acceptance.
- [ ] Replace all remaining TODO values below before final submission.

## Known Limitations

- The public Hostinger URL and final Supabase production redirect configuration are not yet recorded in this repository.
- The existing Playwright evidence exercises the real UI and page-level WebMCP tool bridge; final verification in the target WebMCP-capable browser remains required.
- Anonymous visitors can explore the deterministic template, but persistent multi-user collaboration requires magic-link authentication.
- Final YouTube narration and public video hosting are still outstanding.

## TODO Official Form Fields

| Official field | Draft value |
| --- | --- |
| Submitter Type | **TODO — choose Individual, Team of Individuals or Organization.** |
| Country of residence | **TODO — confirm for every submitter/team member.** |
| Organization name | Leave blank unless submitting for an organization. |
| App Status | **New** |
| Existing-project update explanation | Not applicable; the first commit is dated August 31, 2026. |
| Live URL | **TODO — final public HTTPS URL.** |
| Testing instructions | Use the public judge flow above; add credentials only if the final deployment requires them. |
| Public repository | https://github.com/RZDESIGN/PLOT-Planner-WebMCP |
| Agent(s) or client(s) tested | **TODO — record the final successful ChatGPT in-app browser and/or Chrome 149+ WebMCP test. Current automated evidence uses the page tool bridge.** |
| AI tools leveraged | OpenAI Codex for implementation, refactoring, testing, UX review and submission preparation; a WebMCP browser agent for the final product demonstration once verified. |
| Level of learning | **Suggested: Significant — confirm before submission.** |
| Career-relevant AI value | **Suggested: Yes — confirm before submission.** |

## Official Judging Alignment

- **WebMCP Leverage:** seventeen non-trivial tools, structured page context, read-only hints and an explicit proposal/apply boundary.
- **Execution:** a coherent React product with responsive interaction, Supabase persistence, realtime collaboration, RLS and regression evidence.
- **Potential Impact:** removes the manual translation between agent advice and the planning surface used by a product team.
- **Creativity & Ambition:** combines shapeable sticky notes, animated ghost negotiation and shared human-agent state instead of presenting another chat wrapper.
