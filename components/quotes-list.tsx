"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  Search, FileText, Trash2, CheckSquare, Square,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  PlusCircle, ChevronUp, ChevronDown, ChevronsUpDown, CalendarDays,
} from "lucide-react"
import Link from "next/link"

type DatePreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM"

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "ALL",   label: "Tümü" },
  { value: "TODAY", label: "Bugün" },
  { value: "WEEK",  label: "Bu Hafta" },
  { value: "MONTH", label: "Bu Ay" },
  { value: "YEAR",  label: "Bu Yıl" },
  { value: "CUSTOM", label: "Özel" },
]

function getDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date()
  if (preset === "TODAY") {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(now); end.setHours(23, 59, 59, 999)
    return { from: start.toISOString(), to: end.toISOString() }
  }
  if (preset === "WEEK") {
    const day  = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const start = new Date(now); start.setDate(diff); start.setHours(0, 0, 0, 0)
    return { from: start.toISOString(), to: "" }
  }
  if (preset === "MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: start.toISOString(), to: "" }
  }
  if (preset === "YEAR") {
    const start = new Date(now.getFullYear(), 0, 1)
    return { from: start.toISOString(), to: "" }
  }
  if (preset === "CUSTOM") {
    const to = customTo ? new Date(customTo + "T23:59:59").toISOString() : ""
    return { from: customFrom ? new Date(customFrom).toISOString() : "", to }
  }
  return { from: "", to: "" }
}

const PAGE_SIZE = 20

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
  createdAt: string
  createdBy: { name: string | null }
}

type SortKey = "araç" | "quoteNo" | "müşteri" | "durum" | "tutar" | "tarih" | "danışman"
type SortDir = "asc" | "desc"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  FINALIZED: "Kesin",
  CANCELLED: "İptal",
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  FINALIZED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
}

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })

function sortQuotes(quotes: Quote[], key: SortKey, dir: SortDir): Quote[] {
  return [...quotes].sort((a, b) => {
    let va: string | number = ""
    let vb: string | number = ""
    if (key === "araç")     { va = `${a.brandName} ${a.modelName}`; vb = `${b.brandName} ${b.modelName}` }
    if (key === "quoteNo")  { va = a.quoteNo;      vb = b.quoteNo }
    if (key === "müşteri")  { va = a.customerName ?? ""; vb = b.customerName ?? "" }
    if (key === "danışman") { va = a.createdBy.name ?? ""; vb = b.createdBy.name ?? "" }
    if (key === "durum")    { va = STATUS_LABEL[a.status] ?? ""; vb = STATUS_LABEL[b.status] ?? "" }
    if (key === "tutar")    { va = a.grandTotal;   vb = b.grandTotal }
    if (key === "tarih")    { va = a.createdAt;    vb = b.createdAt }
    if (typeof va === "number") return dir === "asc" ? va - (vb as number) : (vb as number) - va
    return dir === "asc"
      ? String(va).localeCompare(String(vb), "tr")
      : String(vb).localeCompare(String(va), "tr")
  })
}

interface Props { isAdmin: boolean }

