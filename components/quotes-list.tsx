"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, CalendarDays, X } from "lucide-react"
import Link from "next/link"

type Quote = {
  id: string
  quoteNo: string
  status: string
  brandName: string
  modelName: string
  subModelName: string | null
  plateNo: string | null
  customerName: string | null
  grandTotal: number
  createdAt: Date
  createdBy: { name: string | null }
}

interface QuotesListProps {
  quotes: Quote[]
  isAdmin: boolean
}

const statusLabel: Record<string, string> = {
  DRAFT: "Taslak",
  FINALIZED: "Kesin",
  CANCELLED: "İptal",
}

type DatePreset = "all" | "today" | "week" | "month" | "custom"

const presets: { key: DatePreset; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
  { key: "custom", label: "Özel" },
]

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (preset === "today") {
    return { from: startOfDay(now), to: endOfDay(now) }
  }
  if (preset === "week") {
    const day = now.getDay()
    const diffToMonday = (day === 0 ? -6 : 1 - day)
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    return { from: startOfDay(monday), to: endOfDay(now) }
  }
  if (preset === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: endOfDay(now),
    }
  }
  return { from: null, to: null }
}

function toInputValue(d: Date | null): string {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

export function QuotesList({ quotes, isAdmin }: QuotesListProps) {
  const [search, setSearch] = useState("")
  const [preset, setPreset] = useState<DatePreset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const filtered = useMemo(() => {
    let result = quotes

    // --- tarih filtresi ---
    if (preset !== "all") {
      let from: Date | null = null
      let to: Date | null = null

      if (preset === "custom") {
        from = customFrom ? new Date(customFrom + "T00:00:00") : null
        to = customTo ? new Date(customTo + "T23:59:59") : null
      } else {
        const range = getPresetRange(preset)
        from = range.from
        to = range.to
      }

      result = result.filter((q) => {
        const date = new Date(q.createdAt)
        if (from && date < from) return false
        if (to && date > to) return false
        return true
      })
    }

    // --- metin araması ---
    const q = search.toLowerCase().trim()
    if (q) {
      result = result.filter((quote) => {
        const haystack = [
          quote.quoteNo,
          quote.brandName,
          quote.modelName,
          quote.subModelName ?? "",
          quote.plateNo ?? "",
          quote.customerName ?? "",
          quote.createdBy.name ?? "",
          statusLabel[quote.status] ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    return result
  }, [quotes, search, preset, customFrom, customTo])

  const isFiltered = preset !== "all" || search.trim() !== ""

  function clearFilters() {
    setSearch("")
    setPreset("all")
    setCustomFrom("")
    setCustomTo("")
  }

  return (
    <div className="space-y-4">
      {/* Arama + tarih satırı */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Teklif no, plaka, müşteri, araç ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-2 border-green-300 focus:border-green-500 focus-visible:ring-green-200 bg-green-50/40"
          />
        </div>
      </div>

      {/* Tarih preset butonları */}
      <div className="flex items-center gap-2 flex-wrap">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        {presets.map((p) => (
          <Button
            key={p.key}
            variant={preset === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => setPreset(p.key)}
            className="h-8 text-xs"
          >
            {p.label}
          </Button>
        ))}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Temizle
          </Button>
        )}
      </div>

      {/* Özel tarih aralığı */}
      {preset === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-40 h-8 text-sm"
            max={customTo || toInputValue(new Date())}
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-40 h-8 text-sm"
            min={customFrom}
            max={toInputValue(new Date())}
          />
        </div>
      )}

      {/* Sonuç sayısı */}
      {isFiltered && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} sonuç bulundu
        </p>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isFiltered ? "Seçili filtrelere uyan teklif bulunamadı." : "Henüz teklif oluşturulmamış."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Link key={q.id} href={`/dashboard/quotes/${q.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{q.quoteNo}</span>
                        <Badge
                          variant={q.status === "FINALIZED" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {statusLabel[q.status] ?? q.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {q.brandName} {q.modelName} {q.subModelName || ""}
                        {q.plateNo ? ` · ${q.plateNo}` : ""}
                        {q.customerName ? ` · ${q.customerName}` : ""}
                      </div>
                      {isAdmin && (
                        <div className="text-xs text-muted-foreground">
                          Danışman: {q.createdBy.name}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        }).format(q.grandTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(q.createdAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
