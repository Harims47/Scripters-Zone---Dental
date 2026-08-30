import { useState, useEffect } from 'react'
import { KpiCard } from '../components/dashboard/dashboard-components'
import { Users, CheckCircle, Calendar as CalendarIcon, Clock, IndianRupee, CreditCard, Banknote, Package, AlertTriangle, XCircle, Calendar } from 'lucide-react'
import { api } from '../lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

type DateRange = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all_time'

const getDateRange = (range: DateRange) => {
  const end = new Date()
  const start = new Date()
  
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  switch (range) {
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
    case 'all_time':
      return { startDate: undefined, endDate: undefined }
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

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
  const [data, setData] = useState<ReportsSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('this_month')

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true)
      try {
        const { startDate, endDate } = getDateRange(dateRange)
        const query = new URLSearchParams()
        if (startDate) query.append('startDate', startDate)
        if (endDate) query.append('endDate', endDate)

        const res = await api.get<ReportsSummaryData>(`/api/reports/summary?${query.toString()}`)
        setData(res)
      } catch (error) {
        console.error('Failed to fetch reports summary:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchReports()
  }, [dateRange])

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading reports...</p>
        </div>
      </div>
    )
  }

  const { clinicSummary, paymentSummary, inventorySnapshot } = data
  
  const getRangeLabel = () => {
    switch (dateRange) {
      case 'today': return "Today's"
      case 'this_week': return "This Week's"
      case 'this_month': return "This Month's"
      case 'last_month': return "Last Month's"
      case 'this_year': return "This Year's"
      case 'all_time': return "All Time"
    }
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-8 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Clinic Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Aggregate data across the clinic workflow.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white border px-3 py-2 rounded-lg shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Date Range:</span>
          </div>
          <Select value={dateRange} onValueChange={(val) => setDateRange(val as DateRange)}>
            <SelectTrigger className="w-[180px] h-10 bg-white">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-auto pr-2">
        {/* A. Clinic Summary */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">{getRangeLabel()} Clinic Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Patients Seen" value={clinicSummary.uniquePatientsSeen} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Completed Visits" value={clinicSummary.completedVisits} icon={CheckCircle} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Pending Visits" value={clinicSummary.pendingVisits} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Appointments" value={clinicSummary.totalAppointments} icon={CalendarIcon} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* B. Payment Summary */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">{getRangeLabel()} Payment Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Collected" value={`₹${paymentSummary.totalRevenue.toLocaleString()}`} icon={IndianRupee} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Cash Collected" value={`₹${paymentSummary.cashCollected.toLocaleString()}`} icon={Banknote} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="GPay Collected" value={`₹${paymentSummary.gpayCollected.toLocaleString()}`} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Total Payments" value={paymentSummary.paymentCount} icon={CheckCircle} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* C. Inventory Snapshot */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Inventory Snapshot</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Total Medicines" value={inventorySnapshot.totalItems} icon={Package} colorClass="text-slate-600" bgClass="bg-slate-100" />
            <KpiCard title="Low Stock" value={inventorySnapshot.lowStockItems} icon={AlertTriangle} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Out of Stock" value={inventorySnapshot.outOfStockItems} icon={XCircle} colorClass="text-rose-600" bgClass="bg-rose-100" />
          </div>
        </section>
      </div>
    </div>
  )
}
