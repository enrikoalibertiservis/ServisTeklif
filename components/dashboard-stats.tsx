"use client"

import { Car, Users } from "lucide-react"

interface AdvisorStat { name: string; count: number }
interface BrandQuote   { name: string; count: number }

interface Props {
  advisorStats:  AdvisorStat[]
  brandQuotes:   BrandQuote[]
  isAdmin: boolean
}

const BRAND_COLORS: Record<string, string> = {
  "Fiat":         "from-red-400 to-red-500",
  "Jeep":         "from-green-500 to-emerald-500",
  "Alfa Romeo":   "from-rose-500 to-red-600",
  "Lancia":       "from-blue-400 to-indigo-500",
}
const DEFAULT_BAR = "from-violet-400 to-purple-500"

function HorizontalBar({
  label,
  value,
  max,
  barClass,
  bgClass,
  badge,
}: {
  label:    string
  value:    number
  max:      number
  barClass: string
  bgClass:  string
  badge?:   string
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4
  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 shrink-0 truncate text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </div>
      <div className={`flex-1 h-6 rounded-full ${bgClass} overflow-hidden relative`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-700 flex items-center justify-end pr-2`}
          style={{ width: `${pct}%` }}
        >
          {pct > 20 && (
            <span className="text-[10px] font-bold text-white">{value}</span>
          )}
        </div>
        {pct <= 20 && (
          <span
            className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600"
            style={{ left: `calc(${pct}% + 6px)` }}
          >
            {value}
          </span>
        )}
      </div>
      {badge && (
        <span className="shrink-0 text-[10px] text-muted-foreground w-14 text-right">{badge}</span>
      )}
    </div>
  )
}

export function DashboardStats({ advisorStats, brandQuotes, isAdmin }: Props) {
  const maxAdvisor = Math.max(...advisorStats.map(a => a.count), 1)
  const maxBrand   = Math.max(...brandQuotes.map(b => b.count), 1)

  const hasAdvisor = isAdmin && advisorStats.length > 0
  const hasBrand   = brandQuotes.length > 0

  if (!hasAdvisor && !hasBrand) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-stretch">

      {/* Danışman Bazlı Teklifler */}
      {hasAdvisor && (
        <div className="flex flex-col rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Danışman Bazlı Teklifler</h3>
              <p className="text-[11px] text-muted-foreground">Toplam teklif sayısına göre</p>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {advisorStats.map((a, i) => (
              <HorizontalBar
                key={i}
                label={a.name}
                value={a.count}
                max={maxAdvisor}
                barClass={
                  i === 0 ? "from-blue-500 to-indigo-500" :
                  i === 1 ? "from-blue-400 to-blue-500" :
                            "from-blue-300 to-blue-400"
                }
                bgClass="bg-blue-100/60"
                badge={`${a.count} teklif`}
              />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-muted-foreground">
            <span>{advisorStats.length} danışman</span>
            <span className="font-medium text-blue-600">
              Toplam: {advisorStats.reduce((s, a) => s + a.count, 0)} teklif
            </span>
          </div>
        </div>
      )}

      {/* Marka Bazlı Teklif Sayıları */}
      {hasBrand && (
        <div className="flex flex-col rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-purple-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Car className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Marka Bazlı Teklifler</h3>
              <p className="text-[11px] text-muted-foreground">Markaya göre teklif dağılımı</p>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            {brandQuotes.map((b, i) => (
              <HorizontalBar
                key={i}
                label={b.name}
                value={b.count}
                max={maxBrand}
                barClass={BRAND_COLORS[b.name] ?? (
                  i === 0 ? "from-violet-500 to-purple-500" :
                  i === 1 ? "from-violet-400 to-violet-500" :
                            "from-violet-300 to-violet-400"
                )}
                bgClass="bg-violet-100/60"
                badge={`${b.count} teklif`}
              />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-violet-100 flex items-center justify-between text-xs text-muted-foreground">
            <span>{brandQuotes.length} marka</span>
            <span className="font-medium text-violet-600">
              Toplam: {brandQuotes.reduce((s, b) => s + b.count, 0)} teklif
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
