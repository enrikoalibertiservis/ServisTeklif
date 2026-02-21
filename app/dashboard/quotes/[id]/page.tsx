"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import {
  getQuote, updateQuoteDiscount, updateQuoteCustomer, addQuoteItem,
  removeQuoteItem, updateQuoteItem, searchParts, searchLabor, finalizeQuote,
} from "@/app/actions/quote"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Trash2, Plus, Search, FileDown, FileSpreadsheet, Save, Check, Loader2, Pencil, User, Clock, PenLine, X } from "lucide-react"
import { PartSearchDialog } from "@/components/part-search-dialog"
import { exportQuotePdf, exportQuoteExcel } from "@/lib/export"
import { AIOpportunityPanel } from "@/components/ai-opportunity-panel"
import type { CampaignResponse } from "@/app/api/ai/campaign/route"

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchType, setSearchType] = useState<"PART" | "LABOR">("PART")
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [discountType, setDiscountType] = useState<string>("")
  const [discountValue, setDiscountValue] = useState("")

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [plateNo, setPlateNo] = useState("")
  const [notes, setNotes] = useState("")

  // Manuel parça ekleme formu
  const [manualPartOpen, setManualPartOpen] = useState(false)
  const [mPartNo, setMPartNo]     = useState("")
  const [mPartName, setMPartName] = useState("")
  const [mPartPrice, setMPartPrice] = useState("")
  const [mPartQty, setMPartQty]   = useState("1")
  const [mPartSaving, setMPartSaving] = useState(false)

  // AI Fırsat Paneli
  const [campaignResult, setCampaignResult] = useState<CampaignResponse | null>(null)
  const [includeCampaignInPdf, setIncludeCampaignInPdf] = useState(false)

  // Manuel işçilik ekleme formu
  const [manualLaborOpen, setManualLaborOpen] = useState(false)
  const [mLaborCode, setMLaborCode]   = useState("")
  const [mLaborName, setMLaborName]   = useState("")
  const [mLaborHours, setMLaborHours] = useState("")
  const [mLaborRate, setMLaborRate]   = useState("")
  const [mLaborSaving, setMLaborSaving] = useState(false)

  const loadQuote = useCallback(async () => {
    const q = await getQuote(params.id as string)
    if (!q) {
      router.push("/dashboard/quotes")
      return
    }
    setQuote(q)
    setDiscountType(q.discountType || "")
    setDiscountValue(q.discountValue?.toString() || "0")
    setCustomerName(q.customerName || "")
    setCustomerPhone(q.customerPhone || "")
    setCustomerEmail(q.customerEmail || "")
    setPlateNo(q.plateNo || "")
    setNotes(q.notes || "")
    setLoading(false)
  }, [params.id, router])

  useEffect(() => {
    loadQuote()
  }, [loadQuote])

  async function handleDiscountSave() {
    setSaving(true)
    await updateQuoteDiscount(quote.id, discountType || null, parseFloat(discountValue) || 0)
    await loadQuote()
    setSaving(false)
    toast({ title: "İskonto güncellendi" })
  }

  async function handleCustomerSave() {
    setSaving(true)
    await updateQuoteCustomer(quote.id, { customerName, customerPhone, customerEmail, plateNo, notes })
    await loadQuote()
    setSaving(false)
    setEditingCustomer(false)
    toast({ title: "Müşteri bilgileri güncellendi" })
  }

  async function handleRemoveItem(itemId: string) {
    await removeQuoteItem(itemId, quote.id)
    await loadQuote()
  }

  async function handleQuantityChange(itemId: string, newQty: number) {
    if (newQty <= 0) return
    await updateQuoteItem(itemId, quote.id, { quantity: newQty })
    await loadQuote()
  }

  async function handleDiscountPctChange(itemId: string, pct: number) {
    const val = Math.min(100, Math.max(0, pct))
    await updateQuoteItem(itemId, quote.id, { discountPct: val })
    await loadQuote()
  }

  async function handleAddItem(item: any) {
    await addQuoteItem(quote.id, item)
    await loadQuote()
    setSearchOpen(false)
    toast({ title: "Kalem eklendi", description: item.name })
  }

  async function handleManualPartAdd() {
    const unitPrice = parseFloat(mPartPrice.replace(",", "."))
    const qty = parseInt(mPartQty) || 1
    if (!mPartName.trim() || isNaN(unitPrice) || unitPrice <= 0) {
      toast({ title: "Hata", description: "Parça adı ve fiyat zorunludur.", variant: "destructive" })
      return
    }
    setMPartSaving(true)
    await addQuoteItem(quote.id, {
      itemType: "PART",
      referenceCode: mPartNo.trim() || "MANUEL",
      name: mPartName.trim(),
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
    })
    await loadQuote()
    setMPartSaving(false)
    setManualPartOpen(false)
    setMPartNo(""); setMPartName(""); setMPartPrice(""); setMPartQty("1")
    toast({ title: "Parça eklendi", description: mPartName.trim() })
  }

  async function handleManualLaborAdd() {
    const hours = parseFloat(mLaborHours.replace(",", "."))
    const rate  = parseFloat(mLaborRate.replace(",", "."))
    if (!mLaborName.trim() || isNaN(hours) || hours <= 0 || isNaN(rate) || rate <= 0) {
      toast({ title: "Hata", description: "İşlem adı, süre ve saat ücreti zorunludur.", variant: "destructive" })
      return
    }
    setMLaborSaving(true)
    await addQuoteItem(quote.id, {
      itemType: "LABOR",
      referenceCode: mLaborCode.trim() || "MANUEL",
      name: mLaborName.trim(),
      quantity: 1,
      unitPrice: rate,
      totalPrice: hours * rate,
      durationHours: hours,
      hourlyRate: rate,
    })
    await loadQuote()
    setMLaborSaving(false)
    setManualLaborOpen(false)
    setMLaborCode(""); setMLaborName(""); setMLaborHours(""); setMLaborRate("")
    toast({ title: "İşçilik eklendi", description: mLaborName.trim() })
  }

  async function handleFinalize() {
    await finalizeQuote(quote.id)
    await loadQuote()
    toast({ title: "Teklif kesinleştirildi" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!quote) return null

  const partItems = quote.items.filter((i: any) => i.itemType === "PART")
  const laborItems = quote.items.filter((i: any) => i.itemType === "LABOR")
  const isDraft = quote.status === "DRAFT"

  return (
    <div className="space-y-5">
      {/* ── Başlık ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{quote.quoteNo}</h1>
            <Badge variant={quote.status === "FINALIZED" ? "default" : "secondary"} className="text-xs">
              {quote.status === "DRAFT" ? "Taslak" : quote.status === "FINALIZED" ? "Kesinleşmiş" : "İptal"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quote.brandName} {quote.modelName} {quote.subModelName || ""} &middot;
            {quote.periodKm ? ` ${quote.periodKm.toLocaleString("tr-TR")} km` : ""}
            {quote.periodMonth ? ` ${quote.periodMonth} ay` : ""} bakım
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {quote.createdBy?.name ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(quote.createdAt).toLocaleDateString("tr-TR", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })}
              {" "}
              {new Date(quote.createdAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost" size="sm"
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            onClick={() => exportQuoteExcel(quote)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try { await exportQuotePdf(quote, includeCampaignInPdf && campaignResult ? { ...campaignResult, grandTotal: quote.grandTotal } : null) }
              catch (err: any) { toast({ title: "PDF hatası", description: err.message, variant: "destructive" }) }
              finally { setExporting(false) }
            }}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" />}
            {exporting ? "Hazırlanıyor..." : "PDF"}
          </Button>
          {isDraft && (
            <Button size="sm" onClick={handleFinalize}>
              <Check className="h-4 w-4 mr-1.5" />
              Kesinleştir
            </Button>
          )}
        </div>
      </div>

      {/* ── Müşteri / Araç ───────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm font-semibold">Müşteri / Araç Bilgileri</CardTitle>
          {isDraft && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCustomer(!editingCustomer)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {editingCustomer ? "İptal" : "Düzenle"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {editingCustomer ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1"><Label className="text-xs">Müşteri Adı</Label><Input className="h-8 text-sm" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input className="h-8 text-sm" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">E-posta</Label><Input className="h-8 text-sm" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Plaka</Label><Input className="h-8 text-sm" value={plateNo} onChange={e => setPlateNo(e.target.value.toUpperCase())} /></div>
              <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Not</Label><Input className="h-8 text-sm" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              <div className="sm:col-span-3">
                <Button size="sm" onClick={handleCustomerSave} disabled={saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Müşteri: </span>{quote.customerName || "-"}</div>
              <div><span className="text-muted-foreground text-xs">Telefon: </span>{quote.customerPhone || "-"}</div>
              <div><span className="text-muted-foreground text-xs">E-posta: </span>{quote.customerEmail || "-"}</div>
              <div><span className="text-muted-foreground text-xs">Plaka: </span>{quote.plateNo || "-"}</div>
              <div><span className="text-muted-foreground text-xs">Danışman: </span>{quote.createdBy.name}</div>
              <div><span className="text-muted-foreground text-xs">Tarih: </span>{new Date(quote.createdAt).toLocaleDateString("tr-TR")} {new Date(quote.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
              {quote.notes && <div className="sm:col-span-3"><span className="text-muted-foreground text-xs">Not: </span>{quote.notes}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Parçalar ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5 flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Parçalar</CardTitle>
          {isDraft && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSearchType("PART"); setSearchOpen(true) }}>
                <Search className="h-3.5 w-3.5 mr-1" /> Listeden Ekle
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                onClick={() => setManualPartOpen(o => !o)}>
                <PenLine className="h-3.5 w-3.5 mr-1" /> Manuel Ekle
              </Button>
            </div>
          )}
        </CardHeader>
        {isDraft && manualPartOpen && (
          <div className="mx-5 mb-4 rounded-lg border border-cyan-200 bg-cyan-50/60 p-4">
            <p className="text-xs font-semibold text-cyan-800 mb-3 uppercase tracking-wide">Manuel Parça Ekle</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Parça Kodu <span className="text-slate-400">(opsiyonel)</span></Label>
                <Input className="h-8 text-sm" placeholder="55282942" value={mPartNo} onChange={e => setMPartNo(e.target.value)} />
              </div>
              <div className="sm:col-span-1 space-y-1">
                <Label className="text-xs">Parça Adı <span className="text-red-400">*</span></Label>
                <Input className="h-8 text-sm" placeholder="Motor Yağı Filtresi" value={mPartName} onChange={e => setMPartName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Birim Fiyat (TL) <span className="text-red-400">*</span></Label>
                <Input className="h-8 text-sm" placeholder="185.00" value={mPartPrice} onChange={e => setMPartPrice(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adet</Label>
                <Input type="number" min="1" className="h-8 text-sm" value={mPartQty} onChange={e => setMPartQty(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 text-sm bg-cyan-600 hover:bg-cyan-700" onClick={handleManualPartAdd} disabled={mPartSaving}>
                {mPartSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Ekle
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={() => setManualPartOpen(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> İptal
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-5">#</TableHead>
                <TableHead>Parça No</TableHead>
                <TableHead>Parça Adı</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead className="text-center w-20">Adet</TableHead>
                <TableHead className="text-center w-28">İskonto %</TableHead>
                <TableHead className="text-right pr-5">Toplam</TableHead>
                {isDraft && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {partItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Parça kalemi yok
                  </TableCell>
                </TableRow>
              ) : partItems.map((item: any, idx: number) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground pl-5">{idx + 1}</TableCell>
                  <TableCell className="text-muted-foreground">{item.referenceCode}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-center">
                    {isDraft ? (
                      <Input
                        type="number" min="1"
                        className="w-16 text-center mx-auto h-7 text-sm"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      />
                    ) : item.quantity}
                  </TableCell>
                  <TableCell className="text-center">
                    {isDraft ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number" min="0" max="100" step="0.5"
                          className="w-16 text-center h-7 text-sm"
                          defaultValue={item.discountPct ?? 0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (val !== (item.discountPct ?? 0)) handleDiscountPctChange(item.id, val)
                          }}
                        />
                        <span className="text-muted-foreground text-xs">%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">
                        {item.discountPct > 0 ? `%${item.discountPct}` : "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <div className="font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</div>
                    {item.discountPct > 0 && (
                      <div className="text-xs text-emerald-600 tabular-nums">
                        -{formatCurrency(item.discountAmount)}
                      </div>
                    )}
                  </TableCell>
                  {isDraft && (
                    <TableCell className="pr-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={isDraft ? 6 : 5} className="text-right text-sm pl-5">Parça Toplamı</TableCell>
                <TableCell className="text-right font-semibold tabular-nums pr-5">{formatCurrency(quote.partsSubtotal)}</TableCell>
                {isDraft && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* ── İşçilik ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5 flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">İşçilik</CardTitle>
          {isDraft && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSearchType("LABOR"); setSearchOpen(true) }}>
                <Search className="h-3.5 w-3.5 mr-1" /> Listeden Ekle
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => setManualLaborOpen(o => !o)}>
                <PenLine className="h-3.5 w-3.5 mr-1" /> Manuel Ekle
              </Button>
            </div>
          )}
        </CardHeader>
        {isDraft && manualLaborOpen && (
          <div className="mx-5 mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold text-amber-800 mb-3 uppercase tracking-wide">Manuel İşçilik Ekle</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">İşlem Kodu <span className="text-slate-400">(opsiyonel)</span></Label>
                <Input className="h-8 text-sm" placeholder="LBR-001" value={mLaborCode} onChange={e => setMLaborCode(e.target.value)} />
              </div>
              <div className="sm:col-span-1 space-y-1">
                <Label className="text-xs">İşlem Adı <span className="text-red-400">*</span></Label>
                <Input className="h-8 text-sm" placeholder="Motor Yağı Değişimi" value={mLaborName} onChange={e => setMLaborName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Süre (saat) <span className="text-red-400">*</span></Label>
                <Input className="h-8 text-sm" placeholder="0.50" value={mLaborHours} onChange={e => setMLaborHours(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Saat Ücreti (TL) <span className="text-red-400">*</span></Label>
                <Input className="h-8 text-sm" placeholder="5125" value={mLaborRate} onChange={e => setMLaborRate(e.target.value)} />
              </div>
            </div>
            {mLaborHours && mLaborRate && !isNaN(parseFloat(mLaborHours)) && !isNaN(parseFloat(mLaborRate)) && (
              <p className="text-xs text-amber-700 mt-2 font-medium">
                Toplam: {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(parseFloat(mLaborHours) * parseFloat(mLaborRate))}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-8 text-sm bg-amber-600 hover:bg-amber-700" onClick={handleManualLaborAdd} disabled={mLaborSaving}>
                {mLaborSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Ekle
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-sm" onClick={() => setManualLaborOpen(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> İptal
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-5">#</TableHead>
                <TableHead>Operasyon Kodu</TableHead>
                <TableHead>Operasyon Adı</TableHead>
                <TableHead className="text-right">Süre (saat)</TableHead>
                <TableHead className="text-right">Saat Ücreti</TableHead>
                <TableHead className="text-center w-28">İskonto %</TableHead>
                <TableHead className="text-right pr-5">Toplam</TableHead>
                {isDraft && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft ? 8 : 7} className="text-center text-muted-foreground py-8">
                    İşçilik kalemi yok
                  </TableCell>
                </TableRow>
              ) : laborItems.map((item: any, idx: number) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground pl-5">{idx + 1}</TableCell>
                  <TableCell className="text-muted-foreground">{item.referenceCode}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.durationHours?.toFixed(2) || "-"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.hourlyRate || 0)}</TableCell>
                  <TableCell className="text-center">
                    {isDraft ? (
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number" min="0" max="100" step="0.5"
                          className="w-16 text-center h-7 text-sm"
                          defaultValue={item.discountPct ?? 0}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            if (val !== (item.discountPct ?? 0)) handleDiscountPctChange(item.id, val)
                          }}
                        />
                        <span className="text-muted-foreground text-xs">%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">
                        {item.discountPct > 0 ? `%${item.discountPct}` : "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <div className="font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</div>
                    {item.discountPct > 0 && (
                      <div className="text-xs text-emerald-600 tabular-nums">
                        -{formatCurrency(item.discountAmount)}
                      </div>
                    )}
                  </TableCell>
                  {isDraft && (
                    <TableCell className="pr-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={isDraft ? 6 : 5} className="text-right text-sm pl-5">İşçilik Toplamı</TableCell>
                <TableCell className="text-right font-semibold tabular-nums pr-5">{formatCurrency(quote.laborSubtotal)}</TableCell>
                {isDraft && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* ── Toplamlar ────────────────────────────────────────── */}
      <Card>
        <CardContent className="px-5 py-4">
          <div className="max-w-sm ml-auto space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parça Toplamı</span>
              <span className="tabular-nums">{formatCurrency(quote.partsSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">İşçilik Toplamı</span>
              <span className="tabular-nums">{formatCurrency(quote.laborSubtotal)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Ara Toplam</span>
              <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
            </div>

            {isDraft && (
              <div className="flex items-end gap-2 border rounded-lg p-3 bg-muted/30 mt-1">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">İskonto Tipi</Label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Yok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Yok</SelectItem>
                      <SelectItem value="PERCENT">Yüzde (%)</SelectItem>
                      <SelectItem value="AMOUNT">Tutar (TL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {discountType && discountType !== "NONE" && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">
                      {discountType === "PERCENT" ? "İskonto %" : "İskonto Tutar"}
                    </Label>
                    <Input
                      type="number" className="h-8 text-sm"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      min="0" step={discountType === "PERCENT" ? "0.5" : "1"}
                    />
                  </div>
                )}
                <Button size="sm" className="h-8 text-sm" onClick={handleDiscountSave} disabled={saving}>
                  Uygula
                </Button>
              </div>
            )}

            {quote.discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>İskonto{quote.discountType === "PERCENT" ? ` (%${quote.discountValue})` : ""}</span>
                <span className="tabular-nums">-{formatCurrency(quote.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">KDV (%{quote.taxRate})</span>
              <span className="tabular-nums">{formatCurrency(quote.taxAmount)}</span>
            </div>

            <div className="flex justify-between font-bold text-base border-t pt-2.5">
              <span>Genel Toplam</span>
              <span className="text-primary tabular-nums">{formatCurrency(quote.grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Fırsat Paneli ───────────────────────────────────── */}
      <AIOpportunityPanel
        quoteId={quote.id}
        grandTotal={quote.grandTotal}
        campaignResult={campaignResult}
        onCampaignResult={setCampaignResult}
        includeCampaignInPdf={includeCampaignInPdf}
        onIncludePdfChange={setIncludeCampaignInPdf}
      />

      <PartSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchType={searchType}
        brandName={quote.brandName}
        onAdd={handleAddItem}
      />
    </div>
  )
}
