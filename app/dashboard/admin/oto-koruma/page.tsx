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
import { Textarea } from "@/components/ui/textarea"
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
  FileSpreadsheet,
  FileDown,
  CheckCircle2,
  Tag,
  Eye,
  Sparkles,
  TrendingDown,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(n)

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  listPrice: "",
  salesPoints: "",
  category: "",
  sortOrder: "0",
}

// ── Ürün detay kartı (Satış Kartı) ──────────────────────────────────
function ProductDetailDialog({
  product,
  open,
  onClose,
}: {
  product: OtoKorumaProductData | null
  open: boolean
  onClose: () => void
}) {
  if (!product) return null

  const discount =
    product.listPrice && product.listPrice > product.price
      ? Math.round(((product.listPrice - product.price) / product.listPrice) * 100)
      : 0
  const savings =
    product.listPrice && product.listPrice > product.price
      ? product.listPrice - product.price
      : 0

  const points = product.salesPoints
    ? product.salesPoints.split("\n").map(s => s.trim()).filter(Boolean)
    : []

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <DialogTitle className="text-lg leading-tight">{product.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {product.category && (
                  <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                )}
                {discount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">%{discount} İndirim</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Fiyat kutusu */}
          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
            {product.listPrice && product.listPrice > product.price ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Liste Fiyatı
                  </span>
                  <span className="text-base line-through text-gray-400 font-medium">
                    {fmt(product.listPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-teal-700 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Servis Fiyatımız
                  </span>
                  <span className="text-2xl font-bold text-teal-700">{fmt(product.price)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-teal-200 mt-2">
                  <span className="text-xs text-emerald-600 font-semibold">🎉 Müşteri Tasarrufu</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {fmt(savings)} ({discount}% daha ucuz)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-teal-700">Servis Fiyatı</span>
                <span className="text-2xl font-bold text-teal-700">
                  {product.price > 0 ? fmt(product.price) : "Fiyat Sorununuz"}
                </span>
              </div>
            )}
          </div>

          {/* Açıklama */}
          {product.description && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Hakkında
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Satış maddeleri */}
          {points.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Neden Bu Ürün? (Satış Noktaları)
              </p>
              <ul className="space-y-2">
                {points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="leading-snug">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fırsat kancası */}
          {discount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                💬 Müşteriye Söylenecek
              </p>
              <p className="text-sm text-red-800 font-medium leading-snug">
                "{product.name} normalde <strong>{fmt(product.listPrice!)}</strong> değerinde
                ancak bugün burada servis fiyatıyla sadece{" "}
                <strong className="text-red-700">{fmt(product.price)}</strong> — tam{" "}
                <strong>{fmt(savings)} tasarruf</strong> edersiniz. Bu fırsat her zaman olmaz!"
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Ana Sayfa ──────────────────────────────────────────────────────
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

  const [detailProduct, setDetailProduct] = useState<OtoKorumaProductData | null>(null)

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
      listPrice: p.listPrice != null ? String(p.listPrice) : "",
      salesPoints: p.salesPoints || "",
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
    const listPrice = form.listPrice ? parseFloat(form.listPrice) : undefined
    const sortOrder = parseInt(form.sortOrder) || 0
    setSaving(true)
    try {
      if (editingId) {
        await updateOtoKorumaProduct(editingId, {
          name: form.name,
          description: form.description,
          price,
          listPrice,
          salesPoints: form.salesPoints,
          category: form.category,
          isActive: formActive,
          sortOrder,
        })
        toast({ title: "Ürün güncellendi" })
      } else {
        await createOtoKorumaProduct({
          name: form.name,
          description: form.description,
          price,
          listPrice,
          salesPoints: form.salesPoints,
          category: form.category,
          sortOrder,
        })
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

  // ── Excel Export ─────────────────────────────────────────────────
  async function exportExcel() {
    const xlsx = await import("xlsx")
    const rows = products.map((p, i) => ({
      "Sıra": i + 1,
      "Ürün Adı": p.name,
      "Kategori": p.category || "",
      "Açıklama": p.description || "",
      "Servis Fiyatı (₺)": p.price,
      "Liste Fiyatı (₺)": p.listPrice ?? "",
      "İndirim %": p.listPrice && p.listPrice > p.price
        ? Math.round(((p.listPrice - p.price) / p.listPrice) * 100)
        : "",
      "Satış Noktaları": p.salesPoints || "",
      "Durum": p.isActive ? "Aktif" : "Pasif",
    }))
    const ws = xlsx.utils.json_to_sheet(rows)
    // Kolon genişlikleri
    ws["!cols"] = [
      { wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 50 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 60 }, { wch: 10 },
    ]
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Oto Koruma Ürünleri")
    xlsx.writeFile(wb, "oto-koruma-urunleri.xlsx")
  }

  // ── PDF Export ────────────────────────────────────────────────────
  async function exportPdf() {
    const [pdfMakeModule, fontsModule] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ])
    const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
    const fonts   = (fontsModule as any).default ?? fontsModule
    pdfMake.vfs   = fonts?.pdfMake?.vfs ?? fonts?.vfs ?? {}

    const tableBody: any[][] = [
      [
        { text: "#",               style: "th" },
        { text: "Ürün Adı",        style: "th" },
        { text: "Kategori",        style: "th" },
        { text: "Servis Fiyatı",   style: "th", alignment: "right" },
        { text: "Liste Fiyatı",    style: "th", alignment: "right" },
        { text: "İndirim",         style: "th", alignment: "center" },
      ],
    ]

    products.forEach((p, i) => {
      const discount =
        p.listPrice && p.listPrice > p.price
          ? `%${Math.round(((p.listPrice - p.price) / p.listPrice) * 100)}`
          : "—"
      tableBody.push([
        { text: String(i + 1), style: "td", alignment: "center" },
        {
          stack: [
            { text: p.name, bold: true, fontSize: 9 },
            p.description ? { text: p.description, fontSize: 7.5, color: "#6b7280", margin: [0, 1, 0, 0] } : {},
            ...(p.salesPoints
              ? p.salesPoints.split("\n").filter(Boolean).map(pt => ({
                  text: `✓ ${pt}`, fontSize: 7.5, color: "#047857", margin: [0, 1, 0, 0],
                }))
              : []),
          ],
        },
        { text: p.category || "—", style: "td", fontSize: 8 },
        {
          text: p.price > 0
            ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(p.price)
            : "—",
          style: "td",
          alignment: "right",
          bold: true,
          color: "#0f766e",
        },
        {
          text: p.listPrice
            ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(p.listPrice)
            : "—",
          style: "td",
          alignment: "right",
          color: "#9ca3af",
          decoration: p.listPrice && p.listPrice > p.price ? "lineThrough" : undefined,
        },
        {
          text: discount,
          style: "td",
          alignment: "center",
          bold: discount !== "—",
          color: discount !== "—" ? "#dc2626" : "#9ca3af",
        },
      ])
    })

    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [36, 50, 36, 36],
      content: [
        {
          columns: [
            {
              stack: [
                { text: "OTO KORUMA ÜRÜNLERİ", fontSize: 18, bold: true, color: "#0f766e" },
                { text: "Servis Fiyat Kataloğu", fontSize: 10, color: "#6b7280", margin: [0, 2, 0, 0] },
              ],
            },
            {
              text: new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }),
              alignment: "right",
              fontSize: 9,
              color: "#9ca3af",
              margin: [0, 6, 0, 0],
            },
          ],
          margin: [0, 0, 0, 14],
        },
        {
          table: {
            headerRows: 1,
            widths: [18, "*", 72, 72, 72, 44],
            body: tableBody,
          },
          layout: {
            hLineWidth: (i: number) => i === 0 || i === 1 ? 1 : 0.4,
            vLineWidth: () => 0,
            hLineColor: (i: number) => i <= 1 ? "#0f766e" : "#e5e7eb",
            fillColor: (row: number) =>
              row === 0 ? "#f0fdf9" : row % 2 === 0 ? "#f9fafb" : null,
            paddingTop: () => 5,
            paddingBottom: () => 5,
            paddingLeft: () => 6,
            paddingRight: () => 6,
          },
        },
        {
          text: `Toplam ${products.filter(p => p.isActive).length} aktif ürün   ·   ${products.length} kayıt`,
          fontSize: 8,
          color: "#9ca3af",
          alignment: "right",
          margin: [0, 8, 0, 0],
        },
      ],
      styles: {
        th: { fontSize: 8, bold: true, color: "#0f766e", fillColor: "#f0fdf9" },
        td: { fontSize: 8.5, color: "#1f2937" },
      },
      defaultStyle: { font: "Roboto" },
    }

    pdfMake.createPdf(docDefinition).download("oto-koruma-urunleri.pdf")
  }

  const categories = Array.from(new Set(products.map(p => p.category).filter((c): c is string => Boolean(c))))

  return (
    <div className="space-y-6 p-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-500" />
            Oto Koruma Ürünleri
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI Fırsat Paneli'nde önerilecek ürünleri yönetin. Satır satırına tıklayarak satış kartını görün.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf}>
            <FileDown className="h-4 w-4 text-red-500" />
            PDF
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Ürün Listesi
            <Badge variant="outline" className="ml-1">{products.filter(p => p.isActive).length} aktif</Badge>
            <span className="text-xs text-muted-foreground font-normal ml-1">
              · Detaylar için satıra tıklayın
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
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
                <TableRow className="bg-slate-50/60">
                  <TableHead className="w-14 pl-4">Sıra</TableHead>
                  <TableHead>Ürün Adı</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Servis Fiyatı</TableHead>
                  <TableHead className="text-right">Liste Fiyatı</TableHead>
                  <TableHead className="text-center">İndirim</TableHead>
                  <TableHead className="text-center">Durum</TableHead>
                  <TableHead className="w-28 pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, index) => {
                  const discount =
                    p.listPrice && p.listPrice > p.price
                      ? Math.round(((p.listPrice - p.price) / p.listPrice) * 100)
                      : 0
                  return (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer hover:bg-teal-50/40 transition-colors ${!p.isActive ? "opacity-50" : ""}`}
                      onClick={() => setDetailProduct(p)}
                    >
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <button
                              onClick={e => { e.stopPropagation(); moveItem(index, "up") }}
                              disabled={index === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); moveItem(index, "down") }}
                              disabled={index === products.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.category ? (
                          <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-teal-700">
                          {p.price > 0 ? fmt(p.price) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.listPrice && p.listPrice > 0 ? (
                          <span className={`text-sm ${p.listPrice > p.price ? "line-through text-gray-400" : "text-gray-600"}`}>
                            {fmt(p.listPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {discount > 0 ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-bold">
                            %{discount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                          {p.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4">
                        <div
                          className="flex items-center gap-1 justify-end"
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            onClick={() => setDetailProduct(p)}
                            title="Satış Kartı"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(p)}
                            title="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ürün Detay / Satış Kartı */}
      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Ürünü Düzenle" : "Yeni Oto Koruma Ürünü"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
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
                  placeholder="ör. Kaplama, Temizlik..."
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Sıra No</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            {/* Fiyat çifti */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-gray-400" />
                  Liste Fiyatı (₺)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.listPrice}
                  onChange={e => setForm(f => ({ ...f, listPrice: e.target.value }))}
                  placeholder="Normal fiyat (üzeri çizili)"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-teal-500" />
                  Servis Fiyatı (₺) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="İndirimli fiyat"
                  className="border-teal-300 focus:ring-teal-400"
                />
              </div>
            </div>
            {/* İndirim önizleme */}
            {form.listPrice && form.price &&
              parseFloat(form.listPrice) > parseFloat(form.price) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
                🎉 %{Math.round(((parseFloat(form.listPrice) - parseFloat(form.price)) / parseFloat(form.listPrice)) * 100)} indirim
                &nbsp;—&nbsp;
                {fmt(parseFloat(form.listPrice) - parseFloat(form.price))} tasarruf
              </div>
            )}
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ürün hakkında kısa açıklama..."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Satış Noktaları
              </Label>
              <Textarea
                value={form.salesPoints}
                onChange={e => setForm(f => ({ ...f, salesPoints: e.target.value }))}
                placeholder={"Her satıra bir madde yazın:\nAracınızı yıllarca korur\n5 yıl renk garantisi\nUV ışınlarına karşı tam koruma"}
                rows={5}
                className="text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">Her satır, satış kartında ayrı bir madde olarak görünür.</p>
            </div>
            <div className="flex items-center gap-3">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
