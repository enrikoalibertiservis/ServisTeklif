"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuickPriceWidget } from "@/components/quick-price-widget"
import { Car, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react"

// ── Müsait İkame Araçları ──────────────────────────────────────
interface LoanerCar {
  id: string
  plate: string
  brand: string
  modelYear: number
  specs: string | null
}

function AvailableLoanersList({ cars }: { cars: LoanerCar[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-50 to-white px-5 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-slate-500" />
          <h2 className="font-semibold text-sm">Müsait İkame Araçlar</h2>
          <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {cars.length}
          </span>
        </div>
        <Link
          href="/dashboard/loaner-cars"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
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
          {cars.map((car, idx) => (
            <li key={car.id}>
              <Link
                href="/dashboard/loaner-cars"
                className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80 ${idx % 2 === 1 ? "bg-slate-50/40" : ""}`}
              >
                <Car className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-sm font-mono text-slate-700">{car.plate}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {car.brand} {car.modelYear}{car.specs ? ` · ${car.specs}` : ""}
                </span>
              </Link>
            </li>
          ))}
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
