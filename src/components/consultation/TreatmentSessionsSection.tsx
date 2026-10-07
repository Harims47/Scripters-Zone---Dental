import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { api } from '../../lib/api';
import type { TreatmentPlan, TreatmentPlanItem, TreatmentSession } from '../../types/domain';

interface TreatmentSessionsSectionProps {
  patientId: string;
  currentVisitId?: string;
  plan: TreatmentPlan | null;
  onRefresh: () => Promise<void>;
  onUpdatePlan: (updater: (prev: TreatmentPlan | null) => TreatmentPlan | null) => void;
  targetItemId?: string | null;
  targetSessionId?: string | null;
}

export function TreatmentSessionsSection({
  patientId,
  currentVisitId,
  plan,
  onRefresh,
  onUpdatePlan,
  targetItemId,
  targetSessionId
}: TreatmentSessionsSectionProps) {
  // Modal for editing/completing a sitting
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<TreatmentPlanItem | null>(null);
  const [activeSession, setActiveSession] = useState<TreatmentSession | null>(null);

  // Form state
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isCompletedCheck, setIsCompletedCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = (plan?.items || []).filter(
    (item) => (item.totalSittings ?? 1) > 0 || (item.sessions && item.sessions.length > 0)
  );

  // Open edit/complete modal
  const openEditModal = (item: TreatmentPlanItem, session: TreatmentSession) => {
    setActiveItem(item);
    setActiveSession(session);
    const dateVal = session.actualDate || session.plannedDate;
    setSessionDate(dateVal ? new Date(dateVal).toISOString().split('T')[0] : '');
    setSessionNotes(session.clinicalNotes || session.workPerformed || '');
    setIsCompletedCheck(session.status === 'Completed');
    setErrorMsg(null);
    setModalOpen(true);
  };

  // Handle auto-focus and auto-opening of target item / session
  const hasAutoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetItemId || !plan?.items || plan.items.length === 0) return;
    const lookupKey = `${targetItemId}-${targetSessionId || 'first'}`;
    if (hasAutoOpenedRef.current === lookupKey) return;

    const item = plan.items.find((i) => i.id === targetItemId);
    if (!item) return;

    const sessions = item.sessions || [];
    let session = targetSessionId
      ? sessions.find((s) => s.id === targetSessionId)
      : null;

    if (!session) {
      session = sessions.find((s) => s.status === 'Planned' || s.status === 'In Progress') || sessions[0];
    }

    if (session) {
      hasAutoOpenedRef.current = lookupKey;
      openEditModal(item, session);

      setTimeout(() => {
        const el = document.getElementById(`treatment-card-${item.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 150);
    }
  }, [targetItemId, targetSessionId, plan]);

  // Save changes to sitting
  const handleSaveSession = async () => {
    if (!activeItem || !activeSession) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isCompletedCheck && activeSession.status !== 'Completed') {
        // Complete the sitting
        const res = await api.post<{ session: TreatmentSession; item: TreatmentPlanItem }>(
          `/api/patients/${patientId}/treatment-plan/items/${activeItem.id}/sessions/${activeSession.id}/complete`,
          {
            visitId: currentVisitId,
            actualDate: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
            clinicalNotes: sessionNotes.trim() || undefined,
            workPerformed: sessionNotes.trim() || 'Sitting completed'
          }
        );

        onUpdatePlan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.map((i) => (i.id === activeItem.id ? res.item : i))
          };
        });
      } else {
        // Update sitting date & notes
        const targetStatus = isCompletedCheck ? 'Completed' : 'Planned';
        const res = await api.patch<TreatmentSession>(
          `/api/patients/${patientId}/treatment-plan/items/${activeItem.id}/sessions/${activeSession.id}`,
          {
            plannedDate: sessionDate ? new Date(sessionDate).toISOString() : null,
            actualDate: isCompletedCheck ? (sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString()) : null,
            clinicalNotes: sessionNotes.trim() || null,
            workPerformed: sessionNotes.trim() || null,
            status: targetStatus
          }
        );

        onUpdatePlan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            items: prev.items.map((i) => {
              if (i.id !== activeItem.id) return i;
              const updatedSessions = (i.sessions || []).map((s) => (s.id === res.id ? res : s));
              const allDone = updatedSessions.every((s) => s.status === 'Completed');
              return {
                ...i,
                status: allDone ? 'Completed' : 'In Progress',
                sessions: updatedSessions
              };
            })
          };
        });
      }

      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save sitting');
    } finally {
      setLoading(false);
    }
  };

  // Quick mark completed
  const handleQuickComplete = async (item: TreatmentPlanItem, session: TreatmentSession) => {
    try {
      const res = await api.post<{ session: TreatmentSession; item: TreatmentPlanItem }>(
        `/api/patients/${patientId}/treatment-plan/items/${item.id}/sessions/${session.id}/complete`,
        {
          visitId: currentVisitId,
          workPerformed: session.clinicalNotes || 'Completed during visit'
        }
      );

      onUpdatePlan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === item.id ? res.item : i))
        };
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to mark sitting completed');
    }
  };

  // Add another sitting to an existing treatment
  const handleAddSitting = async (item: TreatmentPlanItem) => {
    try {
      const nextNum = (item.sessions?.length || 0) + 1;
      const res = await api.post<TreatmentSession>(
        `/api/patients/${patientId}/treatment-plan/items/${item.id}/sessions`,
        {
          stage: `Sitting ${nextNum}`
        }
      );

      onUpdatePlan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) => {
            if (i.id !== item.id) return i;
            const updatedSessions = [...(i.sessions || []), res].sort(
              (a, b) => a.sittingNumber - b.sittingNumber
            );
            return {
              ...i,
              totalSittings: updatedSessions.length,
              status: 'In Progress',
              sessions: updatedSessions
            };
          })
        };
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to add sitting');
    }
  };

  // Mark overall treatment completed
  const handleMarkOverallComplete = async (item: TreatmentPlanItem) => {
    if (!confirm(`Mark overall treatment "${item.catalogItem?.name || 'Procedure'}" as Completed?`)) {
      return;
    }
    try {
      const res = await api.patch<TreatmentPlanItem>(
        `/api/patients/${patientId}/treatment-plan/items/${item.id}`,
        {
          status: 'Completed',
          completedVisitId: currentVisitId || item.completedVisitId
        }
      );
      onUpdatePlan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === item.id ? res : i))
        };
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update treatment status');
    }
  };

  return (
    <div className="space-y-3.5 w-full min-w-0">
      {items.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-200">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No Treatment Sessions</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Procedures configured with sittings will appear here for sitting tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const sessions = item.sessions || [];
            const isCompleted = item.status === 'Completed';

            return (
              <div
                key={item.id}
                id={`treatment-card-${item.id}`}
                className={`bg-white rounded-xl border transition-all overflow-hidden ${
                  item.id === targetItemId
                    ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                    : 'border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* ── Treatment Header ────────────────────────────── */}
                <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.toothNumber ? (
                      <span className="font-bold text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200">
                        Tooth {item.toothNumber}
                      </span>
                    ) : (
                      <span className="font-semibold text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        General
                      </span>
                    )}

                    <span className="font-bold text-sm text-slate-900">
                      {item.catalogItem?.name || 'Treatment Procedure'}
                      {item.catalogItem?.variant && (
                        <span className="text-slate-500 font-normal ml-1">
                          ({item.catalogItem.variant})
                        </span>
                      )}
                    </span>

                    {item.id === targetItemId && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-600" /> Active Continuation
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Overall Treatment Status: In Progress or Completed */}
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold px-2 py-0.5 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </Badge>

                    {!isCompleted && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkOverallComplete(item)}
                        className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Treatment Done
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Sittings List ─────────────────────────────────── */}
                <div className="divide-y divide-slate-100">
                  {sessions.map((session) => {
                    const isSessionDone = session.status === 'Completed';
                    const displayDate = session.actualDate || session.plannedDate;
                    const isTargetSession = session.id === targetSessionId;

                    return (
                      <div
                        key={session.id}
                        id={`session-row-${session.id}`}
                        className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                          isTargetSession
                            ? 'bg-indigo-50/80 border-y border-indigo-200/80 font-medium'
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Sitting Number */}
                          <div className="flex items-center gap-1.5 shrink-0 font-bold text-slate-800 min-w-[75px]">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isSessionDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {session.sittingNumber}
                            </span>
                            <span>Sitting {session.sittingNumber}</span>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-1 text-slate-600 shrink-0 min-w-[95px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {displayDate ? new Date(displayDate).toLocaleDateString() : 'No date set'}
                            </span>
                          </div>

                          {/* Notes */}
                          <div className="text-slate-600 truncate max-w-xs md:max-w-md">
                            {session.clinicalNotes || session.workPerformed ? (
                              <span title={session.clinicalNotes || session.workPerformed || ''}>
                                {session.clinicalNotes || session.workPerformed}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No notes</span>
                            )}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Status: Pending or Completed */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isSessionDone
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {isSessionDone ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-slate-400" /> Pending
                              </>
                            )}
                          </span>

                          {/* Quick Complete Button (if pending) */}
                          {!isSessionDone && (
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleQuickComplete(item, session)}
                            >
                              Mark Completed
                            </Button>
                          )}

                          {/* Edit Sitting Date & Notes Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                            onClick={() => openEditModal(item, session)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Footer: One Simple Add Sitting Button ────────── */}
                <div className="px-3.5 py-2 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                    onClick={() => handleAddSitting(item)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" /> Add Sitting
                  </Button>

                  <span className="text-[11px] text-slate-400">
                    {sessions.filter((s) => s.status === 'Completed').length} of {sessions.length} completed
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Simple Edit / Complete Modal ──────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full p-5 bg-white rounded-xl shadow-lg">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm font-bold text-slate-900">
              Sitting {activeSession?.sittingNumber} — {activeItem?.catalogItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update date, notes, or mark this sitting completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Date</label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-white text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">Notes / Work Done</label>
              <Textarea
                placeholder="Enter clinical notes or work performed..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                className="bg-white text-xs resize-none"
              />
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <label htmlFor="modal-completed-check" className="font-semibold text-slate-800 cursor-pointer">
                Mark as Completed
              </label>
              <input
                id="modal-completed-check"
                type="checkbox"
                checked={isCompletedCheck}
                onChange={(e) => setIsCompletedCheck(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setModalOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs font-semibold h-8 bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleSaveSession}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Sitting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
