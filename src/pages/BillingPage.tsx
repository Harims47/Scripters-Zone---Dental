import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle2, FileText, Receipt } from 'lucide-react'
import { DataTable, DataTableEmpty } from '../components/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { DataTableToolbar } from '../components/data-table/data-table-toolbar'
import { Sheet, SheetContent, SheetScrollArea } from '../components/ui/sheet'
import { PatientProfileHeader, DrawerSection } from '../components/ui/drawer-patterns'
import { DispensingMedicineItem } from '../components/dispensing/dispensing-components'
import type { DispensingItem } from '../components/dispensing/dispensing-components'
import { PaymentMethodSelector } from '../components/payment/payment-components'
import type { PaymentMethod } from '../components/payment/payment-components'
import { useClinicContext } from '../context/ClinicContext'

export function BillingPage() {
  const [searchParams] = useSearchParams()
  const urlPatientId = searchParams.get('patientId')
  
  const { visits, patients, prescriptions, dispensings, payments, medicines, completeDispensing, recordPayment } = useClinicContext()

  // 1. Data Aggregation
  const billingData = useMemo(() => {
    const eligibleVisits = visits.filter(v => 
      v.status === 'READY_FOR_RECEPTION' || v.status === 'READY_FOR_PAYMENT' || v.status === 'COMPLETED'
    )
    
    return eligibleVisits.map(v => {
      const p = patients.find(pt => pt.id === v.patientId)
      const rx = prescriptions.find(r => r.visitId === v.id && r.status === 'Finalized')
      const disp = dispensings.find(d => d.visitId === v.id)
      const payRecord = payments.find(pay => pay.visitId === v.id)

      let dispensingStatus = 'Not Required'
      if (rx && rx.items.length > 0) {
        dispensingStatus = disp ? 'Dispensed' : 'Pending'
      }

      const paymentStatus = payRecord ? 'Paid' : 'Pending'

      let action = 'View'
      if (dispensingStatus === 'Pending') action = 'Process Billing'
      else if (paymentStatus === 'Pending') action = 'Collect Payment'

      // Build active items for dispensing if prescription exists
      const items: DispensingItem[] = rx ? rx.items.map((ri, idx) => {
        const med = medicines.find(m => m.id === ri.medicineId)
        const dItem = disp?.items.find(di => di.medicineId === ri.medicineId)
        
        return {
          id: `i${idx}`,
          medicineId: ri.medicineId,
          name: med?.name || 'Unknown',
          strength: med?.unit || '',
          categoryId: med?.categoryId || 'cat1',
          prescribedQty: ri.quantity,
          dispensedQty: dItem ? dItem.dispensedQuantity : ri.quantity,
          availableStock: med?.currentStock || 0
        }
      }) : []

      return {
        id: v.id,
        visitId: v.id,
        prescriptionId: rx?.id,
        patientId: p?.id || 'Unknown',
        patientName: p?.name || 'Unknown',
        patientPhone: p?.phone || '-',
        amount: v.amountDue || 0,
        dispensingStatus,
        paymentStatus,
        action,
        items,
        paymentMethod: payRecord?.method || null
      }
    })
  }, [visits, patients, prescriptions, dispensings, payments, medicines])

  const [search, setSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<any | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // Dispensing State
  const [activeItems, setActiveItems] = useState<DispensingItem[]>([])
  const [dispenseError, setDispenseError] = useState<string | null>(null)
  
  // Payment State
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    if (urlPatientId) setSearch(urlPatientId)
  }, [urlPatientId])

  const handleOpenDrawer = (row: any) => {
    setSelectedRow(row)
    setActiveItems(row.items.map((item: any) => ({ ...item })))
    setActiveMethod(row.paymentMethod)
    setDispenseError(null)
    setPaymentError(null)
    setDrawerOpen(true)
  }

  const handleQtyChange = (id: string, qty: number) => {
    setActiveItems(prev => prev.map(item => item.id === id ? { ...item, dispensedQty: qty } : item))
  }

  const handleCompleteDispensing = () => {
    if (selectedRow) {
      setDispenseError(null)
      const mappedItems = activeItems.map(item => ({
        medicineId: item.medicineId,
        prescribedQuantity: item.prescribedQty,
        dispensedQuantity: item.dispensedQty
      }))

      const result = completeDispensing(selectedRow.visitId, selectedRow.prescriptionId, mappedItems)
      
      if (result.success) {
        // Optimistically update the selected row state so the UI transitions smoothly
        setSelectedRow((prev: any) => ({ ...prev, dispensingStatus: 'Dispensed', action: 'Collect Payment' }))
      } else {
        setDispenseError(result.error || 'Failed to dispense')
      }
    }
  }

  const handleCollectPayment = () => {
    if (selectedRow && activeMethod && (activeMethod === 'Cash' || activeMethod === 'GPay' || activeMethod === 'Card' || activeMethod === 'UPI')) {
      setPaymentError(null)
      const result = recordPayment(selectedRow.visitId, activeMethod as 'Cash' | 'GPay') // Note: Using the exact method signature expected by the Context
      
      if (result.success) {
        setSelectedRow((prev: any) => ({ ...prev, paymentStatus: 'Paid', action: 'View' }))
      } else {
        setPaymentError(result.error || 'Failed to record payment')
      }
    } else {
       setPaymentError('Please select a valid payment method.')
    }
  }

  const filteredData = useMemo(() => {
    return billingData.filter(d => 
      (d.patientName.toLowerCase().includes(search.toLowerCase()) || 
       d.patientId.toLowerCase().includes(search.toLowerCase()) ||
       d.visitId.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => {
      // Sort pending actions first
      if (a.action !== 'View' && b.action === 'View') return -1;
      if (a.action === 'View' && b.action !== 'View') return 1;
      return 0;
    })
  }, [billingData, search])

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
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => <span className="font-medium text-slate-900">₹{row.original.amount}</span>
    },
    {
      header: "Dispensing",
      accessorKey: "dispensingStatus",
      cell: ({ row }) => {
        const s = row.original.dispensingStatus
        if (s === 'Pending') return <Badge variant="statusWaiting">{s}</Badge>
        if (s === 'Dispensed') return <Badge variant="statusInactive">{s}</Badge>
        return <span className="text-sm text-slate-400">{s}</span>
      }
    },
    {
      header: "Payment",
      accessorKey: "paymentStatus",
      cell: ({ row }) => {
        const s = row.original.paymentStatus
        if (s === 'Pending') return <Badge variant="statusWaiting">{s}</Badge>
        if (s === 'Paid') return <Badge variant="statusInactive">{s}</Badge>
        return <span className="text-sm text-slate-400">{s}</span>
      }
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isComplete = row.original.action === 'View'
        return (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleOpenDrawer(row.original)}
              className={`font-medium shadow-sm ${isComplete ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'}`}
            >
              {row.original.action}
            </Button>
          </div>
        )
      }
    }
  ]

  const totalPrescribed = activeItems.reduce((acc, item) => acc + item.prescribedQty, 0)
  const totalDispensed = activeItems.reduce((acc, item) => acc + item.dispensedQty, 0)
  const isDispensingReady = selectedRow?.dispensingStatus === 'Dispensed' || selectedRow?.dispensingStatus === 'Not Required'
  const isFullyComplete = selectedRow?.paymentStatus === 'Paid'

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-slate-500 mt-1">Manage dispensing and payment collection in one place.</p>
      </div>

      <DataTableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patient or ID..."
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
                title="No billing items found" 
                description={`There are no records matching "${search}".`}
              />
            ) : (
              <DataTableEmpty 
                icon={Receipt}
                title="No billing items" 
                description="Completed visits will appear here when they are ready for billing." 
              />
            )
          }
        />
      </div>

      {/* Unified Billing Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" size="lg" className="sm:max-w-md bg-white border-l shadow-2xl p-0 flex flex-col gap-0 transition-transform duration-300">
          {selectedRow && (
            <>
              {isFullyComplete ? (
                // COMPLETION STATE
                <div className="flex-1 flex flex-col p-10 justify-center text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Billing Completed</h2>
                    <p className="text-lg text-slate-500 mt-2">Visit Finished</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl inline-block mx-auto text-left min-w-[300px] space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-slate-500">Patient</span>
                      <span className="font-semibold text-slate-900">{selectedRow.patientName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-slate-500">Amount Paid</span>
                      <span className="font-semibold text-emerald-600">₹{selectedRow.amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Method</span>
                      <span className="font-medium text-slate-900">{selectedRow.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="pt-8 flex flex-col gap-3 max-w-sm mx-auto w-full">
                    <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>
                  </div>
                </div>
              ) : (
                // ACTIVE WORKSPACE
                <>
                  <PatientProfileHeader 
                    name={selectedRow.patientName}
                    patientId={selectedRow.patientId}
                    phone={selectedRow.patientPhone}
                    statusElement={<Badge variant="statusWaiting">{selectedRow.action}</Badge>}
                    modeText="Billing Workflow"
                  />
                  <SheetScrollArea className="p-0 bg-slate-50 flex-1">
                    <div className="px-6 sm:px-8 py-8 space-y-6">

                      {/* Step 1: Dispensing */}
                      {selectedRow.dispensingStatus !== 'Not Required' && (
                        <DrawerSection title="1. Dispensing">
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-sm font-semibold text-slate-900">
                              Prescription <span className="font-mono text-slate-500 ml-1">{selectedRow.prescriptionId}</span>
                            </h3>
                          </div>
                          
                          {dispenseError && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium mb-4">
                              {dispenseError}
                            </div>
                          )}

                          <div className="space-y-4 mb-4">
                            {activeItems.map(item => (
                              <DispensingMedicineItem 
                                key={item.id} 
                                item={item} 
                                onChange={selectedRow.dispensingStatus === 'Pending' ? handleQtyChange : undefined} 
                              />
                            ))}
                          </div>

                          {selectedRow.dispensingStatus === 'Pending' ? (
                            <div className="flex items-center justify-between border-t pt-4 mt-2">
                              <span className="text-sm text-slate-500">
                                Dispensing: {totalDispensed} / {totalPrescribed} units
                              </span>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleCompleteDispensing}>
                                Complete Dispensing
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between border-t pt-4 mt-2">
                               <Badge variant="statusInactive">Dispensed</Badge>
                               <span className="text-sm text-slate-500">Inventory Deducted</span>
                            </div>
                          )}
                        </DrawerSection>
                      )}

                      {/* Step 2: Payment */}
                      <DrawerSection title={selectedRow.dispensingStatus !== 'Not Required' ? '2. Payment' : 'Payment'}>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-500 font-medium mb-1">Total Due</p>
                            <div className="text-3xl font-bold text-slate-900">₹{selectedRow.amount}</div>
                          </div>
                          <Badge variant={selectedRow.paymentStatus === 'Paid' ? "statusInactive" : "statusWaiting"}>
                            {selectedRow.paymentStatus}
                          </Badge>
                        </div>

                        {paymentError && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium mb-4">
                            {paymentError}
                          </div>
                        )}

                        {selectedRow.paymentStatus === 'Pending' && isDispensingReady && (
                          <div className="space-y-4">
                            <PaymentMethodSelector value={activeMethod} onChange={setActiveMethod} />
                            <div className="flex justify-end pt-2">
                              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCollectPayment}>
                                Collect Payment
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {selectedRow.paymentStatus === 'Pending' && !isDispensingReady && (
                           <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border text-center">
                             Please complete dispensing before collecting payment.
                           </div>
                        )}

                      </DrawerSection>

                    </div>
                  </SheetScrollArea>
                  
                  {/* Fixed Footer */}
                  <div className="bg-white border-t px-6 py-4 flex justify-end">
                    <Button variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>
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
