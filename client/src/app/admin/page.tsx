'use client'

import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react'
import { useApiFetch } from '@/utils/api'
import { BarChart3, Check, ChevronLeft, ChevronRight, CreditCard, FolderKanban, KeyRound, Loader2, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  plan: 'free' | 'pro' | 'business'
  subscription_status: 'active' | 'cancelled' | 'expired'
  subscription_ends_at: string | null
  total_credits: number
  used_credits: number
  created_at: string
}

type Overview = {
  metrics: { users: number; activeSubscriptions: number; projects: number; revenue: number }
  recentUsers: AdminUser[]
}

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'No end date'

export default function AdminPage() {
  const apiFetch = useApiFetch()
  const [adminKey, setAdminKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const savedKey = window.sessionStorage.getItem('admin-access-key')
    if (savedKey) setAdminKey(savedKey)
  }, [])

  const adminFetch = useCallback((path: string, options: RequestInit = {}) => {
    return apiFetch(path, { ...options, headers: { ...options.headers, 'x-admin-key': adminKey } })
  }, [apiFetch, adminKey])

  const load = useCallback(async () => {
    if (!adminKey) return
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ page: String(page), limit: '25' })
      if (search.trim()) query.set('search', search.trim())
      const [nextOverview, usersResult] = await Promise.all([
        adminFetch('/api/admin/overview'),
        adminFetch(`/api/admin/users?${query.toString()}`),
      ])
      setOverview(nextOverview)
      setUsers(usersResult.users)
      setTotal(usersResult.total)
    } catch (err: any) {
      setError(err.message || 'Unable to load admin data')
      setOverview(null)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [adminFetch, adminKey, page, search])

  useEffect(() => { load() }, [load])

  const unlock = (event: FormEvent) => {
    event.preventDefault()
    const value = keyInput.trim()
    if (!value) return
    window.sessionStorage.setItem('admin-access-key', value)
    setAdminKey(value)
    setError('')
  }

  const saveSubscription = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const result = await adminFetch(`/api/admin/users/${selected.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan: selected.plan,
          subscriptionStatus: selected.subscription_status,
          subscriptionEndsAt: selected.subscription_ends_at || null,
          totalCredits: Number(selected.total_credits),
          usedCredits: Number(selected.used_credits),
        }),
      })
      setSelected(result.user)
      setNotice(`Subscription updated for ${result.user.email}`)
      await load()
    } catch (err: any) {
      setError(err.message || 'Unable to save subscription')
    } finally {
      setSaving(false)
    }
  }

  if (!adminKey) return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12 text-white">
      <form onSubmit={unlock} className="mx-auto mt-24 w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/50 p-7 shadow-2xl">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black"><ShieldCheck size={22} /></div>
        <h1 className="text-xl font-semibold">Admin access</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">Enter the server-side admin access key to manage users, credits, and subscriptions.</p>
        <label className="mt-6 block text-xs font-medium text-neutral-300">Admin access key</label>
        <div className="mt-2 flex gap-2">
          <input autoFocus type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-black px-3 py-2.5 text-sm outline-none ring-white/20 focus:ring-2" placeholder="Enter access key" />
          <button className="rounded-lg bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200">Continue</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </form>
    </main>
  )

  const pages = Math.max(1, Math.ceil(total / 25))
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-black/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black"><ShieldCheck size={19} /></div><div><h1 className="font-semibold">Admin panel</h1><p className="text-xs text-neutral-500">User and subscription management</p></div></div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-medium hover:bg-neutral-900 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">
        {error && <div className="mb-5 rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300"><Check size={15} />{notice}</div>}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Users} label="Total users" value={overview?.metrics.users} />
          <Metric icon={CreditCard} label="Active subscriptions" value={overview?.metrics.activeSubscriptions} />
          <Metric icon={FolderKanban} label="Projects" value={overview?.metrics.projects} />
          <Metric icon={BarChart3} label="Collected revenue" value={overview ? `₹${overview.metrics.revenue.toLocaleString('en-IN')}` : undefined} />
        </section>
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/30">
            <div className="flex flex-col gap-3 border-b border-neutral-800 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-medium">Users</h2><p className="mt-0.5 text-xs text-neutral-500">Select a user to adjust their plan or credits.</p></div><form onSubmit={e => { e.preventDefault(); setPage(1); load() }} className="flex items-center rounded-lg border border-neutral-700 bg-black px-2"><Search size={15} className="text-neutral-500" /><input value={search} onChange={e => setSearch(e.target.value)} className="w-44 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-neutral-600" placeholder="Search user" /></form></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-black/30 text-xs text-neutral-500"><tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Plan</th><th className="px-4 py-3 font-medium">Credits</th><th className="px-4 py-3 font-medium">Subscription</th></tr></thead><tbody>{users.map(user => <tr key={user.id} onClick={() => { setSelected(user); setNotice('') }} className={`cursor-pointer border-t border-neutral-800/80 hover:bg-neutral-800/40 ${selected?.id === user.id ? 'bg-neutral-800/60' : ''}`}><td className="px-4 py-3"><p className="max-w-[240px] truncate font-medium">{user.email}</p><p className="mt-0.5 text-xs text-neutral-600">Joined {formatDate(user.created_at)}</p></td><td className="px-4 py-3 capitalize">{user.plan}</td><td className="px-4 py-3">{user.used_credits} / {user.total_credits}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${user.subscription_status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>{user.subscription_status}</span></td></tr>)}{!loading && !users.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-neutral-500">No users found.</td></tr>}</tbody></table></div>
            <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3 text-xs text-neutral-500"><span>{total} users</span><div className="flex items-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded p-1 hover:bg-neutral-800 disabled:opacity-30"><ChevronLeft size={16} /></button><span>Page {page} of {pages}</span><button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="rounded p-1 hover:bg-neutral-800 disabled:opacity-30"><ChevronRight size={16} /></button></div></div>
          </div>
          <SubscriptionEditor user={selected} saving={saving} onChange={setSelected} onSave={saveSubscription} />
        </section>
      </div>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users, label: string, value?: number | string }) {
  return <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4"><div className="flex items-center justify-between"><span className="text-sm text-neutral-400">{label}</span><Icon size={16} className="text-neutral-500" /></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value ?? '—'}</p></div>
}

function SubscriptionEditor({ user, saving, onChange, onSave }: { user: AdminUser | null, saving: boolean, onChange: (user: AdminUser | null) => void, onSave: (event: FormEvent) => void }) {
  if (!user) return <aside className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/20 p-8 text-center"><KeyRound size={22} className="text-neutral-600" /><h2 className="mt-4 font-medium">Select a user</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Their subscription and credit allocation will appear here.</p></aside>
  const set = (field: keyof AdminUser, value: string | number) => onChange({ ...user, [field]: value })
  return <aside className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5"><h2 className="font-medium">Manage subscription</h2><p className="mt-1 truncate text-sm text-neutral-400">{user.email}</p><form onSubmit={onSave} className="mt-5 space-y-4"><Field label="Plan"><select value={user.plan} onChange={e => set('plan', e.target.value)} className="admin-input"><option value="free">Free</option><option value="pro">Pro</option><option value="business">Business</option></select></Field><Field label="Status"><select value={user.subscription_status} onChange={e => set('subscription_status', e.target.value)} className="admin-input"><option value="active">Active</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></Field><Field label="Subscription ends"><input type="date" value={user.subscription_ends_at ? user.subscription_ends_at.slice(0, 10) : ''} onChange={e => set('subscription_ends_at', e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : '')} className="admin-input" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Total credits"><input min="0" type="number" value={user.total_credits} onChange={e => set('total_credits', Number(e.target.value))} className="admin-input" /></Field><Field label="Used credits"><input min="0" type="number" value={user.used_credits} onChange={e => set('used_credits', Number(e.target.value))} className="admin-input" /></Field></div><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving…' : 'Save changes'}</button></form></aside>
}

function Field({ label, children }: { label: string, children: ReactNode }) { return <label className="block text-xs font-medium text-neutral-400"><span className="mb-1.5 block">{label}</span>{children}</label> }
