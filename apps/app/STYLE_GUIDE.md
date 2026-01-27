# Ok, Box Box - Style Guide

## Reference: Driver Tier Crew Pages (EngineerChat, SpotterChat, AnalystChat)

---

## 1. Layout Structure

### Page Container
```tsx
<div className="h-[calc(100vh-8rem)] flex relative">
```
- Full height minus header/footer (8rem)
- Flexbox row layout
- Relative positioning for video background

### Video Background Layer
```tsx
<div className="absolute inset-0 overflow-hidden">
  <video
    autoPlay
    loop
    muted
    playsInline
    className="w-full h-full object-cover opacity-70"
  >
    <source src="/videos/[context]-bg.mp4" type="video/mp4" />
  </video>
  {/* Gradient overlays */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
</div>
```
- Video at 70% opacity
- Two gradient overlays:
  - Horizontal: darker on left (80%) fading to right (40%)
  - Vertical: transparent top fading to dark bottom (80%)

### Sidebar (Left Panel)
```tsx
<div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
```
- Width: `w-72` (288px)
- Background: `bg-[#0e0e0e]/80` (80% opacity dark)
- Backdrop blur: `backdrop-blur-xl`
- Border: `border-r border-white/[0.06]`
- Z-index: `z-10` (above video)

### Main Content Area
```tsx
<div className="relative z-10 flex-1 flex flex-col">
```
- Flex-1 to fill remaining space
- Column layout for header/content/footer

---

## 2. Color Palette

### Base Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0e0e0e` | Primary background |
| `--bg-elevated` | `#141414` | Cards, elevated surfaces |

### Opacity Scale (White)
| Class | Usage |
|-------|-------|
| `white/90` | Primary text, headings |
| `white/80` | Secondary text, values |
| `white/70` | Tertiary text |
| `white/50` | Muted text, labels |
| `white/40` | Section headers, hints |
| `white/30` | Disabled, timestamps |
| `white/[0.12]` | Strong borders |
| `white/[0.08]` | Medium borders |
| `white/[0.06]` | Subtle borders |
| `white/[0.04]` | Input backgrounds |
| `white/[0.03]` | Card backgrounds |
| `white/[0.02]` | Subtle backgrounds |

### Accent Colors
| Tier | Primary | Usage |
|------|---------|-------|
| Driver | `#f97316` (Orange) | Active states, CTAs |
| Team | `#3b82f6` (Blue) | Active states, CTAs |
| League | `#22c55e` (Green) | Active states, CTAs |

### Status Colors
| Status | Color | Class |
|--------|-------|-------|
| Success/Live | `#22c55e` | `text-green-400`, `bg-green-500/20` |
| Warning | `#eab308` | `text-yellow-400`, `bg-yellow-500/20` |
| Error/Danger | `#ef4444` | `text-red-400`, `bg-red-500/20` |
| Info | `#3b82f6` | `text-blue-400`, `bg-blue-500/20` |
| Purple (Best) | `#a855f7` | `text-purple-400`, `bg-purple-500/20` |

---

## 3. Typography

### Font Family
```css
font-family: 'Orbitron', sans-serif;  /* Headings, labels */
font-family: system-ui, sans-serif;    /* Body text */
font-family: 'Monaco', monospace;      /* Data, times, numbers */
```

### Text Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-2xl` | 1.5rem | Page titles |
| `text-xl` | 1.25rem | Section titles |
| `text-lg` | 1.125rem | Large data values |
| `text-sm` | 0.875rem | Body text, labels |
| `text-xs` | 0.75rem | Small labels, buttons |
| `text-[10px]` | 10px | Micro labels, tracking |

### Text Styling
```tsx
// Section headers
className="text-[10px] uppercase tracking-[0.15em] text-white/40"
style={{ fontFamily: 'Orbitron, sans-serif' }}

// Page titles
className="text-sm font-semibold uppercase tracking-wider text-white/90"
style={{ fontFamily: 'Orbitron, sans-serif' }}

// Body text
className="text-sm text-white/80 leading-relaxed"

// Mono data
className="text-lg font-mono text-white/80"
```

---

## 4. Component Patterns

### Cards/Panels
```tsx
// Standard card
className="bg-white/[0.03] border border-white/[0.06] rounded p-4"

// Elevated card (more prominent)
className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.10] rounded p-6 shadow-lg shadow-black/20"

// Interactive card
className="bg-white/[0.03] border border-white/[0.06] rounded p-4 hover:border-white/20 hover:bg-white/[0.05] transition-all"
```

### Buttons
```tsx
// Primary CTA (uses tier accent)
className="h-11 px-5 bg-[#f97316] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#ea580c] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 rounded transition-all duration-200"

// Secondary/Ghost
className="px-4 py-2 text-xs uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded transition-all duration-200"

// Active tab
className="px-4 py-2 text-xs uppercase tracking-wider bg-white/[0.08] text-white rounded"

// Inactive tab
className="px-4 py-2 text-xs uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded transition-all duration-200"
```

### Inputs
```tsx
className="flex-1 h-11 px-4 bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200"
```

### Status Badges
```tsx
// Active/Connected
className="text-[10px] uppercase tracking-wider px-3 py-1.5 font-semibold bg-green-500/20 text-green-400 border border-green-500/30"

// Inactive/Waiting
className="text-[10px] uppercase tracking-wider px-3 py-1.5 font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"

// Tier accent active
className="bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30"
```

