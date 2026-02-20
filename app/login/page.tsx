"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench } from "lucide-react"
import Image from "next/image"

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
