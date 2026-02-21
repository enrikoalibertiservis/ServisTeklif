"use client"

import { useState, useEffect, useTransition } from "react"
import {
  getOtoKorumaProducts,
  createOtoKorumaProduct,
  updateOtoKorumaProduct,
  deleteOtoKorumaProduct,
  reorderOtoKorumaProducts,
  type OtoKorumaProductData,
} from "@/app/actions/oto-koruma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const EMPTY_FORM = { name: "", description: "", price: "", category: "", sortOrder: "0" }

export default function OtoKorumaPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<OtoKorumaProductData[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formActive, setFormActive] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    startTransition(async () => {
      const data = await getOtoKorumaProducts()
      setProducts(data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEdit(p: OtoKorumaProductData) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      category: p.category || "",
      sortOrder: String(p.sortOrder),
    })
    setFormActive(p.isActive)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: "Ürün adı gerekli", variant: "destructive" })
      return
    }
    const price = parseFloat(form.price) || 0
    const sortOrder = parseInt(form.sortOrder) || 0
    setSaving(true)
    try {
      if (editingId) {
        await updateOtoKorumaProduct(editingId, {
          name: form.name,
          description: form.description,
          price,
          category: form.category,
          isActive: formActive,
          sortOrder,
        })
        toast({ title: "Ürün güncellendi" })
      } else {
        await createOtoKorumaProduct({ name: form.name, description: form.description, price, category: form.category, sortOrder })
        toast({ title: "Ürün eklendi" })
      }
      setDialogOpen(false)
      load()
    } catch (e: unknown) {
      toast({ title: "Hata", description: e instanceof Error ? e.message : "Bilinmeyen hata", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteOtoKorumaProduct(deleteId)
      toast({ title: "Ürün silindi" })
      setDeleteId(null)
      load()
    } catch (e: unknown) {
      toast({ title: "Hata", description: e instanceof Error ? e.message : "Bilinmeyen hata", variant: "destructive" })
    }
  }

  async function moveItem(index: number, direction: "up" | "down") {
    const newProducts = [...products]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newProducts.length) return
    ;[newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]]
    setProducts(newProducts)
    await reorderOtoKorumaProducts(newProducts.map(p => p.id))
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter((c): c is string => Boolean(c))))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-500" />
            Oto Koruma Ürünleri
          </h1>
          <p className="text-muted-foreground">
            AI Fırsat Paneli'nde önerilecek oto koruma ürünlerini yönetin.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Ürün
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ürün Listesi
            <Badge variant="outline" className="ml-2">{products.filter(p => p.isActive).length} aktif</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Henüz ürün eklenmemiş.</p>
              <Button variant="outline" className="mt-3" onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Ürünü Ekle
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sıra</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead className="text-right">Fiyat</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, index) => (
                  <TableRow key={p.id} className={!p.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveItem(index, "down")}
                            disabled={index === products.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.category ? (
                        <Badge variant="secondary">{p.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {p.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {p.price > 0 ? `₺${p.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.isActive ? "default" : "secondary"}>
                        {p.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Ürünü Düzenle" : "Yeni Oto Koruma Ürünü"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ürün Adı <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ör. Seramik Kaplama, Cam Filmi..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="ör. Boyama, Kaplama..."
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Fiyat (₺)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Kısa ürün açıklaması..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sıra No</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="product-active"
                  checked={formActive}
                  onChange={e => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-teal-600"
                />
                <Label htmlFor="product-active">{formActive ? "Aktif" : "Pasif"}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
