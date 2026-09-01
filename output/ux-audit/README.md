# PLOT product UX audit — September 1, 2026

## Scope

The audit covered the anonymous first-use flow on desktop and mobile, board navigation, Sidekick analysis and proposal review, sign-in entry, sprint switching, sharing entry, and card creation. Screenshots were captured before implementation under `current/` and after implementation under `improved/`.

## Flow health

| Step | Before | After | Evidence |
| --- | --- | --- | --- |
| 1. Enter the public board | Visually coherent, but guest/demo state was implicit. | A visible Demo badge and a clearer Save tooltip explain the current state. | `current/01-desktop-board.png`, `improved/04-desktop-board.png` |
| 2. Understand the sprint on mobile | The initial canvas focus omitted sprint context and made the board appear partly empty. | A fixed summary exposes sprint title, goal, capacity, and direct column navigation; the canvas starts on Now at a readable scale. | `current/05-mobile-board.png`, `improved/01-mobile-board.png`, `improved/02-mobile-next-column.png` |
| 3. Ask Sidekick for a plan | The main planning action was below the fold and duplicated. | One prominent preview action sits directly below the focus score and explains that every change remains reviewable. | `current/02-desktop-sidekick.png`, `improved/03-mobile-sidekick.png`, `improved/05-desktop-sidekick.png` |
| 4. Review or reject a proposal | Proposal staging was clear, but Dismiss failed because the generic write guard blocked proposal resolution. | `Keep current board` successfully clears the proposal while preserving the board. | `current/03-desktop-proposal.png` plus browser interaction verification |
| 5. Sign in to save and share | The dialog was clear, but same-browser magic-link guidance appeared only after submission. | The requirement is now stated before the email is sent. | `current/04-auth-dialog.png`, `improved/06-auth-dialog.png` |
| 6. Add work | The form hierarchy, labels, and cancellation path were already healthy. | Retained without unnecessary redesign. | `improved/07-new-card-dialog.png` |

## Accessibility and evidence limits

- Mobile header actions are at least 36px and canvas actions at least 40px; the four column buttons have full-width targets.
- Interactive controls retain semantic buttons, visible labels or accessible names, focus states, and reduced-motion support.
- Screenshots can validate hierarchy, readability, and visible states, but cannot prove full WCAG conformance.
- Authenticated owner/editor/viewer collaboration had already been verified in isolated sessions; this pass focused on anonymous first-use and responsive usability.

## Result

The highest-impact usability failures found in this pass were resolved. The remaining product risk is deployment-level verification of the authenticated share-link flow in a fresh browser, which depends on the live Supabase and hosting redirect configuration rather than the local anonymous audit state.
