"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, Bot, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const generalSettingLabels: Record<string, string> = {
  companyName: "Firma Adı",
  companyAddress: "Firma Adresi",
  companyPhone: "Firma Telefon",
  defaultTaxRate: "Varsayılan KDV Oranı (%)",
  defaultCurrency: "Varsayılan Para Birimi",
  quoteValidityDays: "Teklif Geçerlilik Süresi (gün)",
}

const AI_PROVIDERS = [
  { value: "none",      label: "— Devre Dışı —" },
  { value: "ollama",    label: "Ollama (Local)" },
  { value: "openai",    label: "OpenAI (GPT)" },
  { value: "gemini",    label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic (Claude)" },
]

const OPENAI_MODELS   = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]
const GEMINI_MODELS   = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
const ANTHROPIC_MODELS = [
  "claude-3-haiku-20240307",
  "claude-3-sonnet-20240229",
  "claude-3-opus-20240229",
  "claude-3-5-sonnet-20241022",
]

const DEFAULT_URLS: Record<string, string> = {
  ollama:    "http://localhost:11434",
  openai:    "https://api.openai.com/v1",
  gemini:    "https://generativelanguage.googleapis.com",
  anthropic: "https://api.anthropic.com",
}

const PROVIDER_COLORS: Record<string, string> = {
  ollama:    "bg-orange-50 border-orange-200",
  openai:    "bg-green-50 border-green-200",
  gemini:    "bg-blue-50 border-blue-200",
  anthropic: "bg-purple-50 border-purple-200",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

  // Ollama
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [ollamaConnected, setOllamaConnected] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((data: { key: string; value: string }[]) => {
      const map: Record<string, string> = {}
      data.forEach(s => { map[s.key] = s.value })
      setSettings(map)
    })
  }, [])

  function set(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function handleProviderChange(provider: string) {
    setSettings(prev => ({
      ...prev,
      aiProvider: provider,
      aiModel: "",
      aiApiUrl: DEFAULT_URLS[provider] || "",
      aiApiKey: prev.aiApiKey || "",
    }))
    setOllamaModels([])
    setOllamaConnected(false)
  }

  async function fetchOllamaModels() {
    const url = (settings.aiApiUrl || "http://localhost:11434").replace(/\/$/, "")
    setFetchingModels(true)
    setOllamaConnected(false)
    try {
      const res = await fetch(`/api/ai/ollama-models?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const models: string[] = data.models || []
      if (models.length === 0) throw new Error("Kurulu model bulunamadı")
      setOllamaModels(models)
      setOllamaConnected(true)
      if (!settings.aiModel) set("aiModel", models[0])
      toast({ title: `${models.length} Ollama modeli bulundu` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bağlantı hatası"
      toast({ title: "Ollama bağlantı hatası", description: msg, variant: "destructive" })
    } finally {
      setFetchingModels(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    toast({ title: "Ayarlar kaydedildi" })
  }

  const provider = settings.aiProvider || "none"

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-500" />
          Uygulama Ayarları
        </h1>
        <p className="text-muted-foreground">Genel uygulama parametrelerini düzenleyin.</p>
      </div>

      {/* Genel Ayarlar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Genel Ayarlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          {Object.entries(generalSettingLabels).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input value={settings[key] || ""} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            AI Fırsat Paneli Ayarları
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Teklif sayfasındaki AI Fırsat Paneli için yapay zeka servisini yapılandırın.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">

          {/* Provider Seçimi */}
          <div className="space-y-2">
            <Label>AI Sağlayıcı</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── OLLAMA ── */}
          {provider === "ollama" && (
            <div className={`space-y-4 rounded-lg border p-4 ${PROVIDER_COLORS.ollama}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">Ollama Local</Badge>
                {ollamaConnected && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Bağlı
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ollama URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.aiApiUrl || "http://localhost:11434"}
                    onChange={e => set("aiApiUrl", e.target.value)}
                    placeholder="http://localhost:11434"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchOllamaModels}
                    disabled={fetchingModels}
                    className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${fetchingModels ? "animate-spin" : ""}`} />
                    {fetchingModels ? "Bağlanıyor..." : "Modelleri Getir"}
                  </Button>
                </div>
                <p className="text-xs text-amber-700">
                  Ollama sadece local veya self-hosted ortamda çalışır. Vercel'de OpenAI / Gemini kullanın.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                {ollamaModels.length > 0 ? (
                  <Select value={settings.aiModel || ollamaModels[0]} onValueChange={v => set("aiModel", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Model seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={settings.aiModel || ""}
                    onChange={e => set("aiModel", e.target.value)}
                    placeholder="Önce 'Modelleri Getir' butonuna basın"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Ollama'da yüklü modeller. "Modelleri Getir" ile otomatik listele.
                </p>
              </div>
            </div>
          )}

          {/* ── OPENAI ── */}
          {provider === "openai" && (
            <div className={`space-y-4 rounded-lg border p-4 ${PROVIDER_COLORS.openai}`}>
              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">OpenAI</Badge>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.aiApiKey || ""}
                    onChange={e => set("aiApiKey", e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">platform.openai.com → API Keys</p>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={settings.aiModel || "gpt-4o-mini"} onValueChange={v => set("aiModel", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  gpt-4o-mini ucuz ve hızlı, gpt-4o daha yetenekli.
                </p>
              </div>
            </div>
          )}

          {/* ── GEMINI ── */}
          {provider === "gemini" && (
            <div className={`space-y-4 rounded-lg border p-4 ${PROVIDER_COLORS.gemini}`}>
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">Google Gemini</Badge>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.aiApiKey || ""}
                    onChange={e => set("aiApiKey", e.target.value)}
                    placeholder="AIza..."
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">aistudio.google.com → Get API Key</p>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={settings.aiModel || "gemini-1.5-flash"} onValueChange={v => set("aiModel", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  gemini-1.5-flash hızlı ve ücretsiz, gemini-1.5-pro daha güçlü.
                </p>
              </div>
            </div>
          )}

          {/* ── ANTHROPIC ── */}
          {provider === "anthropic" && (
            <div className={`space-y-4 rounded-lg border p-4 ${PROVIDER_COLORS.anthropic}`}>
              <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">Anthropic Claude</Badge>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.aiApiKey || ""}
                    onChange={e => set("aiApiKey", e.target.value)}
                    placeholder="sk-ant-..."
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">console.anthropic.com → API Keys</p>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={settings.aiModel || "claude-3-haiku-20240307"} onValueChange={v => set("aiModel", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANTHROPIC_MODELS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  haiku hızlı ve uygun maliyetli, sonnet / opus daha gelişmiş.
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
      </Button>
    </div>
  )
}
