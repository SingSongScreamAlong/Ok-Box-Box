/**
 * DriverAvailabilityPlanner — Team event availability calendar
 *
 * Allows team members to mark availability for upcoming events.
 * Shows coverage warnings when insufficient drivers are available.
 *
 * Phase 4b: localStorage-based availability state
 * TODO Phase 4b+: Server-side persistence via driver_availability table
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar, Users, CheckCircle2, XCircle, Clock,
  AlertTriangle, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

const ORBITRON = { fontFamily: 'Orbitron, sans-serif' };
const STORAGE_KEY = 'okbb_driver_availability';

interface DriverInfo {
  id: string;
  name: string;
  iRating?: number;
}

interface AvailabilityEntry {
  driverId: string;
  date: string;
  status: 'available' | 'partial' | 'unavailable';
  notes?: string;
}

interface EventSlot {
  date: string;
  label: string;
  minDrivers: number;
}

interface DriverAvailabilityPlannerProps {
  drivers: DriverInfo[];
  events: EventSlot[];
  teamId: string;
  currentDriverId?: string;
}

function loadAvailability(teamId: string): AvailabilityEntry[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${teamId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAvailability(teamId: string, entries: AvailabilityEntry[]) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${teamId}`, JSON.stringify(entries));
  } catch {}
}

const STATUS_COLORS = {
  available: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: CheckCircle2 },
  partial: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: Clock },
  unavailable: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: XCircle },
};

export function DriverAvailabilityPlanner({
  drivers,
  events,
  teamId,
  currentDriverId,
}: DriverAvailabilityPlannerProps) {
  const [availability, setAvailability] = useState<AvailabilityEntry[]>(() => loadAvailability(teamId));
  const [weekOffset, setWeekOffset] = useState(0);

  const visibleEvents = useMemo(() => {
    const start = weekOffset * 4;
    return events.slice(start, start + 4);
  }, [events, weekOffset]);

  const getStatus = useCallback((driverId: string, date: string): 'available' | 'partial' | 'unavailable' | null => {
    const entry = availability.find(a => a.driverId === driverId && a.date === date);
    return entry?.status ?? null;
  }, [availability]);

  const cycleStatus = useCallback((driverId: string, date: string) => {
    if (currentDriverId && driverId !== currentDriverId) return;

    const current = getStatus(driverId, date);
    const next: 'available' | 'partial' | 'unavailable' =
      current === null ? 'available' :
      current === 'available' ? 'partial' :
      current === 'partial' ? 'unavailable' : 'available';

    const updated = availability.filter(a => !(a.driverId === driverId && a.date === date));
    updated.push({ driverId, date, status: next });
    setAvailability(updated);
    saveAvailability(teamId, updated);
  }, [availability, currentDriverId, getStatus, teamId]);

  const getCoverage = useCallback((date: string, minDrivers: number) => {
    const available = drivers.filter(d => {
      const status = getStatus(d.id, date);
      return status === 'available' || status === 'partial';
    });
    const full = drivers.filter(d => getStatus(d.id, date) === 'available');
    return {
      total: available.length,
      full: full.length,
      sufficient: available.length >= minDrivers,
      warning: available.length < minDrivers + 1,
    };
  }, [drivers, getStatus]);

  if (drivers.length === 0 || events.length === 0) {
    return (
      <div className="border border-white/10 bg-[#0e0e0e]/80">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-white/40" style={ORBITRON}>Availability</h2>
        </div>
        <div className="px-5 py-6 text-center">
          <Users className="w-6 h-6 text-white/15 mx-auto mb-2" />
          <p className="text-[11px] text-white/25">No upcoming events configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0e0e0e]/80">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#f97316]/50" />
          <h2 className="text-sm uppercase tracking-[0.15em] text-[#f97316]" style={ORBITRON}>Driver Availability</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="p-1.5 text-white/20 hover:text-white/50 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={(weekOffset + 1) * 4 >= events.length}
            className="p-1.5 text-white/20 hover:text-white/50 disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-2.5 text-left text-[9px] text-white/25 uppercase tracking-wider w-36">Driver</th>
              {visibleEvents.map(event => {
                const coverage = getCoverage(event.date, event.minDrivers);
                return (
                  <th key={event.date} className="px-3 py-2.5 text-center min-w-[100px]">
                    <div className="text-[10px] text-white/50 font-medium">{event.label}</div>
                    <div className="text-[8px] text-white/20 mt-0.5">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={`text-[8px] mt-1 ${coverage.sufficient ? 'text-green-400/50' : 'text-red-400/70'}`}>
                      {coverage.total}/{event.minDrivers} drivers
                      {!coverage.sufficient && <AlertTriangle className="w-2.5 h-2.5 inline ml-1" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {drivers.map(driver => (
              <tr key={driver.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] text-white/40 font-mono">
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <div className={`text-[11px] ${driver.id === currentDriverId ? 'text-[#f97316]' : 'text-white/60'}`}>
                        {driver.name}
                      </div>
                      {driver.iRating && <div className="text-[8px] text-white/20">{driver.iRating} iR</div>}
                    </div>
                  </div>
                </td>
                {visibleEvents.map(event => {
                  const status = getStatus(driver.id, event.date);
                  const canEdit = !currentDriverId || driver.id === currentDriverId;
                  const config = status ? STATUS_COLORS[status] : null;
                  const Icon = config?.icon;

                  return (
                    <td key={event.date} className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => cycleStatus(driver.id, event.date)}
                        disabled={!canEdit}
                        className={`inline-flex items-center justify-center w-8 h-8 border transition-colors ${
                          config
                            ? `${config.bg} ${config.border}`
                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
                        } ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                        title={canEdit ? 'Click to toggle availability' : 'Only you can set your availability'}
                      >
                        {Icon ? (
                          <Icon className={`w-3.5 h-3.5 ${config!.text}`} />
                        ) : (
                          <span className="text-[9px] text-white/15">—</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Coverage warnings */}
      {visibleEvents.some(e => !getCoverage(e.date, e.minDrivers).sufficient) && (
        <div className="px-5 py-3 border-t border-red-500/20 bg-red-500/[0.03]">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-red-400/60" />
            <span className="text-[10px] text-red-400/60">
              Coverage warning — some events don't have enough confirmed drivers
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4">
        {(['available', 'partial', 'unavailable'] as const).map(status => {
          const config = STATUS_COLORS[status];
          const Icon = config.icon;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <Icon className={`w-3 h-3 ${config.text}`} />
              <span className="text-[8px] text-white/25 capitalize">{status}</span>
            </div>
          );
        })}
        <span className="text-[8px] text-white/15 ml-auto">Click cells to toggle</span>
      </div>
    </div>
  );
}
