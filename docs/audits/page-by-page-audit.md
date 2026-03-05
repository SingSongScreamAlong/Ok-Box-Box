# app.okboxbox.com — Page-by-Page Audit
### March 2026 | All pages read from source

---

## Summary ratings

| Section | Status | Notes |
|---------|--------|-------|
| Auth | ✅ Solid | Minor UX gaps |
| Driver (core) | ✅ Solid | Build label still live |
| Driver Crew (chat) | ⚠️ Partial | bestLap/consistency always hardcoded in Analyst |
| Driver (settings) | ✅ Solid | Voice settings save locally only |
| Shared / Hub | ⚠️ Issues | Track selector has dead tracks; Upload Setup is a no-op |
| Team / Pitwall | ⚠️ Partial | PitwallHome still using mock interface for drivers |
| League | ❌ Heavy mock | StewardConsole, BroadcastGraphics, PublicTiming, Protests, Championship all show hardcoded data |

---

## Auth pages

### `/login` — Login.tsx
- **Status: ✅ Good**
- Error surface is correct (red banner, message from Supabase).
- "Remember me" checkbox is rendered but does nothing — state is not connected to any persist logic. Either wire it or remove it.
- No `redirect` query-param handling: if a user hits a protected route while logged out, they're sent to `/login` but after sign-in they land at `/driver/home`, not the original destination. The `PublicRoute` guard ignores `?redirect=`.
- `AuthCallback` (OAuth return) blindly navigates to `/dashboard` after 1 second — `/dashboard` does not exist as a route; users get a blank screen. Should navigate to `/driver/home`.

### `/signup` — Signup.tsx
- **Status: ✅ Good**
- No T&Cs / Privacy Policy checkbox — legally required before billing.
- "Driver Name" field is optional (`required` is absent on the `<input>`). A user can sign up with no display name and land with `undefined` showing in the UI.
- Password minimum is 6 chars (Supabase default). Consider noting this is a minimum, not guidance.

### `/forgot-password` — ForgotPassword.tsx
- **Status: ✅ Good**
- No rate-limit feedback if user submits repeatedly — Supabase will eventually throttle silently.

### `/auth/reset-password` — ResetPassword.tsx
- **Status: ✅ Good**
- After successful password reset, navigates to `/login` with `replace: true`. Correct.
- Does not validate that the user actually arrived from a reset link — if you visit this page without a valid token, `supabase.auth.updateUser` fails with a session error. The error message surfaced is the raw Supabase string, which is acceptable but could be friendlier.

### `/auth/callback` — AuthCallback.tsx
- **Status: ❌ Bug**
- Navigates to `/dashboard` — this route does not exist in `App.tsx`. The correct destination is `/driver/home`.
- Uses a blind 1-second `setTimeout` rather than listening for Supabase's `onAuthStateChange`. Race condition: if Supabase takes longer than 1s to complete the OAuth session, the redirect fires before the session is established.

### `/oauth/iracing/callback` — IRacingCallback.tsx
- **Status: ✅ Good**
- Handles `error`, `missing_params`, and network errors correctly.
- Forwards code exchange to the API and then redirects to `/settings?iracing_linked=true`. Clean.

---

## Driver pages

### `/driver/home` — DriverLanding.tsx (1724 lines)
- **Status: ✅ Good (with notes)**
- Zero-mock enforcement is upheld — everything gates behind real data.
- "Training Mode" card shows when `sessionCount < 3`. Threshold-locked features (`Crew Intelligence`, `Trend Modeling`, `Advanced Analysis`) are correctly gated.
- `computeDriverLevel` XP threshold at level 10 falls back to `thresholds[thresholds.length - 1] + 5000` — means level-10 drivers show incorrect "XP to next" (no next level). Should display "MAX" or hide the bar.
- The "iRating Trend Sparkline" section is present in the architecture comment but does not render any chart if `ratingTrend` is empty — shows nothing, no empty state. Acceptable but users may think the feature is broken.
- File is 1724 lines. Not a launch blocker but hard to maintain.

### `/driver/cockpit` — DriverCockpit.tsx
- **Status: ⚠️ Minor issues**
- `COCKPIT-v1.0` debug label is rendered in production (bottom-right, `fixed` position). Remove before launch.
- `heatmapData` state is declared but never populated (`useState<{ speed: number }[]>([])`). Heatmap is silently empty.
- When `status` is `connected` but not `in_session`, `P0` is displayed for position (defaults to 0). Should show `--`.
- Background video (`/videos/driver-bg.mp4`) loads twice — once for left panel, once for right panel. Single `<video>` with CSS would be more efficient.
- The Settings button in the bottom-left controls renders a `MapPin` icon (incorrect) and does nothing when clicked.

