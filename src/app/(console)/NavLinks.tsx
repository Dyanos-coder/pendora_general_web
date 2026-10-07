'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, CreditCard, Inbox, LayoutDashboard, Tags, Users } from 'lucide-react'

const LINKS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, adminOnly: false },
  { href: '/hospitals', label: 'Hôpitaux', icon: Building2, adminOnly: false },
  { href: '/leads', label: 'Demandes de contact', icon: Inbox, adminOnly: false },
  { href: '/payments', label: 'Paiements', icon: CreditCard, adminOnly: true },
  { href: '/pricing', label: 'Tarifs', icon: Tags, adminOnly: true },
  { href: '/accounts', label: 'Utilisateurs', icon: Users, adminOnly: true }
]

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="rail-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {LINKS.filter((l) => isAdmin || !l.adminOnly).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors ${
              active
                ? 'bg-gradient-to-r from-[#34cc6b]/[0.16] to-transparent font-semibold text-white'
                : 'text-[#c3d1c9] hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            {active && <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-[#34cc6b] shadow-[0_0_10px_#34cc6b]" />}
            <Icon className={`h-[17px] w-[17px] ${active ? 'text-[#34cc6b]' : 'opacity-80'}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
