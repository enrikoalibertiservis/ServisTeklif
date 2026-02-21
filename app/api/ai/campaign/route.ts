import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type CustomerProfile = {
  profileText?: string   // Yeni format: tüm profil tek okunabilir metin olarak gelir
  // Eski alanlar (geriye dönük uyumluluk)
  age?: number
  occupation?: string
  gender?: string
  vehiclePriceRange?: string
  additionalNote?: string
}

export type CampaignRequest = {
  profile: CustomerProfile
  grandTotal: number
  quoteId?: string
}

export type CampaignResponse = {
  score: number
  scoreLabel: string
  suggestedProducts: { name: string; description?: string; price?: number }[]
  message: string
  whatsappText: string
}

function buildPrompt(
  profile: CustomerProfile,
  grandTotal: number,
  products: { name: string; description: string | null; price: number; category: string | null }[]
): string {
  const productList = products
    .map(p => `- ${p.name}${p.category ? ` (${p.category})` : ""}${p.price > 0 ? `: ₺${p.price.toLocaleString("tr-TR")}` : ""}${p.description ? ` — ${p.description}` : ""}`)
    .join("\n")

  const profileSection = profile.profileText
    ? profile.profileText
    : [
        profile.vehiclePriceRange ? `Araç fiyat segmenti: ${profile.vehiclePriceRange}` : null,
        profile.age               ? `Tahmini yaş: ${profile.age}`                        : null,
        profile.occupation        ? `Meslek: ${profile.occupation}`                       : null,
        profile.gender            ? `Cinsiyet: ${profile.gender}`                         : null,
        profile.additionalNote    ? `Ek not: ${profile.additionalNote}`                   : null,
      ].filter(Boolean).join("\n")

  return `Sen bir otomotiv servis danışmanısın. Aşağıdaki müşteri profili ve oto koruma ürün listesine göre kişiselleştirilmiş satış fırsatı oluştur.

MÜŞTERİ & ARAÇ PROFİLİ:
${profileSection || "Bilgi girilmemiş"}

BAKIMDA ÖDENEN TUTAR: ₺${grandTotal.toLocaleString("tr-TR")}

SKOR HESAPLAMA KURALLARI:
- Araç fiyat segmenti en güçlü etkendir (2M+ → yüksek skor)
- Sıfır veya 1-2 yaş araç → koruma ihtiyacı yüksek → skor artı
- Günlük aktif kullanım → çok değerlendirme anlamına gelir → skor artı
- Şehir içi/ticari yoğun → kir ve çizik riski yüksek → skor artı
- Premium/kalite odaklı müşteri → satın alma ihtimali yüksek → skor artı
- Fiyat hassas müşteri → skor düşürür ama uygun fiyatlı ürün önerilebilir

OTO KORUMA ÜRÜNLERİ (mevcut liste):
${productList || "Ürün listesi boş"}

GÖREVIN:
1. Yukarıdaki kurallara göre 0-100 arası satın alma skoru belirle.
2. Müşteri profiline en uygun 1-2 oto koruma ürünü öner (listeden seç, profile göre eşleştir).
3. "Fırsatı kaçırma" hissi yaratan, samimi ve kısa (2-3 cümle) Türkçe kampanya metni yaz. Müşterinin profilini yansıt, jenerik olmasın.

YANIT FORMATI (sadece geçerli JSON, başka hiçbir şey yazma):
{
  "score": <0-100 arası sayı>,
  "suggestedProducts": [{"name": "<ürün adı>", "price": <fiyat sayı veya 0>}],
  "message": "<müşteriye yönelik kampanya metni>"
}`
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Çok Yüksek"
  if (score >= 60) return "Yüksek"
  if (score >= 40) return "Orta"
  if (score >= 20) return "Düşük"
  return "Çok Düşük"
}

async function callOllama(url: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  })
  if (!res.ok) throw new Error(`Ollama hatası: ${res.statusText}`)
  const data = await res.json()
  return data.response || ""
}

async function callOpenAI(apiUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI hatası: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini hatası: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic hatası: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ""
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body: CampaignRequest = await req.json()
  const { profile, grandTotal } = body

  // Load AI settings
  const settingsRaw = await prisma.appSetting.findMany({
    where: { key: { in: ["aiProvider", "aiModel", "aiApiUrl", "aiApiKey"] } },
  })
  const settings: Record<string, string> = {}
  settingsRaw.forEach(s => { settings[s.key] = s.value })

  const provider = settings.aiProvider || "none"
  if (provider === "none") {
    return NextResponse.json({ error: "AI sağlayıcı yapılandırılmamış. Lütfen Admin > Ayarlar > AI Ayarları bölümünden yapılandırın." }, { status: 400 })
  }

  // Load active products
  const products = await prisma.otoKorumaProduct.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  const prompt = buildPrompt(profile, grandTotal, products)

  let rawText = ""
  try {
    if (provider === "ollama") {
      rawText = await callOllama(settings.aiApiUrl || "http://localhost:11434", settings.aiModel || "llama3", prompt)
    } else if (provider === "openai") {
      rawText = await callOpenAI(settings.aiApiUrl || "https://api.openai.com/v1", settings.aiApiKey || "", settings.aiModel || "gpt-4o-mini", prompt)
    } else if (provider === "gemini") {
      rawText = await callGemini(settings.aiApiKey || "", settings.aiModel || "gemini-1.5-flash", prompt)
    } else if (provider === "anthropic") {
      rawText = await callAnthropic(settings.aiApiKey || "", settings.aiModel || "claude-3-haiku-20240307", prompt)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI servisine bağlanılamadı"
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Parse JSON from AI response
  let parsed: { score: number; suggestedProducts: { name: string; price?: number }[]; message: string }
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON bulunamadı")
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: `AI yanıtı ayrıştırılamadı: ${rawText.slice(0, 200)}` }, { status: 422 })
  }

  const score = Math.max(0, Math.min(100, Math.round(parsed.score || 0)))
  const scoreLabel = getScoreLabel(score)

  const suggestedProducts = (parsed.suggestedProducts || []).map(sp => {
    const match = products.find(p => p.name.toLowerCase().includes(sp.name.toLowerCase()) || sp.name.toLowerCase().includes(p.name.toLowerCase()))
    return {
      name: sp.name,
      description: match?.description || undefined,
      price: sp.price || match?.price || 0,
    }
  })

  const productLines = suggestedProducts.map(p =>
    `• ${p.name}${p.price ? ` (₺${p.price.toLocaleString("tr-TR")})` : ""}`
  ).join("\n")

  const whatsappText = `Sayın Müşterimiz,\n\n${parsed.message}\n\n${productLines ? `Önerilen Ürünler:\n${productLines}\n\n` : ""}Detaylı bilgi için bizi arayın. 🛡️`

  const response: CampaignResponse = {
    score,
    scoreLabel,
    suggestedProducts,
    message: parsed.message || "",
    whatsappText,
  }

  return NextResponse.json(response)
}
