import { Check, X } from 'lucide-react'
import { Badge } from '../ui/badge'
import { ROLE_CONFIG, ALL_MODULES, type ClinicRole } from '../../lib/role-config'

export function StaffStatusBadge({ status }: { status: 'Active' | 'Inactive' }) {
  if (status === 'Active') {
    return <Badge variant="statusActive"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Active</Badge>
  }
  return <Badge variant="statusInactive"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" /> Inactive</Badge>
}

export function RoleAccessPreview({ role }: { role: ClinicRole }) {
  const config = ROLE_CONFIG[role]
  
  if (!config) return null

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50">
        <h4 className="text-sm font-semibold text-slate-900">{config.label}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
      </div>
      <div className="p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Module Access</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {ALL_MODULES.map(mod => {
            const hasAccess = config.permissions.includes(mod)
            return (
              <div key={mod} className="flex items-center gap-2 text-sm">
                {hasAccess ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <X className="w-4 h-4 text-slate-300" />
                )}
                <span className={hasAccess ? "text-slate-700 font-medium" : "text-slate-400"}>
                  {mod}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