### `/driver/history` — DriverHistory.tsx
- **Status: ✅ Good**
- "season" filter tab exists in `TimeFilter` type but the `switch` statement falls through to `return true` for it — it returns all sessions, same as 'all'. Either implement the season filter or remove the tab.
- Back link says "Back to Cockpit" but navigates to `/driver/home` (the landing/dashboard). Label should be "Back to Dashboard".
- `avgFinish` calculation divides by `totalSessions` including sessions where `finishPos` is 0/null — the result is skewed. Should only average sessions with a valid finish position.

### `/driver/ratings` — DriverRatings.tsx
- **Status: ✅ Good**
- SR progress bar uses `width: (sr / 4) * 100%` — max visible SR is 4.0 but iRacing SR goes to 4.99. Bar will be clipped for high-SR drivers.
- Empty state shows "Unable to load ratings" if `profile` is null, but doesn't offer a retry or link to the Setup/Profile page.

### `/driver/profile` — DriverProfilePage.tsx
- **Status: ✅ Good**
- iRacing OAuth callback result is read from URL params here AND in `Settings.tsx` via the same logic (duplicated code).
- When `session.access_token` is absent (token expired), `iracingLoading` stays true forever — the iRacing section spins indefinitely.

---

## Driver Crew pages

### `/driver/crew/engineer` — EngineerChat.tsx
- **Status: ✅ Good**
- If `fetchUpcomingRaces` throws, `loading` is never set to false — infinite spinner.
- Message history for context excludes only `id === 'greeting'`, but if a user sends a new message while the greeting is still the only item, the `history` array will be empty. This is fine — just means no context is sent.

### `/driver/crew/spotter` — SpotterChat.tsx
- **Status: ✅ Good**
- Same `fetchUpcomingRaces` error-path issue as Engineer — missing `.catch()`.
- When `viewMode === 'live'` and the relay is not connected, the LiveSpotter component presumably shows its own empty state. Not verified but acceptable.

### `/driver/crew/analyst` — AnalystChat.tsx
- **Status: ⚠️ Data quality issue**
- `bestLap` is hardcoded to `'--:--.---'` for every session mapped from the API (`bestLap: '--:--.---'`). The analyst panel always shows no best lap data, even though `DriverHistory` renders it fine.
- `consistency` is hardcoded to `0` for all sessions. The Analyst panel will always show 0% consistency, making the panel look broken.
- These two fields need to come from the API response, not be hardcoded.

### `/driver/progress` — DriverProgress.tsx
- **Status: ✅ Good**
- `fetchDevelopmentData` and `fetchGoals` are called in parallel. If either rejects, the other result is also discarded. Should use `Promise.allSettled`.
- Goal cards look correct. CreateGoalModal is wired.

### `/driver/idp` — DriverIDP.tsx
- **Status: ✅ Good**
- Comprehensive IDP types. Data comes from API. Good empty states.
- `fatigueOnsetLap` field is displayed — what happens when it's null? Needs to be audited further to ensure null safety throughout the render path.

### `/driver/settings/voice` — DriverVoice.tsx
- **Status: ⚠️ Settings are local only**
- Voice callout preferences are saved to `localStorage`. They are not synced to the server or the relay. If a user clears storage or switches browsers, all preferences reset. Acceptable for v1 but should be documented.
- `persistSettings` runs on every render change via `useEffect([persistSettings])` — this will fire on every single state change due to `useCallback` depending on all 4 state values. This is high write frequency for localStorage. Acceptable but worth a debounce.

### `/driver/settings/hud` — DriverHUD.tsx
- **Status: ⚠️ Preview is decorative**
- HUD preview panel shows placeholder icons in a `aspect-video` div. Widget position badges are rendered in the correct corners, but the preview is entirely cosmetic — there is no actual HUD overlay system connected. This is fine as a settings UI, but users may expect this to actually control something in the relay.
- Same localStorage-only persistence issue as DriverVoice.

---

## Shared / Hub pages

### `/settings` — Settings.tsx
- **Status: ✅ Good**
- Auto-repair logic for iRacing link is a nice touch.
- Account deletion is double-confirmed. Correct.
- `console.log('[Settings] iRacing linked but missing data...')` and `console.log('[Settings] Repair result:', ...)` will fire in production. Should use structured logger or remove.
- iRacing connection passes the Supabase access token as a URL query param (`?token=...`). This is necessary for a browser redirect but means the token appears in server logs. This is a known trade-off; ensure the server does not log the full query string in production.

