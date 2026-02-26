# Driver Tier QA Walkthrough Checklist

**Date:** _______________  
**Tester:** _______________  
**Build:** _______________

---

## 1. Authentication Flow

### Login Page
- [ ] Page loads at `/login`
- [ ] Email field accepts input
- [ ] Password field accepts input (masked)
- [ ] "Sign In" button is visible and clickable
- [ ] Invalid credentials show error message
- [ ] Valid credentials redirect to dashboard

### Session Persistence
- [ ] Refresh page - still logged in
- [ ] Close browser, reopen - session persists
- [ ] Logout button works

---

## 2. Driver Home (`/driver/home`)

### Profile Card
- [ ] Display name shows correctly
- [ ] iRating displays (if linked to iRacing)
- [ ] Safety rating displays
- [ ] License class badge shows

### Quick Stats
- [ ] Recent sessions count
- [ ] Win rate percentage
- [ ] Incident average

### Navigation
- [ ] All sidebar links work
- [ ] Active page highlighted in sidebar

---

## 3. Driver Ratings (`/driver/ratings`)

### iRating Display
- [ ] Current iRating value
- [ ] iRating trend chart (if data available)
- [ ] Discipline breakdown (Road, Oval, Dirt)

### Safety Rating
- [ ] Current SR value
- [ ] License class display
- [ ] SR trend visualization

### License Cards
- [ ] Each discipline shows license level
- [ ] Colors match license class (R=red, D=orange, C=yellow, B=green, A=blue, Pro=black)

---

## 4. Driver Sessions (`/driver/sessions`)

### Session List
- [ ] Sessions load from iRacing history
- [ ] Pagination works (if >20 sessions)
- [ ] Each session shows:
  - [ ] Track name
  - [ ] Series name
  - [ ] Start/Finish position
  - [ ] iRating change (+/-)
  - [ ] Incident count

### Filtering
- [ ] Filter by discipline works
- [ ] Date range filter (if available)

---

## 5. Crew Chat Pages

### Engineer (`/driver/crew/engineer`)
- [ ] Page loads
- [ ] Chat input visible
- [ ] Send message works
- [ ] AI responds appropriately
- [ ] Response mentions car setup/strategy topics

### Spotter (`/driver/crew/spotter`)
- [ ] Page loads
- [ ] Chat input visible
- [ ] Send message works
- [ ] AI responds with track awareness focus

### Analyst (`/driver/crew/analyst`)
- [ ] Page loads
- [ ] Chat input visible
- [ ] Send message works
- [ ] AI responds with data/telemetry focus

---

## 6. Live Cockpit (`/driver/cockpit`)

### Without Active Session
- [ ] Shows "No active session" or demo mode
- [ ] Track map placeholder visible

### With Active Session (requires iRacing running)
- [ ] Speed gauge updates
- [ ] RPM gauge updates
- [ ] Gear indicator works
- [ ] Fuel level displays
- [ ] Lap time shows
- [ ] Position indicator
- [ ] Track map shows car position

---

## 7. Responsive Design

### Desktop (1920x1080)
- [ ] Layout looks correct
- [ ] No horizontal scroll
- [ ] Sidebar fully visible

### Tablet (768px)
- [ ] Sidebar collapses or hamburger menu
- [ ] Content readable
- [ ] Touch targets adequate size

### Mobile (375px)
- [ ] Single column layout
- [ ] Navigation accessible
- [ ] Forms usable

---

## 8. Error Handling

### Network Errors
- [ ] Offline message shows when disconnected
- [ ] Graceful degradation

### API Errors
- [ ] 401 redirects to login
- [ ] 500 shows error message (not crash)
- [ ] Rate limit message (if triggered)

---

## 9. Performance

### Page Load Times
- [ ] Login page < 2s
- [ ] Dashboard < 3s
- [ ] Sessions list < 3s

### Interactions
- [ ] No visible lag on navigation
- [ ] Forms respond immediately
- [ ] Animations smooth (60fps)

---

## Issues Found

| # | Page | Issue Description | Severity | Screenshot |
|---|------|-------------------|----------|------------|
| 1 |      |                   |          |            |
| 2 |      |                   |          |            |
| 3 |      |                   |          |            |

**Severity Levels:**
- **Critical** - Blocks core functionality
- **High** - Major feature broken
- **Medium** - Feature works but UX issue
- **Low** - Minor visual/polish issue

---

## Sign-Off

- [ ] All critical items pass
- [ ] No high severity issues
- [ ] Ready for production

**Tester Signature:** _______________  
**Date:** _______________
