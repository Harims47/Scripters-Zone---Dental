import { useMemo, useState } from 'react'
import { KpiCard } from '../components/dashboard/dashboard-components'
import { Users, CheckCircle, Calendar as CalendarIcon, Clock, IndianRupee, CreditCard, Banknote, Package, AlertTriangle, XCircle, Pill } from 'lucide-react'
import { useClinicContext } from '../context/ClinicContext'
import { DataTable } from '../components/data-table/data-table'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableColumnHeader } from '../components/data-table/data-table-column-header'
import type { ColumnDef } from '@tanstack/react-table'

export function ReportsPage() {
  const { visits, appointments, payments, dispensings, medicines } = useClinicContext()
  
  const [dispensingSearch, setDispensingSearch] = useState('')

  // --- A. Clinic Summary ---
  const uniquePatientsSeen = new Set(visits.map(v => v.patientId)).size
  const completedVisits = visits.filter(v => v.status === 'COMPLETED').length
  const pendingVisits = visits.filter(v => v.status !== 'COMPLETED' && v.status !== 'CANCELLED').length
  const totalAppointments = appointments.length

  // --- B. Payment Summary ---
  const totalRevenue = payments.reduce((sum, p) => p.status === 'Paid' ? sum + p.amount : sum, 0)
  const cashCollected = payments.reduce((sum, p) => (p.status === 'Paid' && p.method === 'Cash') ? sum + p.amount : sum, 0)
  const gpayCollected = payments.reduce((sum, p) => (p.status === 'Paid' && p.method === 'GPay') ? sum + p.amount : sum, 0)
  const paymentCount = payments.filter(p => p.status === 'Paid').length

  // --- C. Medicine Dispensing Summary ---
  const dispensingTransactions = dispensings.length
  const totalItemsDispensed = dispensings.reduce((sum, d) => sum + d.items.reduce((itemSum, item) => itemSum + item.dispensedQuantity, 0), 0)

  // Dispensing details for the table
  const dispensingTableData = useMemo(() => {
    return dispensings.flatMap(d => 
      d.items.map(item => {
        const med = medicines.find(m => m.id === item.medicineId)
        return {
          id: `${d.id}-${item.id}`,
          dispensingId: d.id,
          medicineName: med ? med.name : item.medicineId,
          prescribedQty: item.prescribedQuantity,
          dispensedQty: item.dispensedQuantity,
          status: d.status
        }
      })
    )
  }, [dispensings, medicines])

  const filteredDispensingData = useMemo(() => {
    return dispensingTableData.filter(d => d.medicineName.toLowerCase().includes(dispensingSearch.toLowerCase()))
  }, [dispensingTableData, dispensingSearch])

  const dispensingColumns: ColumnDef<typeof dispensingTableData[0]>[] = [
    {
      accessorKey: "dispensingId",
      header: "Transaction ID",
      cell: ({ row }) => <span className="text-slate-500 font-mono text-xs">{row.original.dispensingId}</span>
    },
    {
      accessorKey: "medicineName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Medicine" />,
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.medicineName}</span>
    },
    {
      accessorKey: "prescribedQty",
      header: "Prescribed",
      cell: ({ row }) => <span className="text-slate-700">{row.original.prescribedQty}</span>
    },
    {
      accessorKey: "dispensedQty",
      header: "Dispensed",
      cell: ({ row }) => <span className="text-slate-900 font-medium">{row.original.dispensedQty}</span>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <span className="text-slate-500 capitalize">{row.original.status.toLowerCase()}</span>
    }
  ]

  // --- D. Inventory Snapshot ---
  // Using exact logic from InventoryPage.tsx
  const totalItems = medicines.length
  const lowStockItems = medicines.filter(i => i.currentStock > 0 && i.currentStock < i.stockWarningLevel).length
  const outOfStockItems = medicines.filter(i => i.currentStock === 0).length

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-8 h-full flex flex-col">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Clinic Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time aggregate data across the clinic workflow.</p>
      </div>

      <div className="space-y-8 flex-1 overflow-auto pr-2">
        {/* A. Clinic Summary */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Today's Clinic Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Patients Seen" value={uniquePatientsSeen} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Completed Visits" value={completedVisits} icon={CheckCircle} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Pending Visits" value={pendingVisits} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Appointments" value={totalAppointments} icon={CalendarIcon} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* B. Payment Summary */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Payment Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Collected" value={`₹${totalRevenue.toLocaleString()}`} icon={IndianRupee} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="Cash Collected" value={`₹${cashCollected.toLocaleString()}`} icon={Banknote} colorClass="text-emerald-600" bgClass="bg-emerald-100" />
            <KpiCard title="GPay Collected" value={`₹${gpayCollected.toLocaleString()}`} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-100" />
            <KpiCard title="Total Payments" value={paymentCount} icon={CheckCircle} colorClass="text-indigo-600" bgClass="bg-indigo-100" />
          </div>
        </section>

        {/* D. Inventory Snapshot */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">Inventory Snapshot</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard title="Total Medicines" value={totalItems} icon={Package} colorClass="text-slate-600" bgClass="bg-slate-100" />
            <KpiCard title="Low Stock" value={lowStockItems} icon={AlertTriangle} colorClass="text-amber-600" bgClass="bg-amber-100" />
            <KpiCard title="Out of Stock" value={outOfStockItems} icon={XCircle} colorClass="text-rose-600" bgClass="bg-rose-100" />
          </div>
        </section>

        {/* C. Dispensing Summary */}
        <section className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Dispensing Report</h2>
            <div className="flex gap-4 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border"><Pill className="w-4 h-4 text-slate-400"/> {dispensingTransactions} Transactions</span>
              <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border"><Package className="w-4 h-4 text-slate-400"/> {totalItemsDispensed} Items Dispensed</span>
            </div>
          </div>
          
          <DataTableToolbar 
            searchQuery={dispensingSearch} 
            onSearchChange={setDispensingSearch} 
            searchPlaceholder="Search medicine..."
            exportOptions={{ pdf: true, excel: true, csv: true }}
          />
          <div className="mt-4 border rounded-lg overflow-hidden">
            <DataTable 
              columns={dispensingColumns}
              data={filteredDispensingData}
              selectable={false}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