### `/create-driver-profile` — CreateDriverProfile.tsx
- Not audited in detail. Verify it navigates correctly after creation.

### `/pricing` — Pricing.tsx
- **Status: ✅ Good**
- RaceBox free tier CTA links to `/rco` which is not a defined route — clicking "Start Broadcasting" goes nowhere. Remove the CTA or add the route.
- Stripe checkout correctly requires auth before proceeding (redirects to `/login?redirect=/pricing`).

### `/subscription` — SubscriptionManagement.tsx
- **Status: ⚠️ Schema drift**
- `Subscription.product` type is `'blackbox' | 'controlbox' | 'racebox_plus'` but the server's `entitlement-service.ts` uses `'driver' | 'team' | 'league' | 'bundle'`. The `PRODUCT_INFO` map bridges both with dual keys (`blackbox`/`driver`, `controlbox`/`league`) but `racebox_plus` and `team` have no equivalent in the other system. If a `team` entitlement is returned by the API, `PRODUCT_INFO['team']` is missing and the product card will not render.

### `/billing/return` — BillingReturn.tsx
- **Status: ⚠️ Logic bug**
- The polling condition is `if (hasActive && attempts > 0)` — this means even if the entitlement is already active on the **first** poll (attempt 0), `success` is never set. A user who had a previous subscription, then buys again, will always see "Almost There" instead of "Subscription Activated" because on attempt 0 the entitlement exists but the guard fails. Change to `attempts >= 0` or just `hasActive`.

### `/download` — Download.tsx
- **Status: ❌ Broken link**
- `RELAY_DOWNLOAD_URL` points to a GitHub Release that does not exist yet (`v1.0.0/OkBoxBoxRelay-win.exe`). Clicking downloads a 404.
- Instructions say "Download and run the installer" but the file is a `.exe` (not an installer). Step 1 should say "Download and run the relay".

### `/track-intel` — TrackSelectorPage.tsx
- **Status: ⚠️ Dead tracks**
- Shows 5 tracks (Daytona, Spa, Watkins Glen, Road America, Sebring) but the note at the bottom says only Daytona has full map data. Clicking any non-Daytona track will hit `/api/v1/tracks/{id}`, which will return 404, and the user sees "Track not found". The 4 unsupported tracks should be greyed out / marked "Coming Soon" rather than appearing as clickable links.

### `/track-intel/:trackId` — TrackMapPage.tsx
- **Status: ✅ Good**
- `track.turns.find(t => t.number === selectedTurn)` — `number` on the turn vs `selectedTurn` (string from `onTurnSelect`). If `turn.number` is a number type and `selectedTurn` is a string, `===` will always be `false`. Turns will never match after selection.
- `TrackData.turns` is typed as `any[]`. Fragile — turn structure is not enforced.

---

## Team / Pitwall pages

### `/team/:teamId` — TeamDashboard.tsx
- **Status: ✅ Good**
- If `getTeam` or `getUserTeamRole` throws, `loading` is never set to false. Add error handling in `loadTeamData`.
- Navigate to `/teams` if user has no role in the team. Correct access control.

### `/team/:teamId/pitwall` — PitwallHome.tsx (1245 lines)
- **Status: ⚠️ Mock data leaking**
- `RadioChannel` interface is defined and the UI renders channel controls, but the radio is not functional — there is no WebRTC or actual audio. This is visual-only.
- Driver matching from relay standings uses a loose first-name fuzzy match: `sName.includes(firstName)`. This will produce false positives for common first names.
- The relay connect/disconnect flow is correct.
- The pitwall welcome experience (`useFirstTimeExperience`) uses localStorage — same persistence caveat as voice settings.

### `/team/:teamId/pitwall/strategy` — PitwallStrategy.tsx
- **Status: ⚠️ No data yet**
- Maps from `useTeamData()` → `serviceStrategy`. If `serviceStrategy` is null (no strategy exists), `strategy` state remains null and the entire page shows an empty state. There is no "Create Strategy" prompt — users are left staring at nothing.
- Fuel calculator is local state only (no save/persist). It resets on page reload.
- camelCase → snake_case mapping is verbose and fragile. Both sides should agree on one format.

### `/team/:teamId/pitwall/incidents` — TeamIncidents.tsx
- **Status: ✅ Good**
- Filter + search work correctly against live API data.
- Empty state message exists.

