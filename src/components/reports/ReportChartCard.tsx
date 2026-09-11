import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart2 } from 'lucide-react'

interface ReportChartCardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: React.ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  actionSlot?: React.ReactNode
}

export function ReportChartCard({
  title,
  subtitle,
  icon: Icon = BarChart2,
  children,
  loading,
  empty,
  emptyMessage = "No data for the selected period",
  actionSlot
}: ReportChartCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)] p-5 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actionSlot}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-[200px]">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : empty ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <BarChart2 className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

/**
 * Responsive SVG Line Chart for trends over time
 */
export interface LinePoint {
  label: string
  value: number
  secondaryValue?: number
}

interface SvgLineChartProps {
  data: LinePoint[]
  valuePrefix?: string
  lineColor?: string
  secondaryColor?: string
  primaryLabel?: string
  secondaryLabel?: string
  height?: number
}

export function SvgLineChart({
  data,
  valuePrefix = '',
  lineColor = '#0d9488', // teal-600
  secondaryColor = '#6366f1', // indigo-500
  primaryLabel = 'Value',
  secondaryLabel,
  height = 200
}: SvgLineChartProps) {
  if (!data || data.length === 0) return null

  const width = 600
  const padX = 40
  const padY = 30

  const primaryValues = data.map(d => d.value)
  const secondaryValues = data.map(d => d.secondaryValue || 0)
  const maxVal = Math.max(1, ...primaryValues, ...(secondaryLabel ? secondaryValues : [0]))

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2
    return padX + (index / (data.length - 1)) * (width - padX * 2)
  }

  const getY = (val: number) => {
    return (height - padY) - (val / maxVal) * (height - padY * 2)
  }

  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ')
  const secondaryPoints = secondaryLabel ? data.map((d, i) => `${getX(i)},${getY(d.secondaryValue || 0)}`).join(' ') : ''

  return (
    <div className="w-full flex flex-col">
      {(primaryLabel || secondaryLabel) && (
        <div className="flex items-center justify-end gap-4 text-xs font-medium text-slate-600 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: lineColor }} />
            <span>{primaryLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: secondaryColor }} />
              <span>{secondaryLabel}</span>
            </div>
          )}
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = (height - padY) - ratio * (height - padY * 2)
            const val = Math.round(ratio * maxVal)
            return (
              <g key={i}>
                <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <text x={padX - 8} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{valuePrefix}{val}</text>
              </g>
            )
          })}

          {/* Secondary Line */}
          {secondaryLabel && (
            <polyline fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={secondaryPoints} />
          )}

          {/* Primary Line */}
          <polyline fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={primaryPoints} />

          {/* Primary Data Points */}
          {data.map((d, i) => {
            const x = getX(i)
            const y = getY(d.value)
            return (
              <g key={i} className="group cursor-pointer">
                <circle cx={x} cy={y} r="3.5" fill="white" stroke={lineColor} strokeWidth="2.5" className="transition-transform group-hover:scale-150" />
                <title>{`${d.label}: ${valuePrefix}${d.value}${secondaryLabel ? ` | ${secondaryLabel}: ${d.secondaryValue || 0}` : ''}`}</title>
              </g>
            )
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            // Show every Nth label if too many items
            const step = Math.ceil(data.length / 7)
            if (i % step !== 0 && i !== data.length - 1) return null
            const x = getX(i)
            return (
              <text key={i} x={x} y={height - 8} fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="500">
                {d.label.length > 5 ? d.label.slice(5) : d.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

/**
 * Responsive Bar Chart for category comparisons
 */
export interface BarItem {
  label: string
  value: number
  color?: string
  displayValue?: string
}

interface SvgBarChartProps {
  data: BarItem[]
  horizontal?: boolean
  maxItems?: number
  valuePrefix?: string
}

export function SvgBarChart({ data, horizontal = false, maxItems = 10, valuePrefix = '' }: SvgBarChartProps) {
  const items = data.slice(0, maxItems)
  const maxVal = Math.max(1, ...items.map(d => d.value))

  if (horizontal) {
    return (
      <div className="space-y-3 w-full py-1">
        {items.map((item, i) => {
          const pct = Math.round((item.value / maxVal) * 100)
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={item.label}>
                  {item.label}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {item.displayValue || `${valuePrefix}${item.value}`}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, pct)}%`,
                    backgroundColor: item.color || '#0d9488'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Vertical Bar Chart
  return (
    <div className="w-full flex items-end justify-between gap-2 pt-6 pb-2 h-[200px]">
      {items.map((item, i) => {
        const hPct = Math.round((item.value / maxVal) * 80)
        return (
          <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
            <span className="text-[10px] font-bold text-slate-700 mb-1 opacity-80 group-hover:opacity-100">
              {item.displayValue || `${valuePrefix}${item.value}`}
            </span>
            <div
              className="w-full max-w-[32px] rounded-t-md transition-all duration-300 group-hover:brightness-95"
              style={{
                height: `${Math.max(6, hPct)}%`,
                backgroundColor: item.color || '#0d9488'
              }}
            />
            <span className="text-[10px] font-medium text-slate-500 mt-2 truncate max-w-full text-center" title={item.label}>
              {item.label.length > 8 ? `${item.label.slice(0, 8)}…` : item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Donut Chart for simple distribution breakdown
 */
export interface DonutSlice {
  label: string
  value: number
  color: string
  count?: number
}

interface SvgDonutChartProps {
  data: DonutSlice[]
  centerLabel?: string
  centerSub?: string
}

export function SvgDonutChart({ data, centerLabel, centerSub }: SvgDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  const size = 160
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * radius

  let currentAngle = 0

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {data.map((slice, i) => {
            const pct = slice.value / total
            const strokeDasharray = `${pct * circ} ${circ}`
            const strokeDashoffset = -currentAngle * circ
            currentAngle += pct

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
            {centerLabel || total}
          </span>
          {centerSub && <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{centerSub}</span>}
        </div>
      </div>

      <div className="space-y-2 text-xs w-full max-w-[200px]">
        {data.map((slice, i) => {
          const pct = Math.round((slice.value / total) * 100)
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-slate-600 font-medium truncate">{slice.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0">
                <span className="font-bold text-slate-800">{slice.count !== undefined ? `${slice.count} tx` : `₹${slice.value.toLocaleString()}`}</span>
                <span className="text-slate-400 text-[11px] font-normal">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
