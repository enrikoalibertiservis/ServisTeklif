"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QuickPriceWidget } from "@/components/quick-price-widget"
import { Car, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react"

interface LoanerCar {
  id: string
  plate: string
  brand: string
  modelYear: number
  specs: string | null
}

function AvailableLoanersList({ cars }: { cars: LoanerCar[] }) {
  const isFiat = (car: LoanerCar) => car.brand.toUpperCase().includes("FIAT")
  const isARJ  = (car: LoanerCar) => car.brand.toUpperCase().includes("ALFA") || car.brand.toUpperCase().includes("JEEP")

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <span className="font-semibold text-sm text-slate-700">Müsait İkame Araçlar</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {cars.length}
          </span>
        </div>
        <Link
          href="/dashboard/loaner-cars"
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          Tümünü Gör
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body */}
      {cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground flex-1">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Car className="h-8 w-8 opacity-30" />
          </div>
          <p className="text-sm font-medium">Tüm araçlar kullanımda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Şu an müsait ikame araç bulunmuyor.</p>
          <Link href="/dashboard/loaner-cars">
            <Button variant="outline" size="sm" className="mt-4 text-xs gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              İkame Araç Takibi
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="overflow-y-auto flex-1 p-3 space-y-1.5">
          {cars.map((car) => {
            const fiat = isFiat(car)
            const arj  = isARJ(car)
            const tag  = arj  ? { label: "ARJ",  bg: "bg-blue-50 border-blue-100 text-blue-700"  }
                       : fiat ? { label: "Fiat", bg: "bg-red-50 border-red-100 text-red-700"    }
                       :        { label: null,   bg: "" }
            return (
              <li key={car.id}>
                <Link
                  href="/dashboard/loaner-cars"
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2.5 hover:bg-slate-100/80 hover:border-slate-200 transition-all group"
                >
                  <Car className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-mono text-slate-800 tracking-wide">{car.plate}</span>
                      {tag.label && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0 rounded border ${tag.bg}`}>
                          {tag.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {car.brand} {car.modelYear}{car.specs ? ` · ${car.specs}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
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
      <div className="min-w-0 flex flex-col">
        <QuickPriceWidget onActiveChange={setWidgetActive} className="flex-1" />
      </div>
      <div className="min-w-0 flex flex-col">
        <AvailableLoanersList cars={availableLoanerCars} />
      </div>
    </div>
  )
}
