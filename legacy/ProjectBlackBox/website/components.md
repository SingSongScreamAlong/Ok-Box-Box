# okboxbox Component Definitions

Reusable component patterns for the okboxbox website.

---

## Hero Sections

### Hero Fullscreen
Full-viewport hero with centered content and gradient background.

```
Structure:
├── Background (gradient or image)
├── Container (centered, max-width: 720px)
│   ├── Headline (H1, Eurostile, 64px)
│   ├── Subheadline (Body, 20px, gray)
│   └── Button Group (1-2 buttons)
```

**Squarespace:** Blank section + Code Block + Custom CSS

### Hero Product
Product-specific hero with accent color border accent.

```
Structure:
├── Eyebrow (uppercase, 14px, accent color)
├── Headline (H1)
├── Subheadline (Body)
└── Button Group
```

---

## Cards

### Product Card
```
Structure:
├── Icon/Logo (48px, accent color)
├── Title (H3, bold)
├── Subtitle (14px, gray)
├── Description (Body)
└── Hover: border changes to accent color
```

**Dimensions:** 360px min-width, equal height in grid

### Feature Card
```
Structure:
├── Icon (24px line icon)
├── Title (H4)
└── Description (Body, 2-3 lines max)
```

---

## Content Blocks

### Text Block (Centered)
```
Structure:
├── Eyebrow (optional, uppercase)
├── Headline (H2)
└── Body Text (max-width: 720px)
```

### Text + Image Block
```
Layout Options: image-left | image-right
├── Text Column (50%)
│   ├── Eyebrow
│   ├── Headline
│   ├── Body
│   └── Feature List (optional)
└── Image Column (50%)
```

### Steps Block
```
Structure:
├── Section Heading
└── Steps (horizontal on desktop, vertical on mobile)
    ├── Step 1: Number, Title, Description
    ├── Step 2: Number, Title, Description
    └── Step 3: Number, Title, Description
```

---

## Navigation

### Header
```
Structure:
├── Logo (left)
├── Nav Links (center or right)
│   └── Dropdown for Products
└── CTA Button (right)
```

**Behavior:** Fixed on scroll, dark background

### Footer
```
Structure:
├── Logo + Tagline (left)
├── Link Columns (center)
│   ├── Legal Links
│   └── Social Links
└── Copyright (bottom)
```

---

## CTA Components

### CTA Banner
Full-width banner with accent background.

```
Structure:
├── Background (accent color)
├── Headline (white)
├── Subheadline (optional)
└── Button (white outline or solid)
```

### CTA Simple
Minimal centered CTA.

```
Structure:
└── Button (centered)
```

---

## Form Components

### Signup Form
```
Fields:
├── Name (text, required)
├── Email (email, required)
├── Product Interest (select)
├── Experience Level (select)
├── iRacing User (radio Y/N)
└── Submit Button
```

**Success State:** Replace form with confirmation message

---

## Timeline

### Roadmap Timeline
```
Structure:
├── Phase Item
│   ├── Phase Name (H4)
│   ├── Status Badge (active/upcoming/complete)
│   ├── Time Period
│   └── Bullet List of items
└── Repeat for each phase
```

**Active Phase:** Accent color highlight

---

## Pricing

### Pricing Table
```
Structure:
├── Product Heading
├── Tier Cards (horizontal grid)
│   ├── Tier Name
│   ├── Price + Period
│   ├── Feature List
│   └── CTA Button
└── Note text below
```

**Featured Tier:** Border highlight, "recommended" badge

---

## Squarespace Block Mapping

| Component | Squarespace Block |
|-----------|-------------------|
| Hero | Blank Section + Summary Block |
| Product Card | Gallery Block (Grid) |
| Feature Card | Summary Block (Carousel) |
| Text Block | Text Block |
| Steps | Summary Block (List) |
| CTA Banner | Blank Section + Text + Button |
| Form | Form Block |
| Timeline | Text Block + Custom CSS |
| Pricing | Summary Block + Custom CSS |
