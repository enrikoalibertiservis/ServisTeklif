"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuickPriceWidget } from "@/components/quick-price-widget"
import { Car, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react"

// ── Müsait İkame Araçları ──────────────────────────────────────
interface LoanerCar {
  id: string
  plate: string
  brand: string
  modelYear: number
  specs: string | null
  inspectionDate: Date | string
  kaskoDate: Date | string
}

function AvailableLoanersList({ cars }: { cars: LoanerCar[] }) {
  const today = new Date()

  const isExpiringSoon = (dateStr: Date | string) => {
    const d = new Date(dateStr)
    const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 30
  }

  const isExpired = (dateStr: Date | string) => new Date(dateStr) < today

  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-emerald-50 to-white px-5 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold text-sm">Müsait İkame Araçlar</h2>
          <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {cars.length}
          </span>
        </div>
        <Link
          href="/dashboard/loaner-cars"
          className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"
        >
          Tümünü Gör
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body */}
      {cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground flex-1">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Car className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm">Şu an tüm ikame araçlar kullanımda.</p>
          <Link href="/dashboard/loaner-cars">
            <Button variant="outline" size="sm" className="mt-4">
              <ExternalLink className="mr-2 h-4 w-4" />
              İkame Araç Takibi
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y overflow-y-auto flex-1">
          {cars.map((car) => {
            const vizeWarn = isExpiringSoon(car.inspectionDate)
            const vizeExp  = isExpired(car.inspectionDate)
            const kaskoWarn = isExpiringSoon(car.kaskoDate)
            const kaskoExp  = isExpired(car.kaskoDate)
            const hasWarn = vizeWarn || vizeExp || kaskoWarn || kaskoExp

            return (
              <li key={car.id}>
                <Link
                  href="/dashboard/loaner-cars"
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                      <Car className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm font-mono">{car.plate}</span>
                        {hasWarn && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {car.brand} {car.modelYear}{car.specs ? ` · ${car.specs}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right space-y-0.5">
                    <div className={`text-[10px] tabular-nums ${vizeExp ? "text-red-600 font-semibold" : vizeWarn ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                      Vize: {fmtDate(car.inspectionDate)}
                    </div>
                    <div className={`text-[10px] tabular-nums ${kaskoExp ? "text-red-600 font-semibold" : kaskoWarn ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                      Kasko: {fmtDate(car.kaskoDate)}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface Props {
  availableLoanerCars: LoanerCar[]
  isAdmin: boolean
}

export function DashboardBottom({ availableLoanerCars, isAdmin }: Props) {
  const [widgetActive, setWidgetActive] = useState(false)

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-stretch">
      {/* Sol: Hızlı Fiyat Sorgula */}
      <div className="min-w-0 flex flex-col">
        <QuickPriceWidget onActiveChange={setWidgetActive} className="flex-1" />
      </div>

      {/* Sağ: Müsait İkame Araçlar */}
      <div className="min-w-0 flex flex-col">
        <AvailableLoanersList cars={availableLoanerCars} />
      </div>
    </div>
  )
}
