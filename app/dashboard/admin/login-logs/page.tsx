"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import {
  ShieldCheck, Search, Loader2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  CheckCircle2, XCircle, Monitor, Smartphone, Globe,
  ChevronUp, ChevronDown, ChevronsUpDown, CalendarDays, X, MapPin,
} from "lucide-react"

const PAGE_SIZE = 30

type LogEntry = {
  id: string
  email: string
  success: boolean
  ip: string | null
  city: string | null
  country: string | null
  userAgent: string | null
  createdAt: string
  user: { name: string } | null
}

type SortKey = "email" | "user" | "ip" | "city" | "browser" | "date" | "result"
type SortDir = "asc" | "desc"
type DatePreset = "all" | "today" | "week" | "month" | "year" | "custom"

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "all",    label: "Tümü"      },
  { key: "today",  label: "Bugün"     },
  { key: "week",   label: "Bu Hafta"  },
  { key: "month",  label: "Bu Ay"     },
  { key: "year",   label: "Bu Yıl"    },
  { key: "custom", label: "Özel"      },
]

function getPresetRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = ymd(now)

  if (preset === "today") return { from: today, to: today }

  if (preset === "week") {
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // pazartesi = 0
    const mon = new Date(now); mon.setDate(now.getDate() - day)
    return { from: ymd(mon), to: today }
  }
  if (preset === "month") {
    return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: today }
  }
  if (preset === "year") {
    return { from: `${now.getFullYear()}-01-01`, to: today }
  }
  return {}
}

