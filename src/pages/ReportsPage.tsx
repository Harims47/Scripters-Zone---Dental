import { useState, useEffect, useCallback } from 'react'
import { KpiCard } from '../components/dashboard/dashboard-components'
import { Users, CheckCircle, Calendar as CalendarIcon, Clock, IndianRupee, CreditCard, Banknote, Package, AlertTriangle, XCircle, Calendar, FileText } from 'lucide-react'
import { api } from '../lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { DataTable, DataTableEmpty } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import toast from 'react-hot-toast'

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom'

interface ClinicSummary {
  uniquePatientsSeen: number;
  completedVisits: number;
  pendingVisits: number;
  totalAppointments: number;
}

interface PaymentSummary {
  totalRevenue: number;
  cashCollected: number;
  gpayCollected: number;
  paymentCount: number;
}

interface InventorySnapshot {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface ReportsSummaryData {
  clinicSummary: ClinicSummary;
  paymentSummary: PaymentSummary;
  inventorySnapshot: InventorySnapshot;
}

export function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const [dateRangeDates, setDateRangeDates] = useState<{ startDate?: string; endDate?: string }>({})

  // Compute startDate and endDate based on preset or custom dates
  useEffect(() => {
    if (preset === 'all_time') {
      setDateRangeDates({ startDate: undefined, endDate: undefined })
      return
    }

    if (preset === 'custom') {
      if (customStart && customEnd) {
        const s = new Date(customStart)
        s.setHours(0, 0, 0, 0)
        const e = new Date(customEnd)
        e.setHours(23, 59, 59, 999)
        setDateRangeDates({ startDate: s.toISOString(), endDate: e.toISOString() })
      }
      return
    }

    const end = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    switch (preset) {
      case 'today':
        break
      case 'this_week':
        start.setDate(start.getDate() - start.getDay()) // Sunday of this week
        break
      case 'this_month':
        start.setDate(1)
        break
      case 'last_month':
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        end.setDate(0) // Last day of previous month
        break
      case 'this_year':
        start.setMonth(0, 1)
        break
    }

    setDateRangeDates({ startDate: start.toISOString(), endDate: end.toISOString() })
  }, [preset, customStart, customEnd])