export function QuotesList({ isAdmin }: Props) {
  const router   = useRouter()
  const { toast } = useToast()

  const [quotes, setQuotes]     = useState<Quote[]>([])
  const [total, setTotal]       = useState(0)
  const [allIds, setAllIds]     = useState<string[]>([])
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const [status, setStatus]     = useState("ALL")
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [sortKey, setSortKey]   = useState<SortKey>("tarih")
  const [sortDir, setSortDir]   = useState<SortDir>("desc")

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const sorted = sortQuotes(quotes, sortKey, sortDir)

  const buildParams = useCallback((extra: Record<string, string> = {}) => {
    const { from, to } = getDateRange(datePreset, customFrom, customTo)
    const p = new URLSearchParams(extra)
    if (search) p.set("q", search)
    if (status !== "ALL") p.set("status", status)
    if (from) p.set("dateFrom", from)
    if (to)   p.set("dateTo", to)
    return p
  }, [search, status, datePreset, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      const res  = await fetch(`/api/quotes?${params}`)
      const data = await res.json()
      setQuotes(data.items ?? [])
      setTotal(data.total ?? 0)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }, [page, buildParams])

  // "Tümünü Seç" için tüm ID'leri çek (sayfa bağımsız)
  const loadAllIds = useCallback(async () => {
    const params = buildParams({ all: "true" })
    const res  = await fetch(`/api/quotes?${params}`)
    const data = await res.json()
    setAllIds((data.items ?? []).map((q: Quote) => q.id))
  }, [buildParams])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, status, datePreset, customFrom, customTo])

  const pageSelected   = quotes.length > 0 && quotes.every(q => selected.has(q.id))
  const allPagesSelected = allIds.length > 0 && allIds.every(id => selected.has(id))

  function togglePage() {
    if (pageSelected) {
      setSelected(prev => { const next = new Set(prev); quotes.forEach(q => next.delete(q.id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); quotes.forEach(q => next.add(q.id)); return next })
    }
  }

  async function toggleAllPages() {
    if (allPagesSelected) {
      setSelected(new Set())
    } else {
      await loadAllIds()
      setSelected(new Set(allIds))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete(ids: string[]) {
    if (!confirm(`${ids.length} teklif silinecek. Emin misiniz?`)) return
    setDeleting(true)
    try {
      const res = await fetch("/api/quotes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Silindi", description: `${ids.length} teklif silindi.` })
      setAllIds([])
      load()
    } catch {
      toast({ title: "Hata", description: "Silme işlemi başarısız.", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-30 inline" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1 text-blue-500 inline" />
      : <ChevronDown className="h-3 w-3 ml-1 text-blue-500 inline" />
  }

  const SortHead = ({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) => (
    <TableHead
      className={`font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-800 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      {label}<SortIcon col={col} />
    </TableHead>
  )

  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx   = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-3">
      {/* Filtre satırı 1: Arama + Durum + Aksiyon */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Teklif no, araç, müşteri, plaka ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Durumlar</SelectItem>
            <SelectItem value="DRAFT">Taslak</SelectItem>
            <SelectItem value="FINALIZED">Kesin</SelectItem>
            <SelectItem value="CANCELLED">İptal</SelectItem>
          </SelectContent>
        </Select>

        {selected.size > 0 && isAdmin && (
          <Button size="sm" variant="destructive" onClick={() => handleDelete(Array.from(selected))} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            {selected.size} Teklifi Sil
          </Button>
        )}

        <Link href="/dashboard/quotes/new" className="ml-auto">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4 mr-1" /> Yeni Teklif
          </Button>
        </Link>
      </div>

      {/* Filtre satırı 2: Tarih preset butonları */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        {DATE_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setDatePreset(p.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              datePreset === p.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            {p.label}
          </button>
        ))}
        {/* Özel aralık girişleri */}
        {datePreset === "CUSTOM" && (
          <div className="flex items-center gap-2 ml-1">
            <Input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="h-7 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="h-7 text-xs w-36"
            />
          </div>
        )}
      </div>

      {/* Tablo */}
      <Card>
        <CardHeader className="py-3 px-5 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Teklifler
              <Badge variant="secondary" className="text-xs">{total}</Badge>
            </CardTitle>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePage}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {pageSelected
                    ? <CheckSquare className="h-4 w-4 text-blue-500" />
                    : <Square className="h-4 w-4" />}
                  Sayfadakileri Seç
                </button>
                <button
                  onClick={toggleAllPages}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allPagesSelected
                    ? <CheckSquare className="h-4 w-4 text-blue-500" />
                    : <Square className="h-4 w-4" />}
                  Tümünü Seç ({total})
                </button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Yükleniyor…
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm">Teklif bulunamadı.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {isAdmin && <TableHead className="w-10 pl-5" />}
                  <SortHead col="araç"     label="Araç" />
                  <SortHead col="quoteNo"  label="Teklif No" />
                  <SortHead col="müşteri"  label="Müşteri / Plaka" className="hidden sm:table-cell" />
                  <SortHead col="danışman" label="Danışman" className="hidden md:table-cell" />
                  <SortHead col="durum"    label="Durum" />
                  <SortHead col="tutar"    label="Tutar" className="text-right" />
                  <SortHead col="tarih"    label="Tarih"  className="hidden lg:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((q, idx) => (
                  <TableRow
                    key={q.id}
                    onClick={() => router.push(`/dashboard/quotes/${q.id}`)}
                    className={`cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/50 transition-colors`}
                  >
                    {isAdmin && (
                      <TableCell className="pl-5 w-10" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleOne(q.id)}>
                          {selected.has(q.id)
                            ? <CheckSquare className="h-4 w-4 text-blue-500" />
                            : <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />}
                        </button>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-semibold text-sm text-slate-900 leading-tight">
                        {q.brandName} {q.modelName}
                      </div>
                      {q.subModelName && <div className="text-xs text-slate-400">{q.subModelName}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500">{q.quoteNo}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-sm text-slate-700">{q.customerName ?? "—"}</div>
                      {q.plateNo && <div className="text-xs font-mono text-slate-400">{q.plateNo}</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-slate-500">{q.createdBy.name ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[q.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-sm tabular-nums">{fmt(q.grandTotal)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-slate-400">{fmtDate(q.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{startIdx}–{endIdx} / {total} teklif</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 rounded border bg-white text-xs font-medium">{page} / {totalPages}</span>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
