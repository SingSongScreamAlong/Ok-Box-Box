/**
 * DevAuditOverlay - Visual Testing System
 * 
 * Provides a reusable overlay that marks ALL interactive elements on the page
 * with PERMANENT UNIQUE IDs for systematic testing.
 * 
 * Toggle: Ctrl+Shift+A
 * 
 * ID Format: {TIER}-{PAGE}-{NUMBER}
 * Example: D-COK-001 = Driver tier, Cockpit page, element 1
 * 
 * Features:
 * - Scans DOM for buttons, links, inputs, selects
 * - Assigns PERMANENT unique IDs that never repeat
 * - Generates exportable checklist
 * - Persists registry in localStorage
 * - Can be activated multiple times
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { X, Download, RefreshCw, Eye, EyeOff, List, CheckCircle, XCircle, AlertTriangle, Circle } from 'lucide-react';
import { 
  generateElementId, 
  getPageInfo, 
  loadRegistry, 
  saveRegistry, 
  exportRegistryMarkdown,
  type ElementRegistryEntry
} from '../lib/auditRegistry';

// Types
interface AuditElement {
  id: string; // Permanent ID like D-COK-001
  localIndex: number; // Index on current page for display
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'other';
  text: string;
  selector: string;
  rect: DOMRect;
  status: 'untested' | 'working' | 'broken' | 'needs-work';
  notes: string;
  element: HTMLElement;
}

interface AuditState {
  enabled: boolean;
  elements: AuditElement[];
  showPanel: boolean;
  currentPage: string;
  registry: Record<string, ElementRegistryEntry>;
}

interface AuditContextValue {
  state: AuditState;
  toggleOverlay: () => void;
  rescan: () => void;
  setStatus: (id: string, status: AuditElement['status']) => void;
  addNote: (id: string, note: string) => void;
  exportChecklist: () => void;
  clearAll: () => void;
  getElementById: (id: string) => AuditElement | undefined;
}

const AuditContext = createContext<AuditContextValue | null>(null);

// Storage key for UI state
const UI_STATE_KEY = 'okboxbox-audit-ui-state';

// Get element type
function getElementType(el: HTMLElement): AuditElement['type'] {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'select') return 'select';
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type;
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    return 'input';
  }
  if (el.getAttribute('role') === 'button') return 'button';
  if (el.onclick || el.getAttribute('onclick')) return 'button';
  return 'other';
}

// Get readable text for element
function getElementText(el: HTMLElement): string {
  // Try aria-label first
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Try title
  const title = el.getAttribute('title');
  if (title) return title;
  
  // Try placeholder for inputs
  if (el.tagName.toLowerCase() === 'input') {
    const placeholder = (el as HTMLInputElement).placeholder;
    if (placeholder) return `[${placeholder}]`;
  }
  
  // Get text content (limited)
  const text = el.textContent?.trim().slice(0, 50) || '';
  if (text) return text;
  
  // Fallback to tag + class
  return `<${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}>`;
}

// Generate CSS selector for element
function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  
  const tag = el.tagName.toLowerCase();
  const classes = el.className ? `.${el.className.split(' ').filter(c => c && !c.includes('/')).slice(0, 2).join('.')}` : '';
  
  return `${tag}${classes}`;
}

// Provider Component
export function DevAuditProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuditState>(() => {
    // Load registry and UI state from localStorage
    const registry = loadRegistry();
    let showPanel = true;
    try {
      const saved = localStorage.getItem(UI_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        showPanel = parsed.showPanel ?? true;
      }
    } catch (e) {
      console.error('[Audit] Failed to load UI state:', e);
    }
    return {
      enabled: false,
      elements: [],
      showPanel,
      currentPage: window.location.pathname,
      registry,
    };
  });

  // Scan DOM for interactive elements
  const scanElements = useCallback(() => {
    const selectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[onclick]',
      '[tabindex="0"]',
    ];

    const found = document.querySelectorAll(selectors.join(', '));
    const elements: AuditElement[] = [];
    const currentPath = window.location.pathname;
    const pageInfo = getPageInfo(currentPath);
    
    let localIndex = 0;
    found.forEach((el) => {
      const htmlEl = el as HTMLElement;
      
      // Skip hidden elements
      const style = window.getComputedStyle(htmlEl);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }
      
      // Skip elements outside viewport (with some margin)
      const rect = htmlEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      // Skip audit overlay elements themselves
      if (htmlEl.closest('[data-audit-overlay]')) return;
      
      localIndex++;
      const permanentId = generateElementId(currentPath, localIndex);
      const elementType = getElementType(htmlEl);
      const elementText = getElementText(htmlEl);
      const selector = getSelector(htmlEl);
      
      // Check if this element exists in registry
      const existingEntry = state.registry[permanentId];
      
      elements.push({
        id: permanentId,
        localIndex,
        type: elementType,
        text: elementText,
        selector,
        rect,
        status: existingEntry?.status || 'untested',
        notes: existingEntry?.notes || '',
        element: htmlEl,
      });
      
      // Update registry with this element
      if (!existingEntry) {
        setState(prev => ({
          ...prev,
          registry: {
            ...prev.registry,
            [permanentId]: {
              id: permanentId,
              tier: pageInfo.tier,
              pageCode: pageInfo.code,
              pageName: pageInfo.name,
              pagePath: currentPath,
              elementType,
              elementText,
              selector,
              tested: false,
              status: 'untested',
              notes: '',
              lastUpdated: new Date().toISOString(),
            },
          },
        }));
      }
    });

    setState(prev => ({
      ...prev,
      elements,
      currentPage: currentPath,
    }));

    console.log(`[Audit] Scanned ${elements.length} elements on ${pageInfo.name} (${pageInfo.tier}-${pageInfo.code})`);
  }, [state.registry]);

  // Toggle overlay
  const toggleOverlay = useCallback(() => {
    setState(prev => {
      const newEnabled = !prev.enabled;
      if (newEnabled) {
        // Scan when enabling
        setTimeout(scanElements, 100);
      }
      return { ...prev, enabled: newEnabled };
    });
  }, [scanElements]);

  // Rescan
  const rescan = useCallback(() => {
    scanElements();
  }, [scanElements]);

  // Set element status
  const setStatus = useCallback((id: string, status: AuditElement['status']) => {
    setState(prev => {
      const newRegistry = { ...prev.registry };
      if (newRegistry[id]) {
        newRegistry[id] = {
          ...newRegistry[id],
          status,
          tested: status !== 'untested',
          lastUpdated: new Date().toISOString(),
        };
      }
      saveRegistry(newRegistry);
      return {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, status } : el
        ),
        registry: newRegistry,
      };
    });
  }, []);

  // Add note to element
  const addNote = useCallback((id: string, note: string) => {
    setState(prev => {
      const newRegistry = { ...prev.registry };
      if (newRegistry[id]) {
        newRegistry[id] = {
          ...newRegistry[id],
          notes: note,
          lastUpdated: new Date().toISOString(),
        };
      }
      saveRegistry(newRegistry);
      return {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, notes: note } : el
        ),
        registry: newRegistry,
      };
    });
  }, []);

  // Get element by ID
  const getElementById = useCallback((id: string) => {
    return state.elements.find(el => el.id === id);
  }, [state.elements]);

  // Export checklist as markdown
  const exportChecklist = useCallback(() => {
    exportRegistryMarkdown(state.registry);
  }, [state.registry]);

  // Clear all statuses on current page
  const clearAll = useCallback(() => {
    setState(prev => {
      const newRegistry = { ...prev.registry };
      prev.elements.forEach(el => {
        if (newRegistry[el.id]) {
          newRegistry[el.id] = {
            ...newRegistry[el.id],
            status: 'untested',
            tested: false,
            notes: '',
            lastUpdated: new Date().toISOString(),
          };
        }
      });
      saveRegistry(newRegistry);
      return {
        ...prev,
        elements: prev.elements.map(el => ({ ...el, status: 'untested', notes: '' })),
        registry: newRegistry,
      };
    });
  }, []);

  // Keyboard shortcut: Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleOverlay]);

  // Save UI state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(UI_STATE_KEY, JSON.stringify({
        showPanel: state.showPanel,
      }));
    } catch (e) {
      console.error('[Audit] Failed to save UI state:', e);
    }
  }, [state.showPanel]);

  // Rescan on route change
  useEffect(() => {
    if (state.enabled && window.location.pathname !== state.currentPage) {
      setTimeout(scanElements, 500);
    }
  }, [state.enabled, state.currentPage, scanElements]);

  const value: AuditContextValue = {
    state,
    toggleOverlay,
    rescan,
    setStatus,
    addNote,
    exportChecklist,
    clearAll,
    getElementById,
  };

  return (
    <AuditContext.Provider value={value}>
      {children}
      {state.enabled && <AuditOverlayUI />}
    </AuditContext.Provider>
  );
}

// Hook to use audit context
export function useDevAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useDevAudit must be used within DevAuditProvider');
  }
  return context;
}

// Get status icon
function getStatusIcon(status: AuditElement['status']) {
  switch (status) {
    case 'working': return <CheckCircle size={14} className="text-green-500" />;
    case 'broken': return <XCircle size={14} className="text-red-500" />;
    case 'needs-work': return <AlertTriangle size={14} className="text-yellow-500" />;
    default: return <Circle size={14} className="text-white/30" />;
  }
}

// Get status colors
function getStatusColors(status: AuditElement['status']) {
  switch (status) {
    case 'working': return { border: 'border-green-500', bg: 'bg-green-500/10', badge: 'bg-green-500' };
    case 'broken': return { border: 'border-red-600', bg: 'bg-red-500/20', badge: 'bg-red-600' };
    case 'needs-work': return { border: 'border-yellow-500', bg: 'bg-yellow-500/10', badge: 'bg-yellow-500' };
    default: return { border: 'border-red-500', bg: 'bg-red-500/10', badge: 'bg-red-500' };
  }
}

// Overlay UI Component
function AuditOverlayUI() {
  const { state, toggleOverlay, rescan, setStatus, exportChecklist, clearAll } = useDevAudit();
  const [showPanel, setShowPanel] = useState(true);
  const [filter, setFilter] = useState<'all' | 'untested' | 'working' | 'broken' | 'needs-work'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredElements = state.elements.filter(el => {
    if (filter === 'all') return true;
    return el.status === filter;
  });

  const testedCount = state.elements.filter(e => e.status !== 'untested').length;
  const progress = state.elements.length > 0 ? (testedCount / state.elements.length) * 100 : 0;

  // Cycle through statuses on click
  const cycleStatus = (id: string) => {
    const el = state.elements.find(e => e.id === id);
    if (!el) return;
    const statuses: AuditElement['status'][] = ['untested', 'working', 'broken', 'needs-work'];
    const currentIndex = statuses.indexOf(el.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    setStatus(id, nextStatus);
  };

  // Scroll to element when clicked in panel
  const scrollToElement = (el: AuditElement) => {
    el.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.element.style.outline = '3px solid #f97316';
    setTimeout(() => {
      el.element.style.outline = '';
    }, 2000);
  };

  return (
    <div data-audit-overlay="true" className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Element Markers */}
      {state.elements.map(el => {
        const isHovered = hoveredId === el.id;
        return (
          <div
            key={el.id}
            className="absolute pointer-events-auto cursor-pointer transition-all"
            style={{
              left: el.rect.left + window.scrollX,
              top: el.rect.top + window.scrollY,
              width: el.rect.width,
              height: el.rect.height,
            }}
            onClick={() => cycleStatus(el.id)}
            onMouseEnter={() => setHoveredId(el.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Outline */}
            {(() => {
              const colors = getStatusColors(el.status);
              return (
                <div 
                  className={`absolute inset-0 border-2 transition-colors ${colors.border} ${colors.bg} ${isHovered ? 'border-4' : ''}`}
                />
              );
            })()}
            
            {/* ID Badge */}
            {(() => {
              const colors = getStatusColors(el.status);
              return (
                <div 
                  className={`absolute -top-4 -left-2 px-1 py-0.5 flex items-center justify-center text-[8px] font-bold ${colors.badge} text-white whitespace-nowrap`}
                >
                  {el.id}
                </div>
              );
            })()}

            {/* Tooltip on hover */}
            {isHovered && (
              <div className="absolute left-0 top-full mt-1 bg-black/95 border border-white/20 px-3 py-2 text-[10px] text-white whitespace-nowrap z-50 min-w-[200px]">
                <div className="font-bold text-[11px] mb-1">{el.id}</div>
                <div className="text-white/50 uppercase text-[9px]">{el.type}</div>
                <div className="text-white/80 mt-1">{el.text.slice(0, 40)}</div>
                <div className="text-white/40 mt-2 border-t border-white/10 pt-1">Click to cycle status</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Control Panel */}
      {showPanel && (
        <div 
          className="fixed right-4 top-20 w-80 bg-[#0d0d0d] border border-white/20 shadow-2xl pointer-events-auto max-h-[80vh] flex flex-col"
          data-audit-overlay="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-red-500/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Audit Mode
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 text-white/50 hover:text-white"
              >
                <EyeOff size={14} />
              </button>
              <button
                onClick={toggleOverlay}
                className="p-1 text-white/50 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span>Progress</span>
              <span>{testedCount} / {state.elements.length}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
            <button
              onClick={rescan}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white rounded"
            >
              <RefreshCw size={12} />
              Rescan
            </button>
            <button
              onClick={exportChecklist}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white rounded"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white rounded"
            >
              <X size={12} />
              Clear
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10 flex-wrap">
            {(['all', 'untested', 'working', 'broken', 'needs-work'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded ${
                  filter === f 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {f === 'needs-work' ? 'needs' : f}
              </button>
            ))}
          </div>

          {/* Element List */}
          <div className="flex-1 overflow-y-auto">
            {filteredElements.map(el => (
              <div
                key={el.id}
                className={`flex items-start gap-2 px-4 py-2 border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                  hoveredId === el.id ? 'bg-white/10' : ''
                }`}
                onClick={() => scrollToElement(el)}
                onMouseEnter={() => setHoveredId(el.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleStatus(el.id);
                  }}
                  className="mt-0.5"
                >
                  {getStatusIcon(el.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1 rounded ${
                      el.type === 'button' ? 'bg-blue-500/20 text-blue-400' :
                      el.type === 'link' ? 'bg-purple-500/20 text-purple-400' :
                      el.type === 'input' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-white/20 text-white/60'
                    }`}>
                      {el.type}
                    </span>
                    <span className="text-[9px] text-white/50 font-mono">{el.id}</span>
                  </div>
                  <div className="text-[11px] text-white/80 truncate mt-0.5">
                    {el.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/10 text-[10px] text-white/40">
            Press <kbd className="px-1 bg-white/10 rounded">Ctrl+Shift+A</kbd> to toggle
          </div>
        </div>
      )}

      {/* Minimized Panel Toggle */}
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed right-4 top-20 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center pointer-events-auto shadow-lg hover:bg-red-400 transition-colors"
          data-audit-overlay="true"
        >
          <List size={20} className="text-white" />
        </button>
      )}
    </div>
  );
}

// Standalone toggle button (can be placed anywhere)
export function AuditToggleButton() {
  const { state, toggleOverlay } = useDevAudit();
  
  return (
    <button
      onClick={toggleOverlay}
      className={`fixed bottom-4 right-4 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors z-50 ${
        state.enabled 
          ? 'bg-red-500 text-white' 
          : 'bg-white/10 text-white/60 hover:bg-white/20'
      }`}
    >
      {state.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
      {state.enabled ? 'Exit Audit' : 'Audit Mode'}
    </button>
  );
}
