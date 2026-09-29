import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session-token'

// Vérification optimiste de la session avant d'afficher une page (Next.js 16 : « proxy », ex
// middleware). La vérification complète (compte actif, rôle) est refaite côté serveur par
// requireAccount() dans chaque page et action — ce filtre ne fait qu'éviter d'afficher une page
// protégée à un visiteur non connecté.

// Pages publiques : connexion, vérification des reçus (QR code), page de retour après paiement
// MoneyFusion (/callback), notifications de paiement, appels de l'application des hôpitaux (authentifiés par leur propre secret).
const PUBLIC_PREFIXES = ['/login', '/register', '/r/', '/callback', '/api/public/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // `/` = page d'accueil publique (présentation, tarifs, demande de démo).
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if ((pathname === '/login' || pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Tout sauf les fichiers statiques et les ressources internes de Next.js.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)']
}
