import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Check,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  X,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Camera,
  Clock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { api } from '../../lib/api';
import type { TreatmentPlan, TreatmentCatalog, TreatmentPlanItem, DentalImage } from '../../types/domain';
import { FdiToothChart } from './FdiToothChart';
import { getToothInfo } from '../../lib/toothMetadata';
import { DentalImagingSection } from './DentalImagingSection';
import { TreatmentSessionsSection } from './TreatmentSessionsSection';

export function TreatmentPlanUI({
  patientId,
  currentVisitId,
  treatmentFee,
  initialTreatmentZeroReason,
  onSaveTreatmentFee,
  onDone,
  onCancel,
  onRegisterRollback,
  initialEdit = false,
  initialView,
  targetItemId,
  targetSessionId
}: {
  patientId: string;
  currentVisitId?: string;
  treatmentFee?: number;
  initialTreatmentZeroReason?: string;
  onSaveTreatmentFee?: (fee: number, zeroReason?: string) => void;
  onDone?: (noProcedureReason?: string) => void;
  onCancel?: () => void;
  onRegisterRollback?: (rollbackFn: () => Promise<void>) => void;
  initialEdit?: boolean;
  initialView?: 'planning' | 'imaging' | 'sessions';
  targetItemId?: string | null;
  targetSessionId?: string | null;
}) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [catalog, setCatalog] = useState<TreatmentCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localTreatmentFee, setLocalTreatmentFee] = useState<string>(
    treatmentFee !== undefined ? String(treatmentFee) : '0'
  );
  const lastPropFee = useRef<number | undefined>(treatmentFee);
  const [treatmentZeroReason, setTreatmentZeroReason] = useState<string>(initialTreatmentZeroReason || '');
  const [treatmentZeroError, setTreatmentZeroError] = useState<string>('');
  const [isZeroFeeModalOpen, setIsZeroFeeModalOpen] = useState<boolean>(false);

  // Mandatory Procedure reason state
  const [noProcedureReason, setNoProcedureReason] = useState<string>(initialTreatmentZeroReason || '');
  const [noProcedureError, setNoProcedureError] = useState<string>('');
  const [isNoProcedureModalOpen, setIsNoProcedureModalOpen] = useState<boolean>(false);

  // Session tracking to ensure closing without "Done" does NOT keep saved items
  const sessionCreatedItemIds = useRef<string[]>([]);
  const isConfirmed = useRef<boolean>(false);
  const imagingRollbackRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const imagingCommitRef = useRef<() => void>(() => {});

  const rollback = useCallback(async () => {
    if (sessionCreatedItemIds.current.length > 0) {
      const idsToDelete = [...sessionCreatedItemIds.current];
      sessionCreatedItemIds.current = [];
      try {
        await Promise.all(
          idsToDelete.map(id =>
            api.delete(`/api/patients/${patientId}/treatment-plan/items/${id}`)
          )
        );
      } catch (err) {
        console.error('Failed to rollback treatment items:', err);
      }
    }
    await imagingRollbackRef.current();
  }, [patientId]);

  useEffect(() => {
    onRegisterRollback?.(rollback);
  }, [onRegisterRollback, rollback]);

  useEffect(() => {
    return () => {
      if (!isConfirmed.current) {
        rollback();
      }
    };
  }, [rollback]);

  const ZERO_FEE_REASONS = [
    'Follow-up / Review',
    'Included in Package',
    'Warranty / Revision',
    'Complimentary / Courtesy',
    'Observation Only'
  ];

  const NO_PROCEDURE_REASONS = [
    'Consultation / Examination Only',
    'Diagnostic & Advice Only',
    'Prescription & Medication Only',
    'Patient Refused / Deferred Treatment',
    'Awaiting Diagnostics (X-Ray/Lab)',
    'Referred to Specialist / External Facility',
    'Routine Follow-up / Post-op Review',
    'Other Clinical Judgement'
  ];

  // Tooth Selection state
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  // Treatment Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editing state for an existing planned item
  const [editingItem, setEditingItem] = useState<TreatmentPlanItem | null>(null);
  const [plannedSittings, setPlannedSittings] = useState<number>(1);
  const [customSittingsInput, setCustomSittingsInput] = useState<string>('');

  // Workspace View Switcher (Treatment Planning vs Dental Imaging vs Treatment Sessions)
  const [workspaceView, setWorkspaceView] = useState<'planning' | 'imaging' | 'sessions'>(initialView || 'planning');
  const [dentalImages, setDentalImages] = useState<DentalImage[]>([]);

  useEffect(() => {
    if (initialView) {
      setWorkspaceView(initialView);
    }
  }, [initialView]);

  // Past visits history toggle
  const [showPastHistory, setShowPastHistory] = useState(false);

  useEffect(() => {
    if (treatmentFee !== undefined && treatmentFee !== lastPropFee.current) {
      lastPropFee.current = treatmentFee;
      setLocalTreatmentFee(String(treatmentFee));
    }
  }, [treatmentFee]);

  useEffect(() => {
    if (initialTreatmentZeroReason !== undefined) {
      setTreatmentZeroReason(initialTreatmentZeroReason);
    }
  }, [initialTreatmentZeroReason]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPlan(null);
      setSelectedTeeth([]);
      setSelectedCategory('');
      setSelectedProcedure('');
      setNotes('');
      setEditingItem(null);
      setErrorMsg(null);
      try {
        const [catRes, planRes, imgRes] = await Promise.all([
          api.get<any>('/api/treatments/catalog'),
          api.get<any>(`/api/patients/${patientId}/treatment-plan`),
          api.get<any>(`/api/patients/${patientId}/dental-images`).catch(() => [])
        ]);

        const catList = Array.isArray(catRes) ? catRes : catRes?.data || [];
        setCatalog(catList);

        const planData = planRes?.data || planRes;
        setPlan(planData);

        const imgList = Array.isArray(imgRes) ? imgRes : [];
        setDentalImages(imgList);

        // Pre-fill form when opened in edit mode
        if (initialEdit && planData?.items?.length) {
          const itemToEdit = (currentVisitId
            ? planData.items.find((i: TreatmentPlanItem) => i.completedVisitId === currentVisitId)
            : null) || planData.items[0];

          if (itemToEdit) {
            const catItem = catList.find((c: any) => c.id === itemToEdit.treatmentCatalogId) || itemToEdit.catalogItem;
            setEditingItem(itemToEdit);
            setSelectedCategory(catItem?.category || '');
            setSelectedProcedure(itemToEdit.treatmentCatalogId);
            setNotes(itemToEdit.notes || '');
            setSelectedTeeth(itemToEdit.toothNumber ? [itemToEdit.toothNumber] : []);
          }
        }
      } catch (err) {
        console.error('Failed to load treatment plan', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [patientId, initialEdit, currentVisitId]);

  const categories = Array.from(new Set(catalog.map((c) => c.category))).filter(Boolean);
  const procedures = catalog.filter((c) => c.category === selectedCategory);

  // Calculate teeth with existing treatments for chart badges
  const plannedTeeth = (plan?.items || [])
    .filter((item) => item.status === 'Planned' && item.toothNumber != null)
    .map((item) => item.toothNumber as number);

  const completedTeeth = (plan?.items || [])
    .filter((item) => item.status === 'Completed' && item.toothNumber != null)
    .map((item) => item.toothNumber as number);

  // Toggle tooth in multi-selection
  const handleToggleTooth = (fdi: number) => {
    setSelectedTeeth((prev) => {
      if (prev.includes(fdi)) {
        return prev.filter((t) => t !== fdi);
      } else {
        return [...prev, fdi];
      }
    });
    setErrorMsg(null);
  };

  const handleRemoveTooth = (fdi: number) => {
    setSelectedTeeth((prev) => prev.filter((t) => t !== fdi));
  };

  const handleClearSelection = () => {
    setSelectedTeeth([]);
  };

  // Handle Add to Plan (supports single or multi-tooth)
  const handleAddOrUpdate = async () => {
    if (!selectedProcedure) {
      setErrorMsg('Please select a treatment procedure.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingItem) {
        // Update existing planned item
        const singleTooth = selectedTeeth.length > 0 ? selectedTeeth[0] : null;
        const res = await api.patch<TreatmentPlanItem>(
          `/api/patients/${patientId}/treatment-plan/items/${editingItem.id}`,
          {
            treatmentCatalogId: selectedProcedure,
            toothNumber: singleTooth,
            notes: notes || null,
            totalSittings: plannedSittings
          }
        );

        setPlan((prev) =>
          prev
            ? {
              ...prev,
              items: prev.items.map((i) => (i.id === editingItem.id ? res : i))
            }
            : null
        );

        setEditingItem(null);
        setPlannedSittings(1);
      } else {
        // Create new item(s)
        if (selectedTeeth.length > 1) {
          // Multi-tooth batch creation
          const res = await api.post<TreatmentPlanItem[]>(
            `/api/patients/${patientId}/treatment-plan/items`,
            {
              treatmentCatalogId: selectedProcedure,
              toothNumbers: selectedTeeth,
              notes: notes || undefined,
              totalSittings: plannedSittings,
              completedVisitId: currentVisitId
            }
          );

          const newItems = Array.isArray(res) ? res : [res];
          newItems.forEach((i: any) => sessionCreatedItemIds.current.push(i.id));
          setPlan((prev) =>
            prev ? { ...prev, items: [...newItems, ...prev.items] } : null
          );
        } else {
          // Single tooth or non-tooth creation
          const singleTooth = selectedTeeth.length === 1 ? selectedTeeth[0] : null;
          const res = await api.post<TreatmentPlanItem>(
            `/api/patients/${patientId}/treatment-plan/items`,
            {
              treatmentCatalogId: selectedProcedure,
              toothNumber: singleTooth,
              notes: notes || undefined,
              totalSittings: plannedSittings,
              completedVisitId: currentVisitId
            }
          );
          sessionCreatedItemIds.current.push(res.id);

          setPlan((prev) =>
            prev ? { ...prev, items: [res, ...prev.items] } : null
          );
        }
      }

      // Reset form
      setSelectedCategory('');
      setSelectedProcedure('');
      setNotes('');
      setSelectedTeeth([]);
      setPlannedSittings(1);
      setCustomSittingsInput('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save treatment procedure.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: TreatmentPlanItem) => {
    const catItem = catalog.find((c) => c.id === item.treatmentCatalogId) || item.catalogItem;
    setEditingItem(item);
    setSelectedCategory(catItem?.category || '');
    setSelectedProcedure(item.treatmentCatalogId);
    setNotes(item.notes || '');
    setSelectedTeeth(item.toothNumber ? [item.toothNumber] : []);
    const sittingsCount = item.totalSittings !== undefined && item.totalSittings !== null ? item.totalSittings : (item.sessions?.length || 1);
    setPlannedSittings(sittingsCount);
    setCustomSittingsInput(sittingsCount === 0 || sittingsCount > 3 ? String(sittingsCount) : '');
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setSelectedCategory('');
    setSelectedProcedure('');
    setNotes('');
    setSelectedTeeth([]);
    setPlannedSittings(1);
    setCustomSittingsInput('');
    setErrorMsg(null);
  };

  const handleMarkCompleted = async (itemId: string) => {
    setSaving(true);
    try {
      const res = await api.patch<TreatmentPlanItem>(
        `/api/patients/${patientId}/treatment-plan/items/${itemId}`,
        {
          status: 'Completed',
          completedVisitId: currentVisitId
        }
      );
      setPlan((prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.map((i) => (i.id === itemId ? res : i))
          }
          : null
      );
    } catch (err: any) {
      console.error(err);
      alert('Failed to update status. Verify ownership and authorization.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this treatment item?')) return;
    setSaving(true);
    try {
      await api.delete(`/api/patients/${patientId}/treatment-plan/items/${itemId}`);
      sessionCreatedItemIds.current = sessionCreatedItemIds.current.filter((id) => id !== itemId);
      setPlan((prev) =>
        prev
          ? {
            ...prev,
            items: prev.items.filter((i) => i.id !== itemId)
          }
          : null
      );
      if (editingItem?.id === itemId) {
        handleCancelEdit();
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete treatment procedure.');
    } finally {
      setSaving(false);
    }
  };

  // Categorize items by visit context
  const ongoingItems = plan?.items.filter((item) =>
    item.status === 'In Progress' ||
    (item.status !== 'Completed' && (item.sessions || []).some((s: any) => s.status === 'Planned' || s.status === 'In Progress'))
  ) || [];

  const currentVisitItems = currentVisitId
    ? plan?.items.filter((item) => item.completedVisitId === currentVisitId) || []
    : plan?.items || [];

  const plannedItems = currentVisitId
    ? plan?.items.filter((item) => item.status === 'Planned' && !ongoingItems.some((o) => o.id === item.id)) || []
    : [];

  const pastCompletedItems = currentVisitId
    ? plan?.items.filter(
      (item) => item.status === 'Completed' && item.completedVisitId !== currentVisitId
    ) || []
    : [];

  const pendingSessionsCount = (plan?.items || []).reduce((acc, item) => {
    return acc + (item.sessions || []).filter((s: any) => s.status === 'Planned' || s.status === 'In Progress').length;
  }, 0);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
        Loading FDI Treatment Workspace...
      </div>
    );
  }

  // Get Primary Selected Tooth info for display
  const primaryToothInfo = selectedTeeth.length === 1 ? getToothInfo(selectedTeeth[0]) : null;

  return (
    <div className="space-y-2.5 w-full min-w-0 max-w-full overflow-hidden">
      {/* Top Workspace View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 w-full min-w-0">
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 bg-slate-100 p-0.5 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setWorkspaceView('planning')}
            className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              workspaceView === 'planning'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="hidden sm:inline">Treatment Planning & FDI Chart</span>
            <span className="sm:hidden">Planning & FDI</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView('sessions')}
            className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              workspaceView === 'sessions'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Treatment Sessions</span>
            {pendingSessionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300 shrink-0">
                {pendingSessionsCount} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView('imaging')}
            className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
              workspaceView === 'imaging'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>Dental Imaging</span>
            {dentalImages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 font-bold shrink-0">
                {dentalImages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={workspaceView === 'sessions' ? 'bg-slate-50/50 p-1 sm:p-2 rounded-2xl w-full min-w-0 max-w-full overflow-hidden' : 'hidden'}>
        <TreatmentSessionsSection
          patientId={patientId}
          currentVisitId={currentVisitId}
          plan={plan}
          onRefresh={async () => {
            const planRes = await api.get<any>(`/api/patients/${patientId}/treatment-plan`);
            setPlan(planRes?.data || planRes);
          }}
          onUpdatePlan={(updater) => setPlan(updater)}
          targetItemId={targetItemId}
          targetSessionId={targetSessionId}
        />
      </div>

      <div className={workspaceView === 'imaging' ? 'bg-slate-50/50 p-1 sm:p-2 rounded-2xl w-full min-w-0 max-w-full overflow-hidden' : 'hidden'}>
        <DentalImagingSection
          patientId={patientId}
          currentVisitId={currentVisitId}
          activeToothNumber={selectedTeeth.length === 1 ? selectedTeeth[0] : null}
          initialImages={dentalImages}
          onImagesChange={setDentalImages}
          onRegisterRollback={(fn) => { imagingRollbackRef.current = fn; }}
          onRegisterCommit={(fn) => { imagingCommitRef.current = fn; }}
        />
      </div>

      <div className={workspaceView === 'planning' ? 'space-y-3 w-full min-w-0' : 'hidden'}>
        {/* Active Multi-Sitting Treatment In Progress Banner */}
        {ongoingItems.length > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-bold text-slate-900">Active Multi-Sitting Treatment:</span>
                {ongoingItems.map((item) => {
                  const completedS = (item.sessions || []).filter((s: any) => s.status === 'Completed').length;
                  return (
                    <span key={item.id} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {item.catalogItem?.name} {item.toothNumber ? `(Tooth ${item.toothNumber})` : ''} — Sitting {completedS + 1} of {item.totalSittings || 1} Due
                    </span>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7.5 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-2xs cursor-pointer"
              onClick={() => setWorkspaceView('sessions')}
            >
              Manage Sittings &rarr;
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 min-[1440px]:grid-cols-12 gap-3 items-start w-full min-w-0">
          {/* =================================================================== */}
          {/* LEFT COLUMN (min-[1440px]:col-span-5): Interactive FDI Tooth Chart   */}
          {/* =================================================================== */}
          <div className="w-full min-[1440px]:col-span-5 space-y-2">
            <FdiToothChart
              selectedTeeth={selectedTeeth}
              onToggleTooth={handleToggleTooth}
              plannedTeeth={plannedTeeth}
              completedTeeth={completedTeeth}
            />
          </div>

        {/* =================================================================== */}
        {/* MIDDLE COLUMN (min-[1440px]:col-span-3): Selected Tooth Details & Form */}
        {/* =================================================================== */}
        <div className="w-full min-[1440px]:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">
              {editingItem ? 'Edit Procedure' : 'Add Procedure'}
            </h4>
            {editingItem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-slate-500 hover:text-slate-800"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </Button>
            )}
          </div>

          {/* Selected Teeth Badges & Anatomical Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Selected Teeth
              </label>
              {selectedTeeth.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-rose-600 hover:underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedTeeth.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                {selectedTeeth.map((fdi) => {
                  const info = getToothInfo(fdi);
                  return (
                    <span
                      key={fdi}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200"
                      title={info?.name}
                    >
                      Tooth {fdi}
                      <button
                        type="button"
                        onClick={() => handleRemoveTooth(fdi)}
                        className="hover:text-rose-600 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 italic">
                No specific tooth selected. (Will be saved as general/whole-mouth procedure).
              </div>
            )}

            {/* Structured Tooth Anatomical Metadata (Strictly Independent from Notes) */}
            {primaryToothInfo && (
              <div className="p-2 bg-gradient-to-r from-sky-50/70 to-blue-50/50 rounded-xl border border-sky-100/80 space-y-0.5 text-xs">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                    <span>Tooth {primaryToothInfo.fdi}</span>
                  </div>
                  <span className="font-medium text-slate-600 text-[11px] truncate max-w-[150px]">{primaryToothInfo.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {primaryToothInfo.jaw} Jaw
                  </span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {primaryToothInfo.quadrant}
                  </span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {primaryToothInfo.type}
                  </span>
                </div>

                {/* Subtle indicator if this tooth has an RVG radiograph */}
                {dentalImages.some(img => img.type === 'RVG' && img.toothNumber === primaryToothInfo.fdi) && (
                  <div className="flex items-center gap-1.5 text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 mt-1">
                    <Camera className="w-3 h-3 shrink-0" />
                    <span>Tooth {primaryToothInfo.fdi} has RVG radiograph</span>
                    <button
                      type="button"
                      onClick={() => setWorkspaceView('imaging')}
                      className="ml-auto underline font-bold hover:text-teal-900"
                    >
                      View
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Treatment Category & Procedure Selectors */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Treatment Category</label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setSelectedProcedure('');
                }}
              >
                <SelectTrigger className="bg-white text-xs h-9">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Treatment Procedure</label>
              <Select
                value={selectedProcedure}
                onValueChange={setSelectedProcedure}
                disabled={!selectedCategory}
              >
                <SelectTrigger className="bg-white text-xs h-9">
                  <SelectValue placeholder="Select Procedure" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} {p.variant ? `(${p.variant})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expected Sittings: Numeric 1, 2, 3, or custom number */}
            <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Expected Sittings
                </label>
                <span className="text-[11px] font-semibold text-indigo-700">
                  {plannedSittings === 0 ? '0 sittings' : plannedSittings === 1 ? '1 sitting' : `${plannedSittings} sittings`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setPlannedSittings(num);
                      setCustomSittingsInput('');
                    }}
                    className={`flex-1 h-7 rounded-lg text-xs font-bold border transition-all ${
                      plannedSittings === num && customSittingsInput === ''
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <div className="flex-[1.2] min-w-[52px] relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Custom"
                    value={customSittingsInput}
                    onChange={(e) => {
                      const str = e.target.value.replace(/[^0-9]/g, '');
                      setCustomSittingsInput(str);
                      const val = parseInt(str, 10);
                      if (str === '0' || val === 0) {
                        setPlannedSittings(0);
                      } else if (!isNaN(val) && val >= 1) {
                        setPlannedSittings(Math.min(50, val));
                      } else if (str === '') {
                        setPlannedSittings(1);
                      }
                    }}
                    onFocus={() => {
                      if (plannedSittings > 3 && !customSittingsInput) {
                        setCustomSittingsInput(String(plannedSittings));
                      }
                    }}
                    className={`w-full h-7 px-1 text-xs font-bold text-center rounded-lg border transition-all outline-none ${
                      customSittingsInput !== '' || (plannedSittings > 3 && customSittingsInput === '')
                        ? 'bg-indigo-600 text-white border-indigo-600 placeholder:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Doctor Clinical Notes (Strictly Separate from Tooth Number) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Doctor Notes (Optional)
              </label>
              <Textarea
                placeholder="Enter clinical notes, diagnosis, or instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white text-xs min-h-[52px] resize-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-8 text-xs font-bold"
            disabled={!selectedProcedure || saving}
            onClick={handleAddOrUpdate}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : editingItem ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            {editingItem ? 'Save Changes' : selectedTeeth.length > 1 ? `Add ${selectedTeeth.length} Procedures` : 'Add to Plan'}
          </Button>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN (min-[1440px]:col-span-4): Planned & Active Treatments */}
        {/* =================================================================== */}
        <div className="w-full min-[1440px]:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-3 max-h-[440px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Treatments & Sessions</h4>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {ongoingItems.length + currentVisitItems.length + plannedItems.length} items
            </span>
          </div>

          {/* 1. Active Ongoing Multi-Sitting Treatments */}
          {ongoingItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Active Ongoing Treatments ({ongoingItems.length})
                </h5>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  In Progress
                </span>
              </div>

              {ongoingItems.map((item) => {
                const completedSessions = (item.sessions || []).filter((s: any) => s.status === 'Completed');
                const nextSessionNum = completedSessions.length + 1;
                const totalS = item.totalSittings || 1;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border bg-gradient-to-r from-amber-50/70 to-orange-50/50 border-amber-200 text-xs space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.toothNumber ? (
                            <span className="font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                              Tooth {item.toothNumber}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px]">
                              General
                            </span>
                          )}
                          <span className="font-bold text-slate-900">
                            {item.catalogItem?.name} {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.catalogItem?.category}
                        </div>
                      </div>

                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                        Sitting {completedSessions.length}/{totalS}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/70 flex-wrap">
                      <span className="text-[11px] font-semibold text-amber-900">
                        👉 Next: Sitting {nextSessionNum} (Due Today)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 px-2.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer"
                        onClick={() => {
                          setWorkspaceView('sessions');
                        }}
                      >
                        Record Sitting {nextSessionNum} &rarr;
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current Visit Procedures */}
          {currentVisitId ? (
            <div className="space-y-2.5">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Completed This Visit ({currentVisitItems.length})
              </h5>

              {currentVisitItems.length === 0 ? (
                ongoingItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No procedures recorded for this visit yet.
                  </div>
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-400 bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
                    No additional procedures recorded. Active sitting shown above.
                  </div>
                )
              ) : (
                currentVisitItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border bg-emerald-50/40 border-emerald-100 text-xs space-y-1.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.toothNumber ? (
                            <span className="font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                              Tooth {item.toothNumber}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px]">
                              General
                            </span>
                          )}
                          <span className="font-bold text-slate-900">
                            {item.catalogItem?.name}{' '}
                            {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.catalogItem?.category}
                        </div>
                        {((item.totalSittings ?? 1) > 0) && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {item.sessions?.filter(s => s.status === 'Completed').length || 0} / {item.totalSittings ?? 1} Sittings
                            </span>
                            <button
                              type="button"
                              onClick={() => setWorkspaceView('sessions')}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                            >
                              Manage Sittings &rarr;
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                          onClick={() => handleStartEdit(item)}
                          title="Edit procedure"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          onClick={() => handleDelete(item.id)}
                          title="Remove procedure"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="pt-1 text-[11px] text-slate-600 bg-white/70 p-1.5 rounded border border-emerald-100/70">
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Longitudinal / Patient Profile List */
            <div className="space-y-2.5">
              {currentVisitItems.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  No treatment plan items found for this patient.
                </div>
              ) : (
                currentVisitItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                      item.status === 'Completed'
                        ? 'bg-emerald-50/40 border-emerald-100'
                        : 'bg-amber-50/30 border-amber-200/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.toothNumber ? (
                            <span className="font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                              Tooth {item.toothNumber}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px]">
                              General
                            </span>
                          )}
                          <span className="font-bold text-slate-900">
                            {item.catalogItem?.name}{' '}
                            {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                              item.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.catalogItem?.category}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        onClick={() => handleDelete(item.id)}
                        title="Remove procedure"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {item.notes && (
                      <div className="pt-1 text-[11px] text-slate-600 bg-white/70 p-1.5 rounded border border-slate-100">
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Planned Roadmap Items (Pending Future / Complete Today) */}
          {plannedItems.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Planned Future Procedures ({plannedItems.length})
              </h5>

              {plannedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border bg-amber-50/30 border-amber-200/60 text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.toothNumber ? (
                          <span className="font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                            Tooth {item.toothNumber}
                          </span>
                        ) : (
                          <span className="font-medium text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded text-[10px]">
                            General
                          </span>
                        )}
                        <span className="font-bold text-slate-900">
                          {item.catalogItem?.name}{' '}
                          {item.catalogItem?.variant ? `(${item.catalogItem.variant})` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.catalogItem?.category}
                      </div>
                    {((item.totalSittings ?? 1) > 0) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.sessions?.filter(s => s.status === 'Completed').length || 0} / {item.totalSittings ?? 1} Sittings
                        </span>
                        <button
                          type="button"
                          onClick={() => setWorkspaceView('sessions')}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        >
                          Manage Sittings &rarr;
                        </button>
                      </div>
                    )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                        onClick={() => handleStartEdit(item)}
                        title="Edit procedure"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(item.id)}
                        title="Delete procedure"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="text-[11px] text-slate-600 bg-white/70 p-1.5 rounded border border-amber-100">
                      {item.notes}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={saving}
                    onClick={() => handleMarkCompleted(item.id)}
                  >
                    <Check className="w-3 h-3 mr-1" /> Complete Today
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Past Completed History (Hidden as of now) */}
          {false as boolean && pastCompletedItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPastHistory(!showPastHistory)}
                className="flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-800 py-1.5 font-medium transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Past Visits History ({pastCompletedItems.length})
                </span>
                {showPastHistory ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showPastHistory && (
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200">
                  {pastCompletedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center text-slate-600"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          {item.toothNumber && (
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold">
                              T{item.toothNumber}
                            </span>
                          )}
                          {item.catalogItem?.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.catalogItem?.category} {item.notes ? `• ${item.notes}` : ''}
                        </div>
                      </div>
                      <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        Past Visit
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* =================================================================== */}
      {/* BOTTOM BAR: Total Treatment Fee & Done Action                       */}
      {/* =================================================================== */}
      {(currentVisitId || treatmentFee !== undefined) && (
        <div className="py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-slate-800">Total Treatment Fee (₹)</label>
              <p className="text-[10px] text-slate-500">
                Applicable procedure or treatment charge for this clinical consultation
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  className="pl-6 h-8 text-xs bg-white font-semibold text-slate-900"
                  value={localTreatmentFee}
                  onBlur={() => {
                    let num = Number(localTreatmentFee);
                    if (localTreatmentFee === '' || isNaN(num) || num < 0) {
                      num = 0;
                    }
                    setLocalTreatmentFee(String(num));
                    lastPropFee.current = num;
                    if (onSaveTreatmentFee) {
                      onSaveTreatmentFee(num, num === 0 ? treatmentZeroReason : '');
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalTreatmentFee(val);
                    const num = Number(val);
                    if (val !== '' && !isNaN(num) && num >= 0 && onSaveTreatmentFee) {
                      onSaveTreatmentFee(num, '');
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-8 px-4 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                onClick={async () => {
                  await rollback();
                  if (onCancel) onCancel();
                }}
              >
                Cancel
              </Button>
              {onDone && (
                <Button
                  className="h-8 px-5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={async () => {
                    const feeNum = Number(localTreatmentFee) || 0;
                    const totalProcedures = currentVisitItems.length + plannedItems.length + ongoingItems.length;

                    if (totalProcedures === 0) {
                      if (!noProcedureReason.trim()) {
                        setIsNoProcedureModalOpen(true);
                        return;
                      }
                    } else if (feeNum === 0 && !treatmentZeroReason.trim() && currentVisitItems.length > 0) {
                      setIsZeroFeeModalOpen(true);
                      return;
                    }

                    isConfirmed.current = true;
                    sessionCreatedItemIds.current = [];
                    imagingCommitRef.current();
                    const finalReason = totalProcedures === 0 ? noProcedureReason.trim() : treatmentZeroReason;
                    if (onDone) onDone(totalProcedures === 0 ? noProcedureReason.trim() : undefined);
                    if (onSaveTreatmentFee) await onSaveTreatmentFee(feeNum, finalReason);
                  }}
                >
                  Done
                </Button>
              )}
            </div>
          </div>

          {(currentVisitItems.length + plannedItems.length + ongoingItems.length) === 0 ? (
            <div className="text-[10px] w-full text-left pt-0.5 border-t border-slate-200/60">
              {noProcedureReason ? (
                <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium">
                  No Procedure Reason: {noProcedureReason}
                  <button
                    type="button"
                    onClick={() => setIsNoProcedureModalOpen(true)}
                    className="underline text-teal-900 ml-1 hover:text-teal-950 font-bold"
                  >
                    Edit
                  </button>
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Adding a procedure is mandatory. Clicking Done without a procedure requires a clinical reason.
                </span>
              )}
            </div>
          ) : Number(localTreatmentFee) === 0 && currentVisitItems.length > 0 && (
            <div className="text-[10px] w-full text-left pt-0.5 border-t border-slate-200/60">
              {treatmentZeroReason ? (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                  Waiver: {treatmentZeroReason}
                  <button
                    type="button"
                    onClick={() => setIsZeroFeeModalOpen(true)}
                    className="underline text-amber-800 ml-1 hover:text-amber-900"
                  >
                    Edit
                  </button>
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  ₹0 treatment fee requires a waiver reason upon clicking Done.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal for ₹0 Treatment Fee Reason (opens only when Done is clicked with ₹0) */}
      <Dialog open={isZeroFeeModalOpen} onOpenChange={setIsZeroFeeModalOpen}>
        <DialogContent className="max-w-md w-full p-5 gap-3.5 bg-white rounded-2xl shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </span>
              Reason for ₹0 Treatment Fee
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please specify why no treatment fee is charged for this visit. Required for clinical audit and fee waiver records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Quick Tags */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Reason Tag
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ZERO_FEE_REASONS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => {
                      setTreatmentZeroReason(tag);
                      setTreatmentZeroError('');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      treatmentZeroReason === tag
                        ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Reason Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason Details / Notes <span className="text-rose-500">*</span>
              </label>
              <Textarea
                placeholder="Enter reason for ₹0 treatment fee (e.g. Free checkup, warranty adjustment, package follow-up)..."
                value={treatmentZeroReason}
                onChange={(e) => {
                  setTreatmentZeroReason(e.target.value);
                  if (e.target.value.trim()) setTreatmentZeroError('');
                }}
                rows={3}
                className={`text-xs bg-white resize-none ${
                  treatmentZeroError ? 'border-rose-500 focus-visible:ring-rose-400' : 'border-slate-200'
                }`}
              />
              {treatmentZeroError && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">{treatmentZeroError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setTreatmentZeroError('');
                setIsZeroFeeModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              onClick={async () => {
                if (!treatmentZeroReason.trim()) {
                  setTreatmentZeroError('Please select or provide a reason for ₹0 treatment fee.');
                  return;
                }
                // Close ONLY this waiver reason modal
                setIsZeroFeeModalOpen(false);
                if (onSaveTreatmentFee) {
                  await onSaveTreatmentFee(0, treatmentZeroReason.trim());
                }
              }}
            >
              Confirm Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for No Procedure Reason (opens when Done is clicked with 0 procedures) */}
      <Dialog open={isNoProcedureModalOpen} onOpenChange={setIsNoProcedureModalOpen}>
        <DialogContent className="max-w-md w-full p-5 gap-3.5 bg-white rounded-2xl shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 text-rose-700">
                <AlertCircle className="w-4 h-4" />
              </span>
              Clinical Reason Required
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adding a procedure is mandatory for treatment planning. If no procedure was performed or planned during this visit, please specify the clinical reason to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Quick Tags */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Reason Tag
              </label>
              <div className="flex flex-wrap gap-1.5">
                {NO_PROCEDURE_REASONS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => {
                      setNoProcedureReason(tag);
                      setNoProcedureError('');
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      noProcedureReason === tag
                        ? 'bg-teal-600 text-white border-teal-600 font-semibold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Reason Text Box */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Clinical Reason Details / Notes <span className="text-rose-500">*</span>
              </label>
              <Textarea
                placeholder="Enter clinical reason why no procedure was added (e.g. Patient came for diagnostic consultation only, deferred procedure due to fever)..."
                value={noProcedureReason}
                onChange={(e) => {
                  setNoProcedureReason(e.target.value);
                  if (e.target.value.trim()) setNoProcedureError('');
                }}
                rows={3}
                className={`text-xs bg-white resize-none ${
                  noProcedureError ? 'border-rose-500 focus-visible:ring-rose-400' : 'border-slate-200'
                }`}
              />
              {noProcedureError && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">{noProcedureError}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setNoProcedureError('');
                setIsNoProcedureModalOpen(false);
              }}
            >
              Cancel (Add Procedure)
            </Button>
            <Button
              size="sm"
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
              onClick={async () => {
                if (!noProcedureReason.trim()) {
                  setNoProcedureError('Please select or provide a reason why no procedure was added.');
                  return;
                }
                setIsNoProcedureModalOpen(false);
                const feeNum = Number(localTreatmentFee) || 0;
                isConfirmed.current = true;
                sessionCreatedItemIds.current = [];
                imagingCommitRef.current();
                if (onDone) onDone(noProcedureReason.trim());
                if (onSaveTreatmentFee) {
                  await onSaveTreatmentFee(feeNum, noProcedureReason.trim());
                }
              }}
            >
              Confirm Reason & Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
