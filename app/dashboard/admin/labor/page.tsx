"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getBrands } from "@/app/actions/vehicle"
import { formatCurrency, toUpperTR, normalizeSpaces } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Search, Wrench, Trash2, Pencil, CheckSquare, Square, Plus, FileSpreadsheet,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"
import * as XLSX from "xlsx"

const PAGE_SIZE = 20

export default function LaborPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<any[]>([])
  const [brandId, setBrandId] = useState("")
  const [search, setSearch] = useState("")
  const [operations, setOperations] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const [editItem, setEditItem] = useState<any>(null)
  const [editName, setEditName] = useState("")
  const [editRate, setEditRate] = useState("")
  const [saving, setSaving] = useState(false)

  // Yeni işçilik ekleme
  const [newOpen, setNewOpen] = useState(false)
  const [newCode, setNewCode] = useState("")
  const [newName, setNewName] = useState("")
  const [newHours, setNewHours] = useState("1")
  const [newRate, setNewRate] = useState("")
  const [newSaving, setNewSaving] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { getBrands().then(setBrands) }, [])

  useEffect(() => { setPage(1) }, [brandId, search])

  const loadOps = useCallback(() => {
    if (!brandId) { setOperations([]); setTotal(0); return }
    setLoading(true)
    fetch(`/api/labor?brandId=${brandId}&q=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`)
      .then(r => r.json())
      .then((data) => {
        setOperations(data.items || [])
        setTotal(data.total || 0)
        setSelected(new Set())
      })
      .finally(() => setLoading(false))
  }, [brandId, search, page])

  useEffect(() => { loadOps() }, [loadOps])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === operations.length) setSelected(new Set())
    else setSelected(new Set(operations.map(o => o.id)))
  }

  async function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`${selected.size} işçiliği silmek istediğinize emin misiniz?`)) return
    setDeleting(true)
    try {
      const res = await fetch("/api/labor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      toast({ title: "Silindi", description: `${data.deleted} işçilik silindi.` })
      loadOps()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  function openEdit(op: any) {
    setEditItem(op)
    setEditName(op.name)
    setEditRate(String(op.hourlyRate))
  }

  async function handleSaveEdit() {
    if (!editItem) return
    setSaving(true)
    try {
      const hourlyRate = parseFloat(editRate)
      await fetch("/api/labor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, name: editName, hourlyRate, totalPrice: hourlyRate }),
      })
      toast({ title: "Güncellendi" })
      setEditItem(null)
      loadOps()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  async function handleNewSave() {
    if (!brandId) { toast({ title: "Hata", description: "Önce marka seçin", variant: "destructive" }); return }
    const hourlyRate = parseFloat(newRate.replace(",", "."))
    const durationHours = parseFloat(newHours.replace(",", ".")) || 1
    if (!newCode.trim() || !newName.trim() || isNaN(hourlyRate) || hourlyRate <= 0) {
      toast({ title: "Hata", description: "İşlem kodu, adı ve saat ücreti zorunludur", variant: "destructive" })
      return
    }
    setNewSaving(true)
    try {
      const res = await fetch("/api/labor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, operationCode: newCode.trim(), name: newName.trim(), durationHours, hourlyRate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Hata")
      toast({ title: "İşçilik eklendi", description: newName.trim() })
      setNewOpen(false)
      setNewCode(""); setNewName(""); setNewHours("1"); setNewRate("")
      loadOps()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setNewSaving(false) }
  }

  const [exporting, setExporting] = useState(false)

  async function exportLaborExcel() {
    if (!brandId) return
    setExporting(true)
    try {
      const brandName = brands.find(b => b.id === brandId)?.name ?? "Marka"
      const params = new URLSearchParams({ brandId, all: "true" })
      if (search) params.set("q", search)
      const res = await fetch(`/api/labor?${params}`)
      const data = await res.json()
      const allOps: typeof operations = data.items ?? []
      const rows = allOps.map((op, i) => ({
        "#": i + 1,
        "İşlem Kodu": normalizeSpaces(op.operationCode),
        "İşlem Adı": normalizeSpaces(op.name),
        "Süre (Saat)": op.durationHours,
        "Saatlik Ücret (TL)": op.hourlyRate,
        "Toplam Tutar (TL)": op.durationHours * op.hourlyRate,
        "Son Güncelleme": new Date(op.createdAt).toLocaleDateString("tr-TR"),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws["!cols"] = [{ wch: 5 }, { wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 16 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "İşçilik")
      XLSX.writeFile(wb, `${brandName}_Iscilik_Listesi_Tumu.xlsx`)
      toast({ title: "Excel indirildi", description: `${rows.length} işlem dışa aktarıldı.` })
    } finally {
      setExporting(false)
    }
  }

  const allSelected = operations.length > 0 && selected.size === operations.length
  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6 text-amber-500" />
          İşçilik Listesi
        </h1>
        <p className="text-muted-foreground">Kayıtlı işçilik operasyonlarını görüntüleyin, düzenleyin ve silin.</p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Marka seçin" />
          </SelectTrigger>
          <SelectContent>
            {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Operasyon kodu veya adı ile arayın..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          onClick={exportLaborExcel}
          disabled={!brandId || operations.length === 0 || exporting}
        >
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
          {exporting ? "Hazırlanıyor..." : "Excel'e Aktar"}
        </Button>

        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setNewOpen(true)} disabled={!brandId}>
          <Plus className="h-4 w-4 mr-1" /> Yeni İşçilik Ekle
        </Button>

        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Siliniyor...</>
              : <><Trash2 className="h-4 w-4 mr-1" /> Seçilenleri Sil ({selected.size})</>}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              Operasyonlar
              {total > 0 && <Badge variant="secondary">{total}</Badge>}
            </CardTitle>
            {operations.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {allSelected ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                {allSelected ? "Seçimi Kaldır" : "Sayfadakileri Seç"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Op. Kodu</TableHead>
                <TableHead>Operasyon Adı</TableHead>
                <TableHead className="text-right">Saat Ücreti</TableHead>
                <TableHead className="text-right">Toplam (1 saat)</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!brandId ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Lütfen bir marka seçin
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : operations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search ? "Sonuç bulunamadı" : "Kayıtlı işçilik yok"}
                  </TableCell>
                </TableRow>
              ) : operations.map(op => (
                <TableRow key={op.id} className={selected.has(op.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <button onClick={() => toggleSelect(op.id)} className="p-1">
                      {selected.has(op.id)
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">{op.operationCode}</TableCell>
                  <TableCell className="text-sm">{op.name}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(op.hourlyRate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(op.totalPrice ?? op.hourlyRate)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(op)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total} kayıttan {startIdx}–{endIdx} arası gösteriliyor
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni İşçilik Ekleme Dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => { if (!v) { setNewOpen(false); setNewCode(""); setNewName(""); setNewHours("1"); setNewRate("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" /> Yeni İşçilik Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>İşlem Kodu <span className="text-red-500">*</span></Label>
              <Input placeholder="LBR-001" value={newCode} onChange={e => setNewCode(toUpperTR(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>İşlem Adı <span className="text-red-500">*</span></Label>
              <Input placeholder="Motor Yağı Değişimi" value={newName} onChange={e => setNewName(toUpperTR(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Süre (saat)</Label>
                <Input type="number" step="0.25" min="0.25" placeholder="1" value={newHours} onChange={e => setNewHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Saat Ücreti (TL) <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" min="0" placeholder="5125" value={newRate} onChange={e => setNewRate(e.target.value)} />
              </div>
            </div>
            {newHours && newRate && !isNaN(parseFloat(newHours)) && !isNaN(parseFloat(newRate)) && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2 font-medium">
                Toplam: {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(parseFloat(newHours) * parseFloat(newRate))}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleNewSave} disabled={newSaving}>
                {newSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor...</> : <><Plus className="h-4 w-4 mr-1" /> Kaydet</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>İşçilik Düzenle</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Operasyon Kodu</Label>
                <Input value={editItem.operationCode} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Operasyon Adı</Label>
                <Input value={editName} onChange={e => setEditName(toUpperTR(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Saat Ücreti (TL)</Label>
                <Input type="number" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)}>İptal</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor...</> : "Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
