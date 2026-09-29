import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { requireAccount } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { NavLinks } from './NavLinks'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount()
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
          <Image src="/logo.png" alt="Pandora" width={36} height={36} className="rounded-xl" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gray-900">PANDORA</p>
            <p className="text-xs font-semibold tracking-wide text-accent-600">CONSOLE</p>
          </div>
        </div>
        <NavLinks isAdmin={account.role === 'ADMIN'} />
        <div className="border-t border-gray-100 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{account.name}</p>
          <p className="text-xs text-gray-500">{account.role === 'ADMIN' ? 'Administrateur' : 'Prospecteur'}</p>
          <form action={logout} className="mt-3">
            <button className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-red-600">
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
