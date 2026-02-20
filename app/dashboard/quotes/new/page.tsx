"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  getBrands, getModelsByBrand, getSubModelsByModel,
  getMaintenancePeriods, getServiceTypes, getTemplatePeriod,
} from "@/app/actions/vehicle"
import { createQuoteFromTemplate } from "@/app/actions/quote"
import { useToast } from "@/hooks/use-toast"
import { Car, Wrench, User, ArrowRight, Loader2, Zap, Gauge, PlusCircle, Shield } from "lucide-react"

const SERVICE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  NORMAL: { label: "Normal Bakım",  color: "border-blue-500 bg-blue-50 text-blue-700",    icon: Gauge,  desc: "Standart bakım" },
  HIZLI:  { label: "Hızlı Servis",  color: "border-green-500 bg-green-50 text-green-700", icon: Zap,    desc: "Hızlı servis" },
}

export default function NewQuotePage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const { toast }   = useToast()

  // URL'den gelen değerleri bir kez okuyup ref'te saklıyoruz.
  // Her cascade effect bu ref'i kontrol eder; değer varsa uygular ve siler.
  const pending = useRef({
    modelId:    searchParams.get("modelId")    ?? "",
    subModelId: searchParams.get("subModelId") ?? "",
    templateId: searchParams.get("templateId") ?? "",
  })

  const [brands, setBrands]         = useState<any[]>([])
  const [models, setModels]         = useState<any[]>([])
  const [subModels, setSubModels]   = useState<any[]>([])
  const [periods, setPeriods]       = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  const [brandId, setBrandId]           = useState("")
  const [modelId, setModelId]           = useState("")
  const [subModelId, setSubModelId]     = useState("")
  const [selectedPeriodKm, setSelectedPeriodKm] = useState<number | null>(null)
  const [templateId, setTemplateId]     = useState("")

  const [customerName,  setCustomerName]  = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [plateNo, setPlateNo]             = useState("")

  const [loading, setLoading] = useState(false)

  // ── Marka select wrapper (kullanıcı el ile değiştirince pending'i temizle)
  function handleBrandChange(id: string) {
    pending.current = { modelId: "", subModelId: "", templateId: "" }
    setBrandId(id)
  }
  function handleModelChange(id: string) {
    pending.current.subModelId = ""
    pending.current.templateId = ""
    setModelId(id)
  }
  function handleSubModelChange(id: string) {
    pending.current.templateId = ""
    setSubModelId(id)
  }

  // ── 1. Markalar yükle + URL'den brandId uygula
  useEffect(() => {
    const urlBrandId = searchParams.get("brandId") ?? ""
    getBrands().then(b => {
      setBrands(b)
      if (urlBrandId) setBrandId(urlBrandId)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. brandId değişince modeller yükle
  useEffect(() => {
    if (!brandId) return
    getModelsByBrand(brandId).then(m => {
      setModels(m)
      if (pending.current.modelId) {
        // prefill: pending modelId'yi uygula, alt seçimleri sıfırlama
        setModelId(pending.current.modelId)
      } else {
        // kullanıcı el ile değiştirdi: alt seçimleri temizle
        setModelId(""); setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
        setSubModels([]); setPeriods([]); setServiceTypes([])
      }
    })
  }, [brandId])

  // ── 3. modelId değişince alt modeller yükle
  useEffect(() => {
    if (!modelId) return
    getSubModelsByModel(modelId).then(s => {
      setSubModels(s)
      if (pending.current.subModelId) {
        setSubModelId(pending.current.subModelId)
      } else {
        setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
        setPeriods([]); setServiceTypes([])
      }
    })
  }, [modelId])

  // ── 4. subModelId/model değişince periyotlar yükle
  useEffect(() => {
    if (!brandId || !modelId) return
    if (subModels.length > 0 && !subModelId) {
      setPeriods([]); setSelectedPeriodKm(null); setTemplateId(""); setServiceTypes([])
      return
    }
    getMaintenancePeriods(brandId, modelId, subModelId || undefined).then(async p => {
      setPeriods(p)
      if (pending.current.templateId) {
        // Şablonun hangi periyoda ait olduğunu bul
        const km = await getTemplatePeriod(pending.current.templateId)
        setSelectedPeriodKm(km)
      } else {
        setSelectedPeriodKm(null); setTemplateId(""); setServiceTypes([])
      }
    })
  }, [brandId, modelId, subModelId, subModels])

  // ── 5. selectedPeriodKm değişince servis tipleri yükle
  useEffect(() => {
    if (selectedPeriodKm === null || !brandId || !modelId) {
      setServiceTypes([]); setTemplateId(""); return
    }
    getServiceTypes(brandId, modelId, subModelId || undefined, selectedPeriodKm).then(types => {
      setServiceTypes(types)
      const pTemplateId = pending.current.templateId
      if (pTemplateId && types.some(t => t.id === pTemplateId)) {
        setTemplateId(pTemplateId)
        pending.current.templateId = "" // tüketildi
      } else if (types.length === 1) {
        setTemplateId(types[0].id)
      } else {
        setTemplateId("")
      }
    })
  }, [selectedPeriodKm, brandId, modelId, subModelId])

  function handlePeriodSelect(periodKm: number) {
    pending.current.templateId = "" // el ile seçim, pending'i temizle
    setSelectedPeriodKm(prev => prev === periodKm ? null : periodKm)
  }

  async function handleCreate() {
    if (!brandId || !modelId || !templateId) {
      toast({ title: "Hata", description: "Lütfen tüm seçimleri tamamlayın.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const quote = await createQuoteFromTemplate({
        brandId, modelId,
        subModelId: subModelId || undefined,
        templateId,
        customerName:  customerName  || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        plateNo:       plateNo       || undefined,
      })
      toast({ title: "Teklif Oluşturuldu", description: `Teklif No: ${quote.quoteNo}` })
      router.push(`/dashboard/quotes/${quote.id}`)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const regularPeriods = periods.filter(p => p.periodKm !== 0)
  const hizliServis    = periods.find(p => p.periodKm === 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-emerald-500" />
          Yeni Teklif Oluştur
        </h1>
        <p className="text-muted-foreground">Araç ve bakım periyodu seçerek otomatik reçete oluşturun.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Araç Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-orange-500" />
              Araç Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Marka *</Label>
              <Select value={brandId} onValueChange={handleBrandChange}>
                <SelectTrigger><SelectValue placeholder="Marka seçin" /></SelectTrigger>
                <SelectContent>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model *</Label>
              <Select value={modelId} onValueChange={handleModelChange} disabled={!brandId}>
                <SelectTrigger>
                  <SelectValue placeholder={brandId ? "Model seçin" : "Önce marka seçin"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Alt Model / Motor Tipi {subModels.length > 0 && "*"}</Label>
              <Select
                value={subModelId}
                onValueChange={handleSubModelChange}
                disabled={!modelId || subModels.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !modelId ? "Önce model seçin" :
                    subModels.length === 0 ? "Alt model yok" :
                    "Alt model seçin"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {subModels.map(sm => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plaka</Label>
              <Input
                placeholder="34 ABC 123"
                value={plateNo}
                onChange={e => setPlateNo(e.target.value.toUpperCase())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Müşteri Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Müşteri Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Müşteri Adı</Label>
              <Input placeholder="Ad Soyad" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input placeholder="05XX XXX XX XX" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" placeholder="ornek@mail.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bakım Periyodu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-500" />
            Bakım Periyodu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!brandId || !modelId ? (
            <p className="text-sm text-muted-foreground text-center py-4">Lütfen önce marka ve model seçin.</p>
          ) : subModels.length > 0 && !subModelId ? (
            <p className="text-sm text-muted-foreground text-center py-4">Lütfen alt model / motor tipi seçin.</p>
          ) : periods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Bu araç için tanımlı bakım periyodu bulunamadı.</p>
          ) : (
            <div className="space-y-4">
              {hizliServis && (
                <button
                  onClick={() => handlePeriodSelect(0)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${
                    selectedPeriodKm === 0
                      ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                      : "border-border hover:border-green-300 hover:bg-green-50/50"
                  }`}
                >
                  <Zap className={`h-6 w-6 ${selectedPeriodKm === 0 ? "text-green-600" : "text-muted-foreground"}`} />
                  <div>
                    <div className="font-semibold text-lg">Hızlı Servis</div>
                    <div className="text-sm text-muted-foreground">Periyodik bakım dışı hızlı işlemler</div>
                  </div>
                </button>
              )}
              {regularPeriods.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {regularPeriods.map(p => (
                    <button
                      key={p.periodKm}
                      onClick={() => handlePeriodSelect(p.periodKm)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedPeriodKm === p.periodKm
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="font-semibold">
                        {p.periodKm ? `${p.periodKm.toLocaleString("tr-TR")} km` : ""}
                      </div>
                      {p.periodMonth && (
                        <div className="text-xs text-muted-foreground">{p.periodMonth} ay</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Servis Tipi */}
      {selectedPeriodKm !== null && serviceTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              Servis Tipi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPeriodKm === 0 ? (
              <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-700">Hızlı Servis</div>
                    <div className="text-sm text-green-600">Periyodik bakım dışı hızlı işlemler</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {serviceTypes.filter(st => st.serviceType !== "AGIR").map(st => {
                  const config = SERVICE_TYPE_CONFIG[st.serviceType || ""] || {
                    label: st.name || st.serviceType,
                    color: "border-gray-300",
                    icon: Wrench,
                    desc: "",
                  }
                  const Icon = config.icon
                  const isSelected = templateId === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => { pending.current.templateId = ""; setTemplateId(st.id) }}
                      className={`p-5 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? `${config.color} ring-2 ring-offset-1`
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${isSelected ? "" : "text-muted-foreground"}`} />
                        <div>
                          <div className="font-semibold text-lg">{config.label}</div>
                          <div className="text-sm opacity-75">{config.desc}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={handleCreate} disabled={loading || !templateId}>
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Oluşturuluyor...</>
          ) : (
            <><ArrowRight className="h-4 w-4 mr-2" /> Teklif Oluştur</>
          )}
        </Button>
      </div>
    </div>
  )
}
