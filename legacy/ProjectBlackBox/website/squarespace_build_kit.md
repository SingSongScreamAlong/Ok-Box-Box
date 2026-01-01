# Squarespace 7.1 Build Kit

Step-by-step guide to implement okboxbox.com on Squarespace.

---

## Prerequisites

1. Squarespace 7.1 account with Business plan (for custom CSS)
2. Google Fonts: Inter
3. Custom font file: Eurostile (or substitute Orbitron from Google Fonts)

---

## Initial Setup

### 1. Site Settings
- **Site Title:** okboxbox
- **Tag Line:** AI Systems for the Modern Racer.
- **Template:** Bedford or Brine (dark theme compatible)

### 2. Design Settings
- **Site Styles > Colors:** Set background to #000000, text to #FFFFFF
- **Site Styles > Fonts:** Heading = Eurostile/Orbitron, Body = Inter

### 3. Custom CSS
Paste contents of `theme_tokens.css` into **Design > Custom CSS**

---

## Page Creation

### Navigation Structure
```
Home (/)
Products
  ├── PitBox (/products/pitbox)
  └── ControlBox (/products/controlbox)
Roadmap (/roadmap)
Pricing (/pricing)
About (/about)
Join (/join) [Button style in nav]
```

---

## Home Page Build

### Section 1: Hero
- **Block Type:** Blank Section
- **Background:** Color #000000
- **Add:** Text Block (headline + subheadline)
- **Add:** Button Block (2 buttons)
- **Padding:** Top/Bottom 200px

### Section 2: Products
- **Block Type:** Summary Block (Grid)
- **Columns:** 3
- **Cards:** Link to collection or use manual blocks
- **Background:** #1A1A1A

### Section 3: Why
- **Block Type:** Text Block (centered)
- **Max Width:** 720px
- **Background:** #000000

### Section 4: CTA Banner
- **Block Type:** Blank Section
- **Background:** #E10600
- **Add:** Text Block + Button Block

---

## Product Pages Build

### PitBox Page
- Use accent color #E10600 throughout
- Sections: Hero → Features (4 cards) → Steps (3) → Technology → Video → CTA

### ControlBox Page
- Use accent color #00A2FF throughout
- Sections: Hero → Features (6 cards) → Steps (3) → For Leagues → CTA

---

## Roadmap Page Build

### Timeline Section
- **Block Type:** Text Block with styled list
- **Custom Class:** `.timeline` (add via Code Block wrapper)
- Use alternating left/right layout on desktop

---

## Pricing Page Build

### Pricing Tables
- **Block Type:** Summary Block (Carousel or Grid)
- 3 cards per product
- Featured card: Add custom class for border highlight

---

## About Page Build

- Standard text sections
- Image + Text block for founder section

---

## Join Page Build

### Form
- **Block Type:** Form Block
- **Fields:** Name, Email, Select (Product), Select (Experience), Radio (iRacing)
- **Post-Submit:** Redirect to thank-you section or show inline message

---

## Header Configuration

- **Style:** Fixed
- **Logo:** Text-based "okboxbox"
- **Nav:** Products (dropdown), Roadmap, Pricing, About
- **CTA:** Join button (primary style)

---

## Footer Configuration

- **Layout:** 3 columns
- **Column 1:** Logo + Tagline
- **Column 2:** Legal links
- **Column 3:** Social icons
- **Bottom:** Copyright

---

## Custom CSS Injection Points

### Global Overrides
```css
/* Add to Design > Custom CSS */
body { background: var(--color-primary-black); }
.header { background: rgba(0,0,0,0.9); }
```

### Page-Specific (via Code Injection)
Add to page settings > Advanced > Page Header Code Injection:
```html
<style>
  /* PitBox page accent */
  .page-section .btn-primary { background: #E10600; }
</style>
```

---

## Image Requirements

| Asset | Dimensions | Format |
|-------|------------|--------|
| Hero background | 1920x1080 | JPG/WebP |
| Product icons | 96x96 | SVG/PNG |
| Feature icons | 48x48 | SVG |
| Founder photo | 800x800 | JPG |
| OG Image | 1200x630 | JPG |

---

## Testing Checklist

- [ ] Mobile responsive (all pages)
- [ ] Navigation works on mobile
- [ ] Form submits correctly
- [ ] Custom fonts loading
- [ ] Colors match brand spec
- [ ] CTAs link to correct pages
- [ ] Meta descriptions set for SEO
