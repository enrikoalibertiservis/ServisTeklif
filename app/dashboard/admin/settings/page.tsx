"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, Bot, Eye, EyeOff } from "lucide-react"
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
  { value: "none", label: "— Devre Dışı —" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "anthropic", label: "Anthropic (Claude)" },
]

const DEFAULT_MODELS: Record<string, string> = {
  ollama: "llama3",
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  anthropic: "claude-3-haiku-20240307",
}

const DEFAULT_URLS: Record<string, string> = {
  ollama: "http://localhost:11434",
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com",
  anthropic: "https://api.anthropic.com",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

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
    set("aiProvider", provider)
    if (provider !== "none") {
      if (!settings.aiModel) set("aiModel", DEFAULT_MODELS[provider] || "")
      if (!settings.aiApiUrl) set("aiApiUrl", DEFAULT_URLS[provider] || "")
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
              <Input
                value={settings[key] || ""}
                onChange={(e) => set(key, e.target.value)}
              />
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
            Teklif sayfasındaki AI Fırsat Paneli için kullanılacak yapay zeka servisini yapılandırın.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
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

          {provider !== "none" && (
            <>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={settings.aiModel || DEFAULT_MODELS[provider] || ""}
                  onChange={e => set("aiModel", e.target.value)}
                  placeholder={DEFAULT_MODELS[provider] || "model adı"}
                />
                <p className="text-xs text-muted-foreground">
                  {provider === "ollama" && "Ollama'da kurulu model adı (ör. llama3, mistral, gemma2)"}
                  {provider === "openai" && "OpenAI model adı (ör. gpt-4o-mini, gpt-4o)"}
                  {provider === "gemini" && "Gemini model adı (ör. gemini-1.5-flash, gemini-1.5-pro)"}
                  {provider === "anthropic" && "Claude model adı (ör. claude-3-haiku-20240307)"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>API URL</Label>
                <Input
                  value={settings.aiApiUrl || DEFAULT_URLS[provider] || ""}
                  onChange={e => set("aiApiUrl", e.target.value)}
                  placeholder={DEFAULT_URLS[provider] || "https://..."}
                />
                {provider === "ollama" && (
                  <p className="text-xs text-amber-600">
                    Ollama sadece local veya self-hosted ortamda çalışır. Vercel deployment'ında OpenAI/Gemini kullanın.
                  </p>
                )}
              </div>

              {provider !== "ollama" && (
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
                    <button
                      type="button"
                      onClick={() => setShowApiKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API anahtarı şifreli olarak saklanır ve sadece sunucu tarafında kullanılır.
                  </p>
                </div>
              )}
            </>
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
