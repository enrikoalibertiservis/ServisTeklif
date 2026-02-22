"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuickPriceWidget } from "@/components/quick-price-widget"
import { TrendingUp, ArrowRight, FileText, PlusCircle, BookOpen } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  FINALIZED: "Kesin",
  CANCELLED: "İptal",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

interface Quote {
  id: string
  quoteNo: string
  status: string
  brandName: string
  modelName: string
  subModelName: string | null
  customerName: string | null
  grandTotal: number
  createdAt: Date | string
  createdBy: { name: string } | null
}

interface ModelRecipe {
  brand:   string
  defined: number   // reçeteli model sayısı
  total:   number   // toplam model sayısı
}

interface Props {
  recentQuotes: Quote[]
  isAdmin: boolean
  modelRecipes: ModelRecipe[]
}

// Marka renkleri
const BRAND_COLORS: Record<string, { bar: string; badge: string; dot: string }> = {
  Fiat:        { bar: "from-red-400 to-red-500",     badge: "bg-red-100 text-red-700",     dot: "bg-red-400" },
  Jeep:        { bar: "from-green-500 to-emerald-600", badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  "Alfa Romeo":{ bar: "from-rose-500 to-red-600",    badge: "bg-rose-100 text-rose-700",   dot: "bg-rose-500" },
  Lancia:      { bar: "from-blue-400 to-indigo-500", badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-400" },
}
const DEFAULT_COLOR = { bar: "from-teal-400 to-teal-500", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-400" }

export function DashboardBottom({ recentQuotes, isAdmin, modelRecipes }: Props) {
  const [widgetActive, setWidgetActive] = useState(false)
  const totalDefinedModels = modelRecipes.reduce((s, r) => s + r.defined, 0)
  const totalAllModels     = modelRecipes.reduce((s, r) => s + r.total, 0)

  return (
    <>
      {/* ── Hızlı Fiyat Sorgula + Model Reçete Özeti ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        {/* Sol: Hızlı Fiyat Sorgula */}
        <div className="min-w-0 flex flex-col">
          <QuickPriceWidget onActiveChange={setWidgetActive} className="flex-1" />
        </div>

        {/* Sağ: Reçete Tanımlı Modeller — mobilde gizli */}
        <div className="hidden sm:block rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-emerald-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Reçete Tanımlı Modeller</h3>
              <p className="text-[11px] text-muted-foreground">Alt model bazında reçete doluluk oranı</p>
            </div>
          </div>

          {modelRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <BookOpen className="h-8 w-8 opacity-20 mb-2" />
              Henüz reçete tanımlanmamış.
            </div>
          ) : (
            <div className="space-y-3">
              {modelRecipes.map((r, i) => {
                const colors = BRAND_COLORS[r.brand] ?? DEFAULT_COLOR
                const pct = Math.round((r.defined / r.total) * 100)
                const isComplete = pct === 100
                return (
                  <div key={i} className="space-y-1">
                    {/* Satır üstü: marka adı + sayaç + oran */}
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
                    {/* Çift katmanlı progress bar */}
                    <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
                      {/* Arka plan (toplam) */}
                      <div className="absolute inset-0 rounded-full bg-gray-100" />
                      {/* Ön plan (reçeteli) */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                      {/* Segment çizgileri: her model için bir çentik */}
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
          )}

          {modelRecipes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs text-muted-foreground">
              <span>{modelRecipes.length} marka</span>
              <span className="font-medium text-teal-600">
                {totalDefinedModels} / {totalAllModels} alt model reçeteli
                {" "}· %{totalAllModels > 0 ? Math.round((totalDefinedModels / totalAllModels) * 100) : 0} tamamlandı
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Son Teklifler — widget aktifken kapanır, mobilde gizli ── */}
      <div
        className={`hidden sm:block overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-500 ease-in-out ${
          widgetActive ? "max-h-0 opacity-0 border-transparent shadow-none" : "max-h-[800px] opacity-100"
        }`}
      >
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h2 className="font-semibold text-sm">Son Teklifler</h2>
          </div>
          <Link
            href="/dashboard/quotes"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Tümünü Gör
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <FileText className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-sm">Henüz teklif oluşturulmamış.</p>
            <Link href="/dashboard/quotes/new">
              <Button variant="outline" size="sm" className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                İlk Teklifi Oluştur
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {recentQuotes.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/dashboard/quotes/${q.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{q.quoteNo}</span>
                      <Badge
                        variant={q.status === "FINALIZED" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {STATUS_LABEL[q.status] ?? q.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.brandName} {q.modelName}
                      {q.subModelName ? ` · ${q.subModelName}` : ""}
                      {q.customerName ? ` · ${q.customerName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-sm">{fmt(q.grandTotal)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
