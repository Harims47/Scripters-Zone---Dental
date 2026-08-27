import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, Users, Calendar, Clock, 
  Package, CreditCard, Stethoscope, Settings 
} from "lucide-react"
import { cn } from "../../lib/utils"
import { t } from "../../lib/i18n"
import { useAuth } from "../../context/AuthContext"
import { canAccessRoute } from "../../lib/route-permissions"

export type ClinicRole = 'head-doctor' | 'duty-doctor' | 'receptionist' | 'assistant' | 'surgeon'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles?: ClinicRole[]
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", href: "/patients", icon: Users },
  { title: "Appointments", href: "/appointments", icon: Calendar },
  { title: "Queue", href: "/queue", icon: Clock },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Payments", href: "/payments", icon: CreditCard },
  { title: "Staff", href: "/staff", icon: Stethoscope },
  { title: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  currentRole?: ClinicRole
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const { currentUser } = useAuth()
  
  // Filter navItems based on the current user's role and the centralized permission map
  const filteredNav = navItems.filter(item => {
    if (!currentUser) return false
    return canAccessRoute(currentUser.role, item.href)
  })

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.01)]", className)}>
      <div className="h-[72px] flex items-center px-6 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
            D
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">DentalCore</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2">
          {t('sidebar.clinic', 'Main Menu')}
        </div>
        {filteredNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors w-full group relative",
                isActive
                  ? "bg-teal-50 text-teal-700 font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5", isActive ? "text-teal-600" : "")} />
                <span className="truncate">{t(`sidebar.${item.title.toLowerCase()}`, item.title)}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.6)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
