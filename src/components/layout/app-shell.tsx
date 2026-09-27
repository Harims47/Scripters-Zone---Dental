import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { cn } from "../../lib/utils"
import { LowStockAlertModal } from "../inventory/LowStockAlertModal"

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar (visible on >= 1280px) */}
      <aside className={cn("hidden xl:block flex-shrink-0 relative z-20 transition-all duration-300", isSidebarCollapsed ? "w-[88px]" : "w-[260px]")}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        <Topbar />
        
        {/* Main Content Area via Router Outlet */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 flex flex-col justify-between min-w-0">
          <div className="mx-auto w-full max-w-[1600px] flex-1 min-w-0">
            <Outlet />
          </div>
          <footer className="mt-8 pt-4 pb-2 border-t border-slate-200/80 text-center text-xs text-slate-500 font-medium shrink-0">
            © {new Date().getFullYear()} Scripters Zone. All rights reserved.
          </footer>
        </main>

        {/* Global Operational Alerts */}
        <LowStockAlertModal />
      </div>
    </div>
  )
}
