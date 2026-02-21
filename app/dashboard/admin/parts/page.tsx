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
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Search, Package, Trash2, Pencil, CheckSquare, Square, Plus,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react"

const PAGE_SIZE = 20

export default function PartsPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<any[]>([])
  const [brandId, setBrandId] = useState("")
  const [search, setSearch] = useState("")
  const [parts, setParts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const [editItem, setEditItem] = useState<any>(null)
  const [editPartNo, setEditPartNo] = useState("")
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [saving, setSaving] = useState(false)

  // Yeni parça ekleme
  const [newOpen, setNewOpen] = useState(false)
  const [newPartNo, setNewPartNo] = useState("")
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newSaving, setNewSaving] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { getBrands().then(setBrands) }, [])

  useEffect(() => { setPage(1) }, [brandId, search])

  const loadParts = useCallback(() => {
    if (!brandId) { setParts([]); setTotal(0); return }
    setLoading(true)
    fetch(`/api/parts?brandId=${brandId}&q=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`)
      .then(r => r.json())
      .then((data) => {
        setParts(data.items || [])
        setTotal(data.total || 0)
        setSelected(new Set())
      })
      .finally(() => setLoading(false))
  }, [brandId, search, page])

  useEffect(() => { loadParts() }, [loadParts])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === parts.length) setSelected(new Set())
    else setSelected(new Set(parts.map(p => p.id)))
  }

  async function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`${selected.size} parçayı silmek istediğinize emin misiniz?`)) return
    setDeleting(true)
    try {
      const res = await fetch("/api/parts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      toast({ title: "Silindi", description: `${data.deleted} parça silindi.` })
      loadParts()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setDeleting(false) }
  }

  function openEdit(part: any) {
    setEditItem(part)
    setEditPartNo(part.partNo)
    setEditName(part.name)
    setEditPrice(String(part.unitPrice))
  }

  async function handleSaveEdit() {
    if (!editItem) return
    setSaving(true)
    try {
      await fetch("/api/parts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editItem.id, partNo: editPartNo, name: editName, unitPrice: parseFloat(editPrice) }),
      })
      toast({ title: "Güncellendi" })
      setEditItem(null)
      loadParts()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setSaving(false) }
  }

  async function handleNewSave() {
    if (!brandId) { toast({ title: "Hata", description: "Önce marka seçin", variant: "destructive" }); return }
    const unitPrice = parseFloat(newPrice.replace(",", "."))
    if (!newPartNo.trim() || !newName.trim() || isNaN(unitPrice) || unitPrice <= 0) {
      toast({ title: "Hata", description: "Parça kodu, adı ve fiyat zorunludur", variant: "destructive" })
      return
    }
    setNewSaving(true)
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, partNo: newPartNo.trim(), name: newName.trim(), unitPrice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Hata")
      toast({ title: "Parça eklendi", description: newName.trim() })
      setNewOpen(false)
      setNewPartNo(""); setNewName(""); setNewPrice("")
      loadParts()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally { setNewSaving(false) }
  }

  const allSelected = parts.length > 0 && selected.size === parts.length
  const startIdx = (page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-cyan-500" />
          Parça Listesi
        </h1>
        <p className="text-muted-foreground">Kayıtlı parçaları görüntüleyin, düzenleyin ve silin.</p>
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
          <Input placeholder="Parça no veya adı ile arayın..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setNewOpen(true)} disabled={!brandId}>
          <Plus className="h-4 w-4 mr-1" /> Yeni Parça Ekle
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
              <Package className="h-5 w-5 text-cyan-500" />
              Parçalar
              {total > 0 && <Badge variant="secondary">{total}</Badge>}
            </CardTitle>
            {parts.length > 0 && (
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
                <TableHead>Parça No</TableHead>
                <TableHead>Parça Adı</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead>Son Güncelleme</TableHead>
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
              ) : parts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search ? "Sonuç bulunamadı" : "Kayıtlı parça yok"}
                  </TableCell>
                </TableRow>
              ) : parts.map(p => (
                <TableRow key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <button onClick={() => toggleSelect(p.id)} className="p-1">
                      {selected.has(p.id)
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">{p.partNo}</TableCell>
                  <TableCell className="text-sm">{p.name}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.unitPrice)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.validFrom).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
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

      {/* Yeni Parça Ekleme Dialog */}
      <Dialog open={newOpen} onOpenChange={(v) => { if (!v) { setNewOpen(false); setNewPartNo(""); setNewName(""); setNewPrice("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-500" /> Yeni Parça Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Parça Kodu <span className="text-red-500">*</span></Label>
              <Input placeholder="55282942" value={newPartNo} onChange={e => setNewPartNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Parça Adı <span className="text-red-500">*</span></Label>
              <Input placeholder="Motor Yağı Filtresi" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Birim Fiyat (TL) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" placeholder="185.00" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
              <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={handleNewSave} disabled={newSaving}>
                {newSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Kaydediliyor...</> : <><Plus className="h-4 w-4 mr-1" /> Kaydet</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parça Düzenle</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Parça No</Label>
                <Input value={editPartNo} onChange={e => setEditPartNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parça Adı</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Birim Fiyat (TL)</Label>
                <Input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
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
