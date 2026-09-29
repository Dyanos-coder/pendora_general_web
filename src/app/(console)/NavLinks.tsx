'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Inbox, LayoutDashboard, Users } from 'lucide-react'

const LINKS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, adminOnly: false },
  { href: '/hospitals', label: 'Hôpitaux', icon: Building2, adminOnly: false },
  { href: '/leads', label: 'Demandes de contact', icon: Inbox, adminOnly: false },
  { href: '/accounts', label: 'Utilisateurs', icon: Users, adminOnly: true }
]

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {LINKS.filter((l) => isAdmin || !l.adminOnly).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg border-l-2 py-2 pl-2.5 pr-3 text-sm font-medium transition-colors ${
              active ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
