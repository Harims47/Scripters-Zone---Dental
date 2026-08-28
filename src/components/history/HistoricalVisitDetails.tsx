import { useClinicContext } from '../../context/ClinicContext'
import { DEMO_STAFF } from '../../lib/mock-data'
import { ReadOnlyField, DrawerSection } from '../ui/drawer-patterns'

export function HistoricalVisitDetails({ visitId }: { visitId: string }) {
  const { visits, consultations, prescriptions, dispensings, payments, medicines } = useClinicContext()

  const visit = visits.find(v => v.id === visitId)
  const consultation = consultations.find(c => c.visitId === visitId)
  const prescription = prescriptions.find(p => p.visitId === visitId)
  const dispensing = dispensings.find(d => d.visitId === visitId)
  const payment = payments.find(p => p.visitId === visitId)
  const doctor = DEMO_STAFF.find(d => d.id === visit?.doctorId)

  if (!visit) {
    return <div className="p-4 text-slate-500">Visit not found.</div>
  }

  return (
    <div className="space-y-6 pb-8">
      <DrawerSection title="Visit Information">
        <ReadOnlyField label="Visit Status" value={visit.status} />
        <ReadOnlyField label="Doctor" value={doctor?.name || 'Unknown'} />
      </DrawerSection>

      {consultation && (
        <DrawerSection title="Consultation">
          <ReadOnlyField label="Reason for Visit" value={consultation.reasonForVisit || 'Not provided'} />
          <ReadOnlyField label="Clinical Notes" value={consultation.clinicalNotes || 'No notes added'} />
          <ReadOnlyField label="Consultation Fee" value={`₹${consultation.consultationFee}`} />
        </DrawerSection>
      )}

      {prescription && (
        <DrawerSection title="Prescription">
          {prescription.items.length > 0 ? (
            <div className="border rounded-md overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Medicine</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Dosage</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.items.map(item => {
                    const med = medicines.find(m => m.id === item.medicineId)
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-900 font-medium">{med?.name || 'Unknown'}</td>
                        <td className="px-3 py-2 text-slate-700">{item.dosage || '-'} x {item.frequency || '-'} ({item.duration || '-'})</td>
                        <td className="px-3 py-2 text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{item.instructions || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No medicines prescribed.</p>
          )}
          {prescription.notes && (
            <div className="mt-4">
              <ReadOnlyField label="Prescription Notes" value={prescription.notes} />
            </div>
          )}
        </DrawerSection>
      )}

      {dispensing && (
        <DrawerSection title="Dispensing">
          {dispensing.items.length > 0 ? (
            <div className="border rounded-md overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Medicine</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Prescribed</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Dispensed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispensing.items.map(item => {
                    const med = medicines.find(m => m.id === item.medicineId)
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-900 font-medium">{med?.name || 'Unknown'}</td>
                        <td className="px-3 py-2 text-slate-700">{item.prescribedQuantity}</td>
                        <td className="px-3 py-2 text-slate-700 font-medium">{item.dispensedQuantity}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No items dispensed.</p>
          )}
          <div className="mt-4">
            <ReadOnlyField label="Dispensing Status" value={dispensing.status} />
          </div>
        </DrawerSection>
      )}

      {payment && (
        <DrawerSection title="Payment">
          <ReadOnlyField label="Amount Paid" value={`₹${payment.amount}`} />
          <ReadOnlyField label="Payment Method" value={payment.method} />
          <ReadOnlyField label="Payment Status" value={payment.status} />
        </DrawerSection>
      )}
    </div>
  )
}
