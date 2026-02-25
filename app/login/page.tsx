"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, ShieldCheck, ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()

  // Adım: "credentials" | "totp"
  const [step, setStep] = useState<"credentials" | "totp">("credentials")

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [totp, setTotp]         = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  // Adım 1 — şifre doğrulama
  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/2fa-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError("E-posta veya şifre hatalı.")
        setLoading(false)
        return
      }

      if (data.requires2fa) {
        // 2FA adımına geç
        setStep("totp")
        setLoading(false)
        return
      }

      // 2FA yok — direkt giriş
      await doSignIn("")
    } catch {
      setError("Bir hata oluştu. Tekrar deneyin.")
      setLoading(false)
    }
  }

  // Adım 2 — TOTP kodu doğrulama
  async function handleTotp(e: React.FormEvent) {
    e.preventDefault()
    if (totp.length !== 6) { setError("6 haneli kodu girin."); return }
    setError("")
    setLoading(true)
    await doSignIn(totp)
  }

  async function doSignIn(totpCode: string) {
    const result = await signIn("credentials", {
      email, password, totp: totpCode, redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      if (step === "totp") {
        setError("Kod hatalı veya süresi geçmiş. Tekrar deneyin.")
        setTotp("")
      } else {
        setError("E-posta veya şifre hatalı.")
      }
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Card className="w-full max-w-md mx-4 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-primary rounded-2xl">
            {step === "totp"
              ? <ShieldCheck className="h-8 w-8 text-white" />
              : <Wrench className="h-8 w-8 text-white" />
            }
          </div>
          <div>
            <CardTitle className="text-2xl">
              {step === "totp" ? "İki Faktörlü Doğrulama" : "Servis Teklif"}
            </CardTitle>
            <CardDescription className="mt-2">
              {step === "totp"
                ? "Google Authenticator uygulamasındaki 6 haneli kodu girin."
                : "Bakım Teklif Sihirbazı"}
            </CardDescription>
          </div>
          {step === "credentials" && (
            <div className="flex items-center justify-center gap-5 pt-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center overflow-hidden">
                  <Image src="/logos/fiat.png" alt="Fiat" width={48} height={48} className="object-contain w-12 h-12" />
                </div>
                <span className="text-[10px] font-bold text-[#CC0000] tracking-widest">FIAT</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center overflow-hidden">
                  <Image src="/logos/alfa-romeo.png" alt="Alfa Romeo" width={48} height={48} className="object-contain w-12 h-12" />
                </div>
                <span className="text-[10px] font-bold text-[#003580] tracking-widest">ALFA ROMEO</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center overflow-hidden p-2">
                  <Image src="/logos/jeep.png" alt="Jeep" width={48} height={24} className="object-contain w-12" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-widest">JEEP</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email" type="email" placeholder="ornek@servis.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password" type="password"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Kontrol ediliyor..." : "Devam Et"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-5">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 text-center">
                <ShieldCheck className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                Google Authenticator'da <span className="font-bold">Servis Teklif</span> hesabına ait
                6 haneli kodu girin.
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp">Doğrulama Kodu</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totp}
                  onChange={e => setTotp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || totp.length !== 6}>
                {loading ? "Doğrulanıyor..." : "Giriş Yap"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("credentials"); setTotp(""); setError("") }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Geri dön
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
