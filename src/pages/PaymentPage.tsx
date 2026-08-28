import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle2, AlertCircle } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { DataTableEmpty } from '../components/data-table/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { PaymentMethodSelector } from '../components/payment/payment-components'
import type { PaymentMethod } from '../components/payment/payment-components'
import { useClinicContext } from '../context/ClinicContext'

export function PaymentPage() {
  const [searchParams] = useSearchParams()
  const urlPatientId = searchParams.get('patientId')
  
  const { visits, patients, payments, recordPayment } = useClinicContext()

  const paymentData = useMemo(() => {
    const eligibleVisits = visits.filter(v => 
      v.status === 'READY_FOR_PAYMENT' || v.status === 'COMPLETED'
    )
    
    return eligibleVisits.map(v => {
      const p = patients.find(pt => pt.id === v.patientId)
      const payRecord = payments.find(pay => pay.visitId === v.id)
      
      // If completed but no payment record, it's an anomaly in the data, skip or mock
      if (v.status === 'COMPLETED' && !payRecord) return null

      return {
        paymentId: payRecord?.id || '',
        visitId: v.id,
        patientId: p?.id || 'Unknown',
        patientName: p?.name || 'Unknown',
        patientPhone: p?.phone || '-',
        amount: v.amountDue || 0,
        consultationFee: v.consultationFee || 0,
        medicineCost: v.medicineCost || 0,
        method: payRecord?.method || null,
        status: payRecord ? 'Paid' : 'Pending'
      }
    }).filter(Boolean) as any[]
  }, [visits, patients, payments])

  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(null)
  const [paymentState, setPaymentState] = useState<'pending' | 'completed'>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    // If navigated from dispensing with a specific patient, auto-search or filter.
    if (urlPatientId) {
      setSearch(urlPatientId)
    }
  }, [urlPatientId])

  const handleOpenDrawer = (row: any) => {
    setSelectedRow(row)
    setActiveMethod(row.method)
    setPaymentState(row.status === 'Paid' ? 'completed' : 'pending')
    setErrorMsg(null)
    setDrawerOpen(true)
  }

  const handleMarkAsPaid = () => {
    if (selectedRow && activeMethod && (activeMethod === 'Cash' || activeMethod === 'GPay')) {
      setErrorMsg(null)
      const result = recordPayment(selectedRow.visitId, activeMethod as 'Cash' | 'GPay')
      
      if (result.success) {
        setPaymentState('completed')
      } else {
        setErrorMsg(result.error || 'Failed to record payment')
      }
    } else {
       setErrorMsg('Please select a valid payment method.')
    }
  }

  const filteredData = useMemo(() => {
    return paymentData.filter(d => 
      (search ? true : d.status !== 'Paid') &&
      (d.patientName.toLowerCase().includes(search.toLowerCase()) || 
       d.patientId.toLowerCase().includes(search.toLowerCase()) ||
       d.visitId.toLowerCase().includes(search.toLowerCase()))
    )
  }, [paymentData, search])

  const columns: ColumnDef<any>[] = [
    {
      header: "Patient",
      accessorKey: "patientName",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-900">{row.original.patientName}</div>
          <div className="text-sm font-mono text-slate-500">{row.original.patientId}</div>
        </div>
      )
    },
    {
      header: "Amount Due",
      accessorKey: "amount",
      cell: ({ row }) => <span className="font-semibold text-slate-900">₹{row.original.amount.toLocaleString('en-IN')}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const s = row.original.status
        if (s === 'Pending') return <Badge variant="statusWaiting">{s}</Badge>
        if (s === 'Paid') return <Badge variant="statusActive">{s}</Badge>
        return <Badge variant="secondary">{s}</Badge>
      }
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleOpenDrawer(row.original)}
            className={`font-medium shadow-sm ${row.original.status === 'Paid' ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'}`}
          >
            {row.original.status === 'Paid' ? 'View' : 'Collect Payment'}
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collect Payment</h1>
        <p className="text-slate-500 mt-1">Collect payment for visits ready for payment.</p>
      </div>

      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient, ID or visit..."
        exportOptions={{ pdf: true, excel: true, csv: true }}
      />

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1">
        <DataTable 
          columns={columns} 
          data={filteredData}
          onRowClick={handleOpenDrawer}
          emptyState={
            search !== '' ? (
              <DataTableEmpty 
                icon={Search} 
                title="No payments found" 
                description={`There are no payment records matching "${search}".`}
              />
            ) : (
              <DataTableEmpty 
                title="No pending payments" 
                description="All visits are settled." 
              />
            )
          }
        />
      </div>

      {/* Collect Payment Dialog */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white">
          {selectedRow && (
            <>
              {paymentState === 'completed' ? (
                // COMPLETION STATE
                <div className="flex flex-col p-8 justify-center text-center space-y-5">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Received</h2>
                    <p className="text-emerald-600 mt-1 font-medium">Visit completed.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-left space-y-2 mt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Patient</span>
                      <span className="font-semibold text-slate-900">{selectedRow.patientName}</span>
                    </div>
                    {selectedRow.consultationFee > 0 && (
                      <div className="flex justify-between items-center text-sm text-slate-600">
                        <span>Consultation Fee</span>
                        <span>₹{selectedRow.consultationFee.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {selectedRow.medicineCost > 0 && (
                      <div className="flex justify-between items-center text-sm text-slate-600">
                        <span>Pharmacy / Medicines</span>
                        <span>₹{selectedRow.medicineCost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Total Amount</span>
                      <span className="font-semibold text-emerald-600">₹{selectedRow.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="pt-4 flex flex-col gap-2">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full">
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                // PAYMENT WORKSPACE
                <>
                  <DialogHeader className="px-6 py-5 border-b bg-slate-50">
                    <DialogTitle className="text-xl flex justify-between items-center">
                      Collect Payment
                      <Badge variant="statusWaiting">Pending</Badge>
                    </DialogTitle>
                    <div className="text-sm text-slate-500 mt-1">
                      <span className="font-medium text-slate-900">{selectedRow.patientName}</span> • Amount Due: <span className="font-bold text-slate-900">₹{selectedRow.amount.toLocaleString('en-IN')}</span>
                    </div>
                  </DialogHeader>
                  
                  <div className="p-6 space-y-6">
                    {errorMsg && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Bill Breakdown</h4>
                      {selectedRow.consultationFee > 0 && (
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Consultation Fee</span>
                          <span>₹{selectedRow.consultationFee.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {selectedRow.medicineCost > 0 && (
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Pharmacy / Medicines</span>
                          <span>₹{selectedRow.medicineCost.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                        <span>Total Due</span>
                        <span>₹{selectedRow.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <PaymentMethodSelector 
                        value={activeMethod} 
                        onChange={setActiveMethod} 
                      />
                    </div>
                  </div>
                  
                  <DialogFooter className="px-6 py-4 border-t bg-slate-50 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)} className="bg-white">Cancel</Button>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700" 
                      onClick={handleMarkAsPaid}
                      disabled={!activeMethod}
                    >
                      Payment Received
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
