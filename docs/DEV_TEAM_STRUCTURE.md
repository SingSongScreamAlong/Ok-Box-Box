# Ok, Box Box - Development Team Structure

## Overview

This document defines the team structure, roles, responsibilities, and processes for the Ok, Box Box development team.

---

## 1. Team Roles

### Core Team

| Role | Responsibility | Skills Required |
|------|----------------|-----------------|
| **Tech Lead** | Architecture, code review, technical decisions, release management | Full-stack, system design, leadership |
| **Frontend Developer** | React/TypeScript, UI/UX implementation, performance | React, TypeScript, CSS, accessibility |
| **Backend Developer** | Node.js APIs, database, WebSocket, integrations | Node.js, PostgreSQL, Redis, WebSocket |
| **DevOps Engineer** | Infrastructure, CI/CD, monitoring, security | Docker, cloud platforms, Terraform, monitoring |
| **QA Engineer** | Testing strategy, automation, bug triage | Playwright, testing frameworks, attention to detail |

### Extended Team

| Role | Responsibility |
|------|----------------|
| **Product Manager** | Roadmap, priorities, user feedback |
| **Designer** | UI/UX design, design system |
| **Support Engineer** | Customer issues, documentation |

---

## 2. Team Structure

```
┌─────────────────────────────────────────────────────────┐
│                      CTO / Founder                       │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│                      Tech Lead                           │
│  - Architecture decisions                                │
│  - Code review final approval                            │
│  - Release management                                    │
│  - On-call escalation                                    │
└─────────────────────────┬───────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───┴───┐           ┌─────┴─────┐         ┌────┴────┐
│Frontend│           │  Backend  │         │ DevOps  │
│  Dev   │           │    Dev    │         │Engineer │
└───┬───┘           └─────┬─────┘         └────┬────┘
    │                     │                    │
    └─────────────────────┼────────────────────┘
                          │
                    ┌─────┴─────┐
                    │    QA     │
                    │ Engineer  │
                    └───────────┘
```

---

## 3. Responsibilities by Area

### Driver Tier (apps/app)

| Area | Primary | Backup |
|------|---------|--------|
| Cockpit/HUD | Frontend Dev | Tech Lead |
| Ratings/Stats | Frontend Dev | Backend Dev |
| AI Crew Chat | Backend Dev | Frontend Dev |
| Relay Integration | Backend Dev | DevOps |
| Track Map | Frontend Dev | Tech Lead |

### Server (packages/server)

| Area | Primary | Backup |
|------|---------|--------|
| API Routes | Backend Dev | Tech Lead |
| WebSocket/Telemetry | Backend Dev | DevOps |
| Database | Backend Dev | DevOps |
| Authentication | Backend Dev | Tech Lead |
| AI Integration | Backend Dev | Tech Lead |

### Infrastructure

| Area | Primary | Backup |
|------|---------|--------|
| DigitalOcean | DevOps | Tech Lead |
| CI/CD | DevOps | Backend Dev |
| Monitoring | DevOps | Backend Dev |
| Security | DevOps | Tech Lead |

### Python Relay (tools/relay-agent)

| Area | Primary | Backup |
|------|---------|--------|
| iRacing SDK | Backend Dev | Tech Lead |
| Data Mapping | Backend Dev | Tech Lead |
| WebSocket Client | Backend Dev | DevOps |

---

## 4. Development Workflow

### Git Branching Strategy

```
main (production)
  │
  ├── develop (staging)
  │     │
  │     ├── feature/driver-cockpit-improvements
  │     ├── feature/new-ai-crew-member
  │     └── bugfix/track-map-position
  │
  └── hotfix/critical-auth-fix (direct to main)
```

### Pull Request Process

1. **Create PR** from feature branch to `develop`
2. **Automated checks** run (lint, typecheck, tests)
3. **Code review** by at least 1 team member
4. **QA review** for user-facing changes
5. **Merge** after approval
6. **Deploy to staging** automatically
7. **Promote to production** after staging validation

### Code Review Guidelines

- Review within 24 hours (business days)
- Focus on: correctness, performance, security, maintainability
- Use "Request Changes" sparingly - prefer suggestions
- Approve with minor comments when appropriate

---

## 5. Communication

### Channels

| Channel | Purpose |
|---------|---------|
| `#dev-general` | General development discussion |
| `#dev-frontend` | Frontend-specific topics |
| `#dev-backend` | Backend-specific topics |
| `#dev-devops` | Infrastructure topics |
| `#incidents` | Production incidents |
| `#alerts` | Automated monitoring alerts |
| `#releases` | Deployment notifications |

### Meetings

| Meeting | Frequency | Duration | Attendees |
|---------|-----------|----------|-----------|
| Daily Standup | Daily | 15 min | All devs |
| Sprint Planning | Bi-weekly | 1 hour | All devs + PM |
| Tech Review | Weekly | 30 min | Tech Lead + Devs |
| Retrospective | Bi-weekly | 45 min | All devs |

### Standup Format

1. What I did yesterday
2. What I'm doing today
3. Any blockers

---

## 6. On-Call Rotation

### Schedule

