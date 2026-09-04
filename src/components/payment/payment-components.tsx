import { Banknote, Smartphone, CreditCard, Wallet } from 'lucide-react'

export type PaymentMethod = 'Cash' | 'GPay' | 'Credit Card' | 'Debit Card' | null

export function PaymentSummaryBlock({ amount }: { amount: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
      <div className="text-sm font-semibold text-slate-500 tracking-widest uppercase">Amount Due</div>
      <div className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
        ₹{amount.toLocaleString('en-IN')}
      </div>
    </div>
  )
}

export function PaymentMethodSelector({ 
  value, 
  onChange 
}: { 
  value: PaymentMethod, 
  onChange: (m: PaymentMethod) => void 
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Payment Method</h3>
      <div className="grid grid-cols-2 gap-4">
        
        {/* Cash Option */}
        <button
          onClick={() => onChange('Cash')}
          className={`flex flex-col items-center justify-center gap-3 p-5 border-2 rounded-xl transition-all ${
            value === 'Cash' 
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className={`p-3 rounded-full ${value === 'Cash' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Banknote className="w-6 h-6" />
          </div>
          <span className="font-semibold">Cash</span>
        </button>

        {/* GPay Option */}
        <button
          onClick={() => onChange('GPay')}
          className={`flex flex-col items-center justify-center gap-3 p-5 border-2 rounded-xl transition-all ${
            value === 'GPay' 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className={`p-3 rounded-full ${value === 'GPay' ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Smartphone className="w-6 h-6" />
          </div>
          <span className="font-semibold">GPay</span>
        </button>

        {/* Credit Card Option */}
        <button
          onClick={() => onChange('Credit Card')}
          className={`flex flex-col items-center justify-center gap-3 p-5 border-2 rounded-xl transition-all ${
            value === 'Credit Card' 
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className={`p-3 rounded-full ${value === 'Credit Card' ? 'bg-indigo-100' : 'bg-slate-100'}`}>
            <CreditCard className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Credit Card</span>
        </button>

        {/* Debit Card Option */}
        <button
          onClick={() => onChange('Debit Card')}
          className={`flex flex-col items-center justify-center gap-3 p-5 border-2 rounded-xl transition-all ${
            value === 'Debit Card' 
              ? 'border-violet-500 bg-violet-50 text-violet-700' 
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className={`p-3 rounded-full ${value === 'Debit Card' ? 'bg-violet-100' : 'bg-slate-100'}`}>
            <Wallet className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm">Debit Card</span>
        </button>

      </div>

      {value === 'GPay' && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg p-4 text-sm mt-4">
          <p className="font-semibold mb-1">Verify GPay Payment</p>
          <p>Please manually verify the successful GPay transaction screen shown by the patient before marking as paid.</p>
        </div>
      )}
      
      {value === 'Cash' && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-4 text-sm mt-4">
          <p className="font-semibold mb-1">Cash Payment</p>
          <p>Collect cash from the patient and verify the amount before marking as paid.</p>
        </div>
      )}
    </div>
  )
}