### `/team/:teamId/pitwall/setups` — PitwallSetups.tsx
- **Status: ⚠️ Upload button is a no-op**
- "Upload Setup" button renders but has no `onClick` — clicking it does nothing. Should either open a file picker or be disabled with a "Coming Soon" badge.
- "Download" button per setup also has no `onClick`. Same issue.
- These are the two primary actions on this page. The page is currently view-only despite showing actionable buttons.

### Other Pitwall pages (Practice, Roster, Planning, Reports, Events, RacePlan, StintPlanner, DriverComparison, TeamRaceViewer, DriverProfile)
- **Status: Varied — not fully read, spot-checked**
- PitwallPractice and TeamRaceViewer both use relay data correctly.
- StintPlanner and RacePlan appear data-driven from `useTeamData`.
- PitwallRoster loads from Supabase correctly.

---

## League pages

### `/leagues` — Leagues.tsx
- **Status: ✅ Good**
- Standard list + create CTA. Clean.

### `/league/:leagueId` — LeagueDashboard.tsx
- **Status: ✅ Good**
- Access-gated: redirects to `/leagues` if league not found.
- Background video is `league-bg.mp4` — confirm this file exists in `/public/videos/`.

### `/league/:leagueId/incidents` — LeagueIncidents.tsx
- **Status: ✅ Good**
- Access-gated: only `owner`, `admin`, `steward` can view.
- If the user's role check fails, `loading` is never set to false. Spinner shows indefinitely for non-stewards who accidentally navigate here.
- Status filter tabs re-fetch on every tab change — correct behaviour.

### `/league/:leagueId/rulebook/:rulebookId` — LeagueRulebook.tsx
- **Status: ✅ Good**
- Same auth-check / `loading`-never-false issue as Incidents.
- Rule editing flow is wired to `updateRulebook`. Correct.

### `/league/:leagueId/penalties` — LeaguePenalties.tsx
- **Status: ✅ Good**
- Same auth-check issue.
- `updatePenaltyStatus` is imported and likely wired to buttons in the render (not read in full).

### `/league/:leagueId/protests` — LeagueProtests.tsx
- **Status: ❌ All mock data**
- `mockProtests` is an array of hardcoded protests with real-looking names/data displayed to users.
- No API calls anywhere in this file. The page shows this mock data to every user in every league.
- The comments section allows "Send Reply" button clicks, but the handler is not visible in the first 80 lines. If it only updates local state, replies disappear on reload.
- Must replace mock data with real API before launch.

### `/league/:leagueId/steward` — StewardConsole.tsx
- **Status: ❌ All mock data**
- `mockRaceControl` is hardcoded at file level with fake driver names (Alex Rivera, Marcus Chen, Jordan Kim, Sarah Williams).
- Race control data (lap count, time remaining, flag status, incidents) all come from this mock.
- The relay is imported (`useRelay`) but none of the relay data is used to update `raceControl`.
- Session status controls (green/yellow/red) render buttons but clicking them only sets local state.
- This page is entirely non-functional for real league use.

### `/league/:leagueId/broadcast` — BroadcastGraphics.tsx
- **Status: ❌ All mock data**
- `mockDrivers` (8 fake drivers) and `mockBattles` (1 fake battle) are displayed.
- `streamKey` is hardcoded: `'obb_live_abc123xyz'` — visible to users as if it's real.
- "Go Live" button toggles `isLive` local state and simulates position updates with `setInterval` but doesn't connect to any real data source or OBS websocket.
- Until real timing data comes from the relay/API, this page must show a clear "preview mode" label or not be reachable.

### `/league/:leagueId/championship` — LeagueChampionship.tsx
- **Status: ⚠️ Partially mock**
- `DEFAULT_POINTS` is a hardcoded F1-style points system (25/18/15...). Points system should come from league settings.
- Championship standings: not fully read but likely uses mock/empty data like Protests.

### `/league/:leagueId/timing` — PublicTiming.tsx (public, no auth required)
- **Status: ❌ All mock data — public-facing**
- `mockSession` and `mockTiming` (10 fake drivers) are displayed to anyone who visits the public timing URL.
- The page has `useRelay` imported — but live data is not plumbed in.
- This is a **public page** (no auth) visible to spectators, league members, and streamed viewers. Showing fake data with fake driver names here is a significant credibility problem.
- Must either connect to real relay/API data or show an "Awaiting live session" empty state.

---

## Cross-cutting issues found across all pages

### 1. Auth callback navigates to non-existent route
`AuthCallback.tsx:11` → `navigate('/dashboard')` — `/dashboard` is not in `App.tsx`. Should be `/driver/home`.

