# Linear Execution Plan

**Philosophy:** One system at a time. Do not context switch.

## 1) Website (Marketing)

**Scope:** landing + pricing + download relay + login → routes into app

- **DONE:** When marketing only exists at `okboxbox.com` and routes users into `app.okboxbox.com`.
- **Acceptance criteria:**
  - Landing page exists.
  - Pricing page exists.
  - Relay download page exists.
  - Login CTA routes to the app.
  - Flow verified: `okboxbox.com/login` → `app.okboxbox.com/login`.

## 2) IDP / Driver System

- **DONE:** When a driver can authenticate/identify and see driver surfaces.
- **Acceptance criteria:**
  - Driver entrypoint exists at `/driver/*`.
  - Driver can see connection status and basic profile/IDP.
  - Driver surfaces do not leak team/league features.

## 3) Team System

- **DONE:** When a team can use pit wall surfaces reliably inside the canonical app.
- **Acceptance criteria:**
  - Team entrypoint exists at `/team/*`.
  - Pit wall surface exists at `/team/pitwall`.
  - Roster/planning/setups routes exist under team.

## 4) League System

- **DONE:** When league/race control workflows exist and are navigable.
- **Acceptance criteria:**
  - League entrypoint exists at `/league/*`.
  - Incidents/penalties/rulebook surfaces are defined and routed.

## 5) Broadcast System

- **DONE:** When a streamer can use broadcast surfaces without touching team/league admin.
- **Acceptance criteria:**
  - Broadcast entrypoint exists at `/broadcast/*`.
  - Overlay/watch surfaces are routable.
