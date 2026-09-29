import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pandora — Console',
  description: 'Suivi des hôpitaux Pandora Health, abonnements et vérification des reçus.'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
