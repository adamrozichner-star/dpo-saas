# Deepo brand foundation (drop-in for the app repo)

The official Deepo brand system, packaged for the v3 UI rebuild. Drop this folder into the app repo (suggested: `src/brand/` or `design/`) so Claude Code can port from it.

## What's here

- `colors_and_type.css` - the token source of truth: every color, the type scale, spacing, radii, shadows, motion. This is what the app styles from.
- `styles.css` - global entry (imports `colors_and_type.css`).
- `deepo-icons.js` - the Duotone inline-SVG icon set. Ids: `dp-shield`, `dp-radar`, `dp-doc`, `dp-bell`, `dp-lock`, `dp-seal`, `dp-bolt`, `dp-database`, `dp-link`, `dp-sparkle`, `dp-check`, `dp-x`, `dp-health`, `dp-education`, `dp-finance`.
- `logos/` - `logofull.png` (on light), `logoreverse.png` (on dark), `logomark.png` (shield icon, favicon/app icon), plus `logoondark.png` and `logo.png`.
- `components/` - the seven primitives as reference (`.jsx` + `.d.ts`): Button, Input, Switch, Checkbox, Radio, Badge, Card.
- `reference/` - the product UI kit (`chrome.jsx` app shell, `login.jsx`, `dashboard.jsx`, `screens.jsx`, `screens.css`, `app.css`) for shell and later screens.

## How to use it (important)

- **Do not import the design-system bundle** (`DeepoDesignSystem_<hash>`). The `.jsx` files reference that bundle and a compiler. In the app, reimplement each component as a real app component (TSX) driven by the CSS tokens, matching the reference behavior.
- **Tokens only.** Style from `colors_and_type.css` variables. Never hardcode hex (except inside ember-glow multi-stop gradients).
- **Fonts:** Rubik (display/brand), Assistant (body), Heebo (labels). All Hebrew-native.
- **Icons:** Duotone via `deepo-icons.js`. The shield is the only shield. No padlock clip-art.
- **RTL:** Hebrew is `dir="rtl"`, logo top-right, numbers and Latin terms stay LTR.

## Brand rules (non-negotiable)

- Name is Deepo (capital D only). Never DeePO / DEEPO / deepo.
- No em-dashes anywhere. Use a hyphen, colon, parentheses, or two sentences. En-dash only for numeric ranges.
- No emoji in product copy. Sentence case. Calm, warm, first-person, plain language.
- The brand gradient is precious: logo, hero accents, one CTA per surface. Never a full-bleed wash.
- Palette is warm crimson to orange. Crimson `#D10331` primary, Onyx `#1B1308` dark (with ember glow from a corner), Sand `#FBF4EE` light. Status colors are confident, not pastel.
