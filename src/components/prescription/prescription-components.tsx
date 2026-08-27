import * as React from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { GripVertical, Plus, Minus, Trash2 } from "lucide-react"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { MEDICINE_CATEGORIES } from "../../lib/medicine-categories"
import { type Medicine } from "../../lib/mock-data"

export interface PrescriptionLineItem extends Medicine {
  quantity: number
}

export function MedicineCategoryBadge({ categoryId }: { categoryId: string }) {
  const cat = MEDICINE_CATEGORIES[categoryId]
  if (!cat) return null
  return (
    <Badge variant="outline" className={cn(cat.bgClass, cat.textClass, cat.borderClass, "font-medium text-[10px] shadow-sm uppercase tracking-wider")}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", cat.dotClass)} />
      {cat.displayName}
    </Badge>
  )
}

export function DraggableMedicineItem({ medicine }: { medicine: Medicine }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: medicine.id,
    data: medicine,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-start p-3 bg-white border rounded-lg cursor-grab hover:border-primary/50 transition-colors shadow-sm select-none",
        isDragging && "opacity-50 border-primary ring-2 ring-primary/20 cursor-grabbing z-50"
      )}
    >
      <GripVertical className="h-4 w-4 text-slate-300 mt-1 mr-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm leading-tight mb-1">{medicine.name}</div>
        <div className="text-xs text-slate-500 mb-2">{medicine.unit}</div>
        <MedicineCategoryBadge categoryId={medicine.categoryId} />
      </div>
    </div>
  )
}

export function PrescriptionDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'prescription-dropzone',
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 flex flex-col rounded-xl border-2 transition-colors min-h-[400px] p-4 overflow-y-auto",
        isOver ? "border-primary bg-primary/5 border-dashed" : "border-transparent bg-slate-50/80"
      )}
    >
      {children}
    </div>
  )
}

export function PrescriptionRow({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: { 
  item: PrescriptionLineItem, 
  onUpdateQuantity: (id: string, qty: number) => void,
  onRemove: (id: string) => void 
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-xl shadow-sm gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm leading-tight mb-1">{item.name} <span className="text-slate-500 font-normal ml-1">{item.unit}</span></div>
        <MedicineCategoryBadge categoryId={item.categoryId} />
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 border rounded-lg bg-slate-50 p-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input 
            className="w-14 h-7 text-center font-semibold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (!isNaN(val) && val >= 1) onUpdateQuantity(item.id, val)
            }}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-slate-500 hover:text-slate-900"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-1" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove medicine</span>
        </Button>
      </div>
    </div>
  )
}
