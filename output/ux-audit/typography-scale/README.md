# PLOT typography and scale audit

Date: September 1, 2026  
Scope: anonymous demo board, Sidekick, authentication entry, mobile board navigation, and proposal preview.

## Outcome

The interface now uses one self-hosted variable UI family, a smaller and more coherent type scale, a consistent 4/8/12/16 spacing rhythm, and calmer weights. Compact board zoom hides explanatory copy that is useful at detail zoom but redundant while planning.

## Audited steps

1. **Board overview — healthy**
   - Before: the browser fell back from an unloaded `Inter`, card headings used heavy weights, and the board repeated its description in the fitted view.
   - After: Geist is loaded locally, the sprint switcher and top bar are simpler, fitted board copy is reduced, and cards align to a consistent spacing rhythm.
   - Evidence: `current/01-desktop-board.png` → `improved/01-desktop-board.png`

2. **Sidekick planning view — healthy**
   - Before: the panel repeated its identity, section label, long insight explanations, and a demo prompt shortcut.
   - After: one score, one primary action, two concise signals, and WebMCP status remain. Full signal explanations remain available to assistive technology and on hover.
   - Evidence: `current/02-desktop-sidekick.png` → `improved/02-desktop-sidekick.png`

3. **Mobile Sidekick — healthy**
   - Before: the sheet was taller than necessary and the core action competed with explanatory copy.
   - After: the sheet sizes to its content and leaves substantially more board context visible.
   - Evidence: `current/03-mobile-sidekick.png` → `improved/03-mobile-sidekick.png`

4. **Authentication entry — healthy**
   - The dialog uses the same Geist hierarchy, 24 px panel rhythm, 8 px controls, and 14 px panel radius as the rest of the app.
   - Evidence: `improved/04-auth-dialog.png`

5. **Mobile board navigation — healthy**
   - At 390 × 844, the fixed top bar and body both fit the viewport with no horizontal document overflow. The sprint context and column navigation remain readable while the spatial board remains pannable.
   - Evidence: `improved/05-mobile-board.png`

6. **Plan preview — healthy**
   - The proposal sheet preserves a clear title, three moves, one primary acceptance action, and one secondary dismissal action without reintroducing explanatory paragraphs.
   - Evidence: `improved/06-mobile-proposal.png`

## Font decision

Geist Sans replaces the unresolved `Inter` declaration and the unresolved `DM Sans` sticky-note override. Geist Mono now backs data-like UI where the mono token is used. Both variable WOFF2 files are self-hosted in `public/fonts/`, with the upstream OFL license included.

## Verification

- Browser review: desktop 1200 × 720 and mobile 390 × 844
- Responsive overflow: `window.innerWidth`, `body.clientWidth`, and `body.scrollWidth` all measured 390 px
- Browser console: no warnings or errors from the application
- Automated project checks: see the repository handoff for the final `npm run check` result

## Evidence limits

- This pass reviewed the anonymous demo experience and did not repeat authenticated owner/editor/viewer multi-session collaboration tests.
- The audit demonstrates visual and interaction health at the captured breakpoints; it is not a formal WCAG conformance audit.
- The variable font was reviewed in the current Chromium-based in-app browser. Native rendering can vary slightly by platform.
