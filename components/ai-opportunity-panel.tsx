"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
  MessageSquare,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CampaignResponse } from "@/app/api/ai/campaign/route"

interface AIOpportunityPanelProps {
  quoteId?: string
  grandTotal: number
  includeCampaignInPdf?: boolean
  campaignResult?: CampaignResponse | null
  onCampaignResult?: (result: CampaignResponse | null) => void
  onIncludePdfChange?: (include: boolean) => void
}

type Profile = {
  vehiclePriceRange: string
  vehicleAge: string
  usageFrequency: string
  usageType: string
  decisionProfile: string
  additionalNote: string
}

const EMPTY_PROFILE: Profile = {
  vehiclePriceRange: "",
  vehicleAge: "",
  usageFrequency: "",
  usageType: "",
  decisionProfile: "",
  additionalNote: "",
}

const PROFILE_OPTIONS = {
  vehiclePriceRange: [
    { value: "0-500k",  label: "0 – 500K TL" },
    { value: "500k-1m", label: "500K – 1M TL" },
    { value: "1m-2m",   label: "1M – 2M TL" },
    { value: "2m+",     label: "2M+ TL" },
  ],
  vehicleAge: [
    { value: "0km",   label: "0 km (Sıfır)" },
    { value: "1-2y",  label: "1 – 2 Yıl" },
    { value: "3-5y",  label: "3 – 5 Yıl" },
    { value: "5y+",   label: "5 Yıl ve üzeri" },
  ],
  usageFrequency: [
    { value: "daily",   label: "Günlük aktif" },
    { value: "weekly",  label: "Haftalık" },
    { value: "rarely",  label: "Nadiren" },
  ],
  usageType: [
    { value: "city",        label: "Şehir içi" },
    { value: "highway",     label: "Uzun yol" },
    { value: "mixed",       label: "Karma" },
    { value: "commercial",  label: "Ticari yoğun" },
  ],
  decisionProfile: [
    { value: "price",    label: "Fiyat hassas" },
    { value: "balanced", label: "Dengeli" },
    { value: "quality",  label: "Kalite odaklı" },
    { value: "premium",  label: "Premium eğilimli" },
  ],
}

const FIELD_LABELS: Record<keyof Profile, string> = {
  vehiclePriceRange: "Araç Fiyat Segmenti",
  vehicleAge:        "Araç Yaşı",
  usageFrequency:    "Kullanım Yoğunluğu",
  usageType:         "Kullanım Tipi",
  decisionProfile:   "Müşteri Karar Profili",
  additionalNote:    "Ek Not",
}

type ScoreBreakdown = {
  vehiclePriceRange: number
  vehicleAge:        number
  usageFrequency:    number
  usageType:         number
  decisionProfile:   number
  additionalNote:    number
}

const BREAKDOWN_LABELS: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: "vehiclePriceRange", label: "Araç Fiyat Segmenti", max: 30 },
  { key: "vehicleAge",        label: "Araç Yaşı",           max: 20 },
  { key: "usageFrequency",    label: "Kullanım Yoğunluğu",  max: 15 },
  { key: "usageType",         label: "Kullanım Tipi",        max: 15 },
  { key: "decisionProfile",   label: "Karar Profili",        max: 15 },
  { key: "additionalNote",    label: "Ek Not",               max:  5 },
]

