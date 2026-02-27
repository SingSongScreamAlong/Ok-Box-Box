# Driver Home Redesign — Executive Direction

**Date:** 2026-02-27  
**Status:** Design Direction (Pre-Implementation)

---

## Core Reframe

This is **NOT** an in-race HUD. It is:

- A **pre-race / post-race intelligence environment**
- A **team operations portal**
- A **performance lab**
- A **digital pit wall command center**

The page should feel like a **Monday Morning Performance Debrief**, not a live cockpit.

---

## New Identity

# "Driver Intelligence Brief"

---

## Current Problems

### 1. Mixed Purpose
The page currently mixes:
- Tactical diagnosis (Incident Management)
- Career leveling (XP / Level 6 Veteran)
- Social network (Racing Network)
- Licensing overview
- Historical metrics
- AI crew advice
- Timeline performance feed

**Too many surfaces competing for attention.**

### 2. Undefined Metrics
- **CPI** — No definition anywhere
- **Pace Stability** — No explanation
- **Level XP** — No context for what it means

**Metrics without explanation = support burden.**

### 3. Gamification Risk
The leveling system risks feeling "gamey" to serious drivers.

**Options:**
- Toggle for "Professional Mode" that hides gamification
- Make leveling purely internal, not visually dominant

### 4. Alpha Label
"Driver Tier • v0.1.0-alpha" undercuts authority.

---

## Proposed Information Hierarchy

Top to bottom flow:

| Order | Section | Purpose |
|-------|---------|---------|
| 1 | **Driver Status Snapshot** | Name, primary license, iRating (dominant), SR, CPI (secondary) |
| 2 | **Primary Risk Alert** | Incident Management diagnosis with "Why?" and "View Data" links |
| 3 | **Performance Attributes** | 3 bars max, clearly defined |
| 4 | **AI Crew Recommendations** | With specific citations ("In your last 5 oval sessions...") |
| 5 | **Rolling Trend** | Last 5 sessions summary, trend arrows |
| 6 | **Licensing Status** | With delta since last week, promotion risk |

---

## What to Move Off Home

| Section | Move To |
|---------|---------|
| Racing Network (Notifications, Messages, Invites) | Separate tab or collapsible |
| XP Leveling | `/driver/progress` |
| Social stats | `/driver/profile` |

---

## Section-by-Section Fixes

### Driver Header
- Capitalize "Oval"
- Define CPI (tooltip or inline)
- Visual hierarchy: iRating (primary) > CPI (secondary) > SR/Class (tertiary)

### Incident Management ✅ (Strongest Module)
Keep the diagnosis tone. Add:
- "Why?" dropdown
- "View Supporting Data" link
- Last-updated timestamp

### Driver Development Panel
Separate into two distinct systems:
1. **Skill Attributes** (Consistency, Incident Discipline, Pace Stability)
2. **Progression** (Level, XP) — move to Progress page

### Licenses Panel
Add:
- Delta since last week (+0.12 SR)
- Promotion risk indicator
- SR trajectory arrow

### Crew Intelligence
Make advice specific and undeniable:
```
"In your last 5 oval sessions:
– 63% of incidents occurred under braking.
– Average entry delta: +0.21s.
Recommendation: lift 3m earlier at T1."
```

### Recent Performance Feed
Currently too compressed. Answer ONE question:
> "Am I trending up or down?"

Show:
- Trend arrows
- Rolling average
- Incident per race over last 5

---

## Brand Tone

✅ Dark, serious, performance-oriented — **Keep**

❌ "v0.1.0-alpha" label — **Remove or reposition as "Early Access" if invite-only**

---

## Next Steps

1. **Decide dominant identity** — Intelligence Brief vs Career Dashboard vs Social Hub
2. **Wireframe new hierarchy** — Single-column focused flow
3. **Define all metrics** — CPI, Pace Stability, Level XP with tooltips
4. **Implement Professional Mode toggle** — Hide gamification for serious drivers

---

## Decision Required

Choose ONE primary purpose for Home:

- [ ] 🔥 **Driver Intelligence Briefing** — Diagnosis-first, AI recommendations prominent
- [ ] 🧠 **Performance Status** — Metrics-first, trends and attributes prominent  
- [ ] 🏁 **Operations Overview** — Balanced summary, links to deeper pages

**Recommendation:** Driver Intelligence Briefing
