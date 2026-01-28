/**
 * Audit Element Registry
 * 
 * Provides PERMANENT, UNIQUE IDs for every interactive element in the app.
 * IDs are based on page + element position and NEVER change or repeat.
 * 
 * Format: {TIER}-{PAGE}-{NUMBER}
 * Example: D-COK-001 = Driver tier, Cockpit page, element 1
 * 
 * Tiers:
 *   A = Auth pages
 *   D = Driver tier
 *   T = Team tier (pitwall)
 *   L = League tier
 *   G = Global (header, footer, shared)
 * 
 * Pages: 3-letter codes defined below
 */

// Page code mappings
export const PAGE_CODES: Record<string, { tier: string; code: string; name: string }> = {
  // Auth
  '/login': { tier: 'A', code: 'LOG', name: 'Login' },
  '/signup': { tier: 'A', code: 'SGN', name: 'Signup' },
  '/forgot-password': { tier: 'A', code: 'FGT', name: 'Forgot Password' },
  '/auth/reset-password': { tier: 'A', code: 'RST', name: 'Reset Password' },
  
  // Driver Tier
  '/driver/home': { tier: 'D', code: 'HOM', name: 'Driver Home' },
  '/driver/cockpit': { tier: 'D', code: 'COK', name: 'Driver Cockpit' },
  '/driver/history': { tier: 'D', code: 'HIS', name: 'Driver History' },
  '/driver/ratings': { tier: 'D', code: 'RAT', name: 'Driver Ratings' },
  '/driver/profile': { tier: 'D', code: 'PRO', name: 'Driver Profile' },
  '/driver/progress': { tier: 'D', code: 'PRG', name: 'Driver Progress' },
  '/driver/crew/engineer': { tier: 'D', code: 'ENG', name: 'Engineer Chat' },
  '/driver/crew/spotter': { tier: 'D', code: 'SPT', name: 'Spotter Chat' },
  '/driver/crew/analyst': { tier: 'D', code: 'ANL', name: 'Analyst Chat' },
  '/driver/pitwall': { tier: 'D', code: 'DPW', name: 'Driver Pitwall' },
  '/driver/settings/hud': { tier: 'D', code: 'HUD', name: 'HUD Settings' },
  '/driver/settings/voice': { tier: 'D', code: 'VOI', name: 'Voice Settings' },
  '/driver/replay': { tier: 'D', code: 'RPL', name: 'Replay Viewer' },
  '/driver/blackbox': { tier: 'D', code: 'BBX', name: 'Black Box' },
  
  // Team Tier - Dashboard & Settings
  '/team/:teamId': { tier: 'T', code: 'TDB', name: 'Team Dashboard' },
  '/team/:teamId/settings': { tier: 'T', code: 'TST', name: 'Team Settings' },
  
  // Team Tier - Pitwall
  '/team/:teamId/pitwall': { tier: 'T', code: 'PWH', name: 'Pitwall Home' },
  '/team/:teamId/pitwall/strategy': { tier: 'T', code: 'STR', name: 'Strategy' },
  '/team/:teamId/pitwall/practice': { tier: 'T', code: 'PRC', name: 'Practice' },
  '/team/:teamId/pitwall/roster': { tier: 'T', code: 'ROS', name: 'Roster' },
  '/team/:teamId/pitwall/planning': { tier: 'T', code: 'PLN', name: 'Planning' },
  '/team/:teamId/pitwall/race-plan': { tier: 'T', code: 'RCP', name: 'Race Plan' },
  '/team/:teamId/pitwall/race': { tier: 'T', code: 'RCE', name: 'Race Viewer' },
  '/team/:teamId/pitwall/compare': { tier: 'T', code: 'CMP', name: 'Driver Compare' },
  '/team/:teamId/pitwall/stint-planner': { tier: 'T', code: 'STP', name: 'Stint Planner' },
  '/team/:teamId/pitwall/events': { tier: 'T', code: 'EVT', name: 'Events' },
  '/team/:teamId/pitwall/reports': { tier: 'T', code: 'RPT', name: 'Reports' },
  '/team/:teamId/pitwall/setups': { tier: 'T', code: 'SET', name: 'Setups' },
  '/team/:teamId/pitwall/incidents': { tier: 'T', code: 'INC', name: 'Team Incidents' },
  '/team/:teamId/pitwall/driver/:driverId': { tier: 'T', code: 'DRP', name: 'Driver Profile (Team)' },
  
  // League Tier
  '/leagues': { tier: 'L', code: 'LLS', name: 'Leagues List' },
  '/create-league': { tier: 'L', code: 'CRL', name: 'Create League' },
  '/league/:leagueId': { tier: 'L', code: 'LDB', name: 'League Dashboard' },
  '/league/:leagueId/settings': { tier: 'L', code: 'LST', name: 'League Settings' },
  '/league/:leagueId/incidents': { tier: 'L', code: 'LIN', name: 'League Incidents' },
  '/league/:leagueId/incident/:incidentId': { tier: 'L', code: 'LID', name: 'Incident Detail' },
  '/league/:leagueId/rulebook/:rulebookId': { tier: 'L', code: 'RUL', name: 'Rulebook' },
  '/league/:leagueId/penalties': { tier: 'L', code: 'PEN', name: 'Penalties' },
  '/league/:leagueId/championship': { tier: 'L', code: 'CHP', name: 'Championship' },
  '/league/:leagueId/broadcast': { tier: 'L', code: 'BRD', name: 'Broadcast' },
  '/league/:leagueId/protests': { tier: 'L', code: 'PRT', name: 'Protests' },
  '/league/:leagueId/steward-console': { tier: 'L', code: 'STC', name: 'Steward Console' },
  '/league/:leagueId/create-event': { tier: 'L', code: 'CRE', name: 'Create Event' },
  '/league/:leagueId/timing': { tier: 'L', code: 'TIM', name: 'Public Timing' },
  
  // Other
  '/teams': { tier: 'T', code: 'TLS', name: 'Teams List' },
  '/create-team': { tier: 'T', code: 'CRT', name: 'Create Team' },
  '/settings': { tier: 'G', code: 'GST', name: 'Global Settings' },
  '/create-driver-profile': { tier: 'D', code: 'CDP', name: 'Create Driver Profile' },
  '/event/:eventId': { tier: 'L', code: 'EVW', name: 'Event View' },
};

