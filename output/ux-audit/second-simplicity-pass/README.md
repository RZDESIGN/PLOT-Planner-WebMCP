# PLOT second simplicity pass

Date: September 1, 2026  
Scope: anonymous desktop board, Sidekick plan and proposal states, mobile board navigation, and sign-in entry.

## Outcome

The remaining inspector-like chrome has been reduced. Sidekick now sizes to its content, mobile prioritizes one readable column, and duplicate status and canvas controls have been removed without taking away the underlying actions.

## Audited steps

1. **Desktop board — healthy**
   - Removed the redundant Demo badge; the actual guest action now says `Sign in`.
   - Compact zoom hides the aggregate card/note line because each column already exposes its count.
   - Removed the second fit-to-screen control; the percentage readout remains the single fit action.
   - Evidence: `current/01-desktop-board.png` → `improved/01-desktop-board.png`

2. **Desktop Sidekick — healthy**
   - The panel now grows with its content instead of occupying nearly the full viewport height.
   - The default planning state is 352 px tall at the captured desktop size; proposal preview grows to 444 px and remains below the available maximum.
   - Activity, proposal preview, acceptance, and dismissal remain available.
   - Evidence: `current/02-desktop-sidekick.png` → `improved/02-desktop-sidekick.png`, `improved/04-desktop-proposal.png`

3. **Mobile board — healthy**
   - Removed the second rendering of the sprint identity from the floating context card.
   - Kept goal, planned capacity, and direct column navigation.
   - Increased the working zoom from 78% to 86%, making the active column noticeably easier to read while preserving a useful peek at the next column.
   - Evidence: `current/03-mobile-board.png` → `improved/03-mobile-board.png`

4. **Mobile Sidekick — healthy**
   - The content-sized sheet remains readable at 390 × 844 and preserves useful board context behind it.
   - Evidence: `improved/05-mobile-sidekick.png`

5. **Sign-in entry — healthy**
   - The guest CTA now describes the actual action instead of promising a save before authentication.
   - The existing passwordless authentication dialog still opens from both sign-in and share entry points.

## Verification

- Browser review: desktop 1440 × 900 and mobile 390 × 844
- Mobile overflow: `window.innerWidth`, `body.clientWidth`, and `body.scrollWidth` all measured 390 px
- Browser console: no application warnings or errors
- Mobile direct navigation: `Next` moved the canvas and updated `aria-pressed`
- Proposal review: preview opened, rendered all three actions, and `Keep board` restored the live board without applying changes

## Evidence limits

- This pass used the anonymous demo state and did not repeat authenticated multi-user collaboration or invitation acceptance.
- Visual captures support layout and visible hierarchy findings; they do not establish formal accessibility conformance.
- The `Sign in` entry was opened and inspected, but no magic-link email was sent in this pass.