- **Rotation**: Weekly, Monday to Monday
- **Coverage**: 24/7 during launch, business hours after stabilization
- **Compensation**: Time off in lieu or on-call bonus

### Rotation Order

```
Week 1: Backend Dev (Primary), DevOps (Secondary)
Week 2: DevOps (Primary), Tech Lead (Secondary)
Week 3: Tech Lead (Primary), Backend Dev (Secondary)
Week 4: [Repeat]
```

### On-Call Responsibilities

1. **Acknowledge** alerts within 5 minutes
2. **Triage** and assess severity
3. **Communicate** status in #incidents
4. **Resolve** or escalate as needed
5. **Document** incident and resolution

### Escalation Path

```
L1: On-call Engineer (5 min)
    │
    ├── Can resolve → Fix and document
    │
    └── Cannot resolve → Escalate to L2
                         │
L2: Tech Lead (15 min)
    │
    ├── Can resolve → Fix and document
    │
    └── Cannot resolve → Escalate to L3
                         │
L3: CTO (30 min)
```

---

## 7. Incident Management

### Severity Levels

| Level | Description | Response | Example |
|-------|-------------|----------|---------|
| **P1** | Service down | Immediate | API unreachable |
| **P2** | Major degradation | 15 min | 50% error rate |
| **P3** | Minor issue | 1 hour | Slow page loads |
| **P4** | Low impact | Next day | UI glitch |

### Incident Response Process

1. **Detect** - Alert fires or user reports
2. **Acknowledge** - On-call responds
3. **Assess** - Determine severity
4. **Communicate** - Post in #incidents
5. **Mitigate** - Restore service
6. **Resolve** - Fix root cause
7. **Postmortem** - Document learnings

### Postmortem Template

```markdown
# Incident: [Title]

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Severity**: P1/P2/P3/P4
**Author**: [Name]

## Summary
Brief description of what happened.

## Timeline
- HH:MM - Event 1
- HH:MM - Event 2

## Root Cause
What caused the incident.

## Resolution
How it was fixed.

## Action Items
- [ ] Action 1 (Owner, Due Date)
- [ ] Action 2 (Owner, Due Date)

## Lessons Learned
What we learned and how to prevent recurrence.
```

---

## 8. Release Process

### Release Schedule

- **Production releases**: Tuesday and Thursday
- **Hotfixes**: As needed
- **Feature flags**: For gradual rollouts

### Release Checklist

```markdown
## Pre-Release
- [ ] All tests passing
- [ ] Code review approved
- [ ] QA sign-off
- [ ] Release notes written
- [ ] Monitoring dashboards ready

## Release
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Monitor error rates

## Post-Release
- [ ] Announce in #releases
- [ ] Monitor for 30 minutes
- [ ] Update documentation
```

### Rollback Procedure

1. Identify the bad commit
2. Run: `git revert <commit-hash>`
3. Push to main
4. CI/CD auto-deploys
5. Verify rollback successful
6. Post in #incidents

---

## 9. Documentation

### Required Documentation

| Type | Location | Owner |
|------|----------|-------|
| API Docs | `/docs/api/` | Backend Dev |
| Architecture | `/docs/architecture/` | Tech Lead |
| Runbooks | `/docs/runbooks/` | DevOps |
| User Guides | `/docs/guides/` | Support |

### Documentation Standards

- Keep docs close to code
- Update docs with code changes
- Use Markdown format
- Include examples
- Review docs in PRs

---

## 10. Tools & Access

### Development Tools

| Tool | Purpose | Access |
|------|---------|--------|
| GitHub | Code repository | All devs |
| Linear/Jira | Issue tracking | All devs |
| Figma | Design files | All devs (view) |
| Slack | Communication | All team |
| 1Password | Secrets management | All devs |

### Infrastructure Access

| Resource | Access Level |
|----------|--------------|
| Production DB | Tech Lead, Backend Dev (read-only) |
| Production Server | DevOps, Tech Lead |
| Staging | All devs |
| Monitoring | All devs |
| PagerDuty | On-call rotation |

### Access Request Process

1. Request in #dev-general
2. Tech Lead approves
3. DevOps provisions
4. Document in access log

---

## 11. Onboarding Checklist

### New Developer Setup

```markdown
## Day 1
- [ ] GitHub access
- [ ] Slack channels joined
- [ ] 1Password vault access
- [ ] Local dev environment setup
- [ ] Run app locally

## Week 1
- [ ] Read architecture docs
- [ ] Review codebase structure
- [ ] Complete first PR (small fix)
- [ ] Meet with each team member
- [ ] Shadow on-call engineer

## Month 1
- [ ] Own a feature end-to-end
- [ ] Participate in code reviews
- [ ] Join on-call rotation
- [ ] Document something new
```

---

## 12. Performance & Growth

### Code Quality Metrics

- Test coverage > 80%
- PR review time < 24 hours
- Build time < 5 minutes
- Deploy frequency: 2-3x per week

### Team Health Metrics

- On-call burden balanced
- Incident response time < 5 min
- Postmortems completed within 48 hours
- Documentation up to date

### Career Growth

- Regular 1:1s with Tech Lead
- Quarterly goal setting
- Conference/training budget
- Open source contribution time
