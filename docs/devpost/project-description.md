## Inspiration

An agent can recommend a better sprint, but somebody still has to translate that advice into cards, estimates, dependencies and priorities. The recommendation lives in one place; the team's work lives somewhere else.

I wanted people and agents to work on the same visible planning canvas. I built PLOT as an individual, with OpenAI Codex helping me implement and refine the product.

## What it does

PLOT turns a messy backlog into a dependency-aware sprint that people can inspect and shape together. A four-column canvas combines task cards, loose sticky notes, capacity, a focus score and the critical path toward a sprint goal.

A browser agent can use 17 WebMCP tools to read the board, analyze scope, capture an idea, convert a sticky into a task, link blockers and propose a plan. The proposal appears as animated ghost cards. A separate apply or dismiss step keeps the recommendation visible before it changes the live board. People can apply in the interface or explicitly ask the agent to apply through WebMCP.

Anonymous visitors can try a deterministic activation sprint without creating an account. In the demo, the proposed plan moves a blocking Email API into Now, defers unrelated analytics work and fits 13 points into a 13-point sprint. The focus score improves from 69 to 92.

Signed-in workspaces add persistent sprints, invitations, realtime updates and owner, editor and live-view roles.

## Why WebMCP

The planning context already exists in the page: cards, order, estimates, goal fit, dependencies, sticky notes and the current proposal. WebMCP gives the browser agent structured access to that state and the application's own actions.

Human controls and page-defined tools call the same typed React actions. That keeps domain validation, animation and persistence together. The agent can take part in the product's actual workflow, and the team can see the result on its shared canvas.

## How I built it

PLOT uses React 19, TypeScript and Vite. The frontend registers imperative tools with `document.modelContext.registerTool()`. Read operations expose structured board and analysis results; mutation tools support cards, sticky notes, dependencies, sprint navigation and proposals.

The planner is deterministic. A browser agent supplies the conversational reasoning and uses the tools; PLOT itself does not call a server-side language model to generate its plan.

Supabase provides magic-link authentication, Postgres storage, Realtime updates and Presence. Row Level Security enforces access roles. Multi-row operations use transactional Postgres functions for operations such as applying a proposal, converting cards and notes, or copying a sprint.

Codex supported implementation, refactoring, database and access-policy work, debugging, UX iteration, tests, browser review and submission preparation. I also used Codex to build an editable Remotion demo with English AI narration.

## Challenges

The central challenge was making agent operations feel like visible teamwork. I separated proposals from application, reused the same actions for tools and the UI, and kept validation close to the underlying board model.

Other challenges included preserving planning metadata when converting between sticky notes and cards, keeping drag and zoom interactions understandable, and maintaining consistent access boundaries across the UI, tools and database.

Recording the demo also exposed a proposal guard that rejected the apply operation itself. The fix allows an owner or editor to resolve the current proposal while continuing to block ordinary mutations during review and all viewer writes. It is included in public commit `c5b685c`.

## Accomplishments

- A complete planning interaction: observe, shape an idea, preview a plan, dismiss it, then apply it.
- Seventeen page-defined WebMCP tools with JSON schemas and structured results.
- Native WebMCP discovery and successful board, analysis, sticky creation/conversion, proposal and dismissal calls in Codex's in-app browser on https://plotplanner.xyz/ on September 2, 2026.
- Automated UI and tool-handler checks showing that dismissal preserves the board and application reaches 13/13 points and a focus score of 92.
- Twenty-seven passing tests, plus successful lint, TypeScript and production-build checks after the proposal fix.
- An MIT-licensed public repository and a narrated, editable Remotion demo under three minutes.

## What I learned

WebMCP was new to me. I gained significant experience designing structured tools around an existing interface, exposing useful application context to browser agents, and keeping agent-driven changes inspectable. Building with Codex also gave me practical AI development experience that I can use in my work.

## What's next

The public Hostinger deployment is live and native WebMCP checks have passed on its HTTPS origin. Remaining release checks cover production authentication redirects and the final explicitly approved native apply operation. Further improvements would focus on richer planning context and feedback from real product teams.

## Try it and test it

App: https://plotplanner.xyz/

Code, MIT license and local setup: https://github.com/RZDESIGN/PLOT-Planner-WebMCP

Public narrated demo: https://youtu.be/EtIJsp6dBow

1. Open the app in a WebMCP-capable browser and use the anonymous activation sprint.
2. Ask the agent to call `plot.get_board` and `plot.analyze_board`.
3. Ask it to create a customer-signal sticky with `plot.create_sticky_note`, then shape it with `plot.convert_sticky_to_card`.
4. Ask for a realistic plan that protects the sprint goal. Call `plot.propose_sprint` and inspect the ghost changes.
5. Dismiss once with `plot.dismiss_proposal` and confirm the live board is unchanged.
6. Propose again, review the changes and explicitly request `plot.apply_proposal`, or click Apply in the UI.
7. Confirm 13/13 points and a focus score of 92.

For collaboration, sign in by magic link, create a sprint, and invite an editor or live viewer in another browser profile. Anonymous planning needs no credentials; persistent collaboration requires a real email address.

## Verification scope

Native discovery, reads, sticky creation/conversion, proposal and dismissal were verified on https://plotplanner.xyz/ in Codex's in-app browser. The proposed and dismissed plans left the structured live board unchanged. The final native apply check awaits explicit approval of the proposed card moves. Mutation recordings use the real local UI and its tool-handler test bridge, as labeled in the film; that recorded apply flow reaches 13/13 points and focus 92. The film does not stage a multi-user session.

The public app loads over HTTPS and its served bundle contains the proposal fix. Hosted Supabase Auth redirect settings and the end-to-end production magic-link flow still await dashboard access. The remote database is healthy, all 11 migrations match the repository and all 11 application tables have RLS enabled.

The proposal/apply boundary is explicit, but an authorized agent can call apply; the app does not independently verify that a person reviewed the proposal.
