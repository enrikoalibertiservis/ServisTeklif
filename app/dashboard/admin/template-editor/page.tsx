"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getBrands, getModelsByBrand, getSubModelsByModel } from "@/app/actions/vehicle"
import { searchParts, searchLabor } from "@/app/actions/quote"
import {
  getTemplatesForVehicle,
  getTemplateDetails,
  addItemToTemplate,
  removeItemFromTemplate,
  updateTemplateItemQuantity,
  copyTemplateItems,
  clearTemplateItems,
  createTemplate,
  deleteTemplate,
  dedupeMaintenanceTemplates,
  approveTemplate,
} from "@/app/actions/template"
import { formatCurrency } from "@/lib/utils"
import {
  ClipboardList, Plus, Trash2, Search, Loader2, Copy, Package,
  Wrench, AlertTriangle, Check, Minus, ChevronRight, FileCog, PlusCircle, X,
  ShieldCheck, ShieldOff,
} from "lucide-react"

interface TemplateItem {
  id: string
  itemType: string
  referenceCode: string
  quantity: number
  name: string
  unitPrice: number
  durationHours?: number
  hourlyRate?: number
}

export default function TemplateEditorPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [subModels, setSubModels] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])

  const [brandId, setBrandId] = useState("")
  const [modelId, setModelId] = useState("")
  const [subModelId, setSubModelId] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")

  // Pending auto-select values from URL ?templateId param
  const pending = useRef<{
    brandId: string
    modelId?: string
    subModelId?: string
    templateId: string
  } | null>(null)

  const [templateDetails, setTemplateDetails] = useState<any>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [approving, setApproving] = useState(false)

  // Search dialog
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<"PART" | "LABOR">("PART")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Copy dialog
  const [copyOpen, setCopyOpen] = useState(false)
  const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set())
  const [copyLoading, setCopyLoading] = useState(false)

  // New template dialog
  const [newOpen, setNewOpen] = useState(false)
  const [newPeriodKm, setNewPeriodKm] = useState("")
  const [newPeriodMonth, setNewPeriodMonth] = useState("")
  const [newServiceType, setNewServiceType] = useState("NORMAL")
  const [newName, setNewName] = useState("")
  const [newLoading, setNewLoading] = useState(false)

  // Load brands
  useEffect(() => { getBrands().then(setBrands) }, [])

  // On mount: if ?templateId param exists, auto-select vehicle + template
  useEffect(() => {
    const templateId = searchParams.get("templateId")
    if (!templateId) return
    getTemplateDetails(templateId).then(details => {
      pending.current = {
        brandId: details.brand!.id,
        modelId: details.model?.id,
        subModelId: details.subModel?.id,
        templateId: details.id,
      }
      setBrandId(details.brand!.id)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Brand change
  useEffect(() => {
    if (!brandId) return
    const isPending = pending.current?.brandId === brandId
    if (!isPending) {
      setModelId("")
      setSubModelId("")
      setSelectedTemplateId("")
      setSubModels([])
      setTemplates([])
      setItems([])
      setTemplateDetails(null)
    }
    getModelsByBrand(brandId).then(models => {
      setModels(models)
      if (isPending && pending.current?.modelId) {
        setModelId(pending.current.modelId)
      }
    })
  }, [brandId])

  // Model change
  useEffect(() => {
    if (!modelId) return
    const isPending = pending.current?.modelId === modelId
    if (!isPending) {
      setSubModelId("")
      setSelectedTemplateId("")
      setTemplates([])
      setItems([])
      setTemplateDetails(null)
    }
    getSubModelsByModel(modelId).then(subModels => {
      setSubModels(subModels)
      if (isPending) {
        if (pending.current?.subModelId) {
          setSubModelId(pending.current.subModelId)
        } else {
          // Template has no subModel — load templates directly
          const bId = pending.current!.brandId
          const tid = pending.current!.templateId
          getTemplatesForVehicle(bId, modelId).then(tpls => {
            setTemplates(tpls)
            setSelectedTemplateId(tid)
            pending.current = null
          })
        }
      }
    })
  }, [modelId])

  // SubModel change → load templates
  useEffect(() => {
    if (!brandId || !modelId || !subModelId) return
    const isPending = pending.current?.subModelId === subModelId
    if (!isPending) {
      setSelectedTemplateId("")
      setItems([])
      setTemplateDetails(null)
    }
    getTemplatesForVehicle(brandId, modelId, subModelId).then(tpls => {
      setTemplates(tpls)
      if (isPending && pending.current?.templateId) {
        setSelectedTemplateId(pending.current.templateId)
        pending.current = null
      }
    })
  }, [brandId, modelId, subModelId])

  const loadTemplateDetails = useCallback(async (templateId: string) => {
    setLoadingDetails(true)
    try {
      const details = await getTemplateDetails(templateId)
      setTemplateDetails(details)
      setItems(details.items)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setLoadingDetails(false)
    }
  }, [toast])

  // Template select
  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetails(selectedTemplateId)
    }
  }, [selectedTemplateId, loadTemplateDetails])

  // Search
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("")
      setSearchResults([])
      return
    }
  }, [searchOpen])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const brandName = brands.find(b => b.id === brandId)?.name || ""
        if (searchType === "PART") {
          setSearchResults(await searchParts(brandName, searchQuery))
        } else {
          setSearchResults(await searchLabor(brandName, searchQuery))
        }
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchType, brandId, brands])

  async function handleAddItem(item: any) {
    try {
      const refCode = searchType === "PART" ? item.partNo : item.operationCode
      await addItemToTemplate(selectedTemplateId, searchType, refCode, 1)
      await loadTemplateDetails(selectedTemplateId)
      toast({ title: "Eklendi", description: `${item.name} şablona eklendi.` })
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  async function handleRemoveItem(itemId: string) {
    try {
      await removeItemFromTemplate(itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      toast({ title: "Silindi" })
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  async function handleQuantityChange(itemId: string, newQuantity: number) {
    if (newQuantity <= 0) return
    try {
      await updateTemplateItemQuantity(itemId, newQuantity)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i))
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  async function handleCopy() {
    if (copyTargets.size === 0) return
    setCopyLoading(true)
    try {
      const result = await copyTemplateItems(selectedTemplateId, Array.from(copyTargets))
      toast({
        title: "Kopyalandı",
        description: `${result.copied} kalem ${result.targetCount} şablona kopyalandı.`,
      })
      setCopyOpen(false)
      setCopyTargets(new Set())
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setCopyLoading(false)
    }
  }

  async function handleClearAll() {
    if (!confirm("Bu şablondaki tüm kalemleri silmek istediğinize emin misiniz?")) return
    try {
      await clearTemplateItems(selectedTemplateId)
      setItems([])
      toast({ title: "Temizlendi", description: "Tüm kalemler silindi." })
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  function toggleCopyTarget(id: string) {
    setCopyTargets(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllCopyTargets() {
    const others = templates.filter(t => t.id !== selectedTemplateId).map(t => t.id)
    setCopyTargets(new Set(others))
  }

  async function handleCreateTemplate() {
    if (!brandId) return
    const km = newPeriodKm ? parseInt(newPeriodKm) : null
    const month = newPeriodMonth ? parseInt(newPeriodMonth) : null
    if (!km && newServiceType !== "HIZLI") {
      toast({ title: "Hata", description: "Kilometre giriniz.", variant: "destructive" })
      return
    }
    setNewLoading(true)
    try {
      const created = await createTemplate({
        brandId,
        modelId: modelId || undefined,
        subModelId: subModelId || undefined,
        periodKm: newServiceType === "HIZLI" ? 0 : km,
        periodMonth: month,
        serviceType: newServiceType || null,
        name: newName || null,
      })
      toast({ title: "Oluşturuldu", description: "Yeni bakım periyodu eklendi." })
      setNewOpen(false)
      setNewPeriodKm(""); setNewPeriodMonth(""); setNewServiceType("NORMAL"); setNewName("")
      // Reload templates and select the new one
      const tpls = await getTemplatesForVehicle(brandId, modelId, subModelId)
      setTemplates(tpls)
      setSelectedTemplateId(created.id)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setNewLoading(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplateId) return
    if (!confirm("Bu şablonu tamamen silmek istediğinize emin misiniz? Geri alınamaz.")) return
    try {
      await deleteTemplate(selectedTemplateId)
      toast({ title: "Silindi", description: "Şablon silindi." })
      const tpls = await getTemplatesForVehicle(brandId, modelId, subModelId)
      setTemplates(tpls)
      setSelectedTemplateId("")
      setItems([])
      setTemplateDetails(null)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  async function handleApprove(approve: boolean) {
    if (!selectedTemplateId) return
    setApproving(true)
    try {
      const updated = await approveTemplate(selectedTemplateId, approve)
      setTemplateDetails((prev: any) => prev ? { ...prev, isApproved: updated.isApproved, approvedAt: updated.approvedAt } : prev)
      // Templates listesini de güncelle
      setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, isApproved: updated.isApproved } : t))
      toast({
        title: approve ? "Reçete Onaylandı ✓" : "Onay Kaldırıldı",
        description: approve
          ? "Danışmanlar bu reçetenin onaylı olduğunu görecek."
          : "Reçetenin onay işareti kaldırıldı.",
      })
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setApproving(false)
    }
  }

  const partsTotal = items.filter(i => i.itemType === "PART").reduce((s, i) => s + (i.unitPrice * i.quantity), 0)
  const laborTotal = items.filter(i => i.itemType === "LABOR").reduce((s, i) => s + (i.unitPrice * i.quantity), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCog className="h-6 w-6 text-violet-500" />
          Şablon Editörü
        </h1>
        <p className="text-muted-foreground">Bakım periyodlarına parça ve işçilik tanımlayın.</p>
      </div>

      {/* Vehicle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Araç Seçimi</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label>Alt Model / Motor</Label>
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

      {/* Template List */}
      {brandId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Bakım Şablonları</CardTitle>
              <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={async () => {
                  if (!confirm("Tüm mükerrer bakım periyodları silinecek (her periyot için kalem sayısı en fazla olan bırakılacak). Devam?")) return
                  try {
                    const { deleted } = await dedupeMaintenanceTemplates()
                    toast({ title: deleted > 0 ? "Tekilleştirildi" : "Mükerrer yok", description: deleted > 0 ? `${deleted} mükerrer şablon silindi.` : "Silinecek çift periyot bulunamadı." })
                    if (deleted > 0 && brandId && modelId) {
                      const tpls = await getTemplatesForVehicle(brandId, modelId, subModelId || undefined)
                      setTemplates(tpls)
                      if (!tpls.some((t: any) => t.id === selectedTemplateId)) setSelectedTemplateId("")
                    }
                  } catch (e: any) {
                    toast({ title: "Hata", description: e.message, variant: "destructive" })
                  }
                }}
                disabled={!brandId}
              >
                Tekilleştir
              </Button>
              <Button
                variant="ghost" size="sm"
                className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                onClick={() => setNewOpen(true)}
                disabled={!brandId}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" /> Yeni Periyod Ekle
              </Button>
            </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Bu araç için henüz bakım periyodu tanımlanmamış. "Yeni Periyod Ekle" ile başlayın.
              </p>
            )}
            {/* Group by serviceType — Ağır Bakım ayrı tip olarak gösterilmez */}
            {(["HIZLI", "NORMAL", null] as (string | null)[]).map(sType => {
              const group = templates.filter(t => (t.serviceType || null) === sType || (sType === "NORMAL" && t.serviceType === "AGIR"))
              if (group.length === 0) return null
              const groupLabel = sType === "NORMAL" ? "Normal Bakım" : sType === "HIZLI" ? "Hızlı Servis" : "Diğer"
              const groupColor = sType === "NORMAL" ? "text-blue-600" : sType === "HIZLI" ? "text-green-600" : ""
              return (
                <div key={sType || "null"}>
                  <div className={`text-sm font-semibold mb-2 ${groupColor}`}>{groupLabel}</div>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {group.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`relative p-3 rounded-lg border-2 text-left transition-all ${
                          selectedTemplateId === t.id
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-semibold text-sm">
                          {t.periodKm === 0 ? (t.name || "Hızlı Servis") : `${t.periodKm.toLocaleString("tr-TR")} km`}
                        </div>
                        {t.periodKm !== 0 && t.periodMonth ? (
                          <div className="text-xs text-muted-foreground">{t.periodMonth} ay</div>
                        ) : null}
                        <Badge
                          variant={t._count.items > 0 ? "default" : "secondary"}
                          className="absolute top-2 right-2 text-xs"
                        >
                          {t._count.items}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Template Editor */}
      {selectedTemplateId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-violet-500" />
                {templateDetails
                  ? (templateDetails.periodKm === 0
                    ? (templateDetails.name || "Hızlı Servis Reçetesi")
                    : `${templateDetails.periodKm?.toLocaleString("tr-TR")} km Bakım Reçetesi`)
                  : "Yükleniyor..."}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                {/* Onayla / Onayı Kaldır */}
                {templateDetails?.isApproved ? (
                  <Button
                    variant="ghost" size="sm"
                    className="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    onClick={() => handleApprove(false)}
                    disabled={approving}
                  >
                    {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Onaylı — Kaldır
                  </Button>
                ) : (
                  <Button
                    variant="ghost" size="sm"
                    className="bg-amber-50 text-amber-700 border border-amber-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                    onClick={() => handleApprove(true)}
                    disabled={approving || items.length === 0}
                  >
                    {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Onayla
                  </Button>
                )}
                <Button
                  variant="ghost" size="sm"
                  className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  onClick={() => { setSearchType("PART"); setSearchOpen(true) }}
                >
                  <Package className="h-4 w-4 mr-1" /> Parça Ekle
                </Button>
                <Button
                  variant="ghost" size="sm"
                  className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                  onClick={() => { setSearchType("LABOR"); setSearchOpen(true) }}
                >
                  <Wrench className="h-4 w-4 mr-1" /> İşçilik Ekle
                </Button>
                {items.length > 0 && (
                  <>
                    <Button
                      variant="ghost" size="sm"
                      className="bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                      onClick={() => { setCopyTargets(new Set()); setCopyOpen(true) }}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Kopyala
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                      onClick={handleClearAll}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Kalemleri Temizle
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost" size="sm"
                  className="bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  onClick={handleDeleteTemplate}
                >
                  <X className="h-4 w-4 mr-1" /> Şablonu Sil
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Bu şablonda henüz kalem yok</p>
                <p className="text-sm mt-1">Parça veya işçilik ekleyerek reçeteyi oluşturun.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead className="w-20">Tip</TableHead>
                      <TableHead>Referans Kodu</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-center w-32">Adet</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant={item.itemType === "PART" ? "default" : "secondary"} className="text-xs">
                            {item.itemType === "PART" ? "Parça" : "İşçilik"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{item.referenceCode}</TableCell>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => {
                                const v = parseFloat(e.target.value)
                                if (v > 0) handleQuantityChange(item.id, v)
                              }}
                              className="w-14 h-7 text-center text-sm p-0"
                            />
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex justify-end">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm min-w-[260px]">
                    <p className="text-[11px] text-amber-600 font-medium text-right mb-2 flex items-center justify-end gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Tüm fiyatlar KDV hariçtir
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parça Toplamı:</span>
                      <span className="font-medium">{formatCurrency(partsTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">İşçilik Toplamı:</span>
                      <span className="font-medium">{formatCurrency(laborTotal)}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t pt-2 mt-1">
                      <div>
                        <span className="font-semibold">Genel Toplam</span>
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">KDV Hariç</span>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(partsTotal + laborTotal)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {searchType === "PART" ? "Parça Ara & Ekle" : "İşçilik Ara & Ekle"}
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchType === "PART" ? "Parça no veya adı ile arayın..." : "Operasyon kodu veya adı..."}
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {searchLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Sonuç bulunamadı</div>
            )}

            {!searchLoading && searchResults.length > 0 && (
              <div className="space-y-1 mt-2">
                {searchResults.map(item => {
                  const isInTemplate = items.some(
                    i => i.referenceCode === (searchType === "PART" ? item.partNo : item.operationCode)
                  )
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isInTemplate ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {searchType === "PART" ? item.partNo : item.operationCode}
                        </div>
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        {searchType === "LABOR" && (
                          <div className="text-xs text-muted-foreground">
                            {item.durationHours} saat &middot; {formatCurrency(item.hourlyRate)}/saat
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-semibold text-sm whitespace-nowrap">
                          {searchType === "PART"
                            ? formatCurrency(item.unitPrice)
                            : formatCurrency(item.totalPrice ?? item.durationHours * item.hourlyRate)}
                        </span>
                        {isInTemplate ? (
                          <Badge variant="secondary" className="gap-1">
                            <Check className="h-3 w-3" /> Eklendi
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => handleAddItem(item)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!searchLoading && searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                En az 2 karakter yazarak aramaya başlayın
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reçeteyi Diğer Periyodlara Kopyala</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Mevcut reçete içeriğini seçilen periyodlara kopyalar.
            Hedef periyodların mevcut içeriği <strong>silinip</strong> yenisiyle değiştirilir.
          </p>

          <div className="flex justify-end mb-2">
            <Button variant="link" size="sm" onClick={selectAllCopyTargets}>
              Tümünü Seç
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {templates.filter(t => t.id !== selectedTemplateId).map(t => (
              <button
                key={t.id}
                onClick={() => toggleCopyTarget(t.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                  copyTargets.has(t.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    copyTargets.has(t.id) ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}>
                    {copyTargets.has(t.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="font-medium">
                    {t.periodKm === 0
                      ? (t.name || "Hızlı Servis")
                      : `${t.periodKm?.toLocaleString("tr-TR")} km${t.periodMonth ? ` / ${t.periodMonth} ay` : ""}`
                    }
                  </span>
                </div>
                <Badge variant="secondary">{t._count.items} kalem</Badge>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCopyOpen(false)}>İptal</Button>
            <Button
              onClick={handleCopy}
              disabled={copyTargets.size === 0 || copyLoading}
            >
              {copyLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kopyalanıyor...</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" /> {copyTargets.size} Periyoda Kopyala</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Template Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-indigo-500" />
              Yeni Bakım Periyodu
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Bakım Tipi</Label>
              <Select value={newServiceType} onValueChange={setNewServiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIZLI">Hızlı Servis</SelectItem>
                  <SelectItem value="NORMAL">Normal Bakım</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newServiceType !== "HIZLI" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kilometre</Label>
                  <Input
                    type="number"
                    placeholder="ör. 10000"
                    value={newPeriodKm}
                    onChange={e => setNewPeriodKm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ay (opsiyonel)</Label>
                  <Input
                    type="number"
                    placeholder="ör. 12"
                    value={newPeriodMonth}
                    onChange={e => setNewPeriodMonth(e.target.value)}
                  />
                </div>
              </div>
            )}

            {newServiceType === "HIZLI" && (
              <div className="space-y-2">
                <Label>İsim (opsiyonel)</Label>
                <Input
                  placeholder="ör. Hızlı Servis"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setNewOpen(false)} disabled={newLoading}>
                İptal
              </Button>
              <Button onClick={handleCreateTemplate} disabled={newLoading}>
                {newLoading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Oluşturuluyor...</>
                  : <><PlusCircle className="h-4 w-4 mr-2" /> Oluştur</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
