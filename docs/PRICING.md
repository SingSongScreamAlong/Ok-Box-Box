# Ok, Box Box — Product & Pricing Model

**AUTHORITATIVE — DO NOT MODIFY WITHOUT BUSINESS APPROVAL**

---

## Account Requirement

All users must create a free Ok, Box Box account.  
No anonymous access. No anonymous relay connections.

---

## Products (What Is Sold)

| Product | Price | Internal Code |
|---------|-------|---------------|
| **BlackBox** | $14/month | `driver` |
| **TeamBox** | $26/month | `team` |
| **LeagueBox** | $48/active month | `league` |

> ⚠️ **"ControlBox" is DEPRECATED.** Use "LeagueBox" for league tier.

---

## Surfaces (UI Modes)

Surfaces are NOT products. They are permissioned interfaces within products.

| Surface | Description | Product | Tier |
|---------|-------------|---------|------|
| **Driver HUD** | In-car, real-time, single-driver | BlackBox | driver |
| **LiveSpotter** | Read-only, single-driver, shareable | BlackBox | driver |
| **Pit Wall** | Multi-car team operations | TeamBox | team |
| **Steward Console** | Live race control (optional) | LeagueBox | league |

---

## LiveSpotter vs Pit Wall (CRITICAL DISTINCTION)

### LiveSpotter (BlackBox / Driver Tier)

LiveSpotter is a **read-only, single-driver, session-scoped view** for:
- Spotters (non-interactive observation)
- Stream viewers
- Broadcast overlays (OBS browser source)

**Characteristics:**
- ✅ Single driver only
- ✅ Read-only (no controls)
- ✅ Shareable via link
- ✅ Embeddable as browser source
- ❌ NO strategy tools
- ❌ NO multi-car awareness
- ❌ NO persistence beyond session
- ❌ NOT interactive

**LiveSpotter is NOT a pit wall. It is an observation tool.**

---

### Pit Wall (TeamBox / Team Tier)

The Pit Wall is the **fully featured team operations system** for:
- Real spotters and engineers
- Strategy coordination
- Team pit sequencing

**Characteristics:**
- ✅ Multi-car awareness
- ✅ Interactive controls
- ✅ Strategy and coordination tools
- ✅ Persistent session context
- ✅ Role-based access (spotter, engineer, owner)
- ❌ NOT accessible via share links
- ❌ NOT available to driver-only accounts

**Pit Wall is where real team operations happen.**

---

## Tier Details

### Free Account — $0
- Account identity only
- Relay download + authentication
- No HUDs, dashboards, or views

### BlackBox (Driver) — $14/month
- Driver HUD
- AI race engineer (driver-scoped)
- Personal telemetry + history
- IDP / Driver DNA
- **LiveSpotter** (link generation enabled)

### TeamBox (Team) — $26/month
- Everything in BlackBox (for team members)
- **Full Pit Wall system:**
  - Multi-car timing
  - Strategy coordination
  - Pit sequencing
  - Team telemetry
  - Spotter and engineer workflows
- Team roles and permissions

### LeagueBox (League) — $48/active month
- League organization + roles
- Seasons and series
- Rulesets and scoring
- Results and standings
- Review-only access when inactive
- Steward Console (optional, permissioned)

---

## Capabilities (Internal)

```typescript
// Free: Only relay_auth is granted
relay_auth: true

// BlackBox (driver) — $14/mo
driver_hud: true
situational_awareness: true
voice_engineer: true
personal_telemetry: true
livespotter_access: true      // NEW: Read-only spotter view

// TeamBox (team) — $26/mo
pitwall_view: true            // Full Pit Wall (NOT LiveSpotter)
multi_car_monitor: true
strategy_timeline: true

// LeagueBox (league) — $48/mo
incident_review: true
penalty_assign: true          // requires racecontrol role
session_authority: true       // requires admin role
```

---

## Non-Negotiable Rules

1. **LiveSpotter ≠ Pit Wall** — Observation ≠ Coordination
2. **LiveSpotter can NEVER show multiple cars**
3. **Pit Wall can NEVER be accessed via share links**
4. **Visibility ≠ Control**
5. **"ControlBox" is deprecated** — Use "LeagueBox"

---

## Stripe Environment Variables

```bash
STRIPE_PRICE_DRIVER=price_xxx   # BlackBox - $14/mo
STRIPE_PRICE_TEAM=price_xxx     # TeamBox - $26/mo
STRIPE_PRICE_LEAGUE=price_xxx   # LeagueBox - $48/mo
```

---

*Last updated: January 2026*
