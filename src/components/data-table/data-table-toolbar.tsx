import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "../ui/input"
import { cn } from "../../lib/utils"

interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterSlot?: React.ReactNode
  actionSlot?: React.ReactNode
}

export function DataTableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterSlot,
  actionSlot,
  className,
  ...props
}: DataTableToolbarProps) {
  return (
    <div className={cn("p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white", className)} {...props}>
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 flex-1">
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder={searchPlaceholder}
            className="pl-9 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-colors"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        {filterSlot && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterSlot}
          </div>
        )}
      </div>
      {actionSlot && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actionSlot}
        </div>
      )}
    </div>
  )
}