### List Items (Selectable)
```tsx
// Selected
className="w-full text-left p-3 rounded border border-white/20 bg-white/[0.06] transition-all duration-200"

// Unselected
className="w-full text-left p-3 rounded border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03] bg-transparent transition-all duration-200"
```

---

## 5. Spacing

### Padding
| Context | Value |
|---------|-------|
| Page | `p-4` or `p-6` |
| Cards | `p-3` to `p-6` |
| Sidebar sections | `p-4` |
| Inputs | `px-4` |
| Buttons | `px-3 py-1.5` to `px-5 py-2` |

### Gaps
| Context | Value |
|---------|-------|
| Icon + text | `gap-2` |
| Card grid | `gap-3` or `gap-4` |
| Section spacing | `mb-4` to `mb-8` |
| List items | `space-y-2` or `space-y-3` |

---

## 6. Icons

### Library
- **Lucide React** (`lucide-react`)

### Sizes
| Context | Size |
|---------|------|
| Inline with text | `w-3 h-3` |
| Small buttons | `w-3.5 h-3.5` |
| Standard | `w-4 h-4` |
| Card icons | `w-5 h-5` |
| Feature icons | `w-6 h-6` or larger |

### Icon Colors
```tsx
// In text
className="w-3 h-3 text-white/40"

// In cards
className="w-5 h-5 text-white/70"

// Accent
className="w-4 h-4 text-[#f97316]"
```

---

## 7. Borders

### Border Colors
| Strength | Class |
|----------|-------|
| Subtle | `border-white/[0.06]` |
| Medium | `border-white/[0.08]` |
| Strong | `border-white/[0.10]` or `border-white/[0.12]` |
| Hover | `border-white/20` |
| Accent | `border-[#f97316]/30` |

### Border Radius
| Context | Class |
|---------|-------|
| Buttons, inputs | `rounded` |
| Cards | `rounded` |
| Avatars | `rounded-full` |
| Status dots | `rounded-full` |

---

## 8. Animations & Transitions

### Standard Transition
```tsx
className="transition-all duration-200"
// or
className="transition-colors"
```

### Hover States
- Borders: `hover:border-white/20`
- Backgrounds: `hover:bg-white/[0.05]`
- Text: `hover:text-white/80`

### Loading States
```tsx
<Loader2 className="w-5 h-5 animate-spin text-white/30" />
```

### Status Pulse
```tsx
<span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
```

---

## 9. Sidebar Structure

```
┌─────────────────────────┐
│ Back Link               │
│ ┌─────────────────────┐ │
│ │ Icon  Title         │ │
│ │       Subtitle      │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Navigation Tabs         │
├─────────────────────────┤
│ Section Header          │
│ ┌─────────────────────┐ │
│ │ List Item 1         │ │
│ │ List Item 2         │ │
│ │ List Item 3         │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Details Panel           │
│ (contextual info)       │
└─────────────────────────┘
```

---

## 10. Main Content Structure

```
┌─────────────────────────────────────────┐
│ Toolbar: Status │ View Tabs │ Settings  │
├─────────────────────────────────────────┤
│                                         │
│           Scrollable Content            │
│                                         │
├─────────────────────────────────────────┤
│ Quick Actions (horizontal scroll)       │
├─────────────────────────────────────────┤
│ Input Area                              │
└─────────────────────────────────────────┘
```

---

## 11. Page Types

### Cockpit/Dashboard Pages
- Full-width grid layouts
- Multiple data panels
- Real-time telemetry displays
- Status indicators prominent

### Tool/Feature Pages (Crew, Pitwall tools)
- Sidebar + Main content split
- Video background
- Contextual data panels
- Chat/interaction areas

### List/Management Pages
- Table or card grid layouts
- Filtering controls
- Action buttons
- Detail panels (slide-out or inline)

---

## 12. Responsive Considerations

### Breakpoints
- `lg:` - Desktop (1024px+)
- `md:` - Tablet (768px+)
- `sm:` - Mobile landscape (640px+)

### Common Patterns
```tsx
// Grid columns
className="grid grid-cols-2 lg:grid-cols-4 gap-3"

// Hide on mobile
className="hidden sm:block"

// Sidebar collapse (future)
// Consider collapsible sidebar for mobile
```

---

## Quick Reference: Copy-Paste Snippets

### Page Wrapper with Video
```tsx
<div className="h-[calc(100vh-8rem)] flex relative">
  <div className="absolute inset-0 overflow-hidden">
    <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70">
      <source src="/videos/[context]-bg.mp4" type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e]/80 via-[#0e0e0e]/60 to-[#0e0e0e]/40" />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/80" />
  </div>
  {/* Content with z-10 */}
</div>
```

### Standard Sidebar
```tsx
<div className="relative z-10 w-72 border-r border-white/[0.06] bg-[#0e0e0e]/80 backdrop-blur-xl flex flex-col">
```

### Section Header
```tsx
<h3 className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-3 flex items-center gap-2">
  <Icon className="w-3 h-3" />Section Title
</h3>
```

### Data Card
```tsx
<div className="bg-white/[0.02] border border-white/[0.06] rounded p-4">
  <div className="text-[10px] uppercase tracking-[0.12em] text-white/40">Label</div>
  <div className="mt-1 text-2xl font-bold text-white">Value</div>
</div>
```