function ScoreBadge({
  score,
  label,
  breakdown,
}: {
  score: number
  label: string
  breakdown?: ScoreBreakdown
}) {
  const color =
    score >= 85 ? "bg-green-500" :
    score >= 65 ? "bg-emerald-500" :
    score >= 45 ? "bg-yellow-500" :
    score >= 25 ? "bg-orange-500" : "bg-red-500"

  const textColor =
    score >= 85 ? "text-green-500" :
    score >= 65 ? "text-emerald-500" :
    score >= 45 ? "text-yellow-500" :
    score >= 25 ? "text-orange-500" : "text-red-500"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
            <circle
              cx="18" cy="18" r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
              className={textColor}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {score}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Satın Alma Skoru</p>
          <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-white text-xs font-semibold mt-0.5", color)}>
            {label}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{score}/100 puan</p>
        </div>
      </div>

      {breakdown && (
        <div className="space-y-1.5 rounded-lg bg-muted/30 p-2.5">
          {BREAKDOWN_LABELS.map(({ key, label: lbl, max }) => {
            const val = breakdown[key]
            const pct = max > 0 ? (val / max) * 100 : 0
            return (
              <div key={key} className="flex items-center gap-2 text-[11px]">
                <span className="w-36 shrink-0 text-muted-foreground truncate">{lbl}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-orange-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right font-medium text-muted-foreground shrink-0">
                  {val}/{max}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


export function AIOpportunityPanel({
  quoteId,
  grandTotal,
  includeCampaignInPdf,
  campaignResult,
  onCampaignResult,
  onIncludePdfChange,
}: AIOpportunityPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedMsg, setCopiedMsg] = useState(false)

  function setField(key: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  const filledCount = Object.entries(profile)
    .filter(([k, v]) => k !== "additionalNote" && v !== "")
    .length
  const totalRequired = 5

  async function generate() {
    setLoading(true)
    setError(null)
    onCampaignResult?.(null)
    try {
      const res = await fetch("/api/ai/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            vehiclePriceRange: profile.vehiclePriceRange || undefined,
            vehicleAge:        profile.vehicleAge        || undefined,
            usageFrequency:    profile.usageFrequency    || undefined,
            usageType:         profile.usageType         || undefined,
            decisionProfile:   profile.decisionProfile   || undefined,
            additionalNote:    profile.additionalNote    || undefined,
          },
          grandTotal,
          quoteId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI hatası")
      onCampaignResult?.(data as CampaignResponse)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata")
    } finally {
      setLoading(false)
    }
  }

  async function copyWhatsApp() {
    if (!campaignResult) return
    await navigator.clipboard.writeText(campaignResult.whatsappText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyMessage() {
    if (!campaignResult) return
    await navigator.clipboard.writeText(campaignResult.message)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/60 to-indigo-50/40">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-purple-900">AI Fırsat Paneli</span>
            {campaignResult && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Hazır
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!expanded && filledCount > 0 && (
              <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                {filledCount}/{totalRequired}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {expanded ? "Kapat" : "Kampanya Oluştur"}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {!expanded && campaignResult && (
          <div className="mt-2 flex items-center gap-3">
            <ScoreBadge score={campaignResult.score} label={campaignResult.scoreLabel} />
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1 italic">{campaignResult.message}</p>
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Profil Alanları */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Müşteri &amp; Araç Profili
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Araç Fiyat Segmenti */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-800">
                  {FIELD_LABELS.vehiclePriceRange}
                  <span className="text-red-400 ml-0.5">*</span>
                </Label>
                <Select value={profile.vehiclePriceRange} onValueChange={v => setField("vehiclePriceRange", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.vehiclePriceRange.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Araç Yaşı */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-800">
                  {FIELD_LABELS.vehicleAge}
                  <span className="text-red-400 ml-0.5">*</span>
                </Label>
                <Select value={profile.vehicleAge} onValueChange={v => setField("vehicleAge", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.vehicleAge.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kullanım Yoğunluğu */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-800">
                  {FIELD_LABELS.usageFrequency}
                  <span className="text-red-400 ml-0.5">*</span>
                </Label>
                <Select value={profile.usageFrequency} onValueChange={v => setField("usageFrequency", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.usageFrequency.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kullanım Tipi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-800">
                  {FIELD_LABELS.usageType}
                  <span className="text-red-400 ml-0.5">*</span>
                </Label>
                <Select value={profile.usageType} onValueChange={v => setField("usageType", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.usageType.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Müşteri Karar Profili – tam genişlik, vurgulu */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                {FIELD_LABELS.decisionProfile}
                <span className="text-red-400">*</span>
                <span className="text-[10px] font-normal text-muted-foreground ml-1">— satış zekâsının temel sinyali</span>
              </Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PROFILE_OPTIONS.decisionProfile.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setField("decisionProfile", o.value)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all text-center",
                      profile.decisionProfile === o.value
                        ? "border-purple-500 bg-purple-100 text-purple-800"
                        : "border-muted-foreground/20 bg-background text-muted-foreground hover:border-purple-300 hover:bg-purple-50/50"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ek Not */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{FIELD_LABELS.additionalNote} (opsiyonel)</Label>
              <input
                type="text"
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                placeholder="ör. yeni araç aldı, çok titiz, ilk geliş, uzun süre kullanacak..."
                value={profile.additionalNote}
                onChange={e => setField("additionalNote", e.target.value)}
              />
            </div>

            {/* Doluluk göstergesi */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    filledCount >= 5 ? "bg-green-500" : filledCount >= 3 ? "bg-yellow-500" : "bg-orange-400"
                  )}
                  style={{ width: `${(filledCount / totalRequired) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {filledCount}/{totalRequired} alan dolu
              </span>
            </div>
          </div>

          {/* Üret Butonu */}
          <Button
            onClick={generate}
            disabled={loading || filledCount === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />AI Analiz Ediyor...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Skor Hesapla &amp; Kampanya Oluştur</>
            )}
          </Button>

          {/* Hata */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sonuç */}
          {campaignResult && (() => {
            const otoTotal = campaignResult.suggestedProducts.reduce((s, p) => s + (p.price ?? 0), 0)
            const genelTotal = grandTotal + otoTotal
            return (
            <div className="space-y-4 rounded-xl border border-purple-200 bg-white/70 p-4">
              {/* Tutar Özeti */}
              <div className="rounded-lg border border-purple-200 overflow-hidden text-sm">
                <div className="flex items-center justify-between px-4 py-2 bg-purple-50/60">
                  <span className="text-muted-foreground">Periyodik Bakım Tutarı</span>
                  <span className="font-medium text-gray-700">
                    ₺{grandTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {otoTotal > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 bg-teal-50/60 border-t border-purple-100">
                    <span className="text-muted-foreground">Oto Koruma Paketi</span>
                    <span className="font-medium text-teal-700">
                      ₺{otoTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 bg-purple-600 border-t border-purple-300">
                  <span className="text-white font-semibold">Genel Toplam</span>
                  <span className="text-white font-bold text-base">
                    ₺{genelTotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <ScoreBadge
                score={campaignResult.score}
                label={campaignResult.scoreLabel}
                breakdown={campaignResult.scoreBreakdown}
              />

              {campaignResult.suggestedProducts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-teal-500" />
                    Önerilen Oto Koruma Ürünleri
                  </p>
                  <div className="space-y-1.5">
                    {campaignResult.suggestedProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm">
                        <span className="font-medium text-teal-800">{p.name}</span>
                        {(p.price ?? 0) > 0 && (
                          <span className="text-teal-600 font-semibold">
                            ₺{(p.price ?? 0).toLocaleString("tr-TR")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                    Kampanya Metni
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={copyMessage}>
                    {copiedMsg ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedMsg ? "Kopyalandı" : "Kopyala"}
                  </Button>
                </div>
                <div className="rounded-lg border bg-purple-50/50 p-3 text-sm text-gray-700 leading-relaxed">
                  {campaignResult.message}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={copyWhatsApp}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Kopyalandı!" : "WhatsApp / SMS Metni"}
                </Button>

                {onIncludePdfChange && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={includeCampaignInPdf || false}
                      onChange={e => onIncludePdfChange(e.target.checked)}
                      className="rounded"
                    />
                    PDF&apos;e Ekle
                  </label>
                )}
              </div>
            </div>
          )
          })()}
        </CardContent>
      )}
    </Card>
  )
}