// Element type prefixes for additional context
export const ELEMENT_TYPE_CODES: Record<string, string> = {
  button: 'BTN',
  link: 'LNK',
  input: 'INP',
  select: 'SEL',
  checkbox: 'CHK',
  radio: 'RAD',
  textarea: 'TXT',
  other: 'ELM',
};

/**
 * Generate a unique element ID
 * Format: {TIER}-{PAGE}-{NUMBER}
 * Example: D-COK-001
 */
export function generateElementId(
  pagePath: string,
  elementIndex: number
): string {
  const pageInfo = getPageInfo(pagePath);
  const num = String(elementIndex).padStart(3, '0');
  return `${pageInfo.tier}-${pageInfo.code}-${num}`;
}

/**
 * Get page info from path, handling dynamic segments
 */
export function getPageInfo(path: string): { tier: string; code: string; name: string } {
  // Normalize path
  let normalizedPath = path.replace(/\/+$/, ''); // Remove trailing slash
  
  // Try exact match first
  if (PAGE_CODES[normalizedPath]) {
    return PAGE_CODES[normalizedPath];
  }
  
  // Try matching with dynamic segments replaced
  // /team/abc123 -> /team/:teamId
  // /league/xyz/incidents -> /league/:leagueId/incidents
  const patterns = [
    { regex: /^\/team\/[^/]+\/pitwall\/driver\/[^/]+$/, key: '/team/:teamId/pitwall/driver/:driverId' },
    { regex: /^\/team\/[^/]+\/pitwall\/([^/]+)$/, replace: '/team/:teamId/pitwall/$1' },
    { regex: /^\/team\/[^/]+\/([^/]+)$/, replace: '/team/:teamId/$1' },
    { regex: /^\/team\/[^/]+$/, key: '/team/:teamId' },
    { regex: /^\/league\/[^/]+\/incident\/[^/]+$/, key: '/league/:leagueId/incident/:incidentId' },
    { regex: /^\/league\/[^/]+\/rulebook\/[^/]+$/, key: '/league/:leagueId/rulebook/:rulebookId' },
    { regex: /^\/league\/[^/]+\/([^/]+)$/, replace: '/league/:leagueId/$1' },
    { regex: /^\/league\/[^/]+$/, key: '/league/:leagueId' },
    { regex: /^\/driver\/replay\/[^/]+$/, key: '/driver/replay' },
    { regex: /^\/event\/[^/]+$/, key: '/event/:eventId' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(normalizedPath)) {
      if (pattern.key) {
        return PAGE_CODES[pattern.key] || { tier: 'X', code: 'UNK', name: 'Unknown' };
      }
      if (pattern.replace) {
        const replaced = normalizedPath.replace(pattern.regex, pattern.replace);
        if (PAGE_CODES[replaced]) {
          return PAGE_CODES[replaced];
        }
      }
    }
  }
  
  // Fallback for unknown pages
  return { tier: 'X', code: 'UNK', name: `Unknown: ${normalizedPath}` };
}

