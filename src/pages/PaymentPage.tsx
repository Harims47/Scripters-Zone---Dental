import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle2 } from 'lucide-react'
import { DataTable } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { PatientProfileHeader, DrawerFooterActions } from '../components/ui/drawer-patterns'
import { PaymentSummaryBlock, PaymentMethodSelector } from '../components/payment/payment-components'
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
        amount: v.amountDue,
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
      header: "Visit ID",
      accessorKey: "visitId",
      cell: ({ row }) => <span className="text-slate-600 font-mono text-sm">{row.original.visitId}</span>
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => <span className="font-semibold text-slate-900">₹{row.original.amount.toLocaleString('en-IN')}</span>
    },
    {
      header: "Method",
      accessorKey: "method",
      cell: ({ row }) => <span className="text-slate-600">{row.original.method || '-'}</span>
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
            className="font-medium shadow-sm"
          >
            {row.original.status === 'Paid' ? 'View' : 'Mark Paid'}
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search patient, ID or visit..." 
            className="pl-9 bg-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1">
        <DataTable columns={columns} data={filteredData} />
      </div>

      {/* Collect Payment Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          {selectedRow && (
            <>
              {paymentState === 'completed' ? (
                // COMPLETION STATE
                <div className="flex-1 flex flex-col p-10 justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Payment Recorded</h2>
                    <p className="text-lg text-emerald-600 mt-2 font-medium">Visit Settled & Completed</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl inline-block mx-auto text-left min-w-[300px] space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-slate-500">Patient</span>
                      <span className="font-semibold text-slate-900">{selectedRow.patientName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-semibold text-slate-900">₹{selectedRow.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-slate-500">Method</span>
                      <span className="font-semibold text-slate-900">{activeMethod || selectedRow.method}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status</span>
                      <Badge variant="statusActive">PAID</Badge>
                    </div>
                  </div>
                  <div className="pt-8 flex flex-col gap-3 max-w-sm mx-auto w-full">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                      Close & Return to List
                    </Button>
                  </div>
                </div>
              ) : (
                // PAYMENT WORKSPACE
                <>
                  <PatientProfileHeader 
                    name={selectedRow.patientName}
                    patientId={selectedRow.patientId}
                    phone={selectedRow.patientPhone}
                    statusElement={<Badge variant="statusWaiting">Pending</Badge>}
                    modeText={`Visit ${selectedRow.visitId}`}
                  />
                  <SheetScrollArea className="p-0 bg-white flex-1">
                    <div className="px-6 sm:px-8 py-8 space-y-8">
                      
                      {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium mb-4">
                          {errorMsg}
                        </div>
                      )}

                      <PaymentSummaryBlock amount={selectedRow.amount} />
                      
                      <PaymentMethodSelector 
                        value={activeMethod} 
                        onChange={setActiveMethod} 
                      />

                    </div>
                  </SheetScrollArea>
                  
                  {/* Fixed Footer */}
                  <div className="bg-slate-50 border-t px-6 py-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-slate-500 block">Total Amount Due</span>
                        <span className="text-lg font-bold text-slate-900">₹{selectedRow.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-sm text-right">
                        <span className="text-slate-500 block">Method</span>
                        <span className="font-semibold text-slate-900">{activeMethod || 'None Selected'}</span>
                      </div>
                    </div>
                    <DrawerFooterActions>
                      <Button variant="outline" onClick={() => setDrawerOpen(false)} className="w-full sm:w-auto bg-white">Cancel</Button>
                      <Button 
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700" 
                        onClick={handleMarkAsPaid}
                        disabled={!activeMethod}
                      >
                        Mark as Paid
                      </Button>
                    </DrawerFooterActions>
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  )
}
