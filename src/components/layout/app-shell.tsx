import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[260px] flex-shrink-0 relative z-20">
        <Sidebar />
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Topbar />
        
        {/* Main Content Area via Router Outlet */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
