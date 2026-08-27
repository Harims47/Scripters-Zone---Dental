import { Clock, User } from 'lucide-react'
import { Badge } from '../ui/badge'

export function PatientClinicalSummary({
  patientId,
  name,
  phone,
  age,
  assignedDoctor
}: {
  patientId: string
  name: string
  phone: string
  age: number | string
  assignedDoctor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-5">
      <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">Patient Summary</h3>
      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
        <div>
          <div className="text-slate-500 font-medium mb-1">Patient Name</div>
          <div className="font-semibold text-slate-900">{name}</div>
        </div>
        <div>
          <div className="text-slate-500 font-medium mb-1">Patient ID</div>
          <div className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border inline-block">{patientId}</div>
        </div>
        <div>
          <div className="text-slate-500 font-medium mb-1">Phone</div>
          <div className="text-slate-700">{phone}</div>
        </div>
        <div>
          <div className="text-slate-500 font-medium mb-1">Age</div>
          <div className="text-slate-700">{age} Years</div>
        </div>
        <div className="col-span-2 pt-2 border-t mt-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500 font-medium">Assigned to:</span>
            <span className="font-semibold text-slate-900">{assignedDoctor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PatientVisitHistory({
  visits
}: {
  visits: { date: string, title: string, status?: string }[]
}) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider mb-4">Previous Visits</h3>
      <div className="space-y-4">
        {visits.map((v, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
              {i !== visits.length - 1 && <div className="w-px h-full bg-slate-200 my-1" />}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-slate-900 text-sm">{v.date}</span>
                {v.status && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{v.status}</Badge>}
              </div>
              <div className="text-sm text-slate-500">{v.title}</div>
            </div>
          </div>
        ))}
        {visits.length === 0 && (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Clock className="h-4 w-4" /> No previous visits.
          </div>
        )}
      </div>
    </div>
  )
}
