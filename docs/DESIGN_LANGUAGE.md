# Design Language: F1 Garage / Pit Wall

> **Visual inspiration:** Clean F1 garage, white/gray surfaces, black panels, orange accent, small blue accent, crisp racing lines.
> **Core principle:** Surfaces are **mounted panels** (pit-wall screens), not floating cards. Borders are structural.

## 1. Palette Tokens (CSS Variables)

Use these variables. Do NOT hardcode hex values.

| Token | CSS Variable | Value Guide |
|-------|--------------|------------|
| **Background** | `--bg` | White/very light gray base surface |
| **Panel** | `--panel` | White panel surface |
| **Panel 2** | `--panel2` | Off-white inset surface |
| **Text** | `--text` | Near-black for readable UI text |
| **Muted** | `--muted` | Muted text for labels/meta |
| **Accent (Orange)** | `--accent` | Primary action/attention |
| **Accent 2 (Blue)** | `--accent2` | Active/selected/focus |
| **Danger** | `--danger` | Errors/critical |
| **Success** | `--success` | Good/healthy |
| **Warning** | `--warning` | Warnings (often same family as orange) |

**Canonical source:** `packages/dashboard/src/styles/theme.css`

## 2. Typography Rules

- **Primary:** Modern sans, high legibility (`Inter`, system-ui).
- **Data / telemetry:** Monospace (`JetBrains Mono`).
- **Headings:** Bold, spaced, minimal. Uppercase only for labels and panel headers.

## 3. Layout Patterns

### The "Pit Wall" Grid
- Panels like pit-wall screens: strong borders, subtle shadows.
- Plenty of whitespace.
- One “hero” area, then a grid of functional panels.

### Do's
- [x] Use `grid` and `flex` to fill available viewport space.
- [x] Use alternating row colors for data tables (zebra striping).
- [x] Use `--accent` (orange) for primary actions/alerts.
- [x] Use `--accent2` (blue) for selection/active states.

### Don'ts
- [ ] NO generic SaaS soft shadows or large rounded corners (Keep radii small: `2px` - `4px`).
- [ ] NO heavy gradients. Keep surfaces flat and clean.
- [ ] NO mixed card styles. Stick to the "Panel" class.
- [ ] Don’t do generic SaaS gradients everywhere.
- [ ] Don’t mix old and new themes.

## 4. Components

### Top Bar + Left Nav
- Dark structural bands are allowed for navigation.
- Navigation should be consistent across the canonical app.

### Buttons
- **Primary:** `--accent` (orange). Uppercase labels. Squared edges.
- **Secondary:** Neutral surface with strong border. No gradients.

### Panels
- **Standard:** White background, 1px border. Dark header bar optional but recommended for widgets.
- **Class:** `.panel` or `.card` (per `globals.css`).

### Tables (Timing Tower)
- High density.
- Monospace font for data columns.
- Sticky headers.

### Status Indicators
- **LED/Pill:** Small, uppercase, bold.
- **Solid** color background with white text OR **Tinted** background with strong text.

## 5. Do / Don’t Examples

- **Do**: Use CSS variables (`var(--bg)`, `var(--accent)`) for all colors.
- **Don’t**: Hardcode hex colors in new components.
- **Do**: One panel style (`.panel` / `.card`) across the app.
- **Don’t**: Mix 3 different card styles.

## 6. Logo Usage

- Core: black + orange.
- Secondary accent: blue (sparingly).