/**
 * Parse an element ID back to its components
 */
export function parseElementId(id: string): { tier: string; pageCode: string; number: number } | null {
  const match = id.match(/^([A-Z])-([A-Z]{3})-(\d{3})$/);
  if (!match) return null;
  return {
    tier: match[1],
    pageCode: match[2],
    number: parseInt(match[3], 10),
  };
}

/**
 * Get page name from element ID
 */
export function getPageNameFromId(id: string): string {
  const parsed = parseElementId(id);
  if (!parsed) return 'Unknown';
  
  for (const [, info] of Object.entries(PAGE_CODES)) {
    if (info.tier === parsed.tier && info.code === parsed.pageCode) {
      return info.name;
    }
  }
  return 'Unknown';
}

/**
 * Get tier name from code
 */
export function getTierName(tierCode: string): string {
  const tiers: Record<string, string> = {
    'A': 'Auth',
    'D': 'Driver',
    'T': 'Team',
    'L': 'League',
    'G': 'Global',
    'X': 'Unknown',
  };
  return tiers[tierCode] || 'Unknown';
}

// Master registry type
export interface ElementRegistryEntry {
  id: string;
  tier: string;
  pageCode: string;
  pageName: string;
  pagePath: string;
  elementType: string;
  elementText: string;
  selector: string;
  tested: boolean;
  status: 'untested' | 'working' | 'broken' | 'needs-work';
  notes: string;
  lastUpdated: string;
}

// Registry storage key
export const REGISTRY_STORAGE_KEY = 'okboxbox-element-registry';

/**
 * Load registry from localStorage
 */
export function loadRegistry(): Record<string, ElementRegistryEntry> {
  try {
    const saved = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[Registry] Failed to load:', e);
  }
  return {};
}

/**
 * Save registry to localStorage
 */
export function saveRegistry(registry: Record<string, ElementRegistryEntry>): void {
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (e) {
    console.error('[Registry] Failed to save:', e);
  }
}

/**
 * Export registry to JSON file
 */
export function exportRegistry(registry: Record<string, ElementRegistryEntry>): void {
  const content = JSON.stringify(registry, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `element-registry-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export registry to markdown for documentation
 */
export function exportRegistryMarkdown(registry: Record<string, ElementRegistryEntry>): void {
  const entries = Object.values(registry);
  
  // Group by page
  const byPage: Record<string, ElementRegistryEntry[]> = {};
  entries.forEach(entry => {
    const key = `${entry.tier}-${entry.pageCode}`;
    if (!byPage[key]) byPage[key] = [];
    byPage[key].push(entry);
  });
  
  const lines = [
    '# Ok, Box Box - Element Registry',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total Elements: ${entries.length}`,
    `Working: ${entries.filter(e => e.status === 'working').length}`,
    `Broken: ${entries.filter(e => e.status === 'broken').length}`,
    `Needs Work: ${entries.filter(e => e.status === 'needs-work').length}`,
    `Untested: ${entries.filter(e => e.status === 'untested').length}`,
    '',
  ];
  
  // Sort pages
  const sortedPages = Object.keys(byPage).sort();
  
  for (const pageKey of sortedPages) {
    const pageEntries = byPage[pageKey].sort((a, b) => a.id.localeCompare(b.id));
    const first = pageEntries[0];
    
    lines.push(`## ${first.pageName} (${pageKey})`);
    lines.push(`Path: \`${first.pagePath}\``);
    lines.push('');
    lines.push('| ID | Type | Text | Status | Notes |');
    lines.push('|----|------|------|--------|-------|');
    
    for (const entry of pageEntries) {
      const statusEmoji = {
        'untested': '⬜',
        'working': '✅',
        'broken': '❌',
        'needs-work': '⚠️',
      }[entry.status];
      lines.push(`| ${entry.id} | ${entry.elementType} | ${entry.elementText.slice(0, 30)} | ${statusEmoji} ${entry.status} | ${entry.notes.slice(0, 50)} |`);
    }
    lines.push('');
  }
  
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `element-registry-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
