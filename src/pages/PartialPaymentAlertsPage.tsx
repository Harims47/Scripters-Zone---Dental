import React, { useMemo, useState } from 'react';
import { useClinicContext } from '../context/ClinicContext';
import { DataTable } from '../components/data-table/data-table';
import { DataTableToolbar } from '../components/data-table/data-table-toolbar';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowRight, AlertTriangle, Banknote, CreditCard, Smartphone, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function PartialPaymentAlertsPage() {
  const { visits, payments, patients, staff, recordPayment } = useClinicContext();
  
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [activeMethod, setActiveMethod] = useState<'Cash' | 'GPay' | 'Credit Card' | 'Debit Card'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [overdueFilter, setOverdueFilter] = useState('all');

  const alerts = useMemo(() => {
    let alertData: any[] = [];
    
    // We want to check all visits that aren't cancelled for balances
    const activeVisits = visits.filter(v => v.status !== 'CANCELLED');

    for (const v of activeVisits) {
      const vPayments = payments.filter(p => p.visitId === v.id);
      
      if (vPayments.length > 0) {
        const totalPaid = vPayments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = v.amountDue || 0;
        const balance = amountDue - totalPaid;

        if (balance > 0) {
          // Find the earliest payment to determine when partial payment started
          const earliestPayment = vPayments.reduce((prev, curr) => 
            new Date(prev.createdAt) < new Date(curr.createdAt) ? prev : curr
          );

          const earliestDate = new Date(earliestPayment.createdAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - earliestDate.getTime());
          const daysOutstanding = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          const patient = patients.find(p => p.id === v.patientId);
          const doctor = staff.find(s => s.id === v.doctorId);

          alertData.push({
            visitId: v.id,
            patientName: patient?.name || 'Unknown',
            doctorName: doctor?.name || 'Unassigned',
            totalAmount: amountDue,
            paidAmount: totalPaid,
            balance: balance,
            partialPaymentDate: earliestDate.toLocaleDateString(),
            daysOutstanding: daysOutstanding,
          });
        }
      }
    }
    
    if (overdueFilter === 'overdue') {
      alertData = alertData.filter(d => d.daysOutstanding >= 3);
    } else if (overdueFilter === 'normal') {
      alertData = alertData.filter(d => d.daysOutstanding < 3);
    }

    if (search) {
      const s = search.toLowerCase();
      alertData = alertData.filter(d =>
        d.patientName.toLowerCase().includes(s) ||
        d.doctorName.toLowerCase().includes(s)
      );
    }

    // Sort by days outstanding descending
    return alertData.sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  }, [visits, payments, patients, staff, search, overdueFilter]);

  const handleCollect = async () => {
    if (!selectedAlert || !paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (paymentAmount > selectedAlert.balance) {
      toast.error(`Amount cannot exceed the balance of ₹${selectedAlert.balance}`);
      return;
    }

    setIsProcessing(true);
    // Since this is collecting the remaining balance, we will pass true if the balance is fully paid, or they are just paying some more.
    // If they pay less than the full balance, it's just another partial payment. 
    // We leave isFinalPayment as undefined unless they want to close it, but for simplicity, we don't need to force close it unless balance is 0.
    const isFinal = paymentAmount === selectedAlert.balance;

    const result = await recordPayment(
      selectedAlert.visitId,
      Number(paymentAmount),
      activeMethod,
      'Collecting outstanding balance',
      isFinal
    );

    setIsProcessing(false);

    if (result.success) {
      toast.success('Payment collected successfully!');
      setSelectedAlert(null);
      setPaymentAmount('');
    } else {
      toast.error(result.error || 'Failed to collect payment');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: () => <div className="text-center font-semibold text-slate-600">Patient Name</div>,
      accessorKey: 'patientName',
      cell: ({ row }) => <div className="text-center font-medium text-slate-900">{row.original.patientName}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Doctor Name</div>,
      accessorKey: 'doctorName',
      cell: ({ row }) => <div className="text-center text-slate-600">{row.original.doctorName}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Total Amount</div>,
      accessorKey: 'totalAmount',
      cell: ({ row }) => <div className="text-center text-slate-600">₹{row.original.totalAmount}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Paid Amount</div>,
      accessorKey: 'paidAmount',
      cell: ({ row }) => <div className="text-center text-slate-600">₹{row.original.paidAmount}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Balance</div>,
      accessorKey: 'balance',
      cell: ({ row }) => <div className="text-center font-semibold text-rose-600">₹{row.original.balance}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Partial Payment Date</div>,
      accessorKey: 'partialPaymentDate',
      cell: ({ row }) => <div className="text-center text-slate-600">{row.original.partialPaymentDate}</div>
    },
    {
      header: () => <div className="text-center font-semibold text-slate-600">Days Outstanding</div>,
      accessorKey: 'daysOutstanding',
      cell: ({ row }) => {
        const days = row.original.daysOutstanding;
        const isOverdue = days >= 3;
        return (
          <div className="text-center flex justify-center">
            <Badge variant="outline" className={`flex items-center justify-center ${isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
              {isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
              {days} days
            </Badge>
          </div>
        );
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center font-semibold text-slate-600">Action</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-teal-700 border-teal-200 hover:bg-teal-50"
            onClick={() => {
              setSelectedAlert(row.original);
              setPaymentAmount(row.original.balance);
            }}
          >
            Collect Payment <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Partial Payments</h1>
          <p className="text-slate-500 mt-1">Monitor and follow-up on patients with outstanding balances.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex-1">
        <DataTableToolbar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by patient or doctor name..."
          filterSlot={
            <Select value={overdueFilter} onValueChange={setOverdueFilter}>
              <SelectTrigger className="h-9 w-[170px] bg-slate-50/50 border-slate-200 text-xs font-medium">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="overdue">Overdue (≥ 3 days)</SelectItem>
                <SelectItem value="normal">Normal (&lt; 3 days)</SelectItem>
              </SelectContent>
            </Select>
          }
          exportOptions={{
            pdf: true,
            excel: true,
            csv: true,
            onExport: async (format) => {
              try {
                const query = new URLSearchParams();
                query.set('format', format);
                if (search) query.set('search', search);
                if (overdueFilter && overdueFilter !== 'all') query.set('overdue', overdueFilter);
                const ext = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv';
                await api.download(`/api/payments/export-partial?${query.toString()}`, `partial_payments_export.${ext}`);
                toast.success(`Exported ${format.toUpperCase()} successfully`);
              } catch (err: any) {
                toast.error(err.message || 'Failed to export data');
              }
            }
          }}
        />
        <div className="p-4">
          <DataTable 
            columns={columns} 
            data={alerts}
            totalRecords={alerts.length}
          />
        </div>
      </div>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Collect Outstanding Balance</DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                <span className="text-slate-600 font-medium">Remaining Balance</span>
                <span className="text-2xl font-bold text-slate-900">₹{selectedAlert.balance}</span>
              </div>

              <div className="space-y-3">
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedAlert.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                />
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'Cash', icon: Banknote, label: 'Cash' },
                    { id: 'GPay', icon: Smartphone, label: 'GPay' },
                    { id: 'Credit Card', icon: CreditCard, label: 'Credit Card' },
                    { id: 'Debit Card', icon: CreditCard, label: 'Debit Card' }
                  ].map((method) => {
                    const Icon = method.icon;
                    const isActive = activeMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setActiveMethod(method.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          isActive 
                            ? 'border-teal-500 bg-teal-50 text-teal-700' 
                            : 'border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1.5" />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button 
                onClick={handleCollect} 
                disabled={isProcessing || !paymentAmount}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/20"
              >
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
