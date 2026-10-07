import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google'
import './globals.css'

// Mêmes polices que l'application Pandora Health : Manrope (titres), Inter (texte), JetBrains Mono (codes).
// next/font les héberge avec le site (aucun appel à Google côté visiteur).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'Pandora — Console',
  description: 'Suivi des hôpitaux Pandora Health, abonnements et vérification des reçus.'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`h-full ${inter.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