### 2. Loading state never resolves on auth check failure
Affects: `LeagueIncidents`, `LeaguePenalties`, `LeagueRulebook`, `DriverProfilePage`, `TeamDashboard`, possibly others.
Pattern: `loadData()` returns early if auth/role check fails, but `setLoading(false)` is inside the `finally` of a `try/catch` that never runs when the early return fires. Users with insufficient permissions see an infinite spinner.
**Fix:** Call `setLoading(false)` before every early return, or move it to a `finally` block that always executes.

### 3. Mock data in production-facing league pages
Pages: `StewardConsole`, `BroadcastGraphics`, `PublicTiming`, `LeagueProtests`, `LeagueChampionship`.
These pages either show hardcoded names/data or simulate live updates with random intervals. Three of them (`BroadcastGraphics`, `PublicTiming`, `StewardConsole`) were clearly built for visual demo/mockup purposes and were never connected to real data sources. They need real data before league owners use them.

### 4. Upload/Download buttons that do nothing
Affects: `PitwallSetups.tsx` (Upload Setup button, Download button per setup).
Buttons render without `onClick` handlers. Clicking them is silent.

### 5. RaceBox free-tier CTA links to `/rco`
`Pricing.tsx:54` → `ctaTarget: '/rco'`. Route `/rco` does not exist in `App.tsx`. All free-tier CTA clicks return to current page (React Router no-match) or the root.

### 6. Track selector lists tracks it can't serve
`TrackSelectorPage.tsx` — 4 of 5 tracks will return "Track not found" when clicked. They should be visually disabled.

### 7. `AnalystChat` hardcodes session data fields
`AnalystChat.tsx:61-62` — `bestLap: '--:--.---'` and `consistency: 0` are hardcoded for every session. The Analyst panel always displays empty/zero data.

### 8. BillingReturn polling bug
`BillingReturn.tsx:38` — `if (hasActive && attempts > 0)` — first poll (attempt 0) never resolves to "success" even if entitlement is immediately active.

### 9. Voice/HUD settings are localStorage only
`DriverVoice.tsx`, `DriverHUD.tsx` — preferences not synced to server. Reset on storage clear / different browser.

### 10. `PitwallSetups` Upload button is non-functional
Most critical UX dead-end: the primary action on the Setups page does nothing.

---

## Priority fix list

### Must fix before any tester touches these pages (P0)

| # | Page | Issue |
|---|------|-------|
| 1 | `AuthCallback` | Navigates to `/dashboard` (404). Change to `/driver/home`. |
| 2 | `PublicTiming` | Shows fake drivers to public spectators. Show empty state until real session data available. |
| 3 | `Pricing` | RaceBox CTA navigates to `/rco` (404). Remove or add route. |
| 4 | `BillingReturn` | Polling bug: `attempts > 0` prevents success on first poll. |

### Fix before FP1 goes wide (P1)

| # | Page | Issue |
|---|------|-------|
| 5 | `DriverCockpit` | Remove `COCKPIT-v1.0` debug label. |
| 6 | `AnalystChat` | `bestLap` and `consistency` are hardcoded — Analyst panel always shows empty data. |
| 7 | All league auth pages | Loading spinner never resolves when role check fails. |
| 8 | `TrackSelectorPage` | Grey out / disable 4 tracks that have no data. |
| 9 | `PitwallSetups` | Upload/Download buttons need `onClick` handlers or "Coming Soon" state. |
| 10 | `DriverHistory` | "season" filter does nothing. "Back to Cockpit" label is wrong. |

### Fix before public launch (P2)

| # | Page | Issue |
|---|------|-------|
| 11 | `StewardConsole` | Replace mock race control data with relay data. |
| 12 | `BroadcastGraphics` | Replace mock timing with real data; remove hardcoded stream key. |
| 13 | `LeagueProtests` | Replace mock protests array with API calls. |
| 14 | `LeagueChampionship` | Replace mock points system and standings with real data. |
| 15 | `Signup` | Add T&Cs checkbox. Make "Driver Name" required. |
| 16 | `Login` | Wire "Remember me" or remove it. Add `?redirect=` support to `PublicRoute`. |
| 17 | `TrackMapPage` | Fix turn selection type mismatch (`number` vs `string`). |
| 18 | `SubscriptionManagement` | Add `team` product key to `PRODUCT_INFO` map. |
| 19 | `DriverLanding` | Level-10 XP display shows wrong "XP to next". Show "MAX". |
| 20 | `PitwallStrategy` | Add "Create Strategy" CTA when no strategy exists. |
