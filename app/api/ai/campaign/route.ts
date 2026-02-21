import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type CustomerProfile = {
  // Yeni yapılandırılmış format
  vehiclePriceRange?: string  // "0-500k" | "500k-1m" | "1m-2m" | "2m+"
  vehicleAge?:        string  // "0km" | "1-2y" | "3-5y" | "5y+"
  usageFrequency?:    string  // "daily" | "weekly" | "rarely"
  usageType?:         string  // "city" | "highway" | "mixed" | "commercial"
  decisionProfile?:   string  // "price" | "balanced" | "quality" | "premium"
  additionalNote?:    string
  // Eski format (geriye dönük uyumluluk)
  profileText?: string
}

export type CampaignRequest = {
  profile: CustomerProfile
  grandTotal: number
  quoteId?: string
}

export type CampaignResponse = {
  score:             number
  scoreLabel:        string
  scoreBreakdown:    ScoreBreakdown
  suggestedProducts: { name: string; description?: string; price?: number }[]
  message:           string
  whatsappText:      string
}

type ScoreBreakdown = {
  vehiclePriceRange: number
  vehicleAge:        number
  usageFrequency:    number
  usageType:         number
  decisionProfile:   number
  additionalNote:    number
}

// ─── Deterministik Skor Hesaplama ────────────────────────────────────────────

const PRICE_SCORES: Record<string, number> = {
  "0-500k":  10,
  "500k-1m": 20,
  "1m-2m":   25,
  "2m+":     30,
}

const AGE_SCORES: Record<string, number> = {
  "0km":  20,
  "1-2y": 15,
  "3-5y":  8,
  "5y+":   5,
}

const FREQ_SCORES: Record<string, number> = {
  "daily":  15,
  "weekly":  8,
  "rarely":  5,
}

const TYPE_SCORES: Record<string, number> = {
  "commercial": 15,
  "highway":    12,
  "mixed":       8,
  "city":        5,
}

const DECISION_SCORES: Record<string, number> = {
  "premium":  15,
  "quality":  12,
  "balanced":  8,
  "price":     3,
}

// Ek Not: anahtar kelime tabanlı NLP sinyali (max 5)
function scoreNote(note: string | undefined): number {
  if (!note?.trim()) return 0
  const n = note.toLocaleLowerCase("tr-TR")
  const strongSignals = [
    "yeni araç", "sıfır araç", "titiz", "ilk geliş", "uzun süre",
    "koruma", "çok temiz", "hassas", "kaliteli", "özenli", "yeni aldı",
    "az kullanıyor", "az gidiyor",
  ]
  const negativeSignals = [
    "inceleyeceğim", "düşüneceğim", "sonra", "belki", "bakalım",
    "şimdilik hayır", "fiyat yüksek",
  ]
  if (negativeSignals.some(s => n.includes(s))) return 0
  if (strongSignals.some(s => n.includes(s))) return 5
  return 2  // nötr metin girmiş ama sinyalsiz
}

function calculateScore(profile: CustomerProfile): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    vehiclePriceRange: PRICE_SCORES[profile.vehiclePriceRange ?? ""]    ?? 0,
    vehicleAge:        AGE_SCORES[profile.vehicleAge ?? ""]              ?? 0,
    usageFrequency:    FREQ_SCORES[profile.usageFrequency ?? ""]         ?? 0,
    usageType:         TYPE_SCORES[profile.usageType ?? ""]              ?? 0,
    decisionProfile:   DECISION_SCORES[profile.decisionProfile ?? ""]    ?? 0,
    additionalNote:    scoreNote(profile.additionalNote),
  }
  const score = Math.min(
    100,
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  )
  return { score, breakdown }
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Çok Yüksek — Hemen Kapat"
  if (score >= 65) return "Yüksek — Güçlü Fırsat"
  if (score >= 45) return "Orta — Değerlendirilebilir"
  if (score >= 25) return "Düşük — Zayıf Sinyal"
  return "Çok Düşük"
}

// ─── Profil → Okunabilir Türkçe (AI promptu için) ────────────────────────────

