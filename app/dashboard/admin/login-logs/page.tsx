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
} from "lucide-react"

const PAGE_SIZE = 30

type LogEntry = {
  id: string
  email: string
  success: boolean
  ip: string | null
  userAgent: string | null
  createdAt: string
  user: { name: string } | null
}

function parseDevice(ua: string | null): { icon: React.ReactNode; label: string } {
  if (!ua) return { icon: <Globe className="h-3.5 w-3.5" />, label: "Bilinmiyor" }
  const u = ua.toLowerCase()
  if (u.includes("mobile") || u.includes("android") || u.includes("iphone"))
    return { icon: <Smartphone className="h-3.5 w-3.5 text-purple-500" />, label: "Mobil" }
  return { icon: <Monitor className="h-3.5 w-3.5 text-blue-500" />, label: "Masaüstü" }
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "—"
  if (ua.includes("Edg/")) return "Edge"
  if (ua.includes("Chrome/") && !ua.includes("Chromium")) return "Chrome"
  if (ua.includes("Firefox/")) return "Firefox"
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari"
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera"
  return "Diğer"
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("tr-TR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

export default function LoginLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState("")
  const [filter, setFilter]   = useState("ALL") // ALL | SUCCESS | FAIL
  const [loading, setLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (search) params.set("q", search)
      if (filter !== "ALL") params.set("success", filter === "SUCCESS" ? "true" : "false")
      const res  = await fetch(`/api/login-logs?${params}`)
      const data = await res.json()
      setLogs(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast({ title: "Hata", description: "Kayıtlar yüklenemedi.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, search, filter, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, filter])

  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx   = Math.min(page * PAGE_SIZE, total)

  const successCount = logs.filter(l => l.success).length
  const failCount    = logs.filter(l => !l.success).length

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
            {total > 0 ? `%${Math.round((successCount / logs.length) * 100)}` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Başarı Oranı</div>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="E-posta veya IP ara…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
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
              <p className="text-sm">Henüz giriş kaydı yok.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500 pl-5">Sonuç</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500">E-posta</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500 hidden sm:table-cell">Kullanıcı</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">IP Adresi</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500 hidden lg:table-cell">Tarayıcı / Cihaz</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-slate-500">Tarih & Saat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, idx) => {
                  const { icon, label } = parseDevice(log.userAgent)
                  const browser = parseBrowser(log.userAgent)
                  return (
                    <TableRow
                      key={log.id}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${!log.success ? "bg-red-50/30" : ""}`}
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
                        <span className="text-sm text-slate-600">{log.user?.name ?? <span className="text-slate-400 italic">Bilinmiyor</span>}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {log.ip ?? "—"}
                        </span>
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
                        <span className="text-xs text-slate-500">{fmtDate(log.createdAt)}</span>
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
