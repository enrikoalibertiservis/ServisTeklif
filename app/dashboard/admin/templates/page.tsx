"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { getBrands, getModelsByBrand, getSubModelsByModel } from "@/app/actions/vehicle"
import { deleteTemplate, dedupeMaintenanceTemplates } from "@/app/actions/template"
import { ClipboardList, ChevronDown, ChevronRight, Loader2, Pencil, ChevronLeft, Trash2, Merge, CheckSquare, Square, ShieldCheck, ShieldOff } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const PAGE_SIZE = 20

interface Template {
  id: string
  name: string | null
  periodKm: number | null
  periodMonth: number | null
  serviceType: string | null
  isApproved: boolean
  model: { name: string } | null
  subModel: { name: string } | null
  items: Array<{
    id: string
    itemType: string
    referenceCode: string
    quantity: number
    durationOverride: number | null
    sortOrder: number
  }>
}

const SERVICE_LABELS: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "Normal Bakım", color: "bg-blue-100 text-blue-700" },
  HIZLI:  { label: "Hızlı Servis", color: "bg-green-100 text-green-700" },
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [subModels, setSubModels] = useState<any[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  const [brandId, setBrandId] = useState("")
  const [modelId, setModelId] = useState("")
  const [subModelId, setSubModelId] = useState("")
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showUnapprovedOnly, setShowUnapprovedOnly] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLabel, setDeleteLabel] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [deduping, setDeduping] = useState(false)

  useEffect(() => { getBrands().then(setBrands) }, [])

  useEffect(() => {
    if (brandId) {
      getModelsByBrand(brandId).then(setModels)
      setModelId(""); setSubModelId(""); setSubModels([]); setTemplates([])
    }
  }, [brandId])

  useEffect(() => {
    if (modelId) {
      getSubModelsByModel(modelId).then(setSubModels)
      setSubModelId(""); setTemplates([])
    }
  }, [modelId])

  useEffect(() => { loadTemplates() }, [brandId, modelId, subModelId])
  useEffect(() => { setPage(1) }, [showUnapprovedOnly])

  function loadTemplates() {
    if (!brandId) { setTemplates([]); setSelectedIds(new Set()); return }
    setLoading(true)
    const params = new URLSearchParams({ brandId })
    if (subModelId) params.set("subModelId", subModelId)
    else if (modelId) params.set("modelId", modelId)
    fetch(`/api/templates?${params}`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setPage(1); setSelectedIds(new Set()) })
      .finally(() => setLoading(false))
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const pagedIds = new Set(pagedTemplates.map(t => t.id))
    const allSelected = pagedIds.size > 0 && selectedIds.size === pagedTemplates.length && pagedTemplates.every(t => selectedIds.has(t.id))
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pagedTemplates.forEach(t => next.delete(t.id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pagedTemplates.forEach(t => next.add(t.id)); return next })
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size} şablonu silmek istediğinize emin misiniz? Geri alınamaz.`)) return
    const ids = Array.from(selectedIds)
    setBulkDeleting(true)
    try {
      let ok = 0, err = 0
      for (const id of ids) {
        try {
          await deleteTemplate(id)
          ok++
        } catch {
          err++
        }
      }
      setSelectedIds(new Set())
      loadTemplates()
      toast({ title: "Toplu silme", description: `${ok} silindi${err > 0 ? `, ${err} hata` : ""}.` })
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" })
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleDedupe() {
    if (!confirm("Tüm marka/model/alt modelde mükerrer periyotlar silinecek (her periyot için kalem sayısı en fazla olan bırakılacak). Devam?")) return
    setDeduping(true)
    try {
      const { deleted } = await dedupeMaintenanceTemplates()
      toast({ title: deleted > 0 ? "Tekilleştirildi" : "Mükerrer yok", description: deleted > 0 ? `${deleted} mükerrer şablon silindi.` : "Silinecek çift periyot bulunamadı." })
      if (deleted > 0) loadTemplates()
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" })
    } finally {
      setDeduping(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteTemplate(deleteId)
      toast({ title: "Şablon silindi" })
      setDeleteId(null)
      setTemplates(prev => prev.filter(t => t.id !== deleteId))
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredTemplates = showUnapprovedOnly ? templates.filter(t => !t.isApproved) : templates
  const totalPages = Math.ceil(filteredTemplates.length / PAGE_SIZE)
  const pagedTemplates = filteredTemplates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Group paged templates by serviceType — AGIR, NORMAL aynı grupta gösterilir
  const grouped = new Map<string, Template[]>()
  for (const t of pagedTemplates) {
    const key = (t.serviceType === "AGIR" ? "NORMAL" : t.serviceType) || "OTHER"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }
  const groupOrder = ["HIZLI", "NORMAL", "OTHER"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-indigo-500" />
          Bakım Şablonları
        </h1>
        <p className="text-muted-foreground">Periyodik bakım reçete şablonlarını görüntüleyin.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Marka</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Marka seçin" /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
                <SelectTrigger><SelectValue placeholder={brandId ? "Model seçin" : "Önce marka"} /></SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alt Model</Label>
              <Select value={subModelId} onValueChange={setSubModelId} disabled={!modelId || subModels.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!modelId ? "Önce model" : subModels.length === 0 ? "Alt model yok" : "Alt model seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {subModels.map(sm => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!brandId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Lütfen marka seçin
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Şablon bulunamadı</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Toplam bilgisi */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Toplam <span className="font-semibold text-foreground">{filteredTemplates.length}</span>
              {showUnapprovedOnly && (
                <> / {templates.length} <span className="text-amber-600 font-medium">onaysız</span></>
              )}
              {" "}şablon
              &nbsp;·&nbsp; Sayfa <span className="font-semibold text-foreground">{page}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showUnapprovedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnapprovedOnly(v => !v)}
                className={showUnapprovedOnly
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                  : "text-amber-700 border-amber-300 hover:bg-amber-50"
                }
              >
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                {showUnapprovedOnly ? "Onaysızlar gösteriliyor" : "Onaysızları göster"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {pagedTemplates.length > 0 && pagedTemplates.every(t => selectedIds.has(t.id))
                  ? <><Square className="h-3.5 w-3.5 mr-1.5" /> Seçimi kaldır</>
                  : <><CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Tümünü işaretle</>
                }
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                  Seçilenleri sil ({selectedIds.size})
                </Button>
              )}
              <span className="text-xs">Sayfa başına {PAGE_SIZE} şablon</span>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={handleDedupe}
                disabled={deduping}
              >
                {deduping ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Merge className="h-3.5 w-3.5 mr-1.5" />}
                Mükerrerleri temizle
              </Button>
            </div>
          </div>

          {groupOrder.map(sType => {
            const group = grouped.get(sType)
            if (!group || group.length === 0) return null
            const config = SERVICE_LABELS[sType] || { label: "Diğer", color: "bg-gray-100 text-gray-700" }

            return (
              <div key={sType}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>{config.label}</span>
                  <span className="text-muted-foreground">({group.length} şablon)</span>
                </h3>
                <div className="space-y-2">
                  {group.map(t => (
                    <Card key={t.id} className="overflow-hidden">
                        <div
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors ${selectedIds.has(t.id) ? "bg-primary/5" : ""}`}
                          onClick={() => toggleExpand(t.id)}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); toggleSelect(t.id) }}
                              className="p-1 rounded hover:bg-muted"
                              aria-label={selectedIds.has(t.id) ? "Seçimi kaldır" : "İşaretle"}
                            >
                              {selectedIds.has(t.id)
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4 text-muted-foreground" />
                              }
                            </button>
                            {expanded.has(t.id)
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            }
                            <ClipboardList className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {t.periodKm === 0
                                ? "Hızlı Servis"
                                : `${t.periodKm?.toLocaleString("tr-TR")} km`
                              }
                              {t.periodKm !== 0 && t.periodMonth ? ` / ${t.periodMonth} ay` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {t.isApproved && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                <ShieldCheck className="h-3 w-3" />
                                Onaylı
                              </span>
                            )}
                            <Badge variant={t.items.length > 0 ? "default" : "secondary"}>
                              {t.items.length} kalem
                            </Badge>
                            <Link
                              href={`/dashboard/admin/template-editor?templateId=${t.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                              Düzenle
                            </Link>
                            <button
                              onClick={() => {
                                const label = t.periodKm === 0
                                  ? "Hızlı Servis"
                                  : `${t.periodKm?.toLocaleString("tr-TR")} km${t.periodMonth ? ` / ${t.periodMonth} ay` : ""}`
                                setDeleteLabel(label)
                                setDeleteId(t.id)
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                              title="Şablonu Sil"
                            >
                              <Trash2 className="h-3 w-3" />
                              Sil
                            </button>
                          </div>
                        </div>
                      {expanded.has(t.id) && (
                        <div className="border-t px-4 pb-3 pt-2">
                          {t.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">Henüz kalem eklenmemiş</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8">#</TableHead>
                                  <TableHead>Tip</TableHead>
                                  <TableHead>Referans Kodu</TableHead>
                                  <TableHead className="text-right">Adet</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {t.items.map((item, idx) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                    <TableCell>
                                      {item.itemType === "PART" ? (
                                        <Badge variant="default" className="text-xs">Parça</Badge>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
                                          İşçilik
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs">{item.referenceCode}</TableCell>
                                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`inline-flex items-center justify-center rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted border-border"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Silme Onay Dialogu */}
      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Şablonu Sil
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">
              Aşağıdaki bakım şablonunu silmek istediğinizden emin misiniz?
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
              <p className="font-semibold text-red-800 text-sm">{deleteLabel}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Bu işlem geri alınamaz. Şablona ait tüm kalemler de silinir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
