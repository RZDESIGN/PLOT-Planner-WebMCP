# Sidekick copy-density audit — September 1, 2026

## Goal

Reduce visible copy without weakening the two pieces of information users need most: what deserves attention and whether an agent action changes the board immediately.

## Flow health

| Step | Before | After | Evidence |
| --- | --- | --- | --- |
| 1. Scan the board analysis | The header, score card, CTA, three long signals, prompt block, and footer competed for attention. | One compact score, one primary action, two signals, one prompt shortcut, and a status-only footer fit without scrolling. | `current/01-sidekick.png`, `improved/01-sidekick.png` |
| 2. Review a proposed plan | The proposal repeated its summary and rationale inside both the panel and visible ghost cards. | The panel shows only the plan title, three moves, and the two decision buttons; full rationale remains available in accessible labels and on the board preview. | `improved/02-proposal.png` |
| 3. Check activity on mobile | The full-height sheet magnified sparse or repeated entries. | The sheet sizes to its content, consecutive duplicate events collapse, and descriptions are capped at two lines. | `improved/03-mobile-sidekick.png`, `improved/04-mobile-activity.png` |

## Accessibility and evidence limits

- The primary action, tabs, proposal controls, and close button remain semantic controls with accessible names.
- Removed proposal rationale remains part of each action's accessible label.
- Screenshots validate hierarchy and visible density, not complete WCAG conformance.

## Result

The panel is now intentionally sparse: one score, one next action, two reasons, and one optional agent prompt. No board capability was removed.
