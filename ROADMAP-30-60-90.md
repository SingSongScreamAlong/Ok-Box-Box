# Ok, Box Box – 30/60/90 Day Execution Roadmap (2026)

**Document Version:** 1.0  
**Created:** January 19, 2026  
**Author:** Founder/CTO  
**Status:** Active Execution Plan  

---

# 1. EXECUTIVE INTENT

## What We Are Building Now

Ok, Box Box is a professional racing software suite for iRacing. The immediate focus is a **driver-first product** that earns trust through reliability and utility before expanding to team and league features.

**Primary deliverable for Day 90:**  
A production-ready driver experience (BlackBox) with:
- Reliable desktop relay that captures iRacing telemetry
- Driver Status Panel (minimal system health indicator)
- Functional AI race engineer via push-to-talk (primary interface)
- Session history and basic analytics

**Secondary deliverable:**  
Team pit wall dashboard (Team BlackBox) in usable beta state.

**Tertiary deliverable:**  
League incident detection and steward tools (ControlBox) in early alpha, positioned for beta testing with 1-2 partner leagues.

## What We Are Explicitly NOT Building Yet

- Mobile applications
- Multi-sim support (ACC, rFactor, etc.)
- Automated penalty issuance (AI assists stewards, does not replace them)
- Video replay system (use iRacing's native replay)
- Complex billing logic (special days acknowledged but not implemented)
- Public marketing site beyond landing page
- Discord bot with slash commands
- Twitch/YouTube integrations
- Driver marketplace or matchmaking
- **Driver-facing telemetry overlay** (see Driver HUD Intent below)

---

# 1.1 DRIVER HUD INTENT (AUTHORITATIVE)

> **This section is non-negotiable unless revisited by founder decision.**

## What the Driver HUD Is NOT

The Driver HUD is **NOT** a telemetry overlay. It is **NOT** a data visualization surface.

- No live telemetry (laps, deltas, tire data, inputs, graphs) shown to driver while driving
- Does NOT compete with Racelab, iOverlay, SimHub, or similar tools
- Driver is NOT expected to look at the HUD during on-track driving

## What the Driver HUD IS

The Driver HUD exists only to:

| Function | Purpose |
|----------|--------|
| Relay connectivity | Confirm telemetry uplink is working |
| Telemetry flow | Health check indicator (not data display) |
| Voice state | Listening / muted / processing indicator |
| AI availability | Confirm AI engineer is ready |
| Session context | Practice / Qualifying / Race indicator |
| Error states | Surface rare, high-signal problems only |

## Design Philosophy

- **Voice-first interaction** is the primary driver interface
- HUD functions as a **system status / annunciator panel**, not a dashboard
- Minimal, low-distraction, trust-building by design
- **If the driver never looks at it during a lap, it is working correctly**

## Implementation Guardrails

- Extremely lightweight (minimal DOM, no animations)
- No graphs, charts, scrolling data, or numerical telemetry
- Any telemetry data is routed to non-driver surfaces only:
  - Team pit wall (live)
  - Post-session analytics (delayed)
  - League/broadcast (external)

## Roadmap Impact

- Treat Driver HUD as a **Phase 1 trust feature**, not a feature surface
- Optimize for reliability, clarity, and confidence — not information density
- Success metric: Driver forgets the HUD exists during racing

---

# 2. PRICING & MONETIZATION MODEL

## Subscription Tiers

| Tier | Price | Billing | Target User |
|------|-------|---------|-------------|
| **BlackBox** | $14/month | Per driver | Individual competitive drivers |
| **Team BlackBox** | $26/month | Per team | Endurance teams (4-8 drivers) |
| **ControlBox** | $42/month | Per league | League administrators |

## Seasonal Framing

Subscriptions are positioned as **seasonal operational tools**, not generic SaaS:

- "Run Ok, Box Box for your racing season"
- "Monthly subscription, cancel anytime between seasons"
- Avoid language implying lifetime access or one-time purchase
- Pricing reflects ongoing value during active racing periods

Typical customer lifecycle:
1. Subscribe at season start
2. Active for 3-6 months during season
3. May pause during off-season
4. Resubscribe for next season

## Special Day Concept (Strategic Placeholder)

**Purpose:** Adoption flexibility for leagues and special events.

**Concept:**
- Leagues can optionally enable "special day" activations
- Single-event or special-race access for non-subscribed drivers
- May temporarily unlock premium features for promotional purposes
- Could be priced differently than full monthly subscriptions
- Useful for: league tryouts, invitational events, charity races

**Implementation status:** Conceptual only. No billing logic in Phase 1-3.  
**Roadmap placement:** Post-90-day, after core subscription flow is stable.

---

# 3. PHASE 1 (DAYS 0–30): FOUNDATION & TRUST

## Strategic Focus

Build the foundation that makes everything else possible. Prioritize reliability over features. A driver who trusts the relay and HUD will become an advocate.

## Concrete Goals

### Week 1-2: Infrastructure & Auth

| Goal | Acceptance Criteria |
|------|---------------------|
| Monorepo setup | TypeScript, ESLint, Prettier, working CI |
| Database schema | PostgreSQL with User, Session, Telemetry tables |
| Authentication | Register, login, JWT refresh, password reset |
| Basic API | Health check, user CRUD, session list endpoints |

**Done means:**
- `npm run dev` starts API server
- Can register, login, and see user profile
- Database migrations run cleanly

### Week 3-4: Relay & Telemetry Pipeline

| Goal | Acceptance Criteria |
|------|---------------------|
| Desktop relay MVP | Electron app, system tray, auto-start option |
| iRacing capture | Reads shared memory, extracts core telemetry |
| WebSocket streaming | Relay → Server connection, authenticated |
| Telemetry storage | Session created, snapshots stored, retrievable |

**Done means:**
- Launch iRacing → Relay auto-detects → Session appears in dashboard
- Telemetry data visible in database
- Relay reconnects gracefully after network interruption

## Systems Touched

- `packages/api` — Express/Fastify API server
- `packages/relay` — Electron desktop application
- `packages/shared` — TypeScript types, utilities
- PostgreSQL database
- Redis (optional, for session state)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| iRacing SDK complexity | Use proven node-irsdk library, test on multiple PCs |
| WebSocket reliability | Implement heartbeat, reconnection, message buffering |
| Auth security | Use established patterns (bcrypt, JWT), no custom crypto |

---

# 4. PHASE 2 (DAYS 31–60): EXPANSION & PULL-THROUGH

## Strategic Focus

Deliver the driver experience that creates word-of-mouth. Add team features to enable pull-through sales (driver → team manager).

## Concrete Goals

### Week 5-6: Driver Status Panel & Voice Interface

| Goal | Acceptance Criteria |
|------|---------------------|
| Status panel component | Minimal React component, annunciator-style |
| Relay status indicator | Green/yellow/red connection state |
| Voice state indicator | Listening/muted/processing states |
| AI availability indicator | Ready/busy/unavailable states |
| Session context display | Practice/Qual/Race badge |
| Error surfacing | High-signal errors only, dismissible |

**Done means:**
- Driver sees system health at a glance (not telemetry)
- Panel is invisible/ignorable during normal racing
- No performance impact, no memory leaks
- PTT hotkey works reliably

### Week 7-8: AI Race Engineer

| Goal | Acceptance Criteria |
|------|---------------------|
| PTT audio capture | Browser MediaRecorder, WebSocket streaming |
| Whisper integration | Audio → transcript in <1 second |
| GPT-4 context | Telemetry injected, racing-aware responses |
| ElevenLabs TTS | Response → audio playback |
| End-to-end flow | Driver speaks → AI responds in <3 seconds |

**Done means:**
- "What's my gap to the leader?" → Accurate spoken response
- Works during active racing without disruption
- Graceful degradation if AI services slow

### Week 9-10: Team Pit Wall (Beta)

| Goal | Acceptance Criteria |
|------|---------------------|
| Team creation | Create team, invite members |
| Pit wall dashboard | View driver telemetry as strategist |
| Multi-pane layout | Race state, car status, opponent intel |
| Session coordination | See when team drivers are in session |

**Done means:**
- Team manager can watch driver's race from pit wall view
- Data updates in real-time
- Basic driver roster management works

## UX Polish Items

- Loading states for all async operations
- Error messages that help users self-diagnose
- Keyboard shortcuts for HUD (PTT hotkey)
- Settings persistence (units, timezone)

## Reliability Improvements

- Relay crash recovery
- WebSocket reconnection with state sync
- API rate limiting
- Error tracking (Sentry or similar)

---

# 5. PHASE 3 (DAYS 61–90): READINESS & LEVERAGE

## Strategic Focus

Prepare for real users. Add league tools that position Ok, Box Box as steward assistance (not replacement). Harden for production.

## Concrete Goals

### Week 11-12: Incident Detection & Review

| Goal | Acceptance Criteria |
|------|---------------------|
| Incident detection | Detect contacts, off-tracks from telemetry |
| AI classification | Severity assessment, suggested action |
| Incident queue | List pending incidents for review |
| Review modal | View incident details, make decision |

**Done means:**
- Incidents auto-detected during session
- Steward can review with telemetry evidence
- Decision recorded with audit trail

**Positioning note:** AI provides evidence organization and suggested classification. Steward makes final decision. Never frame as "AI judge."

### Week 13-14: Rulebook & Penalties

| Goal | Acceptance Criteria |
|------|---------------------|
| Rulebook editor | Create rules, assign categories |
| Penalty issuance | Record penalty against driver |
| Notification | Driver notified of penalty (in-app) |
| Discord webhook | Optional penalty announcements |

**Done means:**
- League can define their rulebook
- Penalties issued with rule reference
- Basic Discord integration works

### Week 15-16: Production Readiness

| Goal | Acceptance Criteria |
|------|---------------------|
| Stripe integration | Subscription checkout, webhook handling |
| Production deployment | API, dashboard, relay distribution |
| Monitoring | Uptime checks, error alerting |
| Documentation | User guide, API docs, troubleshooting |

**Done means:**
- User can subscribe and pay
- System runs stable for 48+ hours under load
- Support can diagnose common issues

## Beta → Public Transition

### Beta Criteria (Day 75)
- 10+ active beta testers
- No critical bugs for 7 days
- Core flows work end-to-end

### Public Launch Criteria (Day 90)
- Stripe payments working
- Relay auto-updater functional
- Landing page with download link
- Support email monitored

---

# 6. EXPLICIT NON-GOALS

The following are intentionally deferred beyond Day 90:

| Non-Goal | Reason |
|----------|--------|
| Mobile app | Desktop-first for racing use case |
| Multi-sim support | iRacing focus reduces complexity |
| Video replay integration | Use iRacing's native replay system |
| Automated penalties | AI assists, humans decide |
| Complex billing (special days) | Stabilize core subscriptions first |
| Discord bot commands | Webhook notifications sufficient for launch |
| Public API for third parties | Internal use only initially |
| Driver matchmaking | Out of scope for racing tools |
| Broadcast streaming | Overlay URLs sufficient, no video encoding |
| iRacing data API sync | Manual iRating entry acceptable initially |

---

# 7. RISKS & GUARDRAILS

## Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Drivers don't trust AI engineer | Medium | High | Lead with HUD reliability, AI is optional enhancement |
| League admins resist AI incident detection | Medium | Medium | Position as evidence organization, not judgment |
| Price sensitivity | Low | Medium | $14/mo is less than one iRacing subscription |
| Relay installation friction | Medium | High | Clear installer, troubleshooting guide, support |

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| iRacing SDK changes | Low | High | Abstract SDK layer, monitor iRacing forums |
| AI API costs exceed revenue | Medium | High | Monitor usage, implement caching, set limits |
| WebSocket scaling | Low | Medium | Start with single server, horizontal scaling ready |
| Relay compatibility issues | Medium | Medium | Test on multiple Windows versions, user reports |

## Scope Control Rules

1. **No new features after Day 75** — Bug fixes and polish only
2. **One persona at a time** — Driver → Team → League, not parallel
3. **Working > Perfect** — Ship functional, iterate based on feedback
4. **Say no by default** — New requests go to post-90-day backlog
5. **User feedback > Assumptions** — Adjust based on beta tester input

## Decision Framework

When evaluating new work:

```
1. Does this help a driver trust the relay and HUD?
   → Yes: Consider for Phase 1-2
   → No: Continue evaluation

2. Does this help a team coordinate during endurance races?
   → Yes: Consider for Phase 2-3
   → No: Continue evaluation

3. Does this help a steward review incidents faster?
   → Yes: Consider for Phase 3
   → No: Defer to post-90-day

4. Is this a "nice to have" or "must have"?
   → Nice to have: Defer
   → Must have: Prioritize
```

---

# 8. RESOURCE ASSUMPTIONS

## Team

- **1 full-time developer** (founder/CTO)
- No dedicated designer (use existing design system)
- No dedicated QA (developer testing + beta testers)
- No dedicated support (founder handles initially)

## Time Allocation

| Activity | % of Time |
|----------|-----------|
| Coding | 60% |
| Testing | 15% |
| Documentation | 10% |
| User support/feedback | 10% |
| Infrastructure/DevOps | 5% |

## External Dependencies

| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| OpenAI API | Whisper STT, GPT-4 | $50-200/mo based on usage |
| ElevenLabs | TTS | $22/mo (Starter) |
| Vercel/Railway | Hosting | $20-50/mo |
| Supabase/Neon | PostgreSQL | $25/mo |
| Upstash | Redis | $10/mo |
| Stripe | Payments | 2.9% + $0.30 per transaction |

**Estimated monthly infrastructure cost:** $150-350/mo

---

# 9. SUCCESS METRICS

## Day 30 Checkpoint

| Metric | Target |
|--------|--------|
| Relay captures telemetry | ✓ Working |
| Session data stored | ✓ Working |
| Auth flow complete | ✓ Working |
| API endpoints functional | 10+ endpoints |

## Day 60 Checkpoint

| Metric | Target |
|--------|--------|
| HUD displays real-time data | ✓ Working |
| AI engineer responds | <3 second latency |
| Team dashboard functional | ✓ Beta ready |
| Beta testers active | 5+ drivers |

## Day 90 Checkpoint

| Metric | Target |
|--------|--------|
| Stripe payments working | ✓ Live |
| Incident detection functional | ✓ Working |
| Production uptime | 99%+ |
| Paying customers | 10+ |
| Critical bugs | 0 |

---

# 10. APPENDIX: WEEKLY MILESTONES

| Week | Focus | Key Deliverable |
|------|-------|-----------------|
| 1 | Project setup | Monorepo, CI, database |
| 2 | Authentication | Register, login, JWT |
| 3 | Relay MVP | iRacing detection, telemetry capture |
| 4 | WebSocket pipeline | Relay → Server streaming |
| 5 | HUD components | Position, gaps, speed display |
| 6 | HUD integration | Real-time updates, full layout |
| 7 | AI pipeline | Whisper + GPT-4 integration |
| 8 | AI polish | TTS, latency optimization |
| 9 | Team features | Team creation, pit wall |
| 10 | Team polish | Multi-driver coordination |
| 11 | Incident detection | Contact/off-track detection |
| 12 | Steward tools | Review modal, decisions |
| 13 | Rulebook | Editor, penalty issuance |
| 14 | Notifications | In-app, Discord webhooks |
| 15 | Payments | Stripe integration |
| 16 | Launch prep | Deployment, docs, monitoring |

---

**End of Roadmap Document**

*This document will be updated as execution progresses. Version history maintained in git.*