function parseDevice(ua: string | null): { icon: React.ReactNode; label: string } {
  if (!ua) return { icon: <Globe className="h-3.5 w-3.5 text-slate-400" />, label: "Bilinmiyor" }
  const u = ua.toLowerCase()
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone"))
    return { icon: <Smartphone className="h-3.5 w-3.5 text-purple-500" />, label: "Mobil" }
  return { icon: <Monitor className="h-3.5 w-3.5 text-blue-500" />, label: "Masaüstü" }
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "—"
  if (ua.includes("Edg/"))                                   return "Edge"
  if (ua.includes("Chrome/") && !ua.includes("Chromium"))   return "Chrome"
  if (ua.includes("Firefox/"))                               return "Firefox"
  if (ua.includes("Safari/") && !ua.includes("Chrome"))     return "Safari"
  if (ua.includes("OPR/") || ua.includes("Opera"))          return "Opera"
  return "Diğer"
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

function sortLogs(logs: LogEntry[], key: SortKey, dir: SortDir): LogEntry[] {
  return [...logs].sort((a, b) => {
    let va: string = ""
    let vb: string = ""
    if (key === "email")   { va = a.email;              vb = b.email }
    if (key === "user")    { va = a.user?.name ?? "";   vb = b.user?.name ?? "" }
    if (key === "ip")      { va = a.ip ?? "";           vb = b.ip ?? "" }
    if (key === "city")    { va = a.city ?? "";         vb = b.city ?? "" }
    if (key === "browser") { va = parseBrowser(a.userAgent); vb = parseBrowser(b.userAgent) }
    if (key === "date")    { va = a.createdAt;          vb = b.createdAt }
    if (key === "result")  { va = String(a.success);    vb = String(b.success) }
    const cmp = va.localeCompare(vb, "tr")
    return dir === "asc" ? cmp : -cmp
  })
}

export default function LoginLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs]         = useState<LogEntry[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState("ALL")
  const [preset, setPreset]     = useState<DatePreset>("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo]     = useState("")
  const [loading, setLoading]   = useState(false)
  const [sortKey, setSortKey]   = useState<SortKey>("date")
  const [sortDir, setSortDir]   = useState<SortDir>("desc")

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const getDateRange = useCallback(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined }
    }
    return getPresetRange(preset)
  }, [preset, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search) params.set("q", search)
      if (filter !== "ALL") params.set("success", filter === "SUCCESS" ? "true" : "false")
      const { from, to } = getDateRange()
      if (from) params.set("from", from)
      if (to)   params.set("to",   to)
      const res  = await fetch(`/api/login-logs?${params}`)
      const data = await res.json()
      setLogs(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast({ title: "Hata", description: "Kayıtlar yüklenemedi.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, search, filter, getDateRange, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, filter, preset, customFrom, customTo])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  const sorted = sortLogs(logs, sortKey, sortDir)

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-30 inline" />
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1 text-indigo-500 inline" />
      : <ChevronDown className="h-3 w-3 ml-1 text-indigo-500 inline" />
  }

  const SortHead = ({ col, label, className = "" }: { col: SortKey; label: string; className?: string }) => (
    <TableHead
      className={`font-semibold text-xs uppercase tracking-wide text-slate-500 cursor-pointer select-none hover:text-slate-800 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      {label}<SortIcon col={col} />
    </TableHead>
  )

  const successCount = logs.filter(l => l.success).length
  const failCount    = logs.filter(l => !l.success).length
  const isFiltered   = preset !== "all" || search || filter !== "ALL"
  const startIdx     = (page - 1) * PAGE_SIZE + 1
  const endIdx       = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          Giriş Kayıtları
        </h1>
        <p className="text-muted-foreground">Sisteme kimin, nereden, ne zaman girdiğini takip edin.</p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4 border-l-slate-300">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Toplam Kayıt</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-400">
          <div className="text-2xl font-bold text-green-600">{successCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Başarılı (bu sayfa)</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-400">
          <div className="text-2xl font-bold text-red-600">{failCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Başarısız (bu sayfa)</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-400">
          <div className="text-2xl font-bold text-blue-600">
            {logs.length > 0 ? `%${Math.round((successCount / logs.length) * 100)}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Başarı Oranı</div>
        </Card>
      </div>

      {/* Tarih preset butonları */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          {DATE_PRESETS.map(p => (
            <Button
              key={p.key}
              variant={preset === p.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
          {isFiltered && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
              onClick={() => { setPreset("all"); setSearch(""); setFilter("ALL"); setCustomFrom(""); setCustomTo("") }}
            >
              <X className="h-3 w-3 mr-1" /> Temizle
            </Button>
          )}
        </div>

        {/* Özel tarih aralığı */}
        {preset === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="w-40 h-8 text-sm" max={customTo || undefined} />
            <span className="text-muted-foreground">–</span>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="w-40 h-8 text-sm" min={customFrom} max={new Date().toISOString().slice(0,10)} />
          </div>
        )}
      </div>

      {/* Arama + durum filtresi */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="E-posta, IP veya şehir ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Girişler</SelectItem>
            <SelectItem value="SUCCESS">Yalnız Başarılı</SelectItem>
            <SelectItem value="FAIL">Yalnız Başarısız</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>Yenile</Button>
      </div>

      {/* Tablo */}
      <Card>
        <CardHeader className="py-3 px-5 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Giriş Denemeleri
            <Badge variant="secondary" className="text-xs">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Yükleniyor…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm">Kayıt bulunamadı.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <SortHead col="result"  label="Sonuç"           className="pl-5" />
                  <SortHead col="email"   label="E-posta" />
                  <SortHead col="user"    label="Kullanıcı"       className="hidden sm:table-cell" />
                  <SortHead col="ip"      label="IP Adresi"       className="hidden md:table-cell" />
                  <SortHead col="city"    label="Şehir / Ülke"   className="hidden md:table-cell" />
                  <SortHead col="browser" label="Tarayıcı / Cihaz" className="hidden lg:table-cell" />
                  <SortHead col="date"    label="Tarih & Saat" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((log, idx) => {
                  const { icon, label } = parseDevice(log.userAgent)
                  const browser = parseBrowser(log.userAgent)
                  return (
                    <TableRow
                      key={log.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${!log.success ? "bg-red-50/40" : ""}`}
                    >
                      <TableCell className="pl-5">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> Başarılı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                            <XCircle className="h-4 w-4 text-red-500" /> Başarısız
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-slate-800">{log.email}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-slate-600">
                          {log.user?.name ?? <span className="text-slate-400 italic text-xs">Bilinmiyor</span>}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {log.ip ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.city || log.country ? (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
                            <span>{[log.city, log.country].filter(Boolean).join(", ")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          {icon}
                          <span>{browser}</span>
                          <span className="text-slate-300">·</span>
                          <span>{label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500 tabular-nums">{fmtDate(log.createdAt)}</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{startIdx}–{endIdx} / {total} kayıt</span>
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
