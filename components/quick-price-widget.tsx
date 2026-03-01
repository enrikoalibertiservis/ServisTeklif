"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getBrands, getModelsByBrand, getSubModelsByModel,
  getMaintenancePeriods, getServiceTypesByTemplate,
} from "@/app/actions/vehicle"
import { previewTemplatePrice } from "@/app/actions/quote"
import {
  Zap, Shield, Gauge, Wrench, Car, ChevronRight, ChevronDown,
  Loader2, RotateCcw, PlusCircle, Package, ShieldCheck, ShieldOff,
} from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

const SERVICE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  NORMAL: { label: "Normal Bakım", color: "border-blue-500 bg-blue-50 text-blue-700",    icon: Gauge  },
  HIZLI:  { label: "Hızlı Servis", color: "border-green-500 bg-green-50 text-green-700", icon: Zap   },
}

type PreviewResult = Awaited<ReturnType<typeof previewTemplatePrice>>

interface QuickPriceWidgetProps {
  onActiveChange?: (active: boolean) => void
  className?: string
}

export function QuickPriceWidget({ onActiveChange, className = "" }: QuickPriceWidgetProps = {}) {
  const router = useRouter()
  const [brands, setBrands]         = useState<any[]>([])
  const [models, setModels]         = useState<any[]>([])
  const [subModels, setSubModels]   = useState<any[]>([])
  const [periods, setPeriods]       = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  const [brandId, setBrandId]           = useState("")
  const [modelId, setModelId]           = useState("")
  const [subModelId, setSubModelId]     = useState("")
  const [selectedPeriodKm, setSelectedPeriodKm] = useState<number | null>(null)
  const [basePeriodTemplateId, setBasePeriodTemplateId] = useState("")
  const [templateId, setTemplateId]     = useState("")
  const [hasMultipleServiceTypes, setHasMultipleServiceTypes] = useState(false)
  const [isApprovedTemplate, setIsApprovedTemplate] = useState(false)

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<PreviewResult | null>(null)
  const [error, setError]       = useState("")

  const [partsOpen, setPartsOpen]   = useState(false)
  const [laborOpen, setLaborOpen]   = useState(false)

  // İndirim durumu
  const [warrantyDiscount, setWarrantyDiscount] = useState(false)
  const [discountSettings, setDiscountSettings] = useState({
    warrantyParts: 15, warrantyLabor: 20,
  })

  // İndirim ayarlarını çek
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((data: { key: string; value: string }[]) => {
      const map: Record<string, string> = {}
      data.forEach(s => { map[s.key] = s.value })
      setDiscountSettings({
        warrantyParts: parseFloat(map.warrantyDiscountParts ?? "15") || 15,
        warrantyLabor: parseFloat(map.warrantyDiscountLabor ?? "20") || 20,
      })
    }).catch(() => {})
  }, [])

  // Dışarıya aktif/pasif durumu bildir
  useEffect(() => {
    onActiveChange?.(!!brandId)
  }, [brandId, onActiveChange])

  // Markalar
  useEffect(() => { getBrands().then(setBrands) }, [])

  // Modeller
  useEffect(() => {
    if (!brandId) return
    getModelsByBrand(brandId).then(setModels)
    setModelId(""); setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
    setSubModels([]); setPeriods([]); setServiceTypes([]); setResult(null)
  }, [brandId])

  // Alt modeller
  useEffect(() => {
    if (!modelId) return
    getSubModelsByModel(modelId).then(setSubModels)
    setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
    setPeriods([]); setServiceTypes([]); setResult(null)
  }, [modelId])

  // Periyotlar
  useEffect(() => {
    if (!brandId || !modelId) return
    if (subModels.length > 0 && !subModelId) {
      setPeriods([]); setSelectedPeriodKm(null); setBasePeriodTemplateId(""); setTemplateId(""); setServiceTypes([]); setHasMultipleServiceTypes(false); setIsApprovedTemplate(false); return
    }
    getMaintenancePeriods(brandId, modelId, subModelId || undefined).then(setPeriods)
    setSelectedPeriodKm(null); setBasePeriodTemplateId(""); setTemplateId(""); setServiceTypes([]); setHasMultipleServiceTypes(false); setIsApprovedTemplate(false); setResult(null)
  }, [brandId, modelId, subModelId, subModels])

  // Servis tipleri — sadece "başka seçenek var mı?" kontrolü için
  // templateId period tıklanınca zaten set edilmiş olur, burada sadece sibling'leri yükleriz
  useEffect(() => {
    if (!basePeriodTemplateId) {
      setServiceTypes([])
      setHasMultipleServiceTypes(false)
      return
    }
    getServiceTypesByTemplate(basePeriodTemplateId).then((types) => {
      const visible = types.filter(t => t.serviceType !== "AGIR")
      setServiceTypes(visible)
      setHasMultipleServiceTypes(visible.length > 1)
      // templateId zaten period onClick'te set edildi.
      // Sadece başka tip seçilmediyse ilk seçeneği doğrula (AGIR değilse)
      setTemplateId(prev => {
        if (prev) return prev            // kullanıcı zaten bir seçim yapmış
        const first = visible[0]
        return first ? first.id : prev   // fallback: ilk visible tip
      })
    })
  }, [basePeriodTemplateId])

  // Şablon seçilince otomatik fiyat hesapla
  useEffect(() => {
    if (!templateId || !brandId) { setResult(null); return }
    setLoading(true); setError("")
    previewTemplatePrice(templateId, brandId)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [templateId, brandId])

  function reset() {
    setBrandId(""); setModelId(""); setSubModelId("")
    setSelectedPeriodKm(null); setBasePeriodTemplateId(""); setTemplateId("")
    setModels([]); setSubModels([]); setPeriods([]); setServiceTypes([])
    setHasMultipleServiceTypes(false)
    setIsApprovedTemplate(false)
    setResult(null); setError("")
  }

  const regularPeriods = periods.filter(p => p.periodKm !== 0)
  const hizliServis    = periods.find(p => p.periodKm === 0)

  // Araç etiketi
  const selectedBrand    = brands.find(b => b.id === brandId)
  const selectedModel    = models.find(m => m.id === modelId)
  const selectedSubModel = subModels.find(s => s.id === subModelId)

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white shadow-md shadow-emerald-100 ${className}`}>
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-200 bg-emerald-50/60">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-bold text-emerald-900">Hızlı Fiyat Sorgula</h2>
            <p className="text-xs text-emerald-700/60">Teklif oluşturmadan anlık bakım fiyatı görün.</p>
          </div>
        </div>
        {(brandId || result) && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white/80 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </button>
        )}
      </div>

      {/* İçerik alanı */}
      <div className="flex-1 p-5 space-y-4">
        {/* Araç Seçimi */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder="Marka seçin" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder={brandId ? "Model seçin" : "Önce marka"} />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={subModelId}
            onValueChange={setSubModelId}
            disabled={!modelId || subModels.length === 0}
          >
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder={
                !modelId ? "Önce model" :
                subModels.length === 0 ? "Alt model yok" :
                "Alt model seçin"
              } />
            </SelectTrigger>
            <SelectContent>
              {subModels.map(sm => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Periyot butonları */}
        {periods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bakım Periyodu</p>
            <div className="flex flex-wrap gap-2">
              {hizliServis && (
                <button
                  onClick={() => {
                    const toggled = selectedPeriodKm === 0
                    setSelectedPeriodKm(toggled ? null : 0)
                    setBasePeriodTemplateId(toggled ? "" : hizliServis.id)
                    setTemplateId(toggled ? "" : hizliServis.id)
                    setIsApprovedTemplate(toggled ? false : !!hizliServis.isApproved)
                    setServiceTypes([]); setHasMultipleServiceTypes(false)
                    setResult(null); setError("")
                  }}
                  className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedPeriodKm === 0
                      ? "border-green-600 bg-green-500 text-white shadow-sm shadow-green-200"
                      : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-500"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Hızlı Servis
                </button>
              )}
              {regularPeriods.map(p => (
                <button
                  key={p.periodKm}
                  onClick={() => {
                    const toggled = selectedPeriodKm === p.periodKm
                    setSelectedPeriodKm(toggled ? null : p.periodKm)
                    setBasePeriodTemplateId(toggled ? "" : p.id)
                    setTemplateId(toggled ? "" : p.id)
                    setIsApprovedTemplate(toggled ? false : !!p.isApproved)
                    setServiceTypes([]); setHasMultipleServiceTypes(false)
                    setResult(null); setError("")
                  }}
                  className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all ${
                    selectedPeriodKm === p.periodKm
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  {p.periodKm.toLocaleString("tr-TR")} km
                  {p.periodMonth ? <span className="text-xs opacity-60 ml-1">/ {p.periodMonth}ay</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Servis tipi — birden fazla seçenek varsa göster */}
        {hasMultipleServiceTypes && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Servis Tipi</p>
            <div className="flex flex-wrap gap-2">
              {serviceTypes.filter(st => st.serviceType !== "AGIR").map(st => {
                const cfg = SERVICE_TYPE_CONFIG[st.serviceType || ""] || { label: st.name || st.serviceType, color: "border-gray-300 bg-white", icon: Wrench }
                const Icon = cfg.icon
                return (
                  <button
                    key={st.id}
                    onClick={() => setTemplateId(templateId === st.id ? "" : st.id)}
                    className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                      templateId === st.id ? cfg.color : "border-border bg-white hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Yükleniyor */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fiyatlar hesaplanıyor…</span>
          </div>
        )}

        {/* Hata */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Sonuç */}
        {result && !loading && (() => {
          const partItems = result.items.filter(i => i.itemType === "PART")
          const laborItems = result.items.filter(i => i.itemType === "LABOR")

          // İndirim hesapla
          const wPartsPct  = discountSettings.warrantyParts / 100
          const wLaborPct  = discountSettings.warrantyLabor / 100
          const dPartsSubtotal = warrantyDiscount ? result.partsSubtotal * (1 - wPartsPct) : result.partsSubtotal
          const dLaborSubtotal = warrantyDiscount ? result.laborSubtotal * (1 - wLaborPct) : result.laborSubtotal
          const dSubtotal      = dPartsSubtotal + dLaborSubtotal
          const dTaxAmount     = dSubtotal * (result.taxRate / 100)
          const dGrandTotal    = dSubtotal + dTaxAmount

          return (
            <div className="space-y-3">
              {/* Onay rozeti + Garantisi Biten butonu */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  {isApprovedTemplate ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Onaylı
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Onaylanmamış
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setWarrantyDiscount(v => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
                    warrantyDiscount
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-rose-700 border-rose-300 hover:bg-rose-50"
                  }`}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  G. Biten Araç İnd.
                  <span className="opacity-75 text-[10px]">YP-%{discountSettings.warrantyParts} / İşç-%{discountSettings.warrantyLabor}</span>
                </button>
              </div>

              {/* Parçalar — indigo/mavi tema */}
              {partItems.length > 0 && (
                <div className="rounded-lg border border-indigo-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPartsOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 border-b-2 border-indigo-200 cursor-pointer hover:bg-indigo-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-indigo-400 transition-transform ${partsOpen ? "rotate-0" : "-rotate-90"}`} />
                      <Package className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-800 uppercase tracking-wide">Parçalar</span>
                      <span className="text-xs text-indigo-400 font-medium ml-1">({partItems.length})</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-700 tabular-nums">{fmt(result.partsSubtotal)}</span>
                  </button>
                  {partsOpen && partItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-0 py-2 text-sm border-b last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-indigo-50/40"
                      }`}
                    >
                      <div className="w-1 self-stretch rounded-r bg-indigo-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="block truncate font-medium text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-400">{item.referenceCode}</span>
                          {item.quantity > 1 && (
                            <span className="inline-flex items-center rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0">
                              ×{item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums pr-3 shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* İşçilik — amber/turuncu tema */}
              {laborItems.length > 0 && (
                <div className="rounded-lg border border-amber-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLaborOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 border-b-2 border-amber-200 cursor-pointer hover:bg-amber-100/70 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-amber-400 transition-transform ${laborOpen ? "rotate-0" : "-rotate-90"}`} />
                      <Wrench className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">İşçilik</span>
                      <span className="text-xs text-amber-400 font-medium ml-1">({laborItems.length})</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 tabular-nums">{fmt(result.laborSubtotal)}</span>
                  </button>
                  {laborOpen && laborItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-0 py-2 text-sm border-b last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-amber-50/40"
                      }`}
                    >
                      <div className="w-1 self-stretch rounded-r bg-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="block truncate font-medium text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-400">{item.referenceCode}</span>
                          {item.durationHours && (
                            <span className="inline-flex items-center rounded bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0">
                              {item.durationHours} saat
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums pr-3 shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Özet */}
              <div className="rounded-lg border overflow-hidden">
                {warrantyDiscount && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 font-medium">
                    <ShieldOff className="h-3.5 w-3.5" />
                    Garanti Sonu İndirimi: YP -%{discountSettings.warrantyParts} · İşçilik -%{discountSettings.warrantyLabor}
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-2.5 text-sm border-b bg-slate-50">
                  <span className="text-slate-500">Ara Toplam</span>
                  <div className="text-right">
                    {warrantyDiscount && (
                      <span className="text-xs text-slate-400 line-through tabular-nums mr-2">{fmt(result.subtotal)}</span>
                    )}
                    <span className="font-medium text-slate-700 tabular-nums">{fmt(dSubtotal)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center px-4 py-2 text-sm border-b bg-white">
                  <span className="text-slate-400 text-xs">KDV (%{result.taxRate})</span>
                  <span className="text-slate-500 text-xs tabular-nums">{fmt(dTaxAmount)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-4 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 text-base">Genel Toplam</span>
                  <div className="text-right">
                    {warrantyDiscount && (
                      <span className="text-sm text-slate-400 line-through tabular-nums block">{fmt(result.grandTotal)}</span>
                    )}
                    <span className={`font-extrabold text-2xl tabular-nums ${warrantyDiscount ? "text-rose-600" : "text-slate-900"}`}>
                      {fmt(dGrandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Teklif Oluştur Butonu */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    const params = new URLSearchParams({ brandId, modelId, templateId })
                    if (subModelId) params.set("subModelId", subModelId)
                    if (warrantyDiscount) {
                      params.set("warrantyPartsPct",  String(discountSettings.warrantyParts))
                      params.set("warrantyLaborPct",  String(discountSettings.warrantyLabor))
                    }
                    router.push(`/dashboard/quotes/new?${params}`)
                  }}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-3.5 px-5 transition-all shadow-sm shadow-orange-200"
                >
                  <PlusCircle className="h-5 w-5 shrink-0" />
                  Bu Fiyatla Teklif Oluştur
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
                </button>
              </div>
            </div>
          )
        })()}

        {/* Yönlendirici boş durum */}
        {!loading && !result && !error && (
          <div className="text-center py-4 text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">
              {!brandId
                ? "Marka seçerek başlayın."
                : !modelId
                ? "Model seçin."
                : subModels.length > 0 && !subModelId
                ? "Alt model / motor tipi seçin."
                : periods.length === 0
                ? "Bu araç için tanımlı bakım şablonu bulunamadı."
                : selectedPeriodKm === null
                ? "Bakım periyodunu seçin."
                : hasMultipleServiceTypes && !templateId
                ? "Servis tipini seçin."
                : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
