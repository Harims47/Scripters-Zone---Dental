
import { Badge } from '../ui/badge'
import { DEMO_PROVIDERS } from '../../lib/mock-data'
import { useClinicContext } from '../../context/ClinicContext'
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

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

export function DoctorSelector({
  value,
  onChange,
  disabled
}: {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = DEMO_PROVIDERS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const selected = DEMO_PROVIDERS.find(p => p.id === value)

  return (
    <div className="relative" ref={ref}>
      <button 
        type="button" 
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected || value ? 'text-slate-900' : 'text-slate-500'}>
          {selected ? `${selected.name} (${selected.role})` : value ? `Provider ID: ${value}` : 'Select doctor'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      
      {open && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center px-3 border-b">
            <Search className="h-4 w-4 opacity-50" />
            <input 
              className="flex h-10 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder:text-slate-500" 
              placeholder="Search doctors..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="p-2 text-sm text-slate-500 text-center">No doctors found.</div>
            ) : filtered.map(p => (
              <div 
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100"
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.role}</span>
                </div>
                {value === p.id && <Check className="ml-auto h-4 w-4 text-slate-900" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { patients } = useClinicContext()
  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  const selected = patients.find(p => p.id === value)

  return (
    <div className="relative" ref={ref}>
      <button 
        type="button" 
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-500'}>
          {selected ? `${selected.name} (${selected.id})` : 'Search or select patient'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      
      {open && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center px-3 border-b">
            <Search className="h-4 w-4 opacity-50" />
            <input 
              className="flex h-10 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder:text-slate-500" 
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="p-2 text-sm text-slate-500 text-center">No patients found.</div>
            ) : filtered.map(p => (
              <div 
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); setSearch(''); }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100"
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{p.id}</span>
                </div>
                {value === p.id && <Check className="ml-auto h-4 w-4 text-slate-900" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
