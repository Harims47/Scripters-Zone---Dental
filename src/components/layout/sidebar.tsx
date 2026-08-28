import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, Users, Calendar, Clock, 
  Package, CreditCard, Stethoscope, Settings,
  LogOut, Menu
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
  { title: "Dispensing", href: "/reception/dispensing", icon: Package },
  { title: "Payments", href: "/payments", icon: CreditCard },
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Staff", href: "/staff", icon: Stethoscope },
  { title: "Settings", href: "/settings", icon: Settings },
]

interface SidebarProps {
  currentRole?: ClinicRole
  className?: string
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ className, onNavigate, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { currentUser, logout } = useAuth()
  
  // Filter navItems based on the current user's role and the centralized permission map
  const filteredNav = navItems.filter(item => {
    if (!currentUser) return false
    return canAccessRoute(currentUser.role, item.href)
  })

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.01)]", className)}>
      <div className={cn("h-[72px] flex items-center border-b border-slate-100 shrink-0", isCollapsed ? "justify-center" : "px-5 justify-between")}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20 shrink-0">
            D
          </div>
          {!isCollapsed && <span className="font-bold text-xl tracking-tight text-slate-900 whitespace-nowrap">DentalCore</span>}
        </div>
        
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={cn(
              "hidden md:flex items-center justify-center rounded-lg p-1.5 transition-colors text-slate-400 hover:bg-slate-100 hover:text-slate-900",
              isCollapsed && "absolute -right-3 top-6 bg-white border border-slate-200 shadow-sm rounded-full z-50 h-7 w-7 p-0"
            )}
          >
            <Menu className="h-5 w-5 shrink-0" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {!isCollapsed && (
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2 whitespace-nowrap">
            {t('sidebar.clinic', 'Main Menu')}
          </div>
        )}
        {filteredNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            title={isCollapsed ? t(`sidebar.${item.title.toLowerCase()}`, item.title) : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-xl font-medium transition-colors w-full group relative",
                isCollapsed ? "justify-center py-3" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-teal-50 text-teal-700 font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-teal-600" : "")} />
                {!isCollapsed && <span className="truncate">{t(`sidebar.${item.title.toLowerCase()}`, item.title)}</span>}
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.6)] shrink-0" />
                )}
                {isActive && isCollapsed && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.6)] shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 space-y-1 shrink-0">
        <button
          onClick={logout}
          title={isCollapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center w-full rounded-xl font-medium transition-colors text-rose-600 hover:bg-rose-50",
            isCollapsed ? "justify-center py-3" : "px-3 py-2.5 gap-3"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
