"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Users, Plus, UserCheck, UserX, Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff, ScanLine, UserCog } from "lucide-react"
import Image from "next/image"

// Şifre kural kontrolü
function checkPassword(pwd: string) {
  return {
    length:    pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[^A-Za-z0-9]/.test(pwd),
  }
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const r = checkPassword(password)
  const passed = Object.values(r).filter(Boolean).length
  const bars = [
    passed <= 1 ? "bg-red-500" : passed <= 2 ? "bg-orange-400" : passed <= 3 ? "bg-yellow-400" : passed <= 4 ? "bg-lime-500" : "bg-green-500",
  ]
  const label = ["", "Çok Zayıf", "Zayıf", "Orta", "İyi", "Güçlü"][passed]
  const labelColor = ["", "text-red-500", "text-orange-500", "text-yellow-600", "text-lime-600", "text-green-600"][passed]

  const rules = [
    { key: "length",    text: "En az 8 karakter" },
    { key: "uppercase", text: "En az 1 büyük harf" },
    { key: "lowercase", text: "En az 1 küçük harf" },
    { key: "number",    text: "En az 1 rakam" },
    { key: "special",   text: "En az 1 özel karakter" },
  ]

  return (
    <div className="mt-2 space-y-2">
      {/* Güç barı */}
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= passed ? bars[0] : "bg-slate-200"}`} />
        ))}
      </div>
      <div className={`text-xs font-medium ${labelColor}`}>{label}</div>
      {/* Kural listesi */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map(rule => (
          <div key={rule.key} className={`flex items-center gap-1 text-xs ${(r as any)[rule.key] ? "text-green-600" : "text-slate-400"}`}>
            <span>{(r as any)[rule.key] ? "✓" : "○"}</span>
            {rule.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])

  // Yeni kullanıcı dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState("ADVISOR")
  const [saving, setSaving] = useState(false)

  // Şifre güncelleme dialog
  const [pwdDialogUser, setPwdDialogUser] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [newPassword2, setNewPassword2] = useState("")
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  // Rol değiştirme dialog
  const [roleDialogUser, setRoleDialogUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [newRole, setNewRole] = useState("ADVISOR")
  const [roleSaving, setRoleSaving] = useState(false)

  // 2FA kurulum dialog
  const [tfaDialogUser, setTfaDialogUser] = useState<{ id: string; name: string; twoFactorEnabled: boolean } | null>(null)
  const [tfaStep, setTfaStep] = useState<"qr" | "verify">("qr")
  const [tfaSecret, setTfaSecret] = useState("")
  const [tfaQr, setTfaQr] = useState("")
  const [tfaToken, setTfaToken] = useState("")
  const [tfaLoading, setTfaLoading] = useState(false)
  const [tfaSaving, setTfaSaving] = useState(false)

  async function loadUsers() {
    const res = await fetch("/api/users")
    setUsers(await res.json())
  }

  useEffect(() => { loadUsers() }, [])

  async function handleChangeRole() {
    if (!roleDialogUser) return
    setRoleSaving(true)
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: roleDialogUser.id, role: newRole }),
    })
    setRoleSaving(false)
    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" })
      return
    }
    toast({ title: "Rol güncellendi", description: `${roleDialogUser.name} kullanıcısının rolü ${newRole === "ADMIN" ? "Yönetici" : "Danışman"} olarak değiştirildi.` })
    setRoleDialogUser(null)
    loadUsers()
  }

  async function handleCreate() {
    if (!name || !email || !password) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" })
      return
    }
    setSaving(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    })
    setSaving(false)

    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" })
      return
    }

    toast({ title: "Kullanıcı oluşturuldu" })
    setDialogOpen(false)
    setName(""); setEmail(""); setPassword(""); setRole("ADVISOR"); setShowPwd(false)
    loadUsers()
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, active: !currentActive }),
    })
    loadUsers()
    toast({ title: currentActive ? "Kullanıcı devre dışı bırakıldı" : "Kullanıcı aktifleştirildi" })
  }

  async function handleUpdatePassword() {
    if (!pwdDialogUser) return
    if (!newPassword) {
      toast({ title: "Hata", description: "Yeni şifre boş olamaz.", variant: "destructive" }); return
    }
    if (newPassword !== newPassword2) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" }); return
    }
    setPwdSaving(true)
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pwdDialogUser.id, password: newPassword }),
    })
    setPwdSaving(false)
    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" }); return
    }
    toast({ title: "Şifre güncellendi", description: `${pwdDialogUser.name} kullanıcısının şifresi değiştirildi.` })
    setPwdDialogUser(null)
    setNewPassword(""); setNewPassword2(""); setShowNewPwd(false)
  }

  async function openTfaSetup(user: { id: string; name: string; twoFactorEnabled: boolean }) {
    setTfaDialogUser(user)
    setTfaStep("qr")
    setTfaToken("")
    setTfaSecret("")
    setTfaQr("")
    if (!user.twoFactorEnabled) {
      setTfaLoading(true)
      try {
        const res = await fetch("/api/auth/2fa-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast({ title: "Hata", description: err.error ?? "QR kod oluşturulamadı.", variant: "destructive" })
          setTfaDialogUser(null)
          return
        }
        const data = await res.json()
        setTfaSecret(data.secret)
        setTfaQr(data.qrDataUrl)
      } catch {
        toast({ title: "Hata", description: "Sunucuya bağlanılamadı.", variant: "destructive" })
        setTfaDialogUser(null)
      } finally {
        setTfaLoading(false)
      }
    }
  }

  async function handleTfaVerify() {
    if (!tfaDialogUser || tfaToken.length !== 6) return
    setTfaSaving(true)
    const res = await fetch("/api/auth/2fa-setup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: tfaDialogUser.id, secret: tfaSecret, token: tfaToken }),
    })
    setTfaSaving(false)
    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" }); return
    }
    toast({ title: "2FA Etkinleştirildi", description: `${tfaDialogUser.name} artık iki faktörlü doğrulama kullanıyor.` })
    setTfaDialogUser(null)
    loadUsers()
  }

  async function handleTfaDisable() {
    if (!tfaDialogUser) return
    if (!confirm(`${tfaDialogUser.name} kullanıcısının 2FA koruması kaldırılacak. Emin misiniz?`)) return
    setTfaSaving(true)
    await fetch("/api/auth/2fa-setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: tfaDialogUser.id }),
    })
    setTfaSaving(false)
    toast({ title: "2FA Devre Dışı", description: `${tfaDialogUser.name} kullanıcısının 2FA koruması kaldırıldı.` })
    setTfaDialogUser(null)
    loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-rose-500" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-muted-foreground">Danışman ve yönetici hesaplarını yönetin.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-500" />
            Kullanıcılar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="w-32">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Yönetici" : "Danışman"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "default" : "destructive"}>
                      {u.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    {u.twoFactorEnabled
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck className="h-3 w-3" />Aktif</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">Kapalı</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm"
                        title={u.active ? "Devre dışı bırak" : "Aktifleştir"}
                        onClick={() => toggleActive(u.id, u.active)}
                      >
                        {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        title="Rolü değiştir"
                        onClick={() => { setRoleDialogUser({ id: u.id, name: u.name, role: u.role }); setNewRole(u.role) }}
                      >
                        <UserCog className="h-4 w-4 text-indigo-500" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        title="Şifre güncelle"
                        onClick={() => { setPwdDialogUser({ id: u.id, name: u.name }); setNewPassword(""); setNewPassword2(""); setShowNewPwd(false) }}
                      >
                        <KeyRound className="h-4 w-4 text-amber-500" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        title={u.twoFactorEnabled ? "2FA Yönet" : "2FA Kur"}
                        onClick={() => openTfaSetup({ id: u.id, name: u.name, twoFactorEnabled: u.twoFactorEnabled })}
                      >
                        <ShieldCheck className={`h-4 w-4 ${u.twoFactorEnabled ? "text-emerald-500" : "text-slate-400"}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rol Değiştirme Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={open => { if (!open) setRoleDialogUser(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-indigo-500" />
              Rol Değiştir
              {roleDialogUser && <span className="text-sm font-normal text-muted-foreground">— {roleDialogUser.name}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 border px-4 py-3 text-sm">
              <span className="text-slate-500">Mevcut Rol:</span>
              <Badge variant={roleDialogUser?.role === "ADMIN" ? "default" : "secondary"}>
                {roleDialogUser?.role === "ADMIN" ? "Yönetici" : "Danışman"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>Yeni Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVISOR">Danışman</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === roleDialogUser?.role && (
              <p className="text-xs text-slate-400">Seçili rol mevcut rolle aynı.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>İptal</Button>
            <Button
              onClick={handleChangeRole}
              disabled={roleSaving || newRole === roleDialogUser?.role}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {roleSaving ? "Kaydediliyor..." : "Rolü Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Kurulum / Yönetim Dialog */}
      <Dialog open={!!tfaDialogUser} onOpenChange={open => { if (!open) setTfaDialogUser(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              {tfaDialogUser?.twoFactorEnabled ? "2FA Yönetimi" : "İki Faktörlü Doğrulama Kurulumu"}
              {tfaDialogUser && <span className="text-sm font-normal text-muted-foreground">— {tfaDialogUser.name}</span>}
            </DialogTitle>
          </DialogHeader>

          {tfaDialogUser?.twoFactorEnabled ? (
            // Zaten aktif — devre dışı bırakma seçeneği
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <ShieldCheck className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-700 text-sm">2FA Aktif</p>
                  <p className="text-xs text-emerald-600">Bu kullanıcı Google Authenticator ile korunuyor.</p>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setTfaDialogUser(null)} className="flex-1">Kapat</Button>
                <Button variant="destructive" onClick={handleTfaDisable} disabled={tfaSaving} className="flex-1">
                  <ShieldOff className="h-4 w-4 mr-1.5" />
                  {tfaSaving ? "Kaldırılıyor..." : "2FA'yı Kaldır"}
                </Button>
              </DialogFooter>
            </div>
          ) : tfaLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <ScanLine className="h-5 w-5 animate-pulse" /> QR kod oluşturuluyor...
            </div>
          ) : (
            // Kurulum adımları
            <div className="space-y-4">
              {tfaStep === "qr" ? (
                <>
                  <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                    <li>Telefona <strong className="text-foreground">Google Authenticator</strong> uygulamasını yükle</li>
                    <li>Uygulamada <strong className="text-foreground">+</strong> → <strong className="text-foreground">QR kodu tara</strong> seç</li>
                    <li>Aşağıdaki kodu tara</li>
                  </ol>
                  {tfaQr && (
                    <div className="flex flex-col items-center gap-2">
                      <img src={tfaQr} alt="2FA QR" className="w-48 h-48 rounded-lg border" />
                      <p className="text-[11px] text-muted-foreground text-center">
                        Elle giriş için anahtar:<br />
                        <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded break-all">{tfaSecret}</code>
                      </p>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTfaDialogUser(null)}>İptal</Button>
                    <Button onClick={() => setTfaStep("verify")}>Tarattım, Devam Et</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Google Authenticator'da görünen <strong>6 haneli kodu</strong> girerek kurulumu tamamlayın.
                  </p>
                  <Input
                    type="text" inputMode="numeric" maxLength={6}
                    placeholder="000000"
                    value={tfaToken}
                    onChange={e => setTfaToken(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                  <DialogFooter className="flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => setTfaStep("qr")} className="flex-1">Geri</Button>
                    <Button
                      onClick={handleTfaVerify}
                      disabled={tfaSaving || tfaToken.length !== 6}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {tfaSaving ? "Doğrulanıyor..." : "Etkinleştir"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Şifre Güncelleme Dialog */}
      <Dialog open={!!pwdDialogUser} onOpenChange={open => { if (!open) { setPwdDialogUser(null); setNewPassword(""); setNewPassword2("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Şifre Güncelle — {pwdDialogUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Yeni şifre girin"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label>Şifre Tekrar</Label>
              <Input
                type="password"
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
                placeholder="Şifreyi tekrar girin"
              />
              {newPassword2 && newPassword !== newPassword2 && (
                <p className="text-xs text-red-500">Şifreler eşleşmiyor</p>
              )}
              {newPassword2 && newPassword === newPassword2 && newPassword.length > 0 && (
                <p className="text-xs text-green-600">✓ Şifreler eşleşiyor</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogUser(null)}>İptal</Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={pwdSaving || !newPassword || newPassword !== newPassword2}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {pwdSaving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Kullanıcı Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Şifre</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVISOR">Danışman</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
