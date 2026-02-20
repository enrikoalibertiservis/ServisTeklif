"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("E-posta veya şifre hatalı.")
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
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Servis Teklif</CardTitle>
            <CardDescription className="mt-2">
              Bakım Teklif Sihirbazı
            </CardDescription>
          </div>
          {/* Marka logoları */}
          <div className="flex items-center justify-center gap-5 pt-1">
            {/* Fiat */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 shadow-md flex items-center justify-center">
                <svg viewBox="0 0 60 60" className="w-10 h-10">
                  <ellipse cx="30" cy="30" rx="28" ry="28" fill="#C00" />
                  <ellipse cx="30" cy="30" rx="22" ry="22" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <text x="30" y="35" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="serif" letterSpacing="1">FIAT</text>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#CC0000] tracking-widest">FIAT</span>
            </div>
            {/* Alfa Romeo */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 shadow-md flex items-center justify-center">
                <svg viewBox="0 0 60 60" className="w-10 h-10">
                  <rect x="2" y="2" width="56" height="56" rx="28" fill="#CC0000" />
                  <rect x="29" y="2" width="3" height="56" fill="#fff" />
                  <text x="15" y="36" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">AR</text>
                  <path d="M32 10 Q38 18 36 30 Q38 42 32 50" fill="none" stroke="#fff" strokeWidth="1.5"/>
                  <text x="45" y="36" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">🐍</text>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#CC0000] tracking-widest">ALFA</span>
            </div>
            {/* Jeep */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 shadow-md flex items-center justify-center">
                <svg viewBox="0 0 70 30" className="w-11 h-7">
                  <rect x="1" y="1" width="68" height="28" rx="4" fill="#1a3a1a" />
                  <text x="35" y="21" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900" fontFamily="Arial Black, sans-serif" letterSpacing="2">JEEP</text>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-[#2E5735] tracking-widest">JEEP</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@servis.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
