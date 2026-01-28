// =====================================================================
// API Routes Index
// =====================================================================

import { Router } from 'express';
import { sessionsRouter } from './sessions.js';
import { incidentsRouter } from './incidents.js';
import { penaltiesRouter } from './penalties.js';
import { rulebooksRouter } from './rulebooks.js';
import { reportsRouter } from './reports.js';
import { healthRouter } from './health.js';
import profilesRouter from './profiles.js';
import recommendationsRouter from './recommendations.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import leaguesRouter from './leagues.js';
import eventsRouter from './events.js';
import artifactsRouter from './artifacts.js';
import eventReportsRouter from './event-reports.js';
import discordRouter from './discord.js';
import scoringRouter from './scoring.js';

export const apiRouter = Router();

// Health check (no auth required)
apiRouter.use('/health', healthRouter);

// Track Intelligence (Public)
import trackIntelRouter from '../../track-intel/routes.js';
apiRouter.use('/v1/tracks', trackIntelRouter);

// Relay version (for auto-update checks)
import relayVersionRouter from './relay-version.js';
apiRouter.use('/relay', relayVersionRouter);

// Auth routes (login/logout, no auth required)
apiRouter.use('/auth', authRouter);

// Admin routes (super admin only)
apiRouter.use('/admin', adminRouter);

// League/series/season routes
apiRouter.use('/leagues', leaguesRouter);

// Core routes (require auth + license for protected operations)
apiRouter.use('/sessions', sessionsRouter);
apiRouter.use('/incidents', incidentsRouter);
apiRouter.use('/penalties', penaltiesRouter);
apiRouter.use('/rulebooks', rulebooksRouter);

// Discipline profiles
apiRouter.use('/profiles', profilesRouter);

// Recommendations
apiRouter.use('/recommendations', recommendationsRouter);

// Reports (nested under sessions - legacy)
apiRouter.use('/sessions', reportsRouter);

// Events and artifacts (post-race uploads)
apiRouter.use('/events', eventsRouter);
apiRouter.use('/artifacts', artifactsRouter);
apiRouter.use('/events', eventReportsRouter);

// Discord integration
apiRouter.use('/discord', discordRouter);
apiRouter.use('/', discordRouter);

// Scoring engine
apiRouter.use('/', scoringRouter);

// Public widgets (no auth)  
import widgetsRouter from './widgets.js';
apiRouter.use('/widgets', widgetsRouter);

// Broadcast overlays (no auth)
import overlayRouter from './overlay.js';
apiRouter.use('/overlay', overlayRouter);

// AI Commentary (no auth)
import commentaryRouter from './commentary.js';
apiRouter.use('/commentary', commentaryRouter);

// Paint/Livery Management
import paintsRouter from './paints.js';
apiRouter.use('/', paintsRouter);
apiRouter.use('/paints', paintsRouter);

// AI / GPT-5 Analysis
import aiRouter from './ai.js';
apiRouter.use('/ai', aiRouter);

// Rulebook AI Interpretation
import rulebookAiRouter from './rulebook-ai.js';
apiRouter.use('/rulebooks', rulebookAiRouter);

// Protests & Appeals (P0 Core)
import protestsRouter from './protests.js';
apiRouter.use('/protests', protestsRouter);

// Steward Voting Panels (P0 Core)
import panelsRouter from './panels.js';
apiRouter.use('/panels', panelsRouter);

// Teams (minimal scaffolding)
import teamsRouter from './teams.js';
apiRouter.use('/teams', teamsRouter);

// Audit Log (P0 Core)
import auditRouter from './audit.js';
apiRouter.use('/audit', auditRouter);

// Evidence (Video/Replay for incidents)
import { evidenceRouter } from './evidence.js';
apiRouter.use('/evidence', evidenceRouter);

// Launch tokens (for relay protocol handler)
import launchRouter from './launch.js';
apiRouter.use('/', launchRouter);

// Billing / Entitlements (Squarespace webhooks)
import billingSquarespaceRouter from './billing-squarespace.js';
apiRouter.use('/billing/squarespace', billingSquarespaceRouter);

// Billing / Stripe (Subscriptions)
import billingStripeRouter from './billing-stripe.js';
apiRouter.use('/billing/stripe', billingStripeRouter);

// Stripe Webhooks (separate from billing routes, needs raw body)
import webhooksStripeRouter from './webhooks-stripe.js';
apiRouter.use('/webhooks/stripe', webhooksStripeRouter);

// Admin Entitlements (manual grants for alpha/testing)
import adminEntitlementsRouter from './admin-entitlements.js';
apiRouter.use('/admin', adminEntitlementsRouter);

// DEV Diagnostics (admin only, gated by DIAGNOSTICS_ENABLED)
import diagnosticsRouter from './dev/diagnostics.js';
apiRouter.use('/dev/diagnostics', diagnosticsRouter);

// Voice API (PTT → Whisper → AI → TTS)
import voiceRouter from './voice.js';
apiRouter.use('/voice', voiceRouter);

// iRacing OAuth (protected routes - start, status, revoke)
import iracingOAuthRouter from './oauth/iracing.js';
apiRouter.use('/oauth/iracing', iracingOAuthRouter);

// Individual Driver Profile (IDP) - v1 API
// import driversRouter from '../../driverbox/routes/drivers.js';


// Team System v1 (Permissioned view over IDP)
import teamsV1Router from '../../driverbox/routes/teams.js';
apiRouter.use('/v1/teams', teamsV1Router);

// Driver Goals (IDP - Development Targets)
import goalsRouter from './goals.js';
apiRouter.use('/v1/goals', goalsRouter);

// Team Operations (Events, Race Plans, Stints)
import teamOperationsRouter from './team-operations.js';
apiRouter.use('/v1/teams', teamOperationsRouter);
