import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { UserPlus, CalendarPlus, Clock, Phone, AlertCircle, CheckCircle2, TrendingUp, Wallet, Calendar } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

// --- HEADER ---
export function DashboardHeader({ greetingOverride }: { greetingOverride?: string }) {
  const [currentDate, setCurrentDate] = useState('')
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const role = currentUser?.role

  useEffect(() => {
    const d = new Date()
    setCurrentDate(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 md:py-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {greetingOverride || "Good morning, Dr. Arun"}
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1.5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {currentDate}
        </p>
      </div>
      
      {/* Quick Actions Desktop */}
      <div className="hidden sm:flex items-center gap-3">
        {role === 'Head Doctor' && (
          <Button onClick={() => navigate('/appointments')} variant="outline" className="gap-2 text-slate-600 bg-white shadow-sm border-slate-200/60 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200">
            <Calendar className="w-4 h-4" />
            Schedule
          </Button>
        )}
        {role !== 'Duty Doctor' && (
          <Button 
            onClick={() => navigate('/reception-desk', { state: { openRegister: true } })} 
            className="gap-2 shadow-sm transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            Register Patient
          </Button>
        )}
      </div>
    </div>
  )
}

// --- KPI CARDS ---
export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  colorClass = "text-primary",
  bgClass = "bg-primary/10",
}: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: string
  trendLabel?: string
  colorClass?: string
  bgClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] flex flex-col h-full relative group overflow-hidden">
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform duration-500", bgClass)}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", bgClass, colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="flex items-center text-[13px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            <TrendingUp className="h-3 w-3 mr-1" /> {trend}
          </span>
        )}
      </div>
      <div className="mt-auto relative z-10">
        <h3 className="text-slate-500 text-[13px] font-semibold uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        {trendLabel && <div className="text-xs text-slate-500 mt-2">{trendLabel}</div>}
      </div>
    </div>
  )
}

// --- QUEUE SUMMARY ---
export interface QueueItem {
  id: string
  visitId: string
  patientName: string
  patientId: string
  status: string
  waitTime: string
}

export function QueueSummary({ items, title, isDoctor, onAction }: { items: QueueItem[], title?: string, isDoctor?: boolean, onAction?: (item: QueueItem) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          {title || "Waiting Now"}
        </h3>
        <Badge variant="statusWaiting">{items.length} in queue</Badge>
      </div>
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No patients waiting.</div>
        ) : (
          items.map((item, i) => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-slate-400 font-mono text-sm font-medium w-6 shrink-0">#{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="font-medium text-slate-900 leading-tight mb-1">{item.patientName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-medium text-amber-600">Waiting</span>
                    <span className="opacity-30">•</span>
                    <span>{item.waitTime} min</span>
                  </div>
                </div>
              </div>
              {isDoctor ? (
                <Button variant="outline" size="sm" className="h-8 text-teal-600 border-teal-200 hover:bg-teal-50" onClick={() => onAction?.(item)}>
                  <span className="hidden sm:inline font-medium">Start Consultation</span>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8" onClick={() => onAction?.(item)}>
                  <Phone className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Call</span>
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t bg-slate-50/50">
        <Button variant="ghost" className="w-full text-primary font-medium hover:bg-primary/5">
          View Full Queue
        </Button>
      </div>
    </div>
  )
}

// --- APPOINTMENTS SUMMARY ---
export interface AppointmentItem {
  id: string
  time: string
  patientName: string
  doctor: string
  type: string
}

export function AppointmentSummary({ items, title }: { items: AppointmentItem[], title?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-primary" />
          {title || "Today's Appointments"}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-14 text-sm font-semibold text-slate-900 shrink-0 pt-0.5">{item.time}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 mb-1">{item.patientName}</div>
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
                <span>{item.doctor}</span>
                <span className="opacity-30">•</span>
                <span className="text-slate-600 font-medium">{item.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- DOCTOR STATUS ---
export interface DoctorStatusItem {
  id: string
  name: string
  status: 'With Patient' | 'Available' | 'On Break' | 'Off Duty'
}

export function DoctorStatusWidget({ items }: { items: DoctorStatusItem[] }) {
  const getStatusNode = (status: string) => {
    switch (status) {
      case 'Available': return <span className="text-emerald-600 font-medium flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Available</span>;
      case 'With Patient': return <span className="text-blue-600 font-medium flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />With Patient</span>;
      case 'On Break': return <span className="text-amber-600 font-medium flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />On Break</span>;
      default: return <span className="text-slate-500 font-medium flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Off Duty</span>;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 tracking-tight text-sm uppercase">Doctor Status</h3>
      </div>
      <div className="divide-y divide-slate-100 p-2">
        {items.map(item => (
          <div key={item.id} className="p-3 flex items-center justify-between">
            <span className="font-medium text-slate-900 text-sm">{item.name}</span>
            <span className="text-xs">{getStatusNode(item.status)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- INVENTORY ALERT ---
export interface InventoryAlertItem {
  id: string
  item: string
  remaining: number
}

export function InventoryAlertWidget({ items }: { items: InventoryAlertItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
        <h3 className="font-semibold text-amber-800 tracking-tight text-sm uppercase flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Low Stock
        </h3>
      </div>
      <div className="divide-y divide-amber-100/50 p-2 bg-amber-50/20">
        {items.map(item => (
          <div key={item.id} className="p-3 flex items-center justify-between">
            <span className="font-medium text-slate-800 text-sm">{item.item}</span>
            <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-200">
              {item.remaining} remaining
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- RECENT ACTIVITY ---
export interface ActivityItem {
  id: string
  action: string
  time: string
  type: 'registration' | 'payment' | 'prescription' | 'appointment'
}

export function RecentActivityWidget({ items }: { items: ActivityItem[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'registration': return <UserPlus className="h-3.5 w-3.5 text-primary" />;
      case 'payment': return <Wallet className="h-3.5 w-3.5 text-emerald-600" />;
      case 'prescription': return <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />;
      case 'appointment': return <CalendarPlus className="h-3.5 w-3.5 text-indigo-500" />;
      default: return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100/60 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 tracking-tight text-sm uppercase">Recent Activity</h3>
      </div>
      <div className="divide-y divide-slate-100 p-2 flex-1">
        {items.map(item => (
          <div key={item.id} className="p-3 flex gap-3">
            <div className="mt-0.5 shrink-0 bg-slate-50 rounded-full p-1.5 border">
              {getIcon(item.type)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 leading-snug mb-0.5">{item.action}</p>
              <p className="text-xs text-slate-500">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
