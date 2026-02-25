"use client"

import { BookOpen, Users } from "lucide-react"

interface AdvisorStat { name: string; count: number }
interface ModelRecipe { brand: string; defined: number; total: number }

interface Props {
  advisorStats:  AdvisorStat[]
  modelRecipes:  ModelRecipe[]
  isAdmin: boolean
}

const BRAND_COLORS: Record<string, { bar: string; dot: string }> = {
  Fiat:        { bar: "from-red-400 to-red-500",     dot: "bg-red-400" },
  Jeep:        { bar: "from-green-500 to-emerald-600", dot: "bg-green-500" },
  "Alfa Romeo":{ bar: "from-orange-400 to-amber-500", dot: "bg-orange-400" },
  Lancia:      { bar: "from-blue-400 to-indigo-500", dot: "bg-blue-400" },
}
const DEFAULT_COLOR = { bar: "from-teal-400 to-teal-500", dot: "bg-teal-400" }

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

export function DashboardStats({ advisorStats, modelRecipes, isAdmin }: Props) {
  const maxAdvisor = Math.max(...advisorStats.map(a => a.count), 1)
  const hasAdvisor = isAdmin && advisorStats.length > 0
  const hasRecipes = modelRecipes.length > 0

  if (!hasAdvisor && !hasRecipes) return null

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

      {/* Reçete Tanımlı Modeller */}
      {hasRecipes && (
        <div className="flex flex-col rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-emerald-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Reçete Tanımlı Modeller</h3>
              <p className="text-[11px] text-muted-foreground">Alt model bazında reçete doluluk oranı</p>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {modelRecipes.map((r, i) => {
              const colors = BRAND_COLORS[r.brand] ?? DEFAULT_COLOR
              const pct = Math.round((r.defined / r.total) * 100)
              const isComplete = pct === 100
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                      <span className="text-xs font-semibold text-gray-700">{r.brand}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {r.defined} / {r.total} alt model
                      </span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                        isComplete ? "bg-green-100 text-green-700" :
                        pct >= 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-orange-100 text-orange-600"
                      }`}>
                        %{pct}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                    {r.total > 1 && Array.from({ length: r.total - 1 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute inset-y-0 w-px bg-white/60"
                        style={{ left: `${((idx + 1) / r.total) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs text-muted-foreground">
            <span>{modelRecipes.length} marka</span>
            <span className="font-medium text-teal-600">
              {modelRecipes.reduce((s, r) => s + r.defined, 0)} / {modelRecipes.reduce((s, r) => s + r.total, 0)} alt model reçeteli
              {" "}· %{modelRecipes.reduce((s, r) => s + r.total, 0) > 0
                ? Math.round((modelRecipes.reduce((s, r) => s + r.defined, 0) / modelRecipes.reduce((s, r) => s + r.total, 0)) * 100)
                : 0} tamamlandı
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
