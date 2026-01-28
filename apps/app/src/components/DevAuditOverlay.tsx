/**
 * DevAuditOverlay - Visual Testing System
 * 
 * Provides a reusable overlay that marks ALL interactive elements on the page
 * with numbered markers for systematic testing.
 * 
 * Toggle: Ctrl+Shift+A
 * 
 * Features:
 * - Scans DOM for buttons, links, inputs, selects
 * - Numbers each element with a red overlay marker
 * - Generates exportable checklist
 * - Persists state in localStorage
 * - Can be activated multiple times
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { X, Download, RefreshCw, Eye, EyeOff, List, CheckSquare, Square } from 'lucide-react';

// Types
interface AuditElement {
  id: number;
  type: 'button' | 'link' | 'input' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'other';
  text: string;
  selector: string;
  rect: DOMRect;
  tested: boolean;
  notes: string;
  element: HTMLElement;
}

interface AuditState {
  enabled: boolean;
  elements: AuditElement[];
  showPanel: boolean;
  currentPage: string;
}

interface AuditContextValue {
  state: AuditState;
  toggleOverlay: () => void;
  rescan: () => void;
  markTested: (id: number) => void;
  addNote: (id: number, note: string) => void;
  exportChecklist: () => void;
  clearAll: () => void;
}

const AuditContext = createContext<AuditContextValue | null>(null);

// Storage key
const STORAGE_KEY = 'okboxbox-audit-state';

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
    // Load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          elements: [], // Don't persist elements, they need fresh scan
          enabled: false, // Start disabled
        };
      }
    } catch (e) {
      console.error('[Audit] Failed to load state:', e);
    }
    return {
      enabled: false,
      elements: [],
      showPanel: true,
      currentPage: window.location.pathname,
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
    
    found.forEach((el, index) => {
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
      
      elements.push({
        id: index + 1,
        type: getElementType(htmlEl),
        text: getElementText(htmlEl),
        selector: getSelector(htmlEl),
        rect,
        tested: false,
        notes: '',
        element: htmlEl,
      });
    });

    setState(prev => ({
      ...prev,
      elements,
      currentPage: window.location.pathname,
    }));

    console.log(`[Audit] Scanned ${elements.length} interactive elements`);
  }, []);

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

  // Mark element as tested
  const markTested = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, tested: !el.tested } : el
      ),
    }));
  }, []);

  // Add note to element
  const addNote = useCallback((id: number, note: string) => {
    setState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, notes: note } : el
      ),
    }));
  }, []);

  // Export checklist as markdown
  const exportChecklist = useCallback(() => {
    const lines = [
      `# Audit Checklist - ${state.currentPage}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      `Total Elements: ${state.elements.length}`,
      `Tested: ${state.elements.filter(e => e.tested).length}`,
      `Remaining: ${state.elements.filter(e => !e.tested).length}`,
      '',
      '## Elements',
      '',
    ];

    state.elements.forEach(el => {
      const status = el.tested ? '[x]' : '[ ]';
      lines.push(`${status} **#${el.id}** - ${el.type.toUpperCase()} - "${el.text}"`);
      lines.push(`   - Selector: \`${el.selector}\``);
      if (el.notes) {
        lines.push(`   - Notes: ${el.notes}`);
      }
      lines.push('');
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${state.currentPage.replace(/\//g, '-')}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // Clear all
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      elements: prev.elements.map(el => ({ ...el, tested: false, notes: '' })),
    }));
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

  // Save state to localStorage (excluding elements)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        enabled: state.enabled,
        showPanel: state.showPanel,
        currentPage: state.currentPage,
      }));
    } catch (e) {
      console.error('[Audit] Failed to save state:', e);
    }
  }, [state.enabled, state.showPanel, state.currentPage]);

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
    markTested,
    addNote,
    exportChecklist,
    clearAll,
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

// Overlay UI Component
function AuditOverlayUI() {
  const { state, toggleOverlay, rescan, markTested, exportChecklist, clearAll } = useDevAudit();
  const [showPanel, setShowPanel] = useState(true);
  const [filter, setFilter] = useState<'all' | 'untested' | 'tested'>('all');
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const filteredElements = state.elements.filter(el => {
    if (filter === 'untested') return !el.tested;
    if (filter === 'tested') return el.tested;
    return true;
  });

  const testedCount = state.elements.filter(e => e.tested).length;
  const progress = state.elements.length > 0 ? (testedCount / state.elements.length) * 100 : 0;

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
            onClick={() => markTested(el.id)}
            onMouseEnter={() => setHoveredId(el.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Outline */}
            <div 
              className={`absolute inset-0 border-2 transition-colors ${
                el.tested 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-red-500 bg-red-500/10'
              } ${isHovered ? 'border-4' : ''}`}
            />
            
            {/* Number Badge */}
            <div 
              className={`absolute -top-3 -left-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                el.tested 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              {el.id}
            </div>

            {/* Tooltip on hover */}
            {isHovered && (
              <div className="absolute left-0 top-full mt-1 bg-black/90 border border-white/20 px-2 py-1 text-[10px] text-white whitespace-nowrap z-50">
                <div className="font-bold">{el.type.toUpperCase()}</div>
                <div className="text-white/70">{el.text}</div>
                <div className="text-white/50 mt-1">Click to {el.tested ? 'unmark' : 'mark'} tested</div>
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
              <Square size={12} />
              Clear
            </button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10">
            {(['all', 'untested', 'tested'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded ${
                  filter === f 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {f}
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
                    markTested(el.id);
                  }}
                  className="mt-0.5"
                >
                  {el.tested ? (
                    <CheckSquare size={14} className="text-green-500" />
                  ) : (
                    <Square size={14} className="text-red-500" />
                  )}
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
                    <span className="text-xs text-white font-mono">#{el.id}</span>
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
