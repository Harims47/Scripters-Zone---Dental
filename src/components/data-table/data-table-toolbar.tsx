import * as React from "react"
import { Search, Download, FileText, FileSpreadsheet, File } from "lucide-react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterSlot?: React.ReactNode
  actionSlot?: React.ReactNode
  exportOptions?: {
    pdf?: boolean
    excel?: boolean
    csv?: boolean
    onExport?: (format: 'pdf' | 'xlsx' | 'csv') => void
  }
}

export function DataTableToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterSlot,
  actionSlot,
  exportOptions,
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
      {(actionSlot || exportOptions) && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actionSlot}
          {exportOptions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 shadow-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                {exportOptions.pdf && (
                  <DropdownMenuItem onClick={() => exportOptions.onExport?.('pdf')}>
                    <FileText className="mr-2 h-4 w-4 text-red-500/80" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                )}
                {exportOptions.excel && (
                  <DropdownMenuItem onClick={() => exportOptions.onExport?.('xlsx')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600/80" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                )}
                {exportOptions.csv && (
                  <DropdownMenuItem onClick={() => exportOptions.onExport?.('csv')}>
                    <File className="mr-2 h-4 w-4 text-slate-400" />
                    <span>CSV</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}
