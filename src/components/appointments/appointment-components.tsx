import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { DEMO_PROVIDERS, DEMO_PATIENTS } from '../../lib/mock-data'
import { type AppointmentStatus } from '../../lib/mock-data'

export function getAppointmentStatusBadge(status: AppointmentStatus) {
  switch (status) {
    case 'Scheduled': return <Badge variant="statusWaiting"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" /> Scheduled</Badge>;
    case 'Confirmed': return <Badge variant="statusActive"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Confirmed</Badge>;
    case 'Completed': return <Badge variant="statusInactive"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" /> Completed</Badge>;
    case 'Cancelled': return <Badge variant="statusCancelled"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" /> Cancelled</Badge>;
    case 'No Show': return <Badge variant="statusCancelled"><span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5" /> No Show</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export function DoctorSelector({
  value,
  onChange,
  disabled
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-slate-50 border-slate-200">
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        {DEMO_PROVIDERS.map(p => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="text-slate-400 text-xs ml-1">({p.role})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function PatientSelector({
  value,
  onChange,
  disabled
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-slate-50 border-slate-200">
        <SelectValue placeholder="Search or select patient" />
      </SelectTrigger>
      <SelectContent>
        {DEMO_PATIENTS.map(p => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="text-slate-400 font-mono text-xs ml-1">{p.id}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