const PRICE_LABELS:    Record<string, string> = { "0-500k": "0–500K TL", "500k-1m": "500K–1M TL", "1m-2m": "1M–2M TL", "2m+": "2M+ TL" }
const AGE_LABELS:      Record<string, string> = { "0km": "Sıfır araç (0 km)", "1-2y": "1–2 yıllık", "3-5y": "3–5 yıllık", "5y+": "5 yıl ve üzeri" }
const FREQ_LABELS:     Record<string, string> = { "daily": "Günlük aktif", "weekly": "Haftalık", "rarely": "Nadiren" }
const TYPE_LABELS:     Record<string, string> = { "city": "Şehir içi", "highway": "Uzun yol", "mixed": "Karma", "commercial": "Ticari yoğun" }
const DECISION_LABELS: Record<string, string> = { "price": "Fiyat hassas", "balanced": "Dengeli", "quality": "Kalite odaklı", "premium": "Premium eğilimli" }

function profileToText(profile: CustomerProfile): string {
  if (profile.profileText) return profile.profileText
  const lines = [
    profile.vehiclePriceRange && `Araç fiyat segmenti: ${PRICE_LABELS[profile.vehiclePriceRange]}`,
    profile.vehicleAge        && `Araç yaşı: ${AGE_LABELS[profile.vehicleAge]}`,
    profile.usageFrequency    && `Kullanım yoğunluğu: ${FREQ_LABELS[profile.usageFrequency]}`,
    profile.usageType         && `Kullanım tipi: ${TYPE_LABELS[profile.usageType]}`,
    profile.decisionProfile   && `Müşteri karar profili: ${DECISION_LABELS[profile.decisionProfile]}`,
    profile.additionalNote?.trim() && `Danışman notu: ${profile.additionalNote}`,
  ].filter(Boolean)
  return lines.join("\n")
}

// ─── AI Prompt — sadece satış metni + ürün paketi ─────────────────────────────

function buildPrompt(
  profile: CustomerProfile,
  score: number,
  scoreLabel: string,
  grandTotal: number,
  products: { name: string; description: string | null; price: number; category: string | null }[]
): string {
  const productList = products
    .map(p =>
      `- ${p.name}${p.category ? ` [${p.category}]` : ""}${p.price > 0 ? ` — ₺${p.price.toLocaleString("tr-TR")}` : ""}${p.description ? `: ${p.description}` : ""}`
    )
    .join("\n")

  return `Sen deneyimli bir otomotiv servis satış danışmanısın. Aşağıdaki müşteri profiline bakarak bir satış stratejisi oluştur.

MÜŞTERİ & ARAÇ PROFİLİ:
${profileToText(profile)}

SATIN ALMA SKORU: ${score}/100 — ${scoreLabel}
BAKIMDA ÖDENEN TUTAR: ₺${grandTotal.toLocaleString("tr-TR")}

MEVCUT OTO KORUMA ÜRÜNLERİ:
${productList || "(liste boş)"}

GÖREVIN:
1. Bu müşteri için listeden EN UYGUN 2-3 ürünü seç ve bir "paket" oluştur. Araç yaşı ve kullanım tipine göre eşleştir:
   - Sıfır/yeni araç + premium profil → seramik, PPF, cam su itici
   - Ticari/yoğun kullanım → motor temizliği, koltuk yıkama, plastik trim
   - Şehir içi + orta segment → cila, kil temizliği, ozon dezenfeksiyon
   - Fiyat hassas → en düşük fiyatlı ama değer yaratan 2 ürün
2. Danışmanın müşteriye YÜZ YÜZE söyleyeceği, 2-3 cümlelik FOMO (fırsatı kaçırma) hissi yaratan ikna edici Türkçe satış metni yaz.
   - Samimi, baskıcı değil ama net ol
   - Müşterinin durumuna özel bir detay içersin (araç yaşı, kullanım, segment)
   - "Bu fırsat bugünkü bakımla birlikte geçerli" veya benzeri bir aciliyet hissi ver
   - Müşteriye hitap et ama danışmanın ağzından çıkacak bir metin olsun

YANIT FORMATI (SADECE geçerli JSON, başka hiçbir şey yazma):
{
  "suggestedProducts": [
    {"name": "<ürün adı listeden>", "price": <fiyat sayı veya 0>},
    {"name": "<ürün adı listeden>", "price": <fiyat sayı veya 0>}
  ],
  "message": "<2-3 cümlelik satış metni>"
}`
}

// ─── AI Çağrıları ─────────────────────────────────────────────────────────────

async function callOllama(url: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`Ollama hatası: ${res.statusText}`)
  const data = await res.json()
  return data.response || ""
}

