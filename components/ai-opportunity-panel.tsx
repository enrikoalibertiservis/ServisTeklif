"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  age: string
  occupation: string
  gender: string
  vehiclePriceRange: string
  additionalNote: string
}

const EMPTY_PROFILE: Profile = {
  age: "",
  occupation: "",
  gender: "other",
  vehiclePriceRange: "mid",
  additionalNote: "",
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-emerald-400" :
    score >= 40 ? "bg-yellow-500" :
    score >= 20 ? "bg-orange-500" : "bg-red-500"

  return (
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
            className={cn(
              score >= 80 ? "text-green-500" :
              score >= 60 ? "text-emerald-400" :
              score >= 40 ? "text-yellow-500" :
              score >= 20 ? "text-orange-500" : "text-red-500"
            )}
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
      </div>
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

  function set(key: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

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
            age: profile.age ? parseInt(profile.age) : undefined,
            occupation: profile.occupation || undefined,
            gender: profile.gender || undefined,
            vehiclePriceRange: profile.vehiclePriceRange || undefined,
            additionalNote: profile.additionalNote || undefined,
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
            <span className="text-xs text-muted-foreground">
              {expanded ? "Kapat" : "Kampanya Oluştur"}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        {!expanded && campaignResult && (
          <div className="mt-2 flex items-center gap-3">
            <ScoreBadge score={campaignResult.score} label={campaignResult.scoreLabel} />
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{campaignResult.message}</p>
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Müşteri Profili */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Müşteri Profili
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tahmini Yaş</Label>
                <Input
                  type="number"
                  min="18"
                  max="99"
                  placeholder="ör. 42"
                  value={profile.age}
                  onChange={e => set("age", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meslek</Label>
                <Input
                  placeholder="ör. doktor, esnaf..."
                  value={profile.occupation}
                  onChange={e => set("occupation", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cinsiyet</Label>
                <Select value={profile.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Erkek</SelectItem>
                    <SelectItem value="female">Kadın</SelectItem>
                    <SelectItem value="other">Belirtilmedi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Araç Fiyat Segmenti</Label>
                <Select value={profile.vehiclePriceRange} onValueChange={v => set("vehiclePriceRange", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Ekonomik (&lt;500K TL)</SelectItem>
                    <SelectItem value="mid">Orta (500K-1M TL)</SelectItem>
                    <SelectItem value="premium">Premium (1M-2M TL)</SelectItem>
                    <SelectItem value="luxury">Lüks (2M+ TL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ek Not (opsiyonel)</Label>
              <Input
                placeholder="ör. yeni araç aldı, temiz araç tutar, ilk gelişi..."
                value={profile.additionalNote}
                onChange={e => set("additionalNote", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Üret Butonu */}
          <Button
            onClick={generate}
            disabled={loading}
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
          {campaignResult && (
            <div className="space-y-4 rounded-xl border border-purple-200 bg-white/70 p-4">
              {/* Score */}
              <ScoreBadge score={campaignResult.score} label={campaignResult.scoreLabel} />

              {/* Önerilen Ürünler */}
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

              {/* Kampanya Mesajı */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                    Kampanya Metni
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground"
                    onClick={copyMessage}
                  >
                    {copiedMsg ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedMsg ? "Kopyalandı" : "Kopyala"}
                  </Button>
                </div>
                <div className="rounded-lg border bg-purple-50/50 p-3 text-sm text-gray-700 leading-relaxed">
                  {campaignResult.message}
                </div>
              </div>

              {/* PDF ve WhatsApp */}
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
                    PDF'e Ekle
                  </label>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
