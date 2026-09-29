import Image from 'next/image'
import Link from 'next/link'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="Pandora" width={40} height={40} className="rounded-xl" priority />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gray-900">PANDORA</p>
            <p className="text-xs font-semibold tracking-wide text-accent-600">CONSOLE</p>
          </div>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Connexion</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">Espace réservé à l&apos;équipe Pandora.</p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-accent-600 hover:text-accent-700">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  )
}
