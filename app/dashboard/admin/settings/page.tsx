"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save } from "lucide-react"

const settingLabels: Record<string, string> = {
  companyName: "Firma Adı",
  companyAddress: "Firma Adresi",
  companyPhone: "Firma Telefon",
  defaultTaxRate: "Varsayılan KDV Oranı (%)",
  defaultCurrency: "Varsayılan Para Birimi",
  quoteValidityDays: "Teklif Geçerlilik Süresi (gün)",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((data: any[]) => {
      const map: Record<string, string> = {}
      data.forEach(s => { map[s.key] = s.value })
      setSettings(map)
    })
  }, [])

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-500" />
          Uygulama Ayarları
        </h1>
        <p className="text-muted-foreground">Genel uygulama parametrelerini düzenleyin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            Genel Ayarlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          {Object.entries(settingLabels).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={settings[key] || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
