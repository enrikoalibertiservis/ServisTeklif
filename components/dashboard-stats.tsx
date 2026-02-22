"use client"

import { Car, Users } from "lucide-react"

interface AdvisorStat { name: string; count: number }
interface BrandTemplate { name: string; count: number }

interface Props {
  advisorStats: AdvisorStat[]
  brandTemplates: BrandTemplate[]
  isAdmin: boolean
}

function HorizontalBar({
  label,
  value,
  max,
  colorClass,
  bgClass,
  badge,
}: {
  label: string
  value: number
  max: number
  colorClass: string
  bgClass: string
  badge?: string
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 shrink-0 truncate text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </div>
      <div className={`flex-1 h-6 rounded-full ${bgClass} overflow-hidden relative`}>
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-700 flex items-center justify-end pr-2`}
          style={{ width: `${pct}%` }}
        >
          {pct > 20 && (
            <span className="text-[10px] font-bold text-white">{value}</span>
          )}
        </div>
        {pct <= 20 && (
          <span className="absolute left-[calc(var(--w)+6px)] top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600"
            style={{ "--w": `${pct}%` } as React.CSSProperties}>
            {value}
          </span>
        )}
      </div>
      {badge && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{badge}</span>
      )}
    </div>
  )
}

export function DashboardStats({ advisorStats, brandTemplates, isAdmin }: Props) {
  const maxAdvisor = Math.max(...advisorStats.map(a => a.count), 1)
  const maxTemplate = Math.max(...brandTemplates.map(b => b.count), 1)

  const hasAdvisor = isAdmin && advisorStats.length > 0
  const hasTemplate = brandTemplates.length > 0

  if (!hasAdvisor && !hasTemplate) return null

  return (
    <div className={`grid gap-4 ${hasAdvisor && hasTemplate ? "lg:grid-cols-2" : "grid-cols-1"}`}>

      {/* Danışman Bazlı Teklifler */}
      {hasAdvisor && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Danışman Bazlı Teklifler</h3>
              <p className="text-[11px] text-muted-foreground">Toplam teklif sayısına göre</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {advisorStats.map((a, i) => (
              <HorizontalBar
                key={i}
                label={a.name}
                value={a.count}
                max={maxAdvisor}
                colorClass={
                  i === 0 ? "bg-gradient-to-r from-blue-500 to-indigo-500" :
                  i === 1 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                  "bg-gradient-to-r from-blue-300 to-blue-400"
                }
                bgClass="bg-blue-100/60"
                badge={`${a.count} teklif`}
              />
            ))}
          </div>
          {/* Özet footer */}
          <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-muted-foreground">
            <span>{advisorStats.length} danışman</span>
            <span className="font-medium text-blue-600">
              Toplam: {advisorStats.reduce((s, a) => s + a.count, 0)} teklif
            </span>
          </div>
        </div>
      )}

      {/* Reçete Tanımlı Markalar */}
      {hasTemplate && (
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Car className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Reçete Tanımlı Markalar</h3>
              <p className="text-[11px] text-muted-foreground">Parça &amp; işçilik tanımlı şablon sayısına göre</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {brandTemplates.map((b, i) => (
              <HorizontalBar
                key={i}
                label={b.name}
                value={b.count}
                max={maxTemplate}
                colorClass={
                  i === 0 ? "bg-gradient-to-r from-teal-500 to-emerald-500" :
                  i === 1 ? "bg-gradient-to-r from-teal-400 to-teal-500" :
                  "bg-gradient-to-r from-teal-300 to-teal-400"
                }
                bgClass="bg-teal-100/60"
                badge={`${b.count} reçete`}
              />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs text-muted-foreground">
            <span>{brandTemplates.length} marka tanımlı</span>
            <span className="font-medium text-teal-600">
              Toplam: {brandTemplates.reduce((s, b) => s + b.count, 0)} reçete
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
