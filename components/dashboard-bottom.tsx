"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QuickPriceWidget } from "@/components/quick-price-widget"
import { TrendingUp, ArrowRight, FileText, PlusCircle, ChevronDown } from "lucide-react"

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

interface Props {
  recentQuotes: Quote[]
  isAdmin: boolean
}

export function DashboardBottom({ recentQuotes, isAdmin }: Props) {
  const [widgetActive, setWidgetActive] = useState(false)

  return (
    <>
      {/* ── Hızlı Fiyat Sorgula ─────────────────────────────────── */}
      <QuickPriceWidget onActiveChange={setWidgetActive} />

      {/* ── Son Teklifler — widget aktifken kapanır ──────────────── */}
      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-500 ease-in-out ${
          widgetActive ? "max-h-0 opacity-0 border-transparent shadow-none" : "max-h-[800px] opacity-100"
        }`}
      >
        {/* başlık */}
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