  // Summary Cards Data
  const [summaryData, setSummaryData] = useState<ReportsSummaryData | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)

  // 1. Detailed Clinic Activity State
  const [clinicVisits, setClinicVisits] = useState<any[]>([])
  const [clinicMeta, setClinicMeta] = useState({ currentPage: 1, pageSize: 10, totalRecords: 0, totalPages: 0 })
  const [clinicLoading, setClinicLoading] = useState(false)
  const [clinicSearch, setClinicSearch] = useState('')
  const [clinicStatusFilter, setClinicStatusFilter] = useState('all')
  const [clinicPagination, setClinicPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  // 2. Detailed Payment Report State
  const [paymentRecords, setPaymentRecords] = useState<any[]>([])
  const [paymentMeta, setPaymentMeta] = useState({ currentPage: 1, pageSize: 10, totalRecords: 0, totalPages: 0 })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [paymentPagination, setPaymentPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  // Fetch Summary Cards
  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    try {
      const query = new URLSearchParams()
      if (dateRangeDates.startDate) query.append('startDate', dateRangeDates.startDate)
      if (dateRangeDates.endDate) query.append('endDate', dateRangeDates.endDate)

      const res = await api.get<ReportsSummaryData>(`/api/reports/summary?${query.toString()}`)
      setSummaryData(res)
    } catch (error) {
      console.error('Failed to fetch reports summary:', error)
      toast.error('Failed to load summary metrics')
    } finally {
      setIsSummaryLoading(false)
    }
  }, [dateRangeDates])

  // Fetch Clinic Activity
  const fetchClinicActivity = useCallback(async () => {
    setClinicLoading(true)
    try {
      const query = new URLSearchParams()
      query.append('page', String(clinicPagination.pageIndex + 1))
      query.append('limit', String(clinicPagination.pageSize))
      if (clinicSearch) query.append('search', clinicSearch)
      if (clinicStatusFilter && clinicStatusFilter !== 'all') query.append('status', clinicStatusFilter)
      if (dateRangeDates.startDate) query.append('startDate', dateRangeDates.startDate)
      if (dateRangeDates.endDate) query.append('endDate', dateRangeDates.endDate)

      const res = await api.get<any>(`/api/reports/clinic-activity?${query.toString()}`)
      setClinicVisits(res.data || [])
      setClinicMeta(res.meta || { currentPage: 1, pageSize: 10, totalRecords: 0, totalPages: 0 })
    } catch (error) {
      console.error('Failed to fetch clinic activity:', error)
      toast.error('Failed to load clinic activity')
    } finally {
      setClinicLoading(false)
    }
  }, [dateRangeDates, clinicPagination.pageIndex, clinicPagination.pageSize, clinicSearch, clinicStatusFilter])

  // Fetch Payment Report
  const fetchPaymentReport = useCallback(async () => {
    setPaymentLoading(true)
    try {
      const query = new URLSearchParams()
      query.append('page', String(paymentPagination.pageIndex + 1))
      query.append('limit', String(paymentPagination.pageSize))
      if (paymentSearch) query.append('search', paymentSearch)
      if (paymentMethodFilter && paymentMethodFilter !== 'all') query.append('method', paymentMethodFilter)
      if (dateRangeDates.startDate) query.append('startDate', dateRangeDates.startDate)
      if (dateRangeDates.endDate) query.append('endDate', dateRangeDates.endDate)

      const res = await api.get<any>(`/api/reports/payments?${query.toString()}`)
      setPaymentRecords(res.data || [])
      setPaymentMeta(res.meta || { currentPage: 1, pageSize: 10, totalRecords: 0, totalPages: 0 })
    } catch (error) {
      console.error('Failed to fetch payment report:', error)
      toast.error('Failed to load payment records')
    } finally {
      setPaymentLoading(false)
    }
  }, [dateRangeDates, paymentPagination.pageIndex, paymentPagination.pageSize, paymentSearch, paymentMethodFilter])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchClinicActivity()
  }, [fetchClinicActivity])

  useEffect(() => {
    fetchPaymentReport()
  }, [fetchPaymentReport])

  // Reset pageIndex on filter change
  useEffect(() => {
    setClinicPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [clinicSearch, clinicStatusFilter, dateRangeDates])

  useEffect(() => {
    setPaymentPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [paymentSearch, paymentMethodFilter, dateRangeDates])

  const getRangeLabel = () => {
    switch (preset) {
      case 'today': return "Today's"
      case 'this_week': return "This Week's"
      case 'this_month': return "This Month's"
      case 'last_month': return "Last Month's"
      case 'this_year': return "This Year's"
      case 'all_time': return "All Time"
      case 'custom':
        return (customStart && customEnd) ? `${customStart} to ${customEnd}` : "Custom Period"
    }
  }

  // Clinic Activity Columns
  const clinicColumns: ColumnDef<any>[] = [
    {
      header: () => <div className="text-left font-semibold text-slate-600">Patient</div>,
      accessorKey: 'patientName',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.patientName}</span>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Visit Date</div>,
      accessorKey: 'visitDate',
      cell: ({ row }) => (
        <div className="text-center text-slate-600 text-xs font-mono">
          {new Date(row.original.visitDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      )
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Doctor</div>,
      accessorKey: 'doctorName',
      cell: ({ row }) => <div className="text-center text-slate-700">{row.original.doctorName}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Visit Type</div>,
      accessorKey: 'visitType',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className={row.original.visitType === 'Appointment' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-slate-600'}>
            {row.original.visitType}
          </Badge>
        </div>
      )
    },
    {
      header: () => <div className="text-left font-semibold text-slate-600">Reason for Visit</div>,
      accessorKey: 'reasonForVisit',
      cell: ({ row }) => <div className="text-slate-600 truncate max-w-[180px]" title={row.original.reasonForVisit}>{row.original.reasonForVisit}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Status</div>,
      accessorKey: 'status',
      cell: ({ row }) => {
        const s = row.original.status
        let badge = <Badge variant="outline">{s}</Badge>
        if (s === 'COMPLETED') badge = <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>
        else if (s === 'CANCELLED') badge = <Badge className="bg-slate-100 text-slate-500 border-slate-200">Cancelled</Badge>
        else badge = <Badge className="bg-amber-100 text-amber-800 border-amber-200">Active</Badge>
        return <div className="text-center">{badge}</div>
      }
    },
    {
      header: () => <div className="text-right font-semibold text-slate-600">Amount Due</div>,
      accessorKey: 'amountDue',
      cell: ({ row }) => <div className="text-right font-medium text-slate-900">₹{row.original.amountDue}</div>
    },
    {
      header: () => <div className="text-right font-semibold text-slate-600">Total Paid</div>,
      accessorKey: 'totalPaid',
      cell: ({ row }) => <div className="text-right font-medium text-emerald-600">₹{row.original.totalPaid}</div>
    },
    {
      header: () => <div className="text-right font-semibold text-slate-600">Balance</div>,
      accessorKey: 'balance',
      cell: ({ row }) => (
        <div className={`text-right font-semibold ${row.original.balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
          ₹{row.original.balance}
        </div>
      )
    }
  ]

  // Payment Report Columns
  const paymentColumns: ColumnDef<any>[] = [
    {
      header: () => <div className="text-left font-semibold text-slate-600">Payment ID</div>,
      accessorKey: 'id',
      cell: ({ row }) => <span className="font-mono text-xs text-slate-500">{row.original.id.slice(0, 8)}...</span>
    },
    {
      header: () => <div className="text-left font-semibold text-slate-600">Patient</div>,
      accessorKey: 'patientName',
      cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.patientName}</span>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Doctor</div>,
      accessorKey: 'doctorName',
      cell: ({ row }) => <div className="text-center text-slate-700">{row.original.doctorName}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Date & Time</div>,
      accessorKey: 'paymentDate',
      cell: ({ row }) => (
        <div className="text-center text-slate-600 text-xs font-mono">
          {new Date(row.original.paymentDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </div>
      )
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Method</div>,
      accessorKey: 'method',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="outline" className="font-medium bg-slate-50 text-slate-700 border-slate-200">
            {row.original.method}
          </Badge>
        </div>
      )
    },
    {
      header: () => <div className="text-right font-semibold text-slate-600">Amount</div>,
      accessorKey: 'amount',
      cell: ({ row }) => <div className="text-right font-bold text-emerald-600">₹{row.original.amount}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Status</div>,
      accessorKey: 'status',
      cell: ({ row }) => (
        <div className="text-center">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">{row.original.status}</Badge>
        </div>
      )
    },
    {
      header: () => <div className="text-left font-semibold text-slate-600">Notes / Reason</div>,
      accessorKey: 'notes',
      cell: ({ row }) => <div className="text-slate-600 text-xs italic truncate max-w-[200px]" title={row.original.notes}>{row.original.notes}</div>
    }
  ]

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12 h-full flex flex-col">
      {/* Header & Date Range Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Clinic Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive clinical activity and financial reporting.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Period:</span>
          </div>

          <Select value={preset} onValueChange={(val) => setPreset(val as DatePreset)}>
            <SelectTrigger className="w-[160px] h-10 bg-white border-slate-200 text-xs font-medium rounded-xl">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range...</SelectItem>
            </SelectContent>
          </Select>

          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-10 w-36 text-xs bg-white border-slate-200 rounded-xl"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <Input
                type="date"
                className="h-10 w-36 text-xs bg-white border-slate-200 rounded-xl"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-10 flex-1 overflow-auto pr-1">
        {/* A. Clinic Summary */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-lg font-bold text-slate-900">{getRangeLabel()} Clinic Summary</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Patients Seen" value={summaryData?.clinicSummary.uniquePatientsSeen ?? (isSummaryLoading ? '...' : 0)} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Completed Visits" value={summaryData?.clinicSummary.completedVisits ?? (isSummaryLoading ? '...' : 0)} icon={CheckCircle} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Pending Visits" value={summaryData?.clinicSummary.pendingVisits ?? (isSummaryLoading ? '...' : 0)} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Appointments" value={summaryData?.clinicSummary.totalAppointments ?? (isSummaryLoading ? '...' : 0)} icon={CalendarIcon} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* B. Payment Summary */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-lg font-bold text-slate-900">{getRangeLabel()} Payment Summary</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Collected" value={isSummaryLoading ? '...' : `₹${(summaryData?.paymentSummary.totalRevenue || 0).toLocaleString()}`} icon={IndianRupee} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Cash Collected" value={isSummaryLoading ? '...' : `₹${(summaryData?.paymentSummary.cashCollected || 0).toLocaleString()}`} icon={Banknote} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="GPay Collected" value={isSummaryLoading ? '...' : `₹${(summaryData?.paymentSummary.gpayCollected || 0).toLocaleString()}`} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Total Payments" value={summaryData?.paymentSummary.paymentCount ?? (isSummaryLoading ? '...' : 0)} icon={CheckCircle} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* C. Inventory Snapshot */}
        <section>
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-lg font-bold text-slate-900">Inventory Snapshot</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Total Medicines" value={summaryData?.inventorySnapshot.totalItems ?? (isSummaryLoading ? '...' : 0)} icon={Package} colorClass="text-slate-600" bgClass="bg-slate-100" />
            <KpiCard title="Low Stock" value={summaryData?.inventorySnapshot.lowStockItems ?? (isSummaryLoading ? '...' : 0)} icon={AlertTriangle} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Out of Stock" value={summaryData?.inventorySnapshot.outOfStockItems ?? (isSummaryLoading ? '...' : 0)} icon={XCircle} colorClass="text-rose-600" bgClass="bg-rose-100" />
          </div>
        </section>

        {/* D. Detailed Clinic Activity Report Table */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detailed Clinic Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Visits and consultation history for the selected date range.</p>
            </div>
          </div>

          <DataTableToolbar
            searchQuery={clinicSearch}
            onSearchChange={setClinicSearch}
            searchPlaceholder="Search patient, reason, ID..."
            filterSlot={
              <Select value={clinicStatusFilter} onValueChange={setClinicStatusFilter}>
                <SelectTrigger className="h-9 w-[150px] bg-slate-50/50 border-slate-200 text-xs font-medium">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="WAITING">Waiting</SelectItem>
                  <SelectItem value="WITH_DOCTOR">With Doctor</SelectItem>
                  <SelectItem value="READY_FOR_RECEPTION">Ready for Reception</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            }
            exportOptions={{
              pdf: true,
              excel: true,
              csv: true,
              onExport: async (format) => {
                try {
                  const query = new URLSearchParams()
                  query.set('format', format)
                  if (clinicSearch) query.set('search', clinicSearch)
                  if (clinicStatusFilter && clinicStatusFilter !== 'all') query.set('status', clinicStatusFilter)
                  if (dateRangeDates.startDate) query.set('startDate', dateRangeDates.startDate)
                  if (dateRangeDates.endDate) query.set('endDate', dateRangeDates.endDate)

                  const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv'
                  await api.download(`/api/reports/clinic-activity/export?${query.toString()}`, `clinic_activity_report.${ext}`)
                  toast.success(`Exported ${format.toUpperCase()} successfully`)
                } catch (err: any) {
                  toast.error(err.message || 'Failed to export clinic activity')
                }
              }
            }}
          />

          <div className="p-4">
            <DataTable
              columns={clinicColumns}
              data={clinicVisits}
              loading={clinicLoading}
              manualPagination={true}
              pageCount={clinicMeta.totalPages}
              totalRecords={clinicMeta.totalRecords}
              state={{ pagination: clinicPagination }}
              onStateChange={(updater: any) => {
                if (typeof updater === 'function') {
                  setClinicPagination(updater(clinicPagination))
                } else if (updater.pagination) {
                  setClinicPagination(updater.pagination)
                }
              }}
              emptyState={
                <DataTableEmpty
                  title="No clinic visits found"
                  description="No visits match your search, status filter, or selected date range."
                />
              }
            />
          </div>
        </section>

        {/* E. Detailed Payment Report Table */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Detailed Payment Report</h2>
              <p className="text-xs text-slate-500 mt-0.5">Individual payment transactions for the selected date range.</p>
            </div>
          </div>

          <DataTableToolbar
            searchQuery={paymentSearch}
            onSearchChange={setPaymentSearch}
            searchPlaceholder="Search patient, payment ID, notes..."
            filterSlot={
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="h-9 w-[150px] bg-slate-50/50 border-slate-200 text-xs font-medium">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="GPay">GPay</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                </SelectContent>
              </Select>
            }
            exportOptions={{
              pdf: true,
              excel: true,
              csv: true,
              onExport: async (format) => {
                try {
                  const query = new URLSearchParams()
                  query.set('format', format)
                  if (paymentSearch) query.set('search', paymentSearch)
                  if (paymentMethodFilter && paymentMethodFilter !== 'all') query.set('method', paymentMethodFilter)
                  if (dateRangeDates.startDate) query.set('startDate', dateRangeDates.startDate)
                  if (dateRangeDates.endDate) query.set('endDate', dateRangeDates.endDate)

                  const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv'
                  await api.download(`/api/reports/payments/export?${query.toString()}`, `payment_transactions_report.${ext}`)
                  toast.success(`Exported ${format.toUpperCase()} successfully`)
                } catch (err: any) {
                  toast.error(err.message || 'Failed to export payment report')
                }
              }
            }}
          />

          <div className="p-4">
            <DataTable
              columns={paymentColumns}
              data={paymentRecords}
              loading={paymentLoading}
              manualPagination={true}
              pageCount={paymentMeta.totalPages}
              totalRecords={paymentMeta.totalRecords}
              state={{ pagination: paymentPagination }}
              onStateChange={(updater: any) => {
                if (typeof updater === 'function') {
                  setPaymentPagination(updater(paymentPagination))
                } else if (updater.pagination) {
                  setPaymentPagination(updater.pagination)
                }
              }}
              emptyState={
                <DataTableEmpty
                  title="No payment records found"
                  description="No transactions match your search, method filter, or selected date range."
                />
              }
            />
          </div>
        </section>
      </div>
    </div>
  )
}