async function callOpenAI(apiUrl: string, apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI hatası: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  if (!res.ok) throw new Error(`Gemini hatası: ${res.status} ${await res.text()}`)
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
  if (!res.ok) throw new Error(`Anthropic hatası: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text || ""
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const body: CampaignRequest = await req.json()
  const { profile, grandTotal } = body

  // 1. Deterministik skor hesapla
  const { score, breakdown } = calculateScore(profile)
  const scoreLabel = getScoreLabel(score)

  // 2. AI ayarlarını yükle
  const settingsRaw = await prisma.appSetting.findMany({
    where: { key: { in: ["aiProvider", "aiModel", "aiApiUrl", "aiApiKey"] } },
  })
  const settings: Record<string, string> = {}
  settingsRaw.forEach(s => { settings[s.key] = s.value })

  const provider = settings.aiProvider || "none"
  if (provider === "none") {
    return NextResponse.json(
      { error: "AI sağlayıcı yapılandırılmamış. Admin > Ayarlar > AI Ayarları bölümünden yapılandırın." },
      { status: 400 }
    )
  }

  // 3. Aktif ürünleri yükle
  const products = await prisma.otoKorumaProduct.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  // 4. AI'dan sadece ürün seçimi + satış metni iste
  const prompt = buildPrompt(profile, score, scoreLabel, grandTotal, products)

  let rawText = ""
  try {
    if (provider === "ollama") {
      rawText = await callOllama(
        settings.aiApiUrl || "http://localhost:11434",
        settings.aiModel || "llama3",
        prompt
      )
    } else if (provider === "openai") {
      rawText = await callOpenAI(
        settings.aiApiUrl || "https://api.openai.com/v1",
        settings.aiApiKey || "",
        settings.aiModel || "gpt-4o-mini",
        prompt
      )
    } else if (provider === "gemini") {
      rawText = await callGemini(
        settings.aiApiKey || "",
        settings.aiModel || "gemini-1.5-flash",
        prompt
      )
    } else if (provider === "anthropic") {
      rawText = await callAnthropic(
        settings.aiApiKey || "",
        settings.aiModel || "claude-3-haiku-20240307",
        prompt
      )
    }
  } catch (e: unknown) {
    const rawMsg = e instanceof Error ? e.message : "AI servisine bağlanılamadı"
    const aiUrl = settings.aiApiUrl || ""
    const isLocal = /localhost|127\.0\.0\.1/.test(aiUrl)
    const msg = isLocal
      ? `Ollama'ya bağlanılamadı. Bu uygulama cloud'da (Vercel) çalışıyor — localhost:11434 adresine erişim mümkün değil. Çözüm: Admin > Ayarlar > AI bölümünden Google Gemini veya OpenAI seçin (ücretsiz API key ile çalışır).`
      : rawMsg
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // 5. AI yanıtını ayrıştır
  let parsed: { suggestedProducts: { name: string; price?: number }[]; message: string }
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON bulunamadı")
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json(
      { error: `AI yanıtı ayrıştırılamadı: ${rawText.slice(0, 300)}` },
      { status: 422 }
    )
  }

  // 6. Önerilen ürünleri veritabanındaki gerçek verilerle zenginleştir
  const suggestedProducts = (parsed.suggestedProducts || []).map(sp => {
    const match = products.find(
      p => p.name.toLowerCase().includes(sp.name.toLowerCase()) ||
           sp.name.toLowerCase().includes(p.name.toLowerCase())
    )
    return {
      name:        sp.name,
      description: match?.description ?? undefined,
      price:       sp.price ?? match?.price ?? 0,
    }
  })

  // 7. WhatsApp metni oluştur
  const productLines = suggestedProducts
    .map(p => `• ${p.name}${p.price ? ` — ₺${p.price.toLocaleString("tr-TR")}` : ""}`)
    .join("\n")

  const whatsappText = [
    "Sayın Müşterimiz,",
    "",
    parsed.message,
    "",
    productLines ? `Önerilen Oto Koruma Paketi:\n${productLines}` : "",
    "",
    "Araç koruma hizmeti hakkında bilgi almak için servisimizi arayabilirsiniz. 🛡️",
  ].filter(l => l !== undefined).join("\n").trim()

  const response: CampaignResponse = {
    score,
    scoreLabel,
    scoreBreakdown: breakdown,
    suggestedProducts,
    message:       parsed.message || "",
    whatsappText,
  }

  return NextResponse.json(response)
}
