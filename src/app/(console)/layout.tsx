import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { requireAccount } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { NavLinks } from './NavLinks'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount()
  return (
    <div className="flex min-h-screen">
      {/* Barre latérale « encre », la même que l'application Pandora Health. */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.04] bg-ink-950 text-[#d3e0d8]">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-4">
          <Image src="/logo.png" alt="Pandora" width={36} height={36} className="rounded-xl shadow-[0_0_18px_rgba(52,204,107,0.25)]" />
          <div className="leading-none">
            <p className="font-display text-[14px] font-extrabold tracking-[0.04em] text-white">PANDORA</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.24em] text-gold-400">CONSOLE</p>
          </div>
        </div>
        <NavLinks isAdmin={account.role === 'ADMIN'} />
        <div className="border-t border-white/[0.06] p-4">
          <p className="truncate text-sm font-semibold text-white">{account.name}</p>
          <p className="text-xs text-[#8fa398]">{account.role === 'ADMIN' ? 'Administrateur' : 'Prospecteur'}</p>
          <form action={logout} className="mt-3">
            <button className="flex items-center gap-2 text-xs font-medium text-[#8fa398] hover:text-red-400">
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  )
}
