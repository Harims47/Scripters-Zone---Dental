import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  FlaskConical,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  User,
  Package,
  Check,
  Building2,
  Palette,
} from "lucide-react";
import toast from "react-hot-toast";
import type { DentalLab, LabRequest } from "../types/domain";

const PRESET_COLORS = [
  { name: "Teal", hex: "#0D9488" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Emerald", hex: "#059669" },
  { name: "Rose", hex: "#E11D48" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Amber", hex: "#D97706" },
  { name: "Cyan", hex: "#0891B2" },
  { name: "Slate", hex: "#475569" },
];

export function LabPage() {
  const [labs, setLabs] = useState<DentalLab[]>([]);
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "Received"
  >("all");

  // Accordion open state for each lab (by lab.id)
  const [expandedLabIds, setExpandedLabIds] = useState<Record<string, boolean>>(
    {},
  );

  // Lab modal state (Create / Edit)
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<DentalLab | null>(null);
  const [labFormData, setLabFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    color: "#0D9488",
    notes: "",
  });
  const [savingLab, setSavingLab] = useState(false);

  // Receive modal state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [activeRequestToReceive, setActiveRequestToReceive] =
    useState<LabRequest | null>(null);
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [receivedNotes, setReceivedNotes] = useState("");
  const [savingReceive, setSavingReceive] = useState(false);

  // Fetch labs and requests
  const fetchData = async () => {
    try {
      setLoading(true);
      const [labsRes, reqsRes] = await Promise.all([
        api.get<DentalLab[]>("/api/labs"),
        api.get<LabRequest[]>("/api/labs/requests"),
      ]);

      const labList = Array.isArray(labsRes)
        ? labsRes
        : (labsRes as any)?.data || [];
      const reqList = Array.isArray(reqsRes)
        ? reqsRes
        : (reqsRes as any)?.data || [];

      setLabs(labList);
      setRequests(reqList);
    } catch (err: any) {
      console.error("Failed to load lab data:", err);
      toast.error((err as any)?.data?.error || err?.message || "Failed to load lab data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter requests based on search query and status filter
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter === "pending" && r.status === "Received") return false;
      if (statusFilter === "Received" && r.status !== "Received") return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const patientName = r.patient?.name?.toLowerCase() || "";
      const patientPhone = r.patient?.phone?.toLowerCase() || "";
      const workType = r.workType.toLowerCase();
      const tooth = r.toothNumbers?.toLowerCase() || "";
      const shade = r.shade?.toLowerCase() || "";
      const labName = r.lab?.name?.toLowerCase() || "";
      const instructions = r.instructions?.toLowerCase() || "";

      return (
        patientName.includes(q) ||
        patientPhone.includes(q) ||
        workType.includes(q) ||
        tooth.includes(q) ||
        shade.includes(q) ||
        labName.includes(q) ||
        instructions.includes(q)
      );
    });
  }, [requests, searchQuery, statusFilter]);

  // Deduplicate labs by name to guarantee only ONE accordion per lab
  const uniqueLabs = useMemo(() => {
    const seen = new Set<string>();
    return labs.filter((l) => {
      const key = l.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [labs]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalLabs = uniqueLabs.length;
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(
      (r) => r.status !== "Received",
    ).length;
    const receivedRequests = requests.filter(
      (r) => r.status === "Received",
    ).length;
    return { totalLabs, totalRequests, pendingRequests, receivedRequests };
  }, [uniqueLabs, requests]);

  // Toggle single lab accordion
  const toggleLabAccordion = (labId: string) => {
    setExpandedLabIds((prev) => ({
      ...prev,
      [labId]: !prev[labId],
    }));
  };

  // Toggle all accordions
  const toggleAllAccordions = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    labs.forEach((l) => {
      updated[l.id] = expand;
    });
    setExpandedLabIds(updated);
  };

  // Open Lab form for Create
  const handleOpenCreateLab = () => {
    setEditingLab(null);
    setLabFormData({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      color: "#0D9488",
      notes: "",
    });
    setIsLabModalOpen(true);
  };

  // Open Lab form for Edit
  const handleOpenEditLab = (lab: DentalLab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingLab(lab);
    setLabFormData({
      name: lab.name,
      contactPerson: lab.contactPerson || "",
      phone: lab.phone || "",
      email: lab.email || "",
      address: lab.address || "",
      color: lab.color || "#0D9488",
      notes: lab.notes || "",
    });
    setIsLabModalOpen(true);
  };

  // Save Lab (Create or Update)
  const handleSaveLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labFormData.name.trim()) {
      toast.error("Lab name is required");
      return;
    }

    try {
      setSavingLab(true);
      if (editingLab) {
        await api.put(`/api/labs/${editingLab.id}`, labFormData);
        toast.success("Lab details updated successfully");
      } else {
        await api.post("/api/labs", labFormData);
        toast.success("New dental lab registered");
      }
      setIsLabModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to save lab:", err);
      toast.error((err as any)?.data?.error || err?.message || "Failed to save lab");
    } finally {
      setSavingLab(false);
    }
  };

  // Open Receive modal
  const handleOpenReceive = (req: LabRequest) => {
    setActiveRequestToReceive(req);
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setReceivedNotes(req.receivedNotes || "");
    setIsReceiveModalOpen(true);
  };

  // Confirm receive
  const handleConfirmReceive = async () => {
    if (!activeRequestToReceive) return;
    try {
      setSavingReceive(true);
      await api.post(
        `/api/labs/requests/${activeRequestToReceive.id}/receive`,
        {
          receivedDate,
          receivedNotes: receivedNotes.trim() || undefined,
        },
      );
      toast.success("Lab work recorded as received");
      setIsReceiveModalOpen(false);
      setActiveRequestToReceive(null);
      fetchData();
    } catch (err: any) {
      console.error("Failed to mark received:", err);
      toast.error(
        (err as any)?.data?.error || err?.message || "Failed to update order status",
      );
    } finally {
      setSavingReceive(false);
    }
  };

  // Delete / deactivate lab
  const handleDeleteLab = async (lab: DentalLab, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to remove "${lab.name}"? If there are existing records, it will be deactivated.`,
    );
    if (!confirmed) return;

    try {
      await api.delete(`/api/labs/${lab.id}`);
      toast.success("Lab removed successfully");
      fetchData();
    } catch (err: any) {
      console.error("Failed to delete lab:", err);
      toast.error((err as any)?.data?.error || err?.message || "Failed to delete lab");
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Check if expected delivery is overdue
  const isOverdue = (dateStr?: string | null, status?: string) => {
    if (!dateStr || status === "Received") return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-2xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Dental Lab Orders
              </h1>
              <p className="text-sm text-slate-500">
                Track outsourced prosthetic orders, fabrication progress,
                delivery dates, and partner labs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleOpenCreateLab}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Dental Lab
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Partner Labs</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalLabs}
          </div>
          <div className="text-[11px] text-slate-400">
            Registered fabrication labs
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {stats.pendingRequests}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            Awaiting lab delivery
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>Received Work</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900">
            {stats.receivedRequests}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Delivered to clinic
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Requests</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalRequests}
          </div>
          <div className="text-[11px] text-slate-400">
            All-time outsourced orders
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search patient, work type, tooth, shade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Status Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({stats.pendingRequests})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Received")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "Received"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Received ({stats.receivedRequests})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllAccordions(true)}
              className="text-xs h-8 text-slate-600"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllAccordions(false)}
              className="text-xs h-8 text-slate-600"
            >
              Collapse All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Lab Accordions */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
          <p className="text-sm">Loading lab records...</p>
        </div>
      ) : labs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No Dental Labs Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Register your dental fabrication lab partners to start tracking
            crown, denture, and aligner orders.
          </p>
          <Button
            onClick={handleOpenCreateLab}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Lab
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {uniqueLabs.map((lab) => {
            const labRequests = filteredRequests.filter(
              (r) => r.labId === lab.id,
            );
            const isExpanded = Boolean(expandedLabIds[lab.id]);
            const labPendingCount = requests.filter(
              (r) => r.labId === lab.id && r.status !== "Received",
            ).length;
            const labReceivedCount = requests.filter(
              (r) => r.labId === lab.id && r.status === "Received",
            ).length;

            return (
              <div
                key={lab.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all duration-200"
                style={{
                  borderLeft: `5px solid ${lab.color || "#0D9488"}`,
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleLabAccordion(lab.id)}
                  className="px-5 py-4 cursor-pointer hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Lab Color Swatch */}
                    <div
                      className="w-4 h-4 rounded-full shadow-2xs shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: lab.color || "#0D9488" }}
                      title={`Color: ${lab.color}`}
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {lab.name}
                        </h3>
                        {lab.contactPerson && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            <User className="w-3 h-3 text-slate-400" />
                            {lab.contactPerson}
                          </span>
                        )}
                        {lab.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {lab.phone}
                          </span>
                        )}
                      </div>
                      {lab.notes && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {lab.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Header Badges & Actions */}
                  <div className="flex items-center gap-2.5 self-end md:self-center">
                    <div className="flex items-center gap-1.5">
                      {labPendingCount > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {labPendingCount} Pending
                        </span>
                      )}
                      {labReceivedCount > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {labReceivedCount} Received
                        </span>
                      )}
                      {labPendingCount === 0 && labReceivedCount === 0 && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          0 Orders
                        </span>
                      )}
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleOpenEditLab(lab, e)}
                      className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Edit Lab Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteLab(lab, e)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove Lab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>

                    <div className="text-slate-400 p-1">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Body: Orders for this lab */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 bg-slate-50/30">
                    {/* Lab details strip */}
                    {(lab.address || lab.email) && (
                      <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap pt-2 px-1">
                        {lab.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {lab.address}
                          </span>
                        )}
                        {lab.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {lab.email}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Table of requests */}
                    <div className="flex items-center justify-between pt-1 pb-0.5 border-b border-slate-200/60">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Package
                          className="w-3.5 h-3.5"
                          style={{ color: lab.color || "#0D9488" }}
                        />
                        Orders Sent to {lab.name} ({labRequests.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Orders tracked from patient treatment plans
                      </span>
                    </div>

                    {labRequests.length === 0 ? (
                      <div className="py-7 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        No prosthetic orders sent to {lab.name} yet. Orders
                        created in patient treatment plans with this lab will
                        appear here.
                      </div>
                    ) : (
                      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="py-3 px-3.5">Patient</th>
                              <th className="py-3 px-3.5">Teeth / FDI</th>
                              <th className="py-3 px-3.5">Work Type & Shade</th>
                              <th className="py-3 px-3.5">Sent Date</th>
                              <th className="py-3 px-3.5">Delivery Expected</th>
                              <th className="py-3 px-3.5">Status</th>
                              <th className="py-3 px-3.5">Cost (₹)</th>
                              <th className="py-3 px-3.5 text-right">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {labRequests.map((req) => {
                              const overdue = isOverdue(
                                req.expectedDeliveryDate,
                                req.status,
                              );
                              const isReceived = req.status === "Received";

                              return (
                                <tr
                                  key={req.id}
                                  className="hover:bg-slate-50/60 transition-colors"
                                >
                                  {/* Patient Name */}
                                  <td className="py-3 px-3.5 font-medium text-slate-900">
                                    <div>
                                      <span className="font-bold text-slate-900 block">
                                        {req.patient?.name || "Unknown Patient"}
                                      </span>
                                      {req.patient?.phone && (
                                        <span className="text-[11px] text-slate-400">
                                          {req.patient.phone}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Teeth / FDI */}
                                  <td className="py-3 px-3.5">
                                    {req.toothNumbers ? (
                                      <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[11px]">
                                        #{req.toothNumbers}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">
                                        General
                                      </span>
                                    )}
                                  </td>

                                  {/* Work Type & Shade */}
                                  <td className="py-3 px-3.5">
                                    <div>
                                      <span className="font-semibold text-slate-800 block">
                                        {req.workType}
                                      </span>
                                      {req.shade && (
                                        <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5">
                                          Shade: {req.shade}
                                        </span>
                                      )}
                                      {req.instructions && (
                                        <p
                                          className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1"
                                          title={req.instructions}
                                        >
                                          "{req.instructions}"
                                        </p>
                                      )}
                                    </div>
                                  </td>

                                  {/* Sent Date */}
                                  <td className="py-3 px-3.5 text-slate-600">
                                    {formatDate(req.sentDate)}
                                  </td>

                                  {/* Expected Delivery */}
                                  <td className="py-3 px-3.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`font-medium ${
                                          overdue
                                            ? "text-rose-600 font-bold"
                                            : "text-slate-700"
                                        }`}
                                      >
                                        {formatDate(req.expectedDeliveryDate)}
                                      </span>
                                      {overdue && (
                                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded">
                                          Overdue
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="py-3 px-3.5">
                                    {isReceived ? (
                                      <div>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                          <Check className="w-3 h-3" />
                                          Received
                                        </span>
                                        {req.receivedDate && (
                                          <span className="block text-[10px] text-slate-400 mt-0.5">
                                            {formatDate(req.receivedDate)}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                        <Clock className="w-3 h-3" />
                                        Sent to Lab
                                      </span>
                                    )}
                                  </td>

                                  {/* Cost */}
                                  <td className="py-3 px-3.5 font-semibold text-slate-700">
                                    {req.cost
                                      ? `₹${req.cost.toLocaleString()}`
                                      : "—"}
                                  </td>

                                  {/* Action: Receive button */}
                                  <td className="py-3 px-3.5 text-right">
                                    {isReceived ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-[11px] text-emerald-700 font-medium">
                                          Completed
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenReceive(req)}
                                          className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                                          title="Edit receipt details"
                                        >
                                          Edit
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenReceive(req)}
                                        className="h-7 px-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Receive
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: Create / Edit Dental Lab                         */}
      {/* ========================================================= */}
      <Dialog open={isLabModalOpen} onOpenChange={setIsLabModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-teal-600" />
              {editingLab ? "Edit Dental Lab" : "Register New Dental Lab"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLab} className="space-y-4 pt-2">
            {/* Lab Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Lab Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Apex Precision Dental Lab"
                value={labFormData.name}
                onChange={(e) =>
                  setLabFormData({ ...labFormData, name: e.target.value })
                }
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Color Option for differentiating lab */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-teal-600" />
                  Lab Differentiating Color
                </Label>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: labFormData.color }}
                  />
                  <span className="text-[11px] font-mono font-semibold text-slate-600">
                    {labFormData.color}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                This color will be used on treatment plans, procedure cards, and
                order accordions to differentiate this lab.
              </p>

              {/* Color Palettes */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() =>
                      setLabFormData({ ...labFormData, color: c.hex })
                    }
                    className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                      labFormData.color.toLowerCase() === c.hex.toLowerCase()
                        ? "scale-110 ring-2 ring-slate-900 ring-offset-1 shadow-xs"
                        : "hover:scale-105 opacity-90"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {labFormData.color.toLowerCase() ===
                      c.hex.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    )}
                  </button>
                ))}

                {/* Custom Color Input */}
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="color"
                    value={labFormData.color}
                    onChange={(e) =>
                      setLabFormData({ ...labFormData, color: e.target.value })
                    }
                    className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    title="Custom color"
                  />
                  <span className="text-[10px] text-slate-400">Custom</span>
                </div>
              </div>
            </div>

            {/* Contact Person & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Contact Person
                </Label>
                <Input
                  placeholder="e.g. Mr. Rajesh (Technician)"
                  value={labFormData.contactPerson}
                  onChange={(e) =>
                    setLabFormData({
                      ...labFormData,
                      contactPerson: e.target.value,
                    })
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Phone Number
                </Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={labFormData.phone}
                  onChange={(e) =>
                    setLabFormData({ ...labFormData, phone: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Email & Address */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="orders@lab.com"
                  value={labFormData.email}
                  onChange={(e) =>
                    setLabFormData({ ...labFormData, email: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Address / City
                </Label>
                <Input
                  placeholder="e.g. Guindy Industrial Estate"
                  value={labFormData.address}
                  onChange={(e) =>
                    setLabFormData({ ...labFormData, address: e.target.value })
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Notes / Specializations */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Specializations & Notes
              </Label>
              <Textarea
                placeholder="e.g. Specialized in Zirconia crowns, digital CAD/CAM milling, 3-day turnaround"
                value={labFormData.notes}
                onChange={(e) =>
                  setLabFormData({ ...labFormData, notes: e.target.value })
                }
                className="text-xs resize-none min-h-[55px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLabModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingLab}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs"
              >
                {savingLab ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : null}
                {editingLab ? "Save Changes" : "Register Lab"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: Receive Lab Work Confirmation                    */}
      {/* ========================================================= */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Receive Dental Lab Work
            </DialogTitle>
          </DialogHeader>

          {activeRequestToReceive && (
            <div className="space-y-4 pt-2">
              {/* Summary card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Patient:</span>
                  <span className="font-bold text-slate-900">
                    {activeRequestToReceive.patient?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Work / Prosthetic:
                  </span>
                  <span className="font-bold text-slate-900">
                    {activeRequestToReceive.workType}
                    {activeRequestToReceive.shade
                      ? ` (Shade ${activeRequestToReceive.shade})`
                      : ""}
                  </span>
                </div>
                {activeRequestToReceive.toothNumbers && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Tooth Numbers:
                    </span>
                    <span className="font-bold text-sky-800">
                      #{activeRequestToReceive.toothNumbers}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    Lab Partner:
                  </span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{
                        backgroundColor:
                          activeRequestToReceive.lab?.color || "#0D9488",
                      }}
                    />
                    {activeRequestToReceive.lab?.name}
                  </span>
                </div>
              </div>

              {/* Received Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Date Received
                </Label>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Received Inspection Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Inspection / Quality Notes (Optional)
                </Label>
                <Textarea
                  placeholder="e.g. Fit verified on cast, margin intact, shade confirmed with patient"
                  value={receivedNotes}
                  onChange={(e) => setReceivedNotes(e.target.value)}
                  className="text-xs resize-none min-h-[60px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingReceive}
                  onClick={handleConfirmReceive}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  {savingReceive ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : null}
                  Confirm Receipt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default LabPage;
